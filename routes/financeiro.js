const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');

// ==================== CONTAS A RECEBER ====================

// GET - Listar contas a receber
router.get('/contas-receber', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { status, data_inicio, data_fim, atrasadas } = req.query;
    let query = 'SELECT * FROM v_contas_receber WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (atrasadas === 'true') {
      query += ' AND atrasado = 1';
    }

    if (data_inicio) {
      query += ' AND DATE(data_vencimento) >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ' AND DATE(data_vencimento) <= ?';
      params.push(data_fim);
    }

    query += ' ORDER BY data_vencimento';

    const contas = db.prepare(query).all(...params);
    res.json(contas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Criar conta a receber
router.post('/contas-receber', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { os_id, cliente_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento } = req.body;

    const stmt = db.prepare(`
      INSERT INTO contas_receber (os_id, cliente_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(os_id, cliente_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento);

    const novaConta = db.prepare('SELECT * FROM v_contas_receber WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(novaConta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PATCH - Receber conta
router.patch('/contas-receber/:id/receber', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { data_recebimento, forma_recebimento } = req.body;

    const stmt = db.prepare(`
      UPDATE contas_receber
      SET status = 'RECEBIDO', data_recebimento = ?, forma_recebimento = ?
      WHERE id = ?
    `);

    const result = stmt.run(data_recebimento || new Date().toISOString().split('T')[0], forma_recebimento, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const contaAtualizada = db.prepare('SELECT * FROM v_contas_receber WHERE id = ?').get(req.params.id);
    res.json(contaAtualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==================== CONTAS A PAGAR ====================

// GET - Listar contas a pagar
router.get('/contas-pagar', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { status, data_inicio, data_fim, atrasadas } = req.query;
    let query = 'SELECT * FROM v_contas_pagar WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (atrasadas === 'true') {
      query += ' AND atrasado = 1';
    }

    if (data_inicio) {
      query += ' AND DATE(data_vencimento) >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ' AND DATE(data_vencimento) <= ?';
      params.push(data_fim);
    }

    query += ' ORDER BY data_vencimento';

    const contas = db.prepare(query).all(...params);
    res.json(contas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Criar conta a pagar
router.post('/contas-pagar', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { oc_id, fornecedor_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento } = req.body;

    const stmt = db.prepare(`
      INSERT INTO contas_pagar (oc_id, fornecedor_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(oc_id, fornecedor_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento);

    const novaConta = db.prepare('SELECT * FROM v_contas_pagar WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(novaConta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PATCH - Pagar conta
router.patch('/contas-pagar/:id/pagar', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { data_pagamento, forma_pagamento } = req.body;

    const stmt = db.prepare(`
      UPDATE contas_pagar
      SET status = 'PAGO', data_pagamento = ?, forma_pagamento = ?
      WHERE id = ?
    `);

    const result = stmt.run(data_pagamento || new Date().toISOString().split('T')[0], forma_pagamento, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const contaAtualizada = db.prepare('SELECT * FROM v_contas_pagar WHERE id = ?').get(req.params.id);
    res.json(contaAtualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==================== FLUXO DE CAIXA ====================

// GET - Fluxo de caixa consolidado
router.get('/fluxo-caixa', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { data_inicio, data_fim } = req.query;
    let query = 'SELECT * FROM v_fluxo_caixa_consolidado WHERE 1=1';
    const params = [];

    if (data_inicio) {
      query += ' AND data >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ' AND data <= ?';
      params.push(data_fim);
    }

    query += ' ORDER BY data';

    const fluxo = db.prepare(query).all(...params);

    // Calcular saldo acumulado
    let saldoAcumulado = 0;
    const fluxoComSaldo = fluxo.map(item => {
      saldoAcumulado += item.saldo_dia;
      return { ...item, saldo_acumulado: saldoAcumulado };
    });

    res.json(fluxoComSaldo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Resumo financeiro
router.get('/resumo', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    // Contas a receber
    const receber = db.prepare(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'ABERTO') as qtd_aberto,
        COALESCE(SUM(valor) FILTER (WHERE status = 'ABERTO'), 0) as valor_aberto,
        COUNT(*) FILTER (WHERE atrasado = 1) as qtd_atrasado,
        COALESCE(SUM(valor) FILTER (WHERE atrasado = 1), 0) as valor_atrasado
      FROM v_contas_receber
    `).get();

    // Contas a pagar
    const pagar = db.prepare(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'ABERTO') as qtd_aberto,
        COALESCE(SUM(valor) FILTER (WHERE status = 'ABERTO'), 0) as valor_aberto,
        COUNT(*) FILTER (WHERE atrasado = 1) as qtd_atrasado,
        COALESCE(SUM(valor) FILTER (WHERE atrasado = 1), 0) as valor_atrasado
      FROM v_contas_pagar
    `).get();

    // Fluxo do mês
    const mesAtual = new Date().toISOString().slice(0, 7);
    const fluxoMes = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE 0 END), 0) as entradas,
        COALESCE(SUM(CASE WHEN tipo = 'SAIDA' THEN valor ELSE 0 END), 0) as saidas
      FROM fluxo_caixa
      WHERE strftime('%Y-%m', data) = ?
    `).get(mesAtual);

    res.json({
      contas_receber: receber,
      contas_pagar: pagar,
      fluxo_mes_atual: {
        ...fluxoMes,
        saldo: fluxoMes.entradas - fluxoMes.saidas
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
