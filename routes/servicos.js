const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');

// GET - Listar categorias de serviço
router.get('/categorias', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const categorias = db.prepare('SELECT * FROM categorias_servico WHERE ativo = 1 ORDER BY nome').all();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Listar tipos de serviço
router.get('/', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { categoria_id, ativo, busca } = req.query;
    let query = `
      SELECT ts.*, cs.nome AS categoria_nome
      FROM tipos_servico ts
      INNER JOIN categorias_servico cs ON ts.categoria_id = cs.id
      WHERE 1=1
    `;
    const params = [];

    if (categoria_id) {
      query += ' AND ts.categoria_id = ?';
      params.push(categoria_id);
    }

    if (ativo !== undefined) {
      query += ' AND ts.ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }

    if (busca) {
      query += ' AND (ts.nome LIKE ? OR ts.descricao LIKE ?)';
      params.push(`%${busca}%`, `%${busca}%`);
    }

    query += ' ORDER BY cs.nome, ts.nome';

    const servicos = db.prepare(query).all(...params);
    res.json(servicos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Buscar tipo de serviço por ID
router.get('/:id', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const servico = db.prepare(`
      SELECT ts.*, cs.nome AS categoria_nome
      FROM tipos_servico ts
      INNER JOIN categorias_servico cs ON ts.categoria_id = cs.id
      WHERE ts.id = ?
    `).get(req.params.id);
    
    if (!servico) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    res.json(servico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Criar novo tipo de serviço
router.post('/', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { categoria_id, nome, descricao, preco_padrao, tempo_estimado } = req.body;

    if (!categoria_id || !nome) {
      return res.status(400).json({ error: 'Categoria e nome são obrigatórios' });
    }

    const stmt = db.prepare(`
      INSERT INTO tipos_servico (categoria_id, nome, descricao, preco_padrao, tempo_estimado)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(categoria_id, nome, descricao, preco_padrao || 0, tempo_estimado || 60);

    const novoServico = db.prepare(`
      SELECT ts.*, cs.nome AS categoria_nome
      FROM tipos_servico ts
      INNER JOIN categorias_servico cs ON ts.categoria_id = cs.id
      WHERE ts.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(novoServico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PUT - Atualizar tipo de serviço
router.put('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { categoria_id, nome, descricao, preco_padrao, tempo_estimado, ativo } = req.body;

    const stmt = db.prepare(`
      UPDATE tipos_servico
      SET categoria_id = ?, nome = ?, descricao = ?, preco_padrao = ?, tempo_estimado = ?, ativo = ?
      WHERE id = ?
    `);

    const result = stmt.run(categoria_id, nome, descricao, preco_padrao, tempo_estimado, ativo ? 1 : 0, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    const servicoAtualizado = db.prepare(`
      SELECT ts.*, cs.nome AS categoria_nome
      FROM tipos_servico ts
      INNER JOIN categorias_servico cs ON ts.categoria_id = cs.id
      WHERE ts.id = ?
    `).get(req.params.id);

    res.json(servicoAtualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// DELETE - Desativar tipo de serviço
router.delete('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const stmt = db.prepare('UPDATE tipos_servico SET ativo = 0 WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    res.json({ message: 'Serviço desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
