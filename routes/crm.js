/**
 * ROTAS API - CRM (Customer Relationship Management)
 * 
 * Gestão de relacionamento com clientes:
 * - Histórico completo do cliente (360°)
 * - Perfil detalhado com estatísticas
 * - Análise de retenção
 * - Preferências de comunicação
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

function getDB() {
  return new Database(path.join(__dirname, '..', 'database', 'oficina.db'));
}

// ==========================================
// PERFIL 360° DO CLIENTE
// ==========================================

/**
 * GET /api/crm/clientes/:id/perfil-360
 * Retorna visão completa do cliente com todas as informações relevantes
 */
router.get('/clientes/:id/perfil-360', (req, res) => {
  const { id } = req.params;
  const db = getDB();

  try {
    // Buscar perfil completo
    const perfil = db.prepare(`
      SELECT * FROM v_clientes_perfil_360
      WHERE id = ?
    `).get(id);

    if (!perfil) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Buscar veículos do cliente
    const veiculos = db.prepare(`
      SELECT * FROM veiculos WHERE cliente_id = ? ORDER BY id DESC
    `).all(id);

    // Buscar últimas OS
    const ultimasOS = db.prepare(`
      SELECT id, numero, data_abertura, data_fechamento, status, valor_total
      FROM ordens_servico
      WHERE cliente_id = ?
      ORDER BY data_abertura DESC
      LIMIT 10
    `).all(id);

    // Buscar últimas pesquisas de satisfação
    const pesquisas = db.prepare(`
      SELECT 
        ps.*,
        os.numero AS os_numero
      FROM pesquisas_satisfacao ps
      LEFT JOIN ordens_servico os ON ps.os_id = os.id
      WHERE ps.cliente_id = ?
      ORDER BY ps.criado_em DESC
      LIMIT 5
    `).all(id);

    // Buscar lembretes pendentes
    const lembretes = db.prepare(`
      SELECT 
        l.*,
        v.placa AS veiculo_placa,
        v.modelo AS veiculo_modelo
      FROM lembretes l
      LEFT JOIN veiculos v ON l.veiculo_id = v.id
      WHERE l.cliente_id = ? AND l.status IN ('PENDENTE', 'ENVIADO')
      ORDER BY l.data_proxima ASC
    `).all(id);

    // Buscar preferências
    const preferencias = db.prepare(`
      SELECT * FROM clientes_preferencias WHERE cliente_id = ?
    `).get(id);

    res.json({
      perfil,
      veiculos,
      ultimas_os: ultimasOS,
      pesquisas_satisfacao: pesquisas,
      lembretes_pendentes: lembretes,
      preferencias: preferencias || {
        receber_lembretes: true,
        receber_promocoes: true,
        receber_pesquisas: true,
        meio_preferencial: 'WHATSAPP'
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// HISTÓRICO DO CLIENTE
// ==========================================

/**
 * GET /api/crm/clientes/:id/historico
 * Lista todo o histórico de interações do cliente
 */
router.get('/clientes/:id/historico', (req, res) => {
  const { id } = req.params;
  const { limite = 50, tipo } = req.query;
  const db = getDB();

  try {
    let query = `
      SELECT * FROM v_clientes_historico_completo
      WHERE cliente_id = ?
    `;
    const params = [id];

    if (tipo) {
      query += ` AND tipo = ?`;
      params.push(tipo);
    }

    query += ` LIMIT ?`;
    params.push(parseInt(limite));

    const historico = db.prepare(query).all(...params);

    res.json({
      cliente_id: id,
      total: historico.length,
      historico
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

/**
 * POST /api/crm/clientes/:id/historico
 * Adiciona entrada manual ao histórico do cliente
 */
router.post('/clientes/:id/historico', (req, res) => {
  const { id } = req.params;
  const { tipo, descricao, usuario, observacoes } = req.body;
  const db = getDB();

  try {
    const insert = db.prepare(`
      INSERT INTO clientes_historico (cliente_id, tipo, descricao, usuario, observacoes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(id, tipo, descricao, usuario || 'Sistema', observacoes);

    res.status(201).json({
      id: result.lastInsertRowid,
      cliente_id: id,
      tipo,
      descricao,
      data_hora: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// ANÁLISE DE RETENÇÃO
// ==========================================

/**
 * GET /api/crm/retencao
 * Análise de retenção de clientes por status
 */
router.get('/retencao', (req, res) => {
  const { status } = req.query;
  const db = getDB();

  try {
    let query = `SELECT * FROM v_analise_retencao`;
    const params = [];

    if (status) {
      query += ` WHERE status_retencao = ?`;
      params.push(status);
    }

    query += ` ORDER BY dias_sem_visita DESC`;

    const clientes = db.prepare(query).all(...params);

    // Estatísticas gerais
    const estatisticas = db.prepare(`
      SELECT 
        status_retencao,
        COUNT(*) AS total_clientes,
        SUM(valor_total_historico) AS valor_total,
        ROUND(AVG(ticket_medio), 2) AS ticket_medio_grupo
      FROM v_analise_retencao
      GROUP BY status_retencao
      ORDER BY 
        CASE status_retencao
          WHEN 'ATIVO' THEN 1
          WHEN 'EM_RISCO' THEN 2
          WHEN 'INATIVO' THEN 3
          WHEN 'PERDIDO' THEN 4
          ELSE 5
        END
    `).all();

    res.json({
      clientes,
      estatisticas
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

/**
 * GET /api/crm/clientes/:id/risco-perda
 * Avalia o risco de perda de um cliente específico
 */
router.get('/clientes/:id/risco-perda', (req, res) => {
  const { id } = req.params;
  const db = getDB();

  try {
    const analise = db.prepare(`
      SELECT * FROM v_analise_retencao WHERE cliente_id = ?
    `).get(id);

    if (!analise) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Calcular score de risco (0-100)
    let score = 0;
    const fatores = [];

    // Fator 1: Tempo sem visita (peso 40)
    if (analise.dias_sem_visita > 365) {
      score += 40;
      fatores.push({ fator: 'Mais de 1 ano sem visita', peso: 40, critico: true });
    } else if (analise.dias_sem_visita > 180) {
      score += 30;
      fatores.push({ fator: 'Mais de 6 meses sem visita', peso: 30, critico: true });
    } else if (analise.dias_sem_visita > 90) {
      score += 15;
      fatores.push({ fator: 'Mais de 3 meses sem visita', peso: 15, critico: false });
    }

    // Fator 2: Frequência histórica (peso 30)
    if (analise.total_visitas === 1) {
      score += 30;
      fatores.push({ fator: 'Apenas 1 visita no histórico', peso: 30, critico: true });
    } else if (analise.total_visitas <= 3) {
      score += 20;
      fatores.push({ fator: 'Poucas visitas no histórico', peso: 20, critico: false });
    }

    // Fator 3: Valor do ticket (peso 20)
    const ticketMedio = analise.ticket_medio || 0;
    if (ticketMedio > 1000) {
      score += 0; // Cliente valioso, sem penalidade
      fatores.push({ fator: 'Cliente de alto valor', peso: 0, critico: false });
    } else if (ticketMedio < 300) {
      score += 20;
      fatores.push({ fator: 'Ticket médio baixo', peso: 20, critico: false });
    }

    // Fator 4: Lembretes não atendidos (peso 10)
    const lembretesPendentes = db.prepare(`
      SELECT COUNT(*) AS total FROM lembretes
      WHERE cliente_id = ? AND status = 'ENVIADO'
      AND data_proxima < DATE('now', '-30 days')
    `).get(id);

    if (lembretesPendentes.total > 0) {
      score += 10;
      fatores.push({ fator: 'Lembretes não atendidos', peso: 10, critico: false });
    }

    // Classificar risco
    let classificacao = 'BAIXO';
    let cor = '#10B981'; // verde
    let recomendacao = 'Cliente com bom relacionamento. Manter comunicação regular.';

    if (score >= 70) {
      classificacao = 'CRÍTICO';
      cor = '#EF4444'; // vermelho
      recomendacao = 'Ação urgente necessária! Entre em contato imediatamente e ofereça promoções.';
    } else if (score >= 50) {
      classificacao = 'ALTO';
      cor = '#F59E0B'; // amarelo
      recomendacao = 'Cliente em risco. Envie lembretes e ofertas personalizadas.';
    } else if (score >= 30) {
      classificacao = 'MÉDIO';
      cor = '#3B82F6'; // azul
      recomendacao = 'Monitorar cliente e manter engajamento.';
    }

    res.json({
      cliente_id: id,
      status_retencao: analise.status_retencao,
      score_risco: score,
      classificacao_risco: classificacao,
      cor,
      recomendacao,
      fatores_risco: fatores,
      dias_sem_visita: analise.dias_sem_visita,
      total_visitas: analise.total_visitas,
      ticket_medio: analise.ticket_medio,
      valor_total_historico: analise.valor_total_historico
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// PREFERÊNCIAS DO CLIENTE
// ==========================================

/**
 * GET /api/crm/clientes/:id/preferencias
 * Busca preferências de comunicação do cliente
 */
router.get('/clientes/:id/preferencias', (req, res) => {
  const { id } = req.params;
  const db = getDB();

  try {
    let preferencias = db.prepare(`
      SELECT * FROM clientes_preferencias WHERE cliente_id = ?
    `).get(id);

    // Se não existir, criar com valores padrão
    if (!preferencias) {
      const insert = db.prepare(`
        INSERT INTO clientes_preferencias (cliente_id)
        VALUES (?)
      `);
      const result = insert.run(id);
      
      preferencias = db.prepare(`
        SELECT * FROM clientes_preferencias WHERE id = ?
      `).get(result.lastInsertRowid);
    }

    res.json(preferencias);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

/**
 * PUT /api/crm/clientes/:id/preferencias
 * Atualiza preferências de comunicação do cliente
 */
router.put('/clientes/:id/preferencias', (req, res) => {
  const { id } = req.params;
  const { receber_lembretes, receber_promocoes, receber_pesquisas, meio_preferencial, melhor_horario, observacoes } = req.body;
  const db = getDB();

  try {
    const update = db.prepare(`
      UPDATE clientes_preferencias
      SET 
        receber_lembretes = COALESCE(?, receber_lembretes),
        receber_promocoes = COALESCE(?, receber_promocoes),
        receber_pesquisas = COALESCE(?, receber_pesquisas),
        meio_preferencial = COALESCE(?, meio_preferencial),
        melhor_horario = COALESCE(?, melhor_horario),
        observacoes = COALESCE(?, observacoes),
        atualizado_em = CURRENT_TIMESTAMP
      WHERE cliente_id = ?
    `);

    const result = update.run(
      receber_lembretes,
      receber_promocoes,
      receber_pesquisas,
      meio_preferencial,
      melhor_horario,
      observacoes,
      id
    );

    if (result.changes === 0) {
      // Se não existe, criar
      db.prepare(`
        INSERT INTO clientes_preferencias 
        (cliente_id, receber_lembretes, receber_promocoes, receber_pesquisas, meio_preferencial, melhor_horario, observacoes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, receber_lembretes ?? 1, receber_promocoes ?? 1, receber_pesquisas ?? 1, meio_preferencial ?? 'WHATSAPP', melhor_horario, observacoes);
    }

    const preferencias = db.prepare(`
      SELECT * FROM clientes_preferencias WHERE cliente_id = ?
    `).get(id);

    res.json(preferencias);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// ESTATÍSTICAS GERAIS DE CRM
// ==========================================

/**
 * GET /api/crm/dashboard
 * Dashboard com métricas de CRM
 */
router.get('/dashboard', (req, res) => {
  const db = getDB();

  try {
    // Total de clientes por status de retenção
    const retencao = db.prepare(`
      SELECT 
        status_retencao,
        COUNT(*) AS total,
        SUM(valor_total_historico) AS valor_total
      FROM v_analise_retencao
      GROUP BY status_retencao
    `).all();

    // Lembretes pendentes e vencidos
    const lembretes = db.prepare(`
      SELECT 
        COUNT(*) AS total_lembretes,
        COUNT(CASE WHEN urgencia = 'VENCIDO' THEN 1 END) AS vencidos,
        COUNT(CASE WHEN urgencia = 'PROXIMO' THEN 1 END) AS proximos
      FROM v_lembretes_vencidos
    `).get();

    // Pesquisas de satisfação
    const pesquisas = db.prepare(`
      SELECT * FROM v_estatisticas_satisfacao
    `).get();

    // Clientes de alto valor (top 10)
    const topClientes = db.prepare(`
      SELECT 
        id,
        nome,
        total_faturado,
        total_os,
        nota_satisfacao_media
      FROM v_clientes_perfil_360
      WHERE total_faturado > 0
      ORDER BY total_faturado DESC
      LIMIT 10
    `).all();

    // Notificações recentes
    const notificacoes = db.prepare(`
      SELECT 
        tipo,
        meio,
        status,
        COUNT(*) AS total,
        SUM(custo) AS custo_total
      FROM notificacoes
      WHERE criado_em >= DATE('now', '-30 days')
      GROUP BY tipo, meio, status
    `).all();

    res.json({
      retencao,
      lembretes,
      pesquisas,
      top_clientes: topClientes,
      notificacoes_30d: notificacoes
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
