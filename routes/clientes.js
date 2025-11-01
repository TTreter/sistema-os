const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');

// GET - Listar todos os clientes
router.get('/', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { ativo, busca } = req.query;
    let query = 'SELECT * FROM clientes WHERE 1=1';
    const params = [];

    if (ativo !== undefined) {
      query += ' AND ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }

    if (busca) {
      query += ' AND (nome LIKE ? OR cpf_cnpj LIKE ? OR telefone LIKE ?)';
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    }

    query += ' ORDER BY nome';

    const clientes = db.prepare(query).all(...params);
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Buscar cliente por ID
router.get('/:id', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Buscar veículos do cliente
    const veiculos = db.prepare('SELECT * FROM veiculos WHERE cliente_id = ?').all(req.params.id);

    res.json({ ...cliente, veiculos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Criar novo cliente
router.post('/', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep, observacoes } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    const stmt = db.prepare(`
      INSERT INTO clientes (nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep, observacoes);

    const novoCliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(novoCliente);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'CPF/CNPJ já cadastrado' });
    }
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PUT - Atualizar cliente
router.put('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep, observacoes, ativo } = req.body;

    const stmt = db.prepare(`
      UPDATE clientes
      SET nome = ?, cpf_cnpj = ?, telefone = ?, email = ?, endereco = ?, cidade = ?, estado = ?, cep = ?, observacoes = ?, ativo = ?
      WHERE id = ?
    `);

    const result = stmt.run(nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep, observacoes, ativo ? 1 : 0, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const clienteAtualizado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);

    res.json(clienteAtualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// DELETE - Desativar cliente (soft delete)
router.delete('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const stmt = db.prepare('UPDATE clientes SET ativo = 0 WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ message: 'Cliente desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
