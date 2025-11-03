const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');

// GET - Rentabilidade geral
router.get('/rentabilidade', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { data_inicio, data_fim } = req.query;
    let whereClause = '';
    const params = [];

    if (data_inicio && data_fim) {
      whereClause = 'WHERE DATE(data_conclusao) BETWEEN ? AND ?';
      params.push(data_inicio, data_fim);
    }

    const rentabilidade = db.prepare(`
      SELECT * FROM v_rentabilidade_os
      ${whereClause}
      ORDER BY data_conclusao DESC
    `).all(...params);

    const resumo = rentabilidade.reduce((acc, os) => {
      acc.receita_total += os.receita_total;
      acc.custo_total += os.custo_total;
      acc.lucro_total += os.lucro_bruto;
      acc.total_os += 1;
      return acc;
    }, { receita_total: 0, custo_total: 0, lucro_total: 0, total_os: 0 });

    resumo.margem_media = resumo.receita_total > 0 
      ? (resumo.lucro_total / resumo.receita_total * 100).toFixed(2)
      : 0;

    res.json({ detalhes: rentabilidade, resumo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Performance por categoria
router.get('/categorias', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { data_inicio, data_fim } = req.query;
    
    let query = `
      SELECT
        cs.nome AS categoria,
        COUNT(DISTINCT oss.os_id) AS total_os,
        COUNT(oss.id) AS total_servicos,
        SUM(oss.valor_total) AS faturamento,
        AVG(oss.valor_total) AS ticket_medio,
        SUM(oss.quantidade) AS quantidade_servicos
      FROM categorias_servico cs
      INNER JOIN tipos_servico ts ON cs.id = ts.categoria_id
      INNER JOIN os_servicos oss ON ts.id = oss.tipo_servico_id
      INNER JOIN ordens_servico os ON oss.os_id = os.id
      WHERE os.status = 'FINALIZADA'
    `;

    const params = [];
    if (data_inicio && data_fim) {
      query += ' AND DATE(os.data_conclusao) BETWEEN ? AND ?';
      params.push(data_inicio, data_fim);
    }

    query += ' GROUP BY cs.id, cs.nome ORDER BY faturamento DESC';

    const categorias = db.prepare(query).all(...params);
    
    const total = categorias.reduce((sum, c) => sum + c.faturamento, 0);
    
    const categoriasComPercentual = categorias.map(c => ({
      ...c,
      percentual_faturamento: total > 0 ? ((c.faturamento / total) * 100).toFixed(2) : 0
    }));

    res.json(categoriasComPercentual);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Performance por mecânico
router.get('/mecanicos', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { data_inicio, data_fim } = req.query;

    let query = `
      SELECT
        m.nome AS mecanico,
        COUNT(os.id) AS total_os,
        SUM(CASE WHEN os.status = 'FINALIZADA' THEN 1 ELSE 0 END) AS os_finalizadas,
        SUM(CASE WHEN os.status = 'FINALIZADA' THEN os.valor_total ELSE 0 END) AS faturamento,
        AVG(CASE WHEN os.status = 'FINALIZADA' THEN os.valor_total ELSE NULL END) AS ticket_medio,
        AVG(CASE WHEN os.status = 'FINALIZADA' 
            THEN CAST(julianday(os.data_conclusao) - julianday(os.data_abertura) AS REAL)
            ELSE NULL END) AS tempo_medio_dias
      FROM mecanicos m
      LEFT JOIN ordens_servico os ON m.id = os.mecanico_id
      WHERE m.ativo = 1
    `;

    const params = [];
    if (data_inicio && data_fim) {
      query += ' AND DATE(os.data_abertura) BETWEEN ? AND ?';
      params.push(data_inicio, data_fim);
    }

    query += ' GROUP BY m.id, m.nome ORDER BY faturamento DESC';

    const mecanicos = db.prepare(query).all(...params);
    res.json(mecanicos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Curva ABC de clientes
router.get('/curva-abc/clientes', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { data_inicio, data_fim } = req.query;

    let query = `
      SELECT
        c.id,
        c.nome,
        COUNT(os.id) AS total_os,
        SUM(os.valor_total) AS faturamento_total,
        AVG(os.valor_total) AS ticket_medio
      FROM clientes c
      INNER JOIN ordens_servico os ON c.id = os.cliente_id
      WHERE os.status = 'FINALIZADA'
    `;

    const params = [];
    if (data_inicio && data_fim) {
      query += ' AND DATE(os.data_conclusao) BETWEEN ? AND ?';
      params.push(data_inicio, data_fim);
    }

    query += ' GROUP BY c.id, c.nome ORDER BY faturamento_total DESC';

    const clientes = db.prepare(query).all(...params);

    // Calcular curva ABC
    const faturamentoTotal = clientes.reduce((sum, c) => sum + c.faturamento_total, 0);
    let acumulado = 0;

    const curvaABC = clientes.map((c, index) => {
      const percentual = (c.faturamento_total / faturamentoTotal) * 100;
      acumulado += percentual;
      
      let classificacao = 'C';
      if (acumulado <= 80) classificacao = 'A';
      else if (acumulado <= 95) classificacao = 'B';

      return {
        ...c,
        posicao: index + 1,
        percentual_faturamento: percentual.toFixed(2),
        percentual_acumulado: acumulado.toFixed(2),
        classificacao
      };
    });

    res.json(curvaABC);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Curva ABC de peças
router.get('/curva-abc/pecas', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { data_inicio, data_fim } = req.query;

    let query = `
      SELECT
        p.id,
        p.codigo,
        p.nome,
        COUNT(DISTINCT op.os_id) AS total_os,
        SUM(op.quantidade) AS quantidade_vendida,
        SUM(op.valor_total) AS faturamento_total,
        SUM(op.quantidade * p.preco_custo) AS custo_total,
        SUM(op.valor_total) - SUM(op.quantidade * p.preco_custo) AS lucro_total
      FROM pecas p
      INNER JOIN os_pecas op ON p.id = op.peca_id
      INNER JOIN ordens_servico os ON op.os_id = os.id
      WHERE os.status = 'FINALIZADA'
    `;

    const params = [];
    if (data_inicio && data_fim) {
      query += ' AND DATE(os.data_conclusao) BETWEEN ? AND ?';
      params.push(data_inicio, data_fim);
    }

    query += ' GROUP BY p.id, p.codigo, p.nome ORDER BY faturamento_total DESC';

    const pecas = db.prepare(query).all(...params);

    // Calcular curva ABC
    const faturamentoTotal = pecas.reduce((sum, p) => sum + p.faturamento_total, 0);
    let acumulado = 0;

    const curvaABC = pecas.map((p, index) => {
      const percentual = (p.faturamento_total / faturamentoTotal) * 100;
      acumulado += percentual;
      
      let classificacao = 'C';
      if (acumulado <= 80) classificacao = 'A';
      else if (acumulado <= 95) classificacao = 'B';

      return {
        ...p,
        posicao: index + 1,
        percentual_faturamento: percentual.toFixed(2),
        percentual_acumulado: acumulado.toFixed(2),
        margem_lucro: p.faturamento_total > 0 
          ? ((p.lucro_total / p.faturamento_total) * 100).toFixed(2)
          : 0,
        classificacao
      };
    });

    res.json(curvaABC);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Dashboard consolidado
router.get('/dashboard', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { periodo = '30' } = req.query; // dias
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));
    const dataInicioStr = dataInicio.toISOString().split('T')[0];

    // Faturamento do período
    const faturamento = db.prepare(`
      SELECT 
        COUNT(*) as total_os,
        SUM(valor_total) as faturamento_total,
        AVG(valor_total) as ticket_medio
      FROM ordens_servico
      WHERE status = 'FINALIZADA'
      AND DATE(data_conclusao) >= ?
    `).get(dataInicioStr);

    // Top 5 categorias
    const topCategorias = db.prepare(`
      SELECT
        cs.nome,
        SUM(oss.valor_total) as faturamento
      FROM categorias_servico cs
      INNER JOIN tipos_servico ts ON cs.id = ts.categoria_id
      INNER JOIN os_servicos oss ON ts.id = oss.tipo_servico_id
      INNER JOIN ordens_servico os ON oss.os_id = os.id
      WHERE os.status = 'FINALIZADA'
      AND DATE(os.data_conclusao) >= ?
      GROUP BY cs.id, cs.nome
      ORDER BY faturamento DESC
      LIMIT 5
    `).all(dataInicioStr);

    // Top 5 clientes
    const topClientes = db.prepare(`
      SELECT
        c.nome,
        COUNT(os.id) as total_os,
        SUM(os.valor_total) as faturamento
      FROM clientes c
      INNER JOIN ordens_servico os ON c.id = os.cliente_id
      WHERE os.status = 'FINALIZADA'
      AND DATE(os.data_conclusao) >= ?
      GROUP BY c.id, c.nome
      ORDER BY faturamento DESC
      LIMIT 5
    `).all(dataInicioStr);

    // Rentabilidade
    const rentabilidade = db.prepare(`
      SELECT
        SUM(receita_total) as receita,
        SUM(custo_total) as custo,
        SUM(lucro_bruto) as lucro,
        AVG(margem_lucro_percentual) as margem_media
      FROM v_rentabilidade_os
      WHERE DATE(data_conclusao) >= ?
    `).get(dataInicioStr);

    res.json({
      periodo: `${periodo} dias`,
      faturamento,
      rentabilidade,
      top_categorias: topCategorias,
      top_clientes: topClientes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
