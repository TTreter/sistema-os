const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');

// GET - Listar todos os fornecedores
router.get('/', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { ativo, busca } = req.query;
    let query = 'SELECT * FROM fornecedores WHERE 1=1';
    const params = [];

    if (ativo !== undefined) {
      query += ' AND ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }

    if (busca) {
      query += ' AND (nome LIKE ? OR cnpj LIKE ?)';
      params.push(`%${busca}%`, `%${busca}%`);
    }

    query += ' ORDER BY nome';

    const fornecedores = db.prepare(query).all(...params);
    res.json(fornecedores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Buscar fornecedor por ID
router.get('/:id', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const fornecedor = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id);
    
    if (!fornecedor) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    res.json(fornecedor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Criar novo fornecedor
router.post('/', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { nome, cnpj, telefone, email, endereco, cidade, estado, contato_responsavel, observacoes } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const stmt = db.prepare(`
      INSERT INTO fornecedores (nome, cnpj, telefone, email, endereco, cidade, estado, contato_responsavel, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(nome, cnpj, telefone, email, endereco, cidade, estado, contato_responsavel, observacoes);

    const novoFornecedor = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(novoFornecedor);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'CNPJ já cadastrado' });
    }
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PUT - Atualizar fornecedor
router.put('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { nome, cnpj, telefone, email, endereco, cidade, estado, contato_responsavel, observacoes, ativo } = req.body;

    const stmt = db.prepare(`
      UPDATE fornecedores
      SET nome = ?, cnpj = ?, telefone = ?, email = ?, endereco = ?, cidade = ?, estado = ?, contato_responsavel = ?, observacoes = ?, ativo = ?
      WHERE id = ?
    `);

    const result = stmt.run(nome, cnpj, telefone, email, endereco, cidade, estado, contato_responsavel, observacoes, ativo ? 1 : 0, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    const fornecedorAtualizado = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id);

    res.json(fornecedorAtualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// DELETE - Desativar fornecedor
router.delete('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const stmt = db.prepare('UPDATE fornecedores SET ativo = 0 WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    res.json({ message: 'Fornecedor desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
