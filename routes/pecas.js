const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');

// GET - Listar todas as peças
router.get('/', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { ativo, estoque_baixo, busca } = req.query;
    let query = 'SELECT * FROM pecas WHERE 1=1';
    const params = [];

    if (ativo !== undefined) {
      query += ' AND ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }

    if (estoque_baixo === 'true') {
      query += ' AND estoque_atual <= estoque_minimo';
    }

    if (busca) {
      query += ' AND (codigo LIKE ? OR nome LIKE ? OR marca LIKE ?)';
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    }

    query += ' ORDER BY nome';

    const pecas = db.prepare(query).all(...params);
    res.json(pecas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Buscar peça por ID
router.get('/:id', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const peca = db.prepare('SELECT * FROM pecas WHERE id = ?').get(req.params.id);
    
    if (!peca) {
      return res.status(404).json({ error: 'Peça não encontrada' });
    }

    res.json(peca);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Criar nova peça
router.post('/', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { codigo, nome, descricao, marca, preco_custo, preco_venda, estoque_atual, estoque_minimo, localizacao } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const stmt = db.prepare(`
      INSERT INTO pecas (codigo, nome, descricao, marca, preco_custo, preco_venda, estoque_atual, estoque_minimo, localizacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(codigo, nome, descricao, marca, preco_custo || 0, preco_venda || 0, estoque_atual || 0, estoque_minimo || 5, localizacao);

    const novaPeca = db.prepare('SELECT * FROM pecas WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(novaPeca);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Código já cadastrado' });
    }
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PUT - Atualizar peça
router.put('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { codigo, nome, descricao, marca, preco_custo, preco_venda, estoque_atual, estoque_minimo, localizacao, ativo } = req.body;

    const stmt = db.prepare(`
      UPDATE pecas
      SET codigo = ?, nome = ?, descricao = ?, marca = ?, preco_custo = ?, preco_venda = ?, estoque_atual = ?, estoque_minimo = ?, localizacao = ?, ativo = ?
      WHERE id = ?
    `);

    const result = stmt.run(codigo, nome, descricao, marca, preco_custo, preco_venda, estoque_atual, estoque_minimo, localizacao, ativo ? 1 : 0, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Peça não encontrada' });
    }

    const pecaAtualizada = db.prepare('SELECT * FROM pecas WHERE id = ?').get(req.params.id);

    res.json(pecaAtualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// DELETE - Desativar peça
router.delete('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const stmt = db.prepare('UPDATE pecas SET ativo = 0 WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Peça não encontrada' });
    }

    res.json({ message: 'Peça desativada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Alertas de estoque baixo
router.get('/alertas/estoque-baixo', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const pecas = db.prepare('SELECT * FROM v_pecas_estoque_baixo ORDER BY estoque_atual').all();
    res.json(pecas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
