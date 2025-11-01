const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');

// GET - Listar todos os veículos
router.get('/', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { cliente_id, placa } = req.query;
    let query = `
      SELECT v.*, c.nome AS cliente_nome
      FROM veiculos v
      INNER JOIN clientes c ON v.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (cliente_id) {
      query += ' AND v.cliente_id = ?';
      params.push(cliente_id);
    }

    if (placa) {
      query += ' AND v.placa LIKE ?';
      params.push(`%${placa}%`);
    }

    query += ' ORDER BY v.placa';

    const veiculos = db.prepare(query).all(...params);
    res.json(veiculos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Buscar veículo por ID
router.get('/:id', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const veiculo = db.prepare(`
      SELECT v.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone
      FROM veiculos v
      INNER JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = ?
    `).get(req.params.id);
    
    if (!veiculo) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    // Buscar histórico de OS do veículo
    const historico = db.prepare(`
      SELECT id, numero, status, data_abertura, data_conclusao, valor_total
      FROM ordens_servico
      WHERE veiculo_id = ?
      ORDER BY data_abertura DESC
    `).all(req.params.id);

    res.json({ ...veiculo, historico_os: historico });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Criar novo veículo
router.post('/', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { cliente_id, placa, modelo, marca, ano, cor, km_atual, chassis, observacoes } = req.body;

    if (!cliente_id || !placa || !modelo || !marca) {
      return res.status(400).json({ error: 'Cliente, placa, modelo e marca são obrigatórios' });
    }

    const stmt = db.prepare(`
      INSERT INTO veiculos (cliente_id, placa, modelo, marca, ano, cor, km_atual, chassis, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(cliente_id, placa.toUpperCase(), modelo, marca, ano, cor, km_atual, chassis, observacoes);

    const novoVeiculo = db.prepare(`
      SELECT v.*, c.nome AS cliente_nome
      FROM veiculos v
      INNER JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(novoVeiculo);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Placa já cadastrada' });
    }
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PUT - Atualizar veículo
router.put('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { cliente_id, placa, modelo, marca, ano, cor, km_atual, chassis, observacoes } = req.body;

    const stmt = db.prepare(`
      UPDATE veiculos
      SET cliente_id = ?, placa = ?, modelo = ?, marca = ?, ano = ?, cor = ?, km_atual = ?, chassis = ?, observacoes = ?
      WHERE id = ?
    `);

    const result = stmt.run(cliente_id, placa.toUpperCase(), modelo, marca, ano, cor, km_atual, chassis, observacoes, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    const veiculoAtualizado = db.prepare(`
      SELECT v.*, c.nome AS cliente_nome
      FROM veiculos v
      INNER JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = ?
    `).get(req.params.id);

    res.json(veiculoAtualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// DELETE - Remover veículo
router.delete('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    // Verificar se há OS vinculadas
    const osCount = db.prepare('SELECT COUNT(*) as total FROM ordens_servico WHERE veiculo_id = ?').get(req.params.id);

    if (osCount.total > 0) {
      return res.status(409).json({ error: 'Não é possível excluir veículo com ordens de serviço vinculadas' });
    }

    const stmt = db.prepare('DELETE FROM veiculos WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    res.json({ message: 'Veículo removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
