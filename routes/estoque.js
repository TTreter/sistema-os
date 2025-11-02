const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');

// GET - Listar movimentações de estoque
router.get('/movimentacoes', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { peca_id, tipo, data_inicio, data_fim, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM v_estoque_movimentacoes WHERE 1=1';
    const params = [];

    if (peca_id) {
      query += ' AND peca_id = ?';
      params.push(peca_id);
    }

    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }

    if (data_inicio) {
      query += ' AND DATE(data_hora) >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ' AND DATE(data_hora) <= ?';
      params.push(data_fim);
    }

    query += ' ORDER BY data_hora DESC LIMIT ?';
    params.push(parseInt(limit));

    const movimentacoes = db.prepare(query).all(...params);

    res.json(movimentacoes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Histórico de movimentações de uma peça específica
router.get('/movimentacoes/peca/:peca_id', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const movimentacoes = db.prepare(`
      SELECT * FROM v_estoque_movimentacoes 
      WHERE peca_id = ? 
      ORDER BY data_hora DESC
      LIMIT 50
    `).all(req.params.peca_id);

    const peca = db.prepare('SELECT * FROM pecas WHERE id = ?').get(req.params.peca_id);

    if (!peca) {
      return res.status(404).json({ error: 'Peça não encontrada' });
    }

    res.json({
      peca,
      movimentacoes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Ajustar estoque manualmente
router.post('/ajustar', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { peca_id, quantidade, motivo, observacoes, usuario } = req.body;

    if (!peca_id || quantidade === undefined || !motivo) {
      return res.status(400).json({ error: 'Peça, quantidade e motivo são obrigatórios' });
    }

    // Buscar estoque atual
    const peca = db.prepare('SELECT estoque_atual, nome FROM pecas WHERE id = ?').get(peca_id);
    
    if (!peca) {
      return res.status(404).json({ error: 'Peça não encontrada' });
    }

    const estoqueAnterior = peca.estoque_atual;
    const novoEstoque = estoqueAnterior + quantidade;

    if (novoEstoque < 0) {
      return res.status(400).json({ error: `Estoque não pode ficar negativo. Disponível: ${estoqueAnterior}` });
    }

    // Atualizar estoque
    db.prepare('UPDATE pecas SET estoque_atual = ? WHERE id = ?').run(novoEstoque, peca_id);

    // Registrar movimentação
    const tipo = quantidade > 0 ? 'ENTRADA' : 'SAIDA';
    db.prepare(`
      INSERT INTO estoque_movimentacoes (
        peca_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo, observacoes, usuario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(peca_id, tipo, Math.abs(quantidade), estoqueAnterior, novoEstoque, motivo, observacoes, usuario);

    res.json({
      message: 'Estoque ajustado com sucesso',
      peca: peca.nome,
      estoque_anterior: estoqueAnterior,
      estoque_novo: novoEstoque,
      quantidade_ajustada: quantidade
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Estatísticas de movimentação
router.get('/estatisticas', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { data_inicio, data_fim } = req.query;

    let whereClause = '';
    const params = [];

    if (data_inicio && data_fim) {
      whereClause = 'WHERE DATE(data_hora) BETWEEN ? AND ?';
      params.push(data_inicio, data_fim);
    }

    // Total de movimentações por tipo
    const porTipo = db.prepare(`
      SELECT tipo, COUNT(*) as quantidade, SUM(quantidade) as total_pecas
      FROM estoque_movimentacoes
      ${whereClause}
      GROUP BY tipo
    `).all(...params);

    // Peças mais movimentadas
    const maisMovimentadas = db.prepare(`
      SELECT 
        p.codigo,
        p.nome,
        COUNT(em.id) as total_movimentacoes,
        SUM(CASE WHEN em.tipo = 'ENTRADA' THEN em.quantidade ELSE 0 END) as total_entradas,
        SUM(CASE WHEN em.tipo = 'SAIDA' THEN em.quantidade ELSE 0 END) as total_saidas,
        p.estoque_atual
      FROM estoque_movimentacoes em
      INNER JOIN pecas p ON em.peca_id = p.id
      ${whereClause}
      GROUP BY em.peca_id
      ORDER BY total_movimentacoes DESC
      LIMIT 10
    `).all(...params);

    // Peças sem movimentação há mais de X dias
    const diasAlerta = db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get('estoque_alerta_dias');
    const dias = diasAlerta ? parseInt(diasAlerta.valor) : 30;

    const semMovimentacao = db.prepare(`
      SELECT 
        p.id,
        p.codigo,
        p.nome,
        p.estoque_atual,
        MAX(em.data_hora) as ultima_movimentacao,
        CAST(julianday('now') - julianday(MAX(em.data_hora)) AS INTEGER) as dias_sem_movimento
      FROM pecas p
      LEFT JOIN estoque_movimentacoes em ON p.id = em.peca_id
      WHERE p.ativo = 1
      GROUP BY p.id
      HAVING dias_sem_movimento > ? OR ultima_movimentacao IS NULL
      ORDER BY dias_sem_movimento DESC
      LIMIT 20
    `).all(dias);

    res.json({
      por_tipo: porTipo,
      mais_movimentadas: maisMovimentadas,
      sem_movimentacao: semMovimentacao,
      dias_alerta: dias
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Relatório de giro de estoque
router.get('/giro', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { data_inicio, data_fim } = req.query;
    
    if (!data_inicio || !data_fim) {
      return res.status(400).json({ error: 'Período (data_inicio e data_fim) é obrigatório' });
    }

    const relatorio = db.prepare(`
      SELECT 
        p.id,
        p.codigo,
        p.nome,
        p.estoque_atual,
        p.preco_custo,
        p.preco_venda,
        COUNT(CASE WHEN em.tipo = 'SAIDA' THEN 1 END) as num_vendas,
        SUM(CASE WHEN em.tipo = 'SAIDA' THEN em.quantidade ELSE 0 END) as quantidade_vendida,
        SUM(CASE WHEN em.tipo = 'ENTRADA' THEN em.quantidade ELSE 0 END) as quantidade_comprada,
        SUM(CASE WHEN em.tipo = 'SAIDA' THEN em.quantidade * p.preco_venda ELSE 0 END) as faturamento,
        SUM(CASE WHEN em.tipo = 'SAIDA' THEN em.quantidade * p.preco_custo ELSE 0 END) as custo_vendido
      FROM pecas p
      LEFT JOIN estoque_movimentacoes em ON p.id = em.peca_id 
        AND DATE(em.data_hora) BETWEEN ? AND ?
      WHERE p.ativo = 1
      GROUP BY p.id
      ORDER BY quantidade_vendida DESC
    `).all(data_inicio, data_fim);

    // Calcular totais
    const totais = relatorio.reduce((acc, item) => {
      acc.faturamento += item.faturamento || 0;
      acc.custo += item.custo_vendido || 0;
      acc.lucro += (item.faturamento || 0) - (item.custo_vendido || 0);
      acc.quantidade_vendida += item.quantidade_vendida || 0;
      return acc;
    }, { faturamento: 0, custo: 0, lucro: 0, quantidade_vendida: 0 });

    res.json({
      periodo: { data_inicio, data_fim },
      itens: relatorio,
      totais
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
