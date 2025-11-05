/**
 * ROTAS API - LEMBRETES DE MANUTENÇÃO
 * 
 * Sistema automático de lembretes para:
 * - Troca de óleo
 * - Revisões periódicas
 * - Alinhamento e balanceamento
 * - Troca de freios
 * - Outros serviços programados
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

function getDB() {
  return new Database(path.join(__dirname, '..', 'database', 'oficina.db'));
}

// ==========================================
// LISTAR LEMBRETES
// ==========================================

/**
 * GET /api/lembretes
 * Lista lembretes com filtros
 */
router.get('/', (req, res) => {
  const { status, veiculo_id, cliente_id, urgencia, limite = 50 } = req.query;
  const db = getDB();

  try {
    let query = `SELECT * FROM v_lembretes_vencidos WHERE 1=1`;
    const params = [];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (veiculo_id) {
      query += ` AND veiculo_id = ?`;
      params.push(veiculo_id);
    }

    if (cliente_id) {
      query += ` AND cliente_id = ?`;
      params.push(cliente_id);
    }

    if (urgencia) {
      query += ` AND urgencia = ?`;
      params.push(urgencia);
    }

    query += ` ORDER BY data_proxima ASC LIMIT ?`;
    params.push(parseInt(limite));

    const lembretes = db.prepare(query).all(...params);

    res.json({
      total: lembretes.length,
      lembretes
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

/**
 * GET /api/lembretes/vencidos
 * Lista apenas lembretes vencidos ou próximos do vencimento
 */
router.get('/vencidos', (req, res) => {
  const db = getDB();

  try {
    const lembretes = db.prepare(`
      SELECT * FROM v_lembretes_vencidos
      WHERE urgencia IN ('VENCIDO', 'PROXIMO')
      AND status IN ('PENDENTE', 'ENVIADO')
      ORDER BY 
        CASE urgencia
          WHEN 'VENCIDO' THEN 1
          WHEN 'PROXIMO' THEN 2
        END,
        data_proxima ASC
    `).all();

    res.json({
      total: lembretes.length,
      lembretes
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// BUSCAR LEMBRETE ESPECÍFICO
// ==========================================

/**
 * GET /api/lembretes/:id
 * Busca lembrete por ID
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();

  try {
    const lembrete = db.prepare(`
      SELECT * FROM v_lembretes_vencidos WHERE id = ?
    `).get(id);

    if (!lembrete) {
      return res.status(404).json({ error: 'Lembrete não encontrado' });
    }

    res.json(lembrete);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// CRIAR LEMBRETE
// ==========================================

/**
 * POST /api/lembretes
 * Cria novo lembrete de manutenção
 */
router.post('/', (req, res) => {
  const { veiculo_id, cliente_id, tipo, descricao, km_atual, km_proximo, data_proxima, prioridade, observacoes } = req.body;
  const db = getDB();

  try {
    // Validações
    if (!veiculo_id || !cliente_id || !tipo || !descricao) {
      return res.status(400).json({ error: 'Campos obrigatórios: veiculo_id, cliente_id, tipo, descricao' });
    }

    if (!data_proxima && !km_proximo) {
      return res.status(400).json({ error: 'Informe data_proxima ou km_proximo' });
    }

    const insert = db.prepare(`
      INSERT INTO lembretes (
        veiculo_id, cliente_id, tipo, descricao, 
        km_atual, km_proximo, data_proxima, prioridade, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      veiculo_id,
      cliente_id,
      tipo,
      descricao,
      km_atual,
      km_proximo,
      data_proxima,
      prioridade || 'MEDIA',
      observacoes
    );

    // Registrar no histórico do cliente
    db.prepare(`
      INSERT INTO clientes_historico (cliente_id, tipo, descricao, referencia_id, referencia_tabela)
      VALUES (?, 'LEMBRETE_CRIADO', ?, ?, 'lembretes')
    `).run(cliente_id, `Lembrete criado: ${tipo} - ${descricao}`, result.lastInsertRowid);

    const lembrete = db.prepare(`
      SELECT * FROM lembretes WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(lembrete);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// ATUALIZAR LEMBRETE
// ==========================================

/**
 * PUT /api/lembretes/:id
 * Atualiza lembrete existente
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { tipo, descricao, km_atual, km_proximo, data_proxima, prioridade, observacoes } = req.body;
  const db = getDB();

  try {
    const update = db.prepare(`
      UPDATE lembretes
      SET 
        tipo = COALESCE(?, tipo),
        descricao = COALESCE(?, descricao),
        km_atual = COALESCE(?, km_atual),
        km_proximo = COALESCE(?, km_proximo),
        data_proxima = COALESCE(?, data_proxima),
        prioridade = COALESCE(?, prioridade),
        observacoes = COALESCE(?, observacoes)
      WHERE id = ?
    `);

    const result = update.run(tipo, descricao, km_atual, km_proximo, data_proxima, prioridade, observacoes, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lembrete não encontrado' });
    }

    const lembrete = db.prepare(`
      SELECT * FROM lembretes WHERE id = ?
    `).get(id);

    res.json(lembrete);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// ATUALIZAR STATUS DO LEMBRETE
// ==========================================

/**
 * PATCH /api/lembretes/:id/status
 * Atualiza status do lembrete
 */
router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = getDB();

  try {
    if (!status) {
      return res.status(400).json({ error: 'Campo status é obrigatório' });
    }

    const validStatus = ['PENDENTE', 'ENVIADO', 'AGENDADO', 'CONCLUIDO', 'IGNORADO'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ error: `Status deve ser um de: ${validStatus.join(', ')}` });
    }

    const update = db.prepare(`
      UPDATE lembretes
      SET status = ?
      WHERE id = ?
    `);

    const result = update.run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lembrete não encontrado' });
    }

    // Se foi concluído, registrar no histórico
    if (status === 'CONCLUIDO') {
      const lembrete = db.prepare('SELECT * FROM lembretes WHERE id = ?').get(id);
      db.prepare(`
        INSERT INTO clientes_historico (cliente_id, tipo, descricao, referencia_id, referencia_tabela)
        VALUES (?, 'LEMBRETE_CONCLUIDO', ?, ?, 'lembretes')
      `).run(lembrete.cliente_id, `Lembrete concluído: ${lembrete.tipo}`, id);
    }

    const lembrete = db.prepare(`
      SELECT * FROM lembretes WHERE id = ?
    `).get(id);

    res.json(lembrete);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// ENVIAR LEMBRETE
// ==========================================

/**
 * POST /api/lembretes/:id/enviar
 * Marca lembrete como enviado e registra o envio
 */
router.post('/:id/enviar', (req, res) => {
  const { id } = req.params;
  const { meio = 'WHATSAPP' } = req.body; // WHATSAPP, SMS, EMAIL
  const db = getDB();

  try {
    // Buscar lembrete
    const lembrete = db.prepare(`
      SELECT l.*, c.nome AS cliente_nome, c.telefone, c.email
      FROM lembretes l
      INNER JOIN clientes c ON l.cliente_id = c.id
      WHERE l.id = ?
    `).get(id);

    if (!lembrete) {
      return res.status(404).json({ error: 'Lembrete não encontrado' });
    }

    // Atualizar lembrete
    db.prepare(`
      UPDATE lembretes
      SET 
        status = 'ENVIADO',
        ultimo_envio = CURRENT_TIMESTAMP,
        total_envios = total_envios + 1
      WHERE id = ?
    `).run(id);

    // Registrar notificação
    const destinatario = meio === 'EMAIL' ? lembrete.email : lembrete.telefone;
    const mensagem = `Olá ${lembrete.cliente_nome}! Lembrete: ${lembrete.descricao}. Agende agora mesmo!`;

    db.prepare(`
      INSERT INTO notificacoes (cliente_id, tipo, meio, destinatario, mensagem, referencia_id, referencia_tabela)
      VALUES (?, 'LEMBRETE', ?, ?, ?, ?, 'lembretes')
    `).run(lembrete.cliente_id, meio, destinatario, mensagem, id);

    // Registrar no histórico
    db.prepare(`
      INSERT INTO clientes_historico (cliente_id, tipo, descricao, referencia_id, referencia_tabela)
      VALUES (?, 'LEMBRETE_ENVIADO', ?, ?, 'lembretes')
    `).run(lembrete.cliente_id, `Lembrete enviado via ${meio}: ${lembrete.tipo}`, id);

    const lembreteAtualizado = db.prepare(`
      SELECT * FROM lembretes WHERE id = ?
    `).get(id);

    res.json({
      lembrete: lembreteAtualizado,
      mensagem: 'Lembrete enviado com sucesso',
      meio
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// CRIAR LEMBRETES AUTOMÁTICOS
// ==========================================

/**
 * POST /api/lembretes/auto-criar
 * Cria lembretes automáticos baseados na última OS
 */
router.post('/auto-criar', (req, res) => {
  const { os_id } = req.body;
  const db = getDB();

  try {
    // Buscar OS
    const os = db.prepare(`
      SELECT * FROM ordens_servico WHERE id = ?
    `).get(os_id);

    if (!os) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    if (os.status !== 'FINALIZADA') {
      return res.status(400).json({ error: 'OS deve estar finalizada' });
    }

    // Buscar veículo
    const veiculo = db.prepare(`
      SELECT * FROM veiculos WHERE id = ?
    `).get(os.veiculo_id);

    const lembretesCriados = [];

    // Verificar serviços executados e criar lembretes
    const servicos = db.prepare(`
      SELECT s.nome, s.categoria
      FROM os_servicos oss
      INNER JOIN servicos s ON oss.servico_id = s.id
      WHERE oss.os_id = ?
    `).all(os_id);

    const kmAtual = veiculo.km_atual || 0;

    servicos.forEach(servico => {
      let tipo = 'OUTROS';
      let descricao = '';
      let kmProximo = null;
      let dataProxima = null;
      let prioridade = 'MEDIA';

      // Definir lembretes baseados no serviço
      if (servico.categoria === 'PREVENTIVA' || servico.nome.toLowerCase().includes('óleo')) {
        tipo = 'TROCA_OLEO';
        descricao = 'Troca de óleo e filtro';
        kmProximo = kmAtual + 10000; // 10.000 km
        dataProxima = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 6 meses
        prioridade = 'ALTA';
      } else if (servico.nome.toLowerCase().includes('revisão')) {
        tipo = 'REVISAO';
        descricao = 'Revisão periódica programada';
        kmProximo = kmAtual + 15000; // 15.000 km
        dataProxima = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 ano
        prioridade = 'ALTA';
      } else if (servico.nome.toLowerCase().includes('alinhamento') || servico.nome.toLowerCase().includes('balanceamento')) {
        tipo = 'ALINHAMENTO';
        descricao = 'Alinhamento e balanceamento';
        kmProximo = kmAtual + 20000; // 20.000 km
        dataProxima = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 6 meses
        prioridade = 'MEDIA';
      } else if (servico.nome.toLowerCase().includes('freio')) {
        tipo = 'FREIOS';
        descricao = 'Verificação do sistema de freios';
        kmProximo = kmAtual + 30000; // 30.000 km
        dataProxima = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 ano
        prioridade = 'ALTA';
      }

      // Verificar se já existe lembrete similar pendente
      const existente = db.prepare(`
        SELECT id FROM lembretes
        WHERE veiculo_id = ? AND tipo = ? AND status IN ('PENDENTE', 'ENVIADO')
      `).get(os.veiculo_id, tipo);

      if (!existente && (kmProximo || dataProxima)) {
        const insert = db.prepare(`
          INSERT INTO lembretes (
            veiculo_id, cliente_id, tipo, descricao,
            km_atual, km_proximo, data_proxima, prioridade,
            observacoes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insert.run(
          os.veiculo_id,
          os.cliente_id,
          tipo,
          descricao,
          kmAtual,
          kmProximo,
          dataProxima,
          prioridade,
          `Criado automaticamente após OS ${os.numero}`
        );

        lembretesCriados.push({
          id: result.lastInsertRowid,
          tipo,
          descricao,
          km_proximo: kmProximo,
          data_proxima: dataProxima
        });
      }
    });

    if (lembretesCriados.length > 0) {
      // Registrar no histórico
      db.prepare(`
        INSERT INTO clientes_historico (cliente_id, tipo, descricao, referencia_id, referencia_tabela)
        VALUES (?, 'LEMBRETES_AUTO_CRIADOS', ?, ?, 'ordens_servico')
      `).run(os.cliente_id, `${lembretesCriados.length} lembrete(s) criado(s) automaticamente`, os_id);
    }

    res.json({
      mensagem: `${lembretesCriados.length} lembrete(s) criado(s) automaticamente`,
      lembretes: lembretesCriados
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// DELETAR LEMBRETE
// ==========================================

/**
 * DELETE /api/lembretes/:id
 * Remove um lembrete
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();

  try {
    const del = db.prepare(`DELETE FROM lembretes WHERE id = ?`);
    const result = del.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lembrete não encontrado' });
    }

    res.json({ mensagem: 'Lembrete removido com sucesso' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
