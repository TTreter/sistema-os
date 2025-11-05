/**
 * ROTAS API - NOTIFICAÇÕES
 * 
 * Sistema de envio de notificações via:
 * - WhatsApp Business API
 * - SMS
 * - Email
 * 
 * NOTA: Este módulo fornece endpoints para integração futura.
 * Para funcionar completamente, é necessário configurar:
 * - API Key do WhatsApp Business
 * - API Key do provedor de SMS
 * - Credenciais SMTP para email
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

function getDB() {
  return new Database(path.join(__dirname, '..', 'database', 'oficina.db'));
}

// ==========================================
// LISTAR NOTIFICAÇÕES
// ==========================================

/**
 * GET /api/notificacoes
 * Lista notificações com filtros
 */
router.get('/', (req, res) => {
  const { status, tipo, meio, cliente_id, limite = 50 } = req.query;
  const db = getDB();

  try {
    let query = `
      SELECT 
        n.*,
        c.nome AS cliente_nome
      FROM notificacoes n
      INNER JOIN clientes c ON n.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND n.status = ?`;
      params.push(status);
    }

    if (tipo) {
      query += ` AND n.tipo = ?`;
      params.push(tipo);
    }

    if (meio) {
      query += ` AND n.meio = ?`;
      params.push(meio);
    }

    if (cliente_id) {
      query += ` AND n.cliente_id = ?`;
      params.push(cliente_id);
    }

    query += ` ORDER BY n.criado_em DESC LIMIT ?`;
    params.push(parseInt(limite));

    const notificacoes = db.prepare(query).all(...params);

    res.json({
      total: notificacoes.length,
      notificacoes
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

/**
 * GET /api/notificacoes/pendentes
 * Lista notificações pendentes de envio
 */
router.get('/pendentes', (req, res) => {
  const db = getDB();

  try {
    const notificacoes = db.prepare(`
      SELECT 
        n.*,
        c.nome AS cliente_nome
      FROM notificacoes n
      INNER JOIN clientes c ON n.cliente_id = c.id
      WHERE n.status = 'PENDENTE'
      ORDER BY n.criado_em ASC
    `).all();

    res.json({
      total: notificacoes.length,
      notificacoes
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// BUSCAR NOTIFICAÇÃO
// ==========================================

/**
 * GET /api/notificacoes/:id
 * Busca notificação por ID
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();

  try {
    const notificacao = db.prepare(`
      SELECT 
        n.*,
        c.nome AS cliente_nome
      FROM notificacoes n
      INNER JOIN clientes c ON n.cliente_id = c.id
      WHERE n.id = ?
    `).get(id);

    if (!notificacao) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json(notificacao);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// ENVIAR NOTIFICAÇÃO
// ==========================================

/**
 * POST /api/notificacoes/enviar
 * Envia notificação para cliente
 */
router.post('/enviar', (req, res) => {
  const { cliente_id, tipo, meio, mensagem, referencia_id, referencia_tabela } = req.body;
  const db = getDB();

  try {
    // Validações
    if (!cliente_id || !tipo || !meio || !mensagem) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: cliente_id, tipo, meio, mensagem' 
      });
    }

    // Buscar cliente
    const cliente = db.prepare(`
      SELECT * FROM clientes WHERE id = ?
    `).get(cliente_id);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Determinar destinatário
    let destinatario = '';
    if (meio === 'EMAIL') {
      destinatario = cliente.email;
      if (!destinatario) {
        return res.status(400).json({ error: 'Cliente não possui email cadastrado' });
      }
    } else {
      destinatario = cliente.telefone;
      if (!destinatario) {
        return res.status(400).json({ error: 'Cliente não possui telefone cadastrado' });
      }
    }

    // Verificar preferências do cliente
    const preferencias = db.prepare(`
      SELECT * FROM clientes_preferencias WHERE cliente_id = ?
    `).get(cliente_id);

    if (preferencias) {
      if (tipo === 'LEMBRETE' && !preferencias.receber_lembretes) {
        return res.status(400).json({ error: 'Cliente não aceita lembretes' });
      }
      if (tipo === 'CAMPANHA' && !preferencias.receber_promocoes) {
        return res.status(400).json({ error: 'Cliente não aceita promoções' });
      }
      if (tipo === 'PESQUISA' && !preferencias.receber_pesquisas) {
        return res.status(400).json({ error: 'Cliente não aceita pesquisas' });
      }
    }

    // Criar notificação
    const insert = db.prepare(`
      INSERT INTO notificacoes (
        cliente_id, tipo, meio, destinatario, mensagem,
        referencia_id, referencia_tabela, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE')
    `);

    const result = insert.run(
      cliente_id,
      tipo,
      meio,
      destinatario,
      mensagem,
      referencia_id,
      referencia_tabela
    );

    // Simular envio (em produção, aqui seria a chamada para API externa)
    const sucesso = simularEnvioNotificacao(meio, destinatario, mensagem);

    if (sucesso) {
      db.prepare(`
        UPDATE notificacoes
        SET status = 'ENVIADA', data_envio = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(result.lastInsertRowid);
    } else {
      db.prepare(`
        UPDATE notificacoes
        SET status = 'ERRO', erro_mensagem = 'Simulação de erro de envio', tentativas = tentativas + 1
        WHERE id = ?
      `).run(result.lastInsertRowid);
    }

    const notificacao = db.prepare(`
      SELECT * FROM notificacoes WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      notificacao,
      mensagem: sucesso ? 'Notificação enviada com sucesso' : 'Erro ao enviar notificação'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

/**
 * POST /api/notificacoes/enviar-em-lote
 * Envia notificações para múltiplos clientes
 */
router.post('/enviar-em-lote', (req, res) => {
  const { cliente_ids, tipo, meio, mensagem } = req.body;
  const db = getDB();

  try {
    if (!cliente_ids || !Array.isArray(cliente_ids) || cliente_ids.length === 0) {
      return res.status(400).json({ error: 'cliente_ids deve ser um array com pelo menos um ID' });
    }

    if (!tipo || !meio || !mensagem) {
      return res.status(400).json({ error: 'Campos obrigatórios: tipo, meio, mensagem' });
    }

    const resultados = {
      total: cliente_ids.length,
      enviados: 0,
      erros: 0,
      detalhes: []
    };

    cliente_ids.forEach(cliente_id => {
      try {
        // Buscar cliente
        const cliente = db.prepare(`
          SELECT * FROM clientes WHERE id = ?
        `).get(cliente_id);

        if (!cliente) {
          resultados.erros++;
          resultados.detalhes.push({ cliente_id, status: 'erro', mensagem: 'Cliente não encontrado' });
          return;
        }

        // Determinar destinatário
        let destinatario = meio === 'EMAIL' ? cliente.email : cliente.telefone;
        if (!destinatario) {
          resultados.erros++;
          resultados.detalhes.push({ cliente_id, status: 'erro', mensagem: 'Contato não cadastrado' });
          return;
        }

        // Verificar preferências
        const preferencias = db.prepare(`
          SELECT * FROM clientes_preferencias WHERE cliente_id = ?
        `).get(cliente_id);

        if (preferencias) {
          if ((tipo === 'LEMBRETE' && !preferencias.receber_lembretes) ||
              (tipo === 'CAMPANHA' && !preferencias.receber_promocoes) ||
              (tipo === 'PESQUISA' && !preferencias.receber_pesquisas)) {
            resultados.erros++;
            resultados.detalhes.push({ cliente_id, status: 'erro', mensagem: 'Cliente não aceita este tipo de comunicação' });
            return;
          }
        }

        // Criar e enviar notificação
        const insert = db.prepare(`
          INSERT INTO notificacoes (cliente_id, tipo, meio, destinatario, mensagem, status)
          VALUES (?, ?, ?, ?, ?, 'PENDENTE')
        `);

        const result = insert.run(cliente_id, tipo, meio, destinatario, mensagem);

        const sucesso = simularEnvioNotificacao(meio, destinatario, mensagem);

        if (sucesso) {
          db.prepare(`
            UPDATE notificacoes SET status = 'ENVIADA', data_envio = CURRENT_TIMESTAMP WHERE id = ?
          `).run(result.lastInsertRowid);
          resultados.enviados++;
          resultados.detalhes.push({ cliente_id, status: 'enviado', notificacao_id: result.lastInsertRowid });
        } else {
          db.prepare(`
            UPDATE notificacoes SET status = 'ERRO', erro_mensagem = 'Falha no envio' WHERE id = ?
          `).run(result.lastInsertRowid);
          resultados.erros++;
          resultados.detalhes.push({ cliente_id, status: 'erro', mensagem: 'Falha no envio' });
        }

      } catch (err) {
        resultados.erros++;
        resultados.detalhes.push({ cliente_id, status: 'erro', mensagem: err.message });
      }
    });

    res.json(resultados);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// REENVIAR NOTIFICAÇÃO
// ==========================================

/**
 * POST /api/notificacoes/:id/reenviar
 * Tenta reenviar notificação com erro
 */
router.post('/:id/reenviar', (req, res) => {
  const { id } = req.params;
  const db = getDB();

  try {
    const notificacao = db.prepare(`
      SELECT * FROM notificacoes WHERE id = ?
    `).get(id);

    if (!notificacao) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    if (notificacao.status === 'ENVIADA') {
      return res.status(400).json({ error: 'Notificação já foi enviada com sucesso' });
    }

    if (notificacao.tentativas >= 3) {
      return res.status(400).json({ error: 'Número máximo de tentativas atingido' });
    }

    // Simular reenvio
    const sucesso = simularEnvioNotificacao(notificacao.meio, notificacao.destinatario, notificacao.mensagem);

    if (sucesso) {
      db.prepare(`
        UPDATE notificacoes
        SET status = 'ENVIADA', data_envio = CURRENT_TIMESTAMP, tentativas = tentativas + 1
        WHERE id = ?
      `).run(id);
    } else {
      db.prepare(`
        UPDATE notificacoes
        SET status = 'ERRO', erro_mensagem = 'Falha no reenvio', tentativas = tentativas + 1
        WHERE id = ?
      `).run(id);
    }

    const notificacaoAtualizada = db.prepare(`
      SELECT * FROM notificacoes WHERE id = ?
    `).get(id);

    res.json({
      notificacao: notificacaoAtualizada,
      mensagem: sucesso ? 'Notificação reenviada com sucesso' : 'Erro ao reenviar notificação'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// ESTATÍSTICAS
// ==========================================

/**
 * GET /api/notificacoes/estatisticas/geral
 * Estatísticas de envio de notificações
 */
router.get('/estatisticas/geral', (req, res) => {
  const { data_inicio, data_fim } = req.query;
  const db = getDB();

  try {
    let filtroData = '';
    const params = [];

    if (data_inicio && data_fim) {
      filtroData = ` WHERE criado_em BETWEEN ? AND ?`;
      params.push(data_inicio, data_fim);
    }

    // Total por status
    const porStatus = db.prepare(`
      SELECT 
        status,
        COUNT(*) AS total,
        SUM(custo) AS custo_total
      FROM notificacoes
      ${filtroData}
      GROUP BY status
    `).all(...params);

    // Total por tipo
    const porTipo = db.prepare(`
      SELECT 
        tipo,
        COUNT(*) AS total,
        SUM(custo) AS custo_total
      FROM notificacoes
      ${filtroData}
      GROUP BY tipo
    `).all(...params);

    // Total por meio
    const porMeio = db.prepare(`
      SELECT 
        meio,
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'ENVIADA' THEN 1 END) AS enviadas,
        COUNT(CASE WHEN status = 'ERRO' THEN 1 END) AS erros,
        SUM(custo) AS custo_total
      FROM notificacoes
      ${filtroData}
      GROUP BY meio
    `).all(...params);

    // Taxa de sucesso
    const taxaSucesso = db.prepare(`
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'ENVIADA' THEN 1 END) AS enviadas,
        COUNT(CASE WHEN status = 'ERRO' THEN 1 END) AS erros,
        ROUND(COUNT(CASE WHEN status = 'ENVIADA' THEN 1 END) * 100.0 / COUNT(*), 2) AS taxa_sucesso
      FROM notificacoes
      ${filtroData}
    `).get(...params);

    res.json({
      por_status: porStatus,
      por_tipo: porTipo,
      por_meio: porMeio,
      taxa_sucesso: taxaSucesso
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// CONFIGURAÇÕES
// ==========================================

/**
 * GET /api/notificacoes/configuracoes
 * Busca configurações de notificações
 */
router.get('/configuracoes', (req, res) => {
  const db = getDB();

  try {
    const configs = db.prepare(`
      SELECT * FROM configuracoes
      WHERE chave LIKE 'crm_whatsapp%' 
         OR chave LIKE 'crm_sms%'
         OR chave LIKE 'crm_email%'
    `).all();

    const configMap = {};
    configs.forEach(config => {
      configMap[config.chave] = {
        valor: config.valor,
        descricao: config.descricao
      };
    });

    res.json(configMap);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

/**
 * PUT /api/notificacoes/configuracoes
 * Atualiza configurações de notificações
 */
router.put('/configuracoes', (req, res) => {
  const configs = req.body; // { chave: valor, ... }
  const db = getDB();

  try {
    const update = db.prepare(`
      UPDATE configuracoes SET valor = ? WHERE chave = ?
    `);

    Object.entries(configs).forEach(([chave, valor]) => {
      update.run(valor, chave);
    });

    res.json({ mensagem: 'Configurações atualizadas com sucesso' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// FUNÇÃO AUXILIAR - SIMULAÇÃO DE ENVIO
// ==========================================

/**
 * Simula envio de notificação
 * Em produção, aqui seria feita a integração com APIs reais:
 * - WhatsApp Business API
 * - Twilio/Nexmo para SMS
 * - Nodemailer/SendGrid para Email
 */
function simularEnvioNotificacao(meio, destinatario, mensagem) {
  console.log(`\n📤 SIMULAÇÃO DE ENVIO:`);
  console.log(`   Meio: ${meio}`);
  console.log(`   Destinatário: ${destinatario}`);
  console.log(`   Mensagem: ${mensagem}`);
  console.log(`   Status: ENVIADO (simulação)\n`);

  // Simular 90% de taxa de sucesso
  return Math.random() > 0.1;
}

module.exports = router;
