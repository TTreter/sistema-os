const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/oficina.db');

// Função auxiliar para gerar número do orçamento
function gerarNumeroOrcamento(db) {
  const ano = new Date().getFullYear();
  const ultimoOrcamento = db.prepare('SELECT numero FROM orcamentos ORDER BY id DESC LIMIT 1').get();
  
  if (!ultimoOrcamento) {
    return `ORC${ano}-0001`;
  }
  
  const ultimoNumero = parseInt(ultimoOrcamento.numero.split('-')[1]);
  const novoNumero = String(ultimoNumero + 1).padStart(4, '0');
  
  return `ORC${ano}-${novoNumero}`;
}

// GET - Listar orçamentos (com filtros)
router.get('/', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { status, cliente_id, veiculo_id, expirados, page = 1, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM v_orcamentos_completos WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (cliente_id) {
      query += ' AND cliente_id = ?';
      params.push(cliente_id);
    }

    if (veiculo_id) {
      query += ' AND veiculo_id = ?';
      params.push(veiculo_id);
    }

    if (expirados === 'true') {
      query += ' AND expirado = 1';
    }

    query += ' ORDER BY data_criacao DESC';
    
    // Paginação
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const orcamentos = db.prepare(query).all(...params);

    // Contar total
    let countQuery = 'SELECT COUNT(*) as total FROM orcamentos WHERE 1=1';
    const countParams = [];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      data: orcamentos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Estatísticas de orçamentos
router.get('/estatisticas', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const stats = db.prepare('SELECT * FROM v_estatisticas_orcamentos').all();
    
    const total = stats.reduce((acc, s) => acc + s.quantidade, 0);
    const valorTotal = stats.reduce((acc, s) => acc + (s.valor_total || 0), 0);
    
    const aprovados = stats.find(s => s.status === 'APROVADO') || { quantidade: 0, valor_total: 0 };
    const taxaConversao = total > 0 ? (aprovados.quantidade / total * 100).toFixed(1) : 0;

    res.json({
      por_status: stats,
      resumo: {
        total,
        valor_total: valorTotal,
        taxa_conversao: taxaConversao,
        aprovados: aprovados.quantidade,
        valor_aprovado: aprovados.valor_total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Buscar orçamento por ID (com detalhes completos)
router.get('/:id', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const orcamento = db.prepare('SELECT * FROM v_orcamentos_completos WHERE id = ?').get(req.params.id);
    
    if (!orcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    // Buscar serviços do orçamento
    const servicos = db.prepare(`
      SELECT os.*, ts.nome AS servico_nome, cs.nome AS categoria_nome
      FROM orcamento_servicos os
      INNER JOIN tipos_servico ts ON os.tipo_servico_id = ts.id
      INNER JOIN categorias_servico cs ON ts.categoria_id = cs.id
      WHERE os.orcamento_id = ?
    `).all(req.params.id);

    // Buscar peças do orçamento
    const pecas = db.prepare(`
      SELECT op.*, p.nome AS peca_nome, p.codigo AS peca_codigo, p.marca AS peca_marca
      FROM orcamento_pecas op
      INNER JOIN pecas p ON op.peca_id = p.id
      WHERE op.orcamento_id = ?
    `).all(req.params.id);

    res.json({
      ...orcamento,
      servicos,
      pecas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Criar novo orçamento
router.post('/', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { cliente_id, veiculo_id, data_validade, descricao_problema, observacoes, servicos, pecas } = req.body;

    if (!cliente_id || !veiculo_id) {
      return res.status(400).json({ error: 'Cliente e veículo são obrigatórios' });
    }

    const numero = gerarNumeroOrcamento(db);

    // Calcular data de validade (15 dias padrão)
    let dataValidade = data_validade;
    if (!dataValidade) {
      const config = db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get('orcamento_validade_dias');
      const dias = config ? parseInt(config.valor) : 15;
      const data = new Date();
      data.setDate(data.getDate() + dias);
      dataValidade = data.toISOString().split('T')[0];
    }

    // Criar orçamento
    const stmt = db.prepare(`
      INSERT INTO orcamentos (numero, cliente_id, veiculo_id, data_validade, descricao_problema, observacoes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(numero, cliente_id, veiculo_id, dataValidade, descricao_problema, observacoes);
    const orcamentoId = result.lastInsertRowid;

    // Adicionar serviços
    if (servicos && servicos.length > 0) {
      const stmtServico = db.prepare(`
        INSERT INTO orcamento_servicos (orcamento_id, tipo_servico_id, descricao, quantidade, valor_unitario)
        VALUES (?, ?, ?, ?, ?)
      `);

      servicos.forEach(s => {
        stmtServico.run(orcamentoId, s.tipo_servico_id, s.descricao, s.quantidade || 1, s.valor_unitario);
      });
    }

    // Adicionar peças
    if (pecas && pecas.length > 0) {
      const stmtPeca = db.prepare(`
        INSERT INTO orcamento_pecas (orcamento_id, peca_id, quantidade, valor_unitario)
        VALUES (?, ?, ?, ?)
      `);

      pecas.forEach(p => {
        stmtPeca.run(orcamentoId, p.peca_id, p.quantidade, p.valor_unitario);
      });
    }

    const novoOrcamento = db.prepare('SELECT * FROM v_orcamentos_completos WHERE id = ?').get(orcamentoId);

    res.status(201).json(novoOrcamento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PUT - Atualizar orçamento
router.put('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { data_validade, descricao_problema, observacoes, valor_desconto } = req.body;

    const stmt = db.prepare(`
      UPDATE orcamentos
      SET data_validade = ?, descricao_problema = ?, observacoes = ?, valor_desconto = ?,
          valor_total = valor_pecas + valor_servicos - ?
      WHERE id = ?
    `);

    const result = stmt.run(data_validade, descricao_problema, observacoes, valor_desconto || 0, valor_desconto || 0, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    const orcamentoAtualizado = db.prepare('SELECT * FROM v_orcamentos_completos WHERE id = ?').get(req.params.id);

    res.json(orcamentoAtualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PATCH - Atualizar status do orçamento
router.patch('/:id/status', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const validStatuses = ['PENDENTE', 'ENVIADO', 'APROVADO', 'RECUSADO', 'EXPIRADO', 'CONVERTIDO'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const stmt = db.prepare('UPDATE orcamentos SET status = ? WHERE id = ?');
    const result = stmt.run(status, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    const orcamentoAtualizado = db.prepare('SELECT * FROM v_orcamentos_completos WHERE id = ?').get(req.params.id);

    res.json(orcamentoAtualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Converter orçamento em OS
router.post('/:id/converter-os', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    // Buscar orçamento completo
    const orcamento = db.prepare('SELECT * FROM orcamentos WHERE id = ?').get(req.params.id);
    
    if (!orcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    if (orcamento.status === 'CONVERTIDO') {
      return res.status(400).json({ error: 'Orçamento já foi convertido em OS' });
    }

    // Gerar número da OS
    const ano = new Date().getFullYear();
    const ultimaOS = db.prepare('SELECT numero FROM ordens_servico ORDER BY id DESC LIMIT 1').get();
    let numeroOS = `OS${ano}-0001`;
    
    if (ultimaOS) {
      const ultimoNumero = parseInt(ultimaOS.numero.split('-')[1]);
      numeroOS = `OS${ano}-${String(ultimoNumero + 1).padStart(4, '0')}`;
    }

    // Criar OS
    const stmtOS = db.prepare(`
      INSERT INTO ordens_servico (
        numero, cliente_id, veiculo_id, problema_reportado, 
        observacoes, valor_desconto
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const resultOS = stmtOS.run(
      numeroOS,
      orcamento.cliente_id,
      orcamento.veiculo_id,
      orcamento.descricao_problema,
      `Convertido do orçamento ${orcamento.numero}. ${orcamento.observacoes || ''}`,
      orcamento.valor_desconto
    );

    const osId = resultOS.lastInsertRowid;

    // Copiar serviços do orçamento para a OS
    const servicosOrc = db.prepare('SELECT * FROM orcamento_servicos WHERE orcamento_id = ?').all(req.params.id);
    
    if (servicosOrc.length > 0) {
      const stmtServico = db.prepare(`
        INSERT INTO os_servicos (os_id, tipo_servico_id, descricao, quantidade, valor_unitario)
        VALUES (?, ?, ?, ?, ?)
      `);

      servicosOrc.forEach(s => {
        stmtServico.run(osId, s.tipo_servico_id, s.descricao, s.quantidade, s.valor_unitario);
      });
    }

    // Copiar peças do orçamento para a OS
    const pecasOrc = db.prepare('SELECT * FROM orcamento_pecas WHERE orcamento_id = ?').all(req.params.id);
    
    if (pecasOrc.length > 0) {
      const stmtPeca = db.prepare(`
        INSERT INTO os_pecas (os_id, peca_id, quantidade, valor_unitario)
        VALUES (?, ?, ?, ?)
      `);

      pecasOrc.forEach(p => {
        // Verificar estoque antes de adicionar
        const peca = db.prepare('SELECT estoque_atual, nome FROM pecas WHERE id = ?').get(p.peca_id);
        
        if (peca.estoque_atual < p.quantidade) {
          throw new Error(`Estoque insuficiente para ${peca.nome}. Disponível: ${peca.estoque_atual}`);
        }

        stmtPeca.run(osId, p.peca_id, p.quantidade, p.valor_unitario);
      });
    }

    // Atualizar orçamento como convertido
    db.prepare('UPDATE orcamentos SET status = ?, os_id = ? WHERE id = ?').run('CONVERTIDO', osId, req.params.id);

    // Registrar no histórico da OS
    db.prepare(`
      INSERT INTO historico_comunicacao (os_id, tipo, mensagem)
      VALUES (?, 'SISTEMA', ?)
    `).run(osId, `OS criada a partir do orçamento ${orcamento.numero}`);

    const novaOS = db.prepare('SELECT * FROM v_os_completa WHERE id = ?').get(osId);

    res.status(201).json({
      message: 'Orçamento convertido em OS com sucesso',
      os: novaOS
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Gerar PDF do orçamento
router.get('/:id/pdf', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    // Buscar orçamento completo
    const orcamento = db.prepare('SELECT * FROM v_orcamentos_completos WHERE id = ?').get(req.params.id);
    
    if (!orcamento) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    const servicos = db.prepare(`
      SELECT os.*, ts.nome AS servico_nome, cs.nome AS categoria_nome
      FROM orcamento_servicos os
      INNER JOIN tipos_servico ts ON os.tipo_servico_id = ts.id
      INNER JOIN categorias_servico cs ON ts.categoria_id = cs.id
      WHERE os.orcamento_id = ?
    `).all(req.params.id);

    const pecas = db.prepare(`
      SELECT op.*, p.nome AS peca_nome, p.codigo AS peca_codigo, p.marca AS peca_marca
      FROM orcamento_pecas op
      INNER JOIN pecas p ON op.peca_id = p.id
      WHERE op.orcamento_id = ?
    `).all(req.params.id);

    // Criar PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=orcamento-${orcamento.numero}.pdf`);

    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(20).text('ORÇAMENTO', { align: 'center' });
    doc.fontSize(12).text(orcamento.numero, { align: 'center' });
    doc.moveDown();

    // Linha separadora
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Dados do Cliente
    doc.fontSize(14).text('Dados do Cliente', { underline: true });
    doc.fontSize(10);
    doc.text(`Nome: ${orcamento.cliente_nome}`);
    doc.text(`Telefone: ${orcamento.cliente_telefone}`);
    if (orcamento.cliente_email) {
      doc.text(`Email: ${orcamento.cliente_email}`);
    }
    doc.moveDown();

    // Dados do Veículo
    doc.fontSize(14).text('Dados do Veículo', { underline: true });
    doc.fontSize(10);
    doc.text(`Placa: ${orcamento.placa}`);
    doc.text(`Modelo: ${orcamento.marca} ${orcamento.modelo}`);
    doc.moveDown();

    // Problema Reportado
    if (orcamento.descricao_problema) {
      doc.fontSize(14).text('Problema Reportado', { underline: true });
      doc.fontSize(10).text(orcamento.descricao_problema);
      doc.moveDown();
    }

    // Serviços
    if (servicos.length > 0) {
      doc.fontSize(14).text('Serviços', { underline: true });
      doc.fontSize(10);
      
      servicos.forEach(s => {
        doc.text(`${s.servico_nome} (${s.categoria_nome})`);
        doc.text(`  Quantidade: ${s.quantidade} x R$ ${s.valor_unitario.toFixed(2)} = R$ ${s.valor_total.toFixed(2)}`);
      });
      doc.moveDown();
    }

    // Peças
    if (pecas.length > 0) {
      doc.fontSize(14).text('Peças', { underline: true });
      doc.fontSize(10);
      
      pecas.forEach(p => {
        doc.text(`${p.peca_codigo} - ${p.peca_nome} ${p.peca_marca ? `(${p.peca_marca})` : ''}`);
        doc.text(`  Quantidade: ${p.quantidade} x R$ ${p.valor_unitario.toFixed(2)} = R$ ${p.valor_total.toFixed(2)}`);
      });
      doc.moveDown();
    }

    // Totais
    doc.fontSize(14).text('Resumo', { underline: true });
    doc.fontSize(10);
    doc.text(`Valor dos Serviços: R$ ${orcamento.valor_servicos.toFixed(2)}`);
    doc.text(`Valor das Peças: R$ ${orcamento.valor_pecas.toFixed(2)}`);
    if (orcamento.valor_desconto > 0) {
      doc.text(`Desconto: R$ ${orcamento.valor_desconto.toFixed(2)}`);
    }
    doc.fontSize(12).text(`VALOR TOTAL: R$ ${orcamento.valor_total.toFixed(2)}`, { bold: true });
    doc.moveDown();

    // Validade
    const dataValidade = new Date(orcamento.data_validade).toLocaleDateString('pt-BR');
    doc.fontSize(10).text(`Validade do Orçamento: ${dataValidade}`);
    doc.moveDown();

    // Observações
    if (orcamento.observacoes) {
      doc.fontSize(12).text('Observações', { underline: true });
      doc.fontSize(10).text(orcamento.observacoes);
      doc.moveDown();
    }

    // Rodapé
    doc.fontSize(8).text(`Orçamento gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });

    doc.end();

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Adicionar serviço ao orçamento
router.post('/:id/servicos', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { tipo_servico_id, descricao, quantidade, valor_unitario } = req.body;

    if (!tipo_servico_id || !valor_unitario) {
      return res.status(400).json({ error: 'Tipo de serviço e valor são obrigatórios' });
    }

    const stmt = db.prepare(`
      INSERT INTO orcamento_servicos (orcamento_id, tipo_servico_id, descricao, quantidade, valor_unitario)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(req.params.id, tipo_servico_id, descricao, quantidade || 1, valor_unitario);

    const orcamentoAtualizado = db.prepare('SELECT * FROM v_orcamentos_completos WHERE id = ?').get(req.params.id);

    res.json(orcamentoAtualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Adicionar peça ao orçamento
router.post('/:id/pecas', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { peca_id, quantidade, valor_unitario } = req.body;

    if (!peca_id || !quantidade || !valor_unitario) {
      return res.status(400).json({ error: 'Peça, quantidade e valor são obrigatórios' });
    }

    const stmt = db.prepare(`
      INSERT INTO orcamento_pecas (orcamento_id, peca_id, quantidade, valor_unitario)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(req.params.id, peca_id, quantidade, valor_unitario);

    const orcamentoAtualizado = db.prepare('SELECT * FROM v_orcamentos_completos WHERE id = ?').get(req.params.id);

    res.json(orcamentoAtualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// DELETE - Remover serviço do orçamento
router.delete('/:id/servicos/:servico_id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const stmt = db.prepare('DELETE FROM orcamento_servicos WHERE id = ? AND orcamento_id = ?');
    const result = stmt.run(req.params.servico_id, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Recalcular totais
    db.prepare(`
      UPDATE orcamentos
      SET valor_servicos = (SELECT COALESCE(SUM(valor_total), 0) FROM orcamento_servicos WHERE orcamento_id = ?),
          valor_total = valor_pecas + valor_servicos - valor_desconto
      WHERE id = ?
    `).run(req.params.id, req.params.id);

    res.json({ message: 'Serviço removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// DELETE - Remover peça do orçamento
router.delete('/:id/pecas/:peca_id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const stmt = db.prepare('DELETE FROM orcamento_pecas WHERE id = ? AND orcamento_id = ?');
    const result = stmt.run(req.params.peca_id, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Peça não encontrada' });
    }

    // Recalcular totais
    db.prepare(`
      UPDATE orcamentos
      SET valor_pecas = (SELECT COALESCE(SUM(valor_total), 0) FROM orcamento_pecas WHERE orcamento_id = ?),
          valor_total = valor_pecas + valor_servicos - valor_desconto
      WHERE id = ?
    `).run(req.params.id, req.params.id);

    res.json({ message: 'Peça removida com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
