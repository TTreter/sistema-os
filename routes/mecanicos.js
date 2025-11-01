const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');

// GET - Listar todos os mecânicos
router.get('/', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { ativo } = req.query;
    let query = 'SELECT * FROM mecanicos WHERE 1=1';
    const params = [];

    if (ativo !== undefined) {
      query += ' AND ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }

    query += ' ORDER BY nome';

    const mecanicos = db.prepare(query).all(...params);
    res.json(mecanicos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Buscar mecânico por ID
router.get('/:id', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const mecanico = db.prepare('SELECT * FROM mecanicos WHERE id = ?').get(req.params.id);
    
    if (!mecanico) {
      return res.status(404).json({ error: 'Mecânico não encontrado' });
    }

    res.json(mecanico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Criar novo mecânico
router.post('/', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { nome, cpf, telefone, especialidade, salario, comissao_percentual, data_admissao } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const stmt = db.prepare(`
      INSERT INTO mecanicos (nome, cpf, telefone, especialidade, salario, comissao_percentual, data_admissao)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(nome, cpf, telefone, especialidade, salario, comissao_percentual || 0, data_admissao);

    const novoMecanico = db.prepare('SELECT * FROM mecanicos WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(novoMecanico);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PUT - Atualizar mecânico
router.put('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { nome, cpf, telefone, especialidade, salario, comissao_percentual, data_admissao, ativo } = req.body;

    const stmt = db.prepare(`
      UPDATE mecanicos
      SET nome = ?, cpf = ?, telefone = ?, especialidade = ?, salario = ?, comissao_percentual = ?, data_admissao = ?, ativo = ?
      WHERE id = ?
    `);

    const result = stmt.run(nome, cpf, telefone, especialidade, salario, comissao_percentual, data_admissao, ativo ? 1 : 0, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Mecânico não encontrado' });
    }

    const mecanicoAtualizado = db.prepare('SELECT * FROM mecanicos WHERE id = ?').get(req.params.id);

    res.json(mecanicoAtualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// DELETE - Desativar mecânico
router.delete('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const stmt = db.prepare('UPDATE mecanicos SET ativo = 0 WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Mecânico não encontrado' });
    }

    res.json({ message: 'Mecânico desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
