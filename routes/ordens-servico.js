const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/oficina.db');

// Configurar upload de fotos do checklist
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'checklist-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas'));
  }
});

// Função auxiliar para gerar número da OS
function gerarNumeroOS(db) {
  const ano = new Date().getFullYear();
  const ultimaOS = db.prepare('SELECT numero FROM ordens_servico ORDER BY id DESC LIMIT 1').get();
  
  if (!ultimaOS) {
    return `OS${ano}-0001`;
  }
  
  const ultimoNumero = parseInt(ultimaOS.numero.split('-')[1]);
  const novoNumero = String(ultimoNumero + 1).padStart(4, '0');
  
  return `OS${ano}-${novoNumero}`;
}

// GET - Listar OS (com filtros e paginação)
router.get('/', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const { status, cliente_id, veiculo_id, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM v_os_completa WHERE 1=1';
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

    if (data_inicio) {
      query += ' AND DATE(data_abertura) >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ' AND DATE(data_abertura) <= ?';
      params.push(data_fim);
    }

    query += ' ORDER BY data_abertura DESC';
    
    // Paginação
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const ordens = db.prepare(query).all(...params);

    // Contar total de registros
    let countQuery = 'SELECT COUNT(*) as total FROM ordens_servico WHERE 1=1';
    const countParams = [];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      data: ordens,
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

// GET - Buscar OS do Kanban (abertas)
router.get('/kanban', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const ordens = db.prepare('SELECT * FROM v_os_kanban ORDER BY data_abertura').all();

    // Organizar por status
    const kanban = {
      AGUARDANDO_DIAGNOSTICO: [],
      AGUARDANDO_APROVACAO: [],
      EM_REPARO: [],
      PRONTO_RETIRADA: []
    };

    ordens.forEach(os => {
      if (kanban[os.status]) {
        kanban[os.status].push(os);
      }
    });

    res.json(kanban);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// GET - Buscar OS por ID (com detalhes completos)
router.get('/:id', (req, res) => {
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const os = db.prepare('SELECT * FROM v_os_completa WHERE id = ?').get(req.params.id);
    
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    // Buscar serviços da OS
    const servicos = db.prepare(`
      SELECT oss.*, ts.nome AS servico_nome, cs.nome AS categoria_nome
      FROM os_servicos oss
      INNER JOIN tipos_servico ts ON oss.tipo_servico_id = ts.id
      INNER JOIN categorias_servico cs ON ts.categoria_id = cs.id
      WHERE oss.os_id = ?
    `).all(req.params.id);

    // Buscar peças da OS
    const pecas = db.prepare(`
      SELECT osp.*, p.nome AS peca_nome, p.codigo AS peca_codigo
      FROM os_pecas osp
      INNER JOIN pecas p ON osp.peca_id = p.id
      WHERE osp.os_id = ?
    `).all(req.params.id);

    // Buscar checklist
    const checklist = db.prepare('SELECT * FROM checklist_entrada WHERE os_id = ?').all(req.params.id);

    // Buscar histórico de comunicação
    const historico = db.prepare('SELECT * FROM historico_comunicacao WHERE os_id = ? ORDER BY data_hora DESC').all(req.params.id);

    res.json({
      ...os,
      servicos,
      pecas,
      checklist,
      historico
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Criar nova OS
router.post('/', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { cliente_id, veiculo_id, mecanico_id, data_prevista, km_entrada, problema_reportado, observacoes } = req.body;

    if (!cliente_id || !veiculo_id) {
      return res.status(400).json({ error: 'Cliente e veículo são obrigatórios' });
    }

    const numero = gerarNumeroOS(db);

    const stmt = db.prepare(`
      INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, mecanico_id, data_prevista, km_entrada, problema_reportado, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(numero, cliente_id, veiculo_id, mecanico_id, data_prevista, km_entrada, problema_reportado, observacoes);

    // Registrar no histórico
    db.prepare(`
      INSERT INTO historico_comunicacao (os_id, tipo, mensagem)
      VALUES (?, 'SISTEMA', ?)
    `).run(result.lastInsertRowid, `OS ${numero} criada`);

    const novaOS = db.prepare('SELECT * FROM v_os_completa WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(novaOS);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PUT - Atualizar OS
router.put('/:id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { mecanico_id, data_prevista, diagnostico, observacoes, valor_desconto } = req.body;

    const stmt = db.prepare(`
      UPDATE ordens_servico
      SET mecanico_id = ?, data_prevista = ?, diagnostico = ?, observacoes = ?, valor_desconto = ?,
          valor_total = valor_pecas + valor_servicos - ?
      WHERE id = ?
    `);

    const result = stmt.run(mecanico_id, data_prevista, diagnostico, observacoes, valor_desconto || 0, valor_desconto || 0, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    const osAtualizada = db.prepare('SELECT * FROM v_os_completa WHERE id = ?').get(req.params.id);

    res.json(osAtualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// PATCH - Atualizar status da OS
router.patch('/:id/status', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const validStatuses = ['AGUARDANDO_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'EM_REPARO', 'PRONTO_RETIRADA', 'FINALIZADA', 'CANCELADA'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    // Se finalizando, registrar data de conclusão
    let query = 'UPDATE ordens_servico SET status = ?';
    const params = [status];
    
    if (status === 'FINALIZADA') {
      query += ', data_conclusao = CURRENT_TIMESTAMP';
    }
    
    query += ' WHERE id = ?';
    params.push(req.params.id);

    const stmt = db.prepare(query);
    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    // Registrar no histórico
    const os = db.prepare('SELECT numero FROM ordens_servico WHERE id = ?').get(req.params.id);
    db.prepare(`
      INSERT INTO historico_comunicacao (os_id, tipo, mensagem)
      VALUES (?, 'SISTEMA', ?)
    `).run(req.params.id, `Status alterado para: ${status}`);

    const osAtualizada = db.prepare('SELECT * FROM v_os_completa WHERE id = ?').get(req.params.id);

    res.json(osAtualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Adicionar serviço à OS
router.post('/:id/servicos', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { tipo_servico_id, descricao, quantidade, valor_unitario } = req.body;

    if (!tipo_servico_id || !valor_unitario) {
      return res.status(400).json({ error: 'Tipo de serviço e valor são obrigatórios' });
    }

    const stmt = db.prepare(`
      INSERT INTO os_servicos (os_id, tipo_servico_id, descricao, quantidade, valor_unitario)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(req.params.id, tipo_servico_id, descricao, quantidade || 1, valor_unitario);

    const osAtualizada = db.prepare('SELECT * FROM v_os_completa WHERE id = ?').get(req.params.id);

    res.json(osAtualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Adicionar peça à OS
router.post('/:id/pecas', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { peca_id, quantidade, valor_unitario } = req.body;

    if (!peca_id || !quantidade || !valor_unitario) {
      return res.status(400).json({ error: 'Peça, quantidade e valor são obrigatórios' });
    }

    // Verificar estoque disponível
    const peca = db.prepare('SELECT estoque_atual, nome FROM pecas WHERE id = ?').get(peca_id);
    
    if (!peca) {
      return res.status(404).json({ error: 'Peça não encontrada' });
    }

    if (peca.estoque_atual < quantidade) {
      return res.status(400).json({ error: `Estoque insuficiente. Disponível: ${peca.estoque_atual}` });
    }

    const stmt = db.prepare(`
      INSERT INTO os_pecas (os_id, peca_id, quantidade, valor_unitario)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(req.params.id, peca_id, quantidade, valor_unitario);

    const osAtualizada = db.prepare('SELECT * FROM v_os_completa WHERE id = ?').get(req.params.id);

    res.json(osAtualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// DELETE - Remover serviço da OS
router.delete('/:id/servicos/:servico_id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const stmt = db.prepare('DELETE FROM os_servicos WHERE id = ? AND os_id = ?');
    const result = stmt.run(req.params.servico_id, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Recalcular totais
    db.prepare(`
      UPDATE ordens_servico
      SET valor_servicos = (SELECT COALESCE(SUM(valor_total), 0) FROM os_servicos WHERE os_id = ?),
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

// DELETE - Remover peça da OS
router.delete('/:id/pecas/:peca_id', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    // Antes de remover, restaurar o estoque
    const osPeca = db.prepare('SELECT peca_id, quantidade FROM os_pecas WHERE id = ? AND os_id = ?').get(req.params.peca_id, req.params.id);
    
    if (!osPeca) {
      return res.status(404).json({ error: 'Peça não encontrada' });
    }

    // Restaurar estoque
    db.prepare('UPDATE pecas SET estoque_atual = estoque_atual + ? WHERE id = ?').run(osPeca.quantidade, osPeca.peca_id);

    // Remover peça da OS
    db.prepare('DELETE FROM os_pecas WHERE id = ? AND os_id = ?').run(req.params.peca_id, req.params.id);

    // Recalcular totais
    db.prepare(`
      UPDATE ordens_servico
      SET valor_pecas = (SELECT COALESCE(SUM(valor_total), 0) FROM os_pecas WHERE os_id = ?),
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

// POST - Adicionar item ao checklist
router.post('/:id/checklist', upload.single('foto'), (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { item, status, observacao } = req.body;
    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!item) {
      return res.status(400).json({ error: 'Item é obrigatório' });
    }

    const stmt = db.prepare(`
      INSERT INTO checklist_entrada (os_id, item, status, observacao, foto_url)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(req.params.id, item, status || 'NAO_VERIFICADO', observacao, foto_url);

    res.json({ message: 'Item adicionado ao checklist com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// POST - Adicionar comunicação ao histórico
router.post('/:id/comunicacao', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const { tipo, mensagem, enviado_por } = req.body;

    if (!tipo || !mensagem) {
      return res.status(400).json({ error: 'Tipo e mensagem são obrigatórios' });
    }

    const stmt = db.prepare(`
      INSERT INTO historico_comunicacao (os_id, tipo, mensagem, enviado_por)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(req.params.id, tipo, mensagem, enviado_por);

    res.json({ message: 'Comunicação registrada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
