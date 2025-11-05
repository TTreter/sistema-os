/**
 * ROTAS API - PESQUISAS DE SATISFAÇÃO
 * 
 * Sistema de coleta de feedback após serviços:
 * - Envio automático após finalização da OS
 * - Coleta de notas de 1 a 5 em múltiplos critérios
 * - Análise de satisfação e NPS
 * - Identificação de pontos de melhoria
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

function getDB() {
  return new Database(path.join(__dirname, '..', 'database', 'oficina.db'));
}

// ==========================================
// LISTAR PESQUISAS
// ==========================================

/**
 * GET /api/pesquisas
 * Lista pesquisas com filtros
 */
router.get('/', (req, res) => {
  const { status, cliente_id, os_id, limite = 50 } = req.query;
  const db = getDB();

  try {
    let query = `
      SELECT 
        ps.*,
        c.nome AS cliente_nome,
        os.numero AS os_numero,
        os.valor_total AS os_valor
      FROM pesquisas_satisfacao ps
      INNER JOIN clientes c ON ps.cliente_id = c.id
      INNER JOIN ordens_servico os ON ps.os_id = os.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND ps.status = ?`;
      params.push(status);
    }

    if (cliente_id) {
      query += ` AND ps.cliente_id = ?`;
      params.push(cliente_id);
    }

    if (os_id) {
      query += ` AND ps.os_id = ?`;
      params.push(os_id);
    }

    query += ` ORDER BY ps.criado_em DESC LIMIT ?`;
    params.push(parseInt(limite));

    const pesquisas = db.prepare(query).all(...params);

    res.json({
      total: pesquisas.length,
      pesquisas
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

/**
 * GET /api/pesquisas/pendentes
 * Lista pesquisas pendentes de envio ou resposta
 */
router.get('/pendentes', (req, res) => {
  const db = getDB();

  try {
    const pesquisas = db.prepare(`
      SELECT 
        ps.*,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        c.email AS cliente_email,
        os.numero AS os_numero,
        os.data_fechamento AS os_data_fechamento
      FROM pesquisas_satisfacao ps
      INNER JOIN clientes c ON ps.cliente_id = c.id
      INNER JOIN ordens_servico os ON ps.os_id = os.id
      WHERE ps.status IN ('PENDENTE', 'ENVIADA')
      ORDER BY ps.criado_em DESC
    `).all();

    res.json({
      total: pesquisas.length,
      pesquisas
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// BUSCAR PESQUISA
// ==========================================

/**
 * GET /api/pesquisas/:id
 * Busca pesquisa por ID
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();

  try {
    const pesquisa = db.prepare(`
      SELECT 
        ps.*,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        os.numero AS os_numero,
        os.valor_total AS os_valor
      FROM pesquisas_satisfacao ps
      INNER JOIN clientes c ON ps.cliente_id = c.id
      INNER JOIN ordens_servico os ON ps.os_id = os.id
      WHERE ps.id = ?
    `).get(id);

    if (!pesquisa) {
      return res.status(404).json({ error: 'Pesquisa não encontrada' });
    }

    res.json(pesquisa);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

/**
 * GET /api/pesquisas/token/:token
 * Busca pesquisa por token único (para link público)
 */
router.get('/token/:token', (req, res) => {
  const { token } = req.params;
  const db = getDB();

  try {
    const pesquisa = db.prepare(`
      SELECT 
        ps.*,
        c.nome AS cliente_nome,
        os.numero AS os_numero,
        os.data_fechamento AS os_data,
        os.valor_total AS os_valor
      FROM pesquisas_satisfacao ps
      INNER JOIN clientes c ON ps.cliente_id = c.id
      INNER JOIN ordens_servico os ON ps.os_id = os.id
      WHERE ps.token = ?
    `).get(token);

    if (!pesquisa) {
      return res.status(404).json({ error: 'Pesquisa não encontrada' });
    }

    // Verificar se já foi respondida
    if (pesquisa.status === 'RESPONDIDA') {
      return res.status(400).json({ 
        error: 'Pesquisa já foi respondida',
        data_resposta: pesquisa.data_resposta
      });
    }

    // Verificar se expirou (30 dias após criação)
    const diasDesdeEnvio = Math.floor((Date.now() - new Date(pesquisa.criado_em).getTime()) / (1000 * 60 * 60 * 24));
    if (diasDesdeEnvio > 30) {
      db.prepare(`
        UPDATE pesquisas_satisfacao SET status = 'EXPIRADA' WHERE id = ?
      `).run(pesquisa.id);

      return res.status(400).json({ error: 'Pesquisa expirada (30 dias)' });
    }

    res.json(pesquisa);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// ENVIAR PESQUISA
// ==========================================

/**
 * POST /api/pesquisas/:id/enviar
 * Envia pesquisa de satisfação para o cliente
 */
router.post('/:id/enviar', (req, res) => {
  const { id } = req.params;
  const { meio = 'WHATSAPP' } = req.body; // WHATSAPP, SMS, EMAIL
  const db = getDB();

  try {
    // Buscar pesquisa
    const pesquisa = db.prepare(`
      SELECT ps.*, c.nome, c.telefone, c.email, os.numero
      FROM pesquisas_satisfacao ps
      INNER JOIN clientes c ON ps.cliente_id = c.id
      INNER JOIN ordens_servico os ON ps.os_id = os.id
      WHERE ps.id = ?
    `).get(id);

    if (!pesquisa) {
      return res.status(404).json({ error: 'Pesquisa não encontrada' });
    }

    if (pesquisa.status === 'RESPONDIDA') {
      return res.status(400).json({ error: 'Pesquisa já foi respondida' });
    }

    // Gerar link da pesquisa
    const linkPesquisa = `http://localhost:3000/pesquisa/${pesquisa.token}`;

    // Criar mensagem
    const mensagem = `Olá ${pesquisa.nome}! Sua opinião é importante! Avalie o serviço da OS ${pesquisa.numero}: ${linkPesquisa}`;

    // Registrar notificação
    const destinatario = meio === 'EMAIL' ? pesquisa.email : pesquisa.telefone;
    db.prepare(`
      INSERT INTO notificacoes (cliente_id, tipo, meio, destinatario, mensagem, referencia_id, referencia_tabela)
      VALUES (?, 'PESQUISA', ?, ?, ?, ?, 'pesquisas_satisfacao')
    `).run(pesquisa.cliente_id, meio, destinatario, mensagem, id);

    // Atualizar pesquisa
    db.prepare(`
      UPDATE pesquisas_satisfacao
      SET 
        status = 'ENVIADA',
        data_envio = CURRENT_TIMESTAMP,
        meio_envio = ?
      WHERE id = ?
    `).run(meio, id);

    const pesquisaAtualizada = db.prepare(`
      SELECT * FROM pesquisas_satisfacao WHERE id = ?
    `).get(id);

    res.json({
      pesquisa: pesquisaAtualizada,
      mensagem: 'Pesquisa enviada com sucesso',
      meio,
      link: linkPesquisa
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// RESPONDER PESQUISA
// ==========================================

/**
 * POST /api/pesquisas/responder/:token
 * Cliente responde à pesquisa de satisfação (endpoint público)
 */
router.post('/responder/:token', (req, res) => {
  const { token } = req.params;
  const { nota_atendimento, nota_qualidade, nota_prazo, nota_preco, comentario, recomendaria } = req.body;
  const db = getDB();

  try {
    // Validações
    if (!nota_atendimento || !nota_qualidade || !nota_prazo || !nota_preco) {
      return res.status(400).json({ error: 'Todas as notas são obrigatórias (1-5)' });
    }

    const notas = [nota_atendimento, nota_qualidade, nota_prazo, nota_preco];
    if (notas.some(n => n < 1 || n > 5)) {
      return res.status(400).json({ error: 'Notas devem estar entre 1 e 5' });
    }

    // Buscar pesquisa
    const pesquisa = db.prepare(`
      SELECT * FROM pesquisas_satisfacao WHERE token = ?
    `).get(token);

    if (!pesquisa) {
      return res.status(404).json({ error: 'Pesquisa não encontrada' });
    }

    if (pesquisa.status === 'RESPONDIDA') {
      return res.status(400).json({ error: 'Pesquisa já foi respondida' });
    }

    // Atualizar pesquisa
    const update = db.prepare(`
      UPDATE pesquisas_satisfacao
      SET 
        nota_atendimento = ?,
        nota_qualidade = ?,
        nota_prazo = ?,
        nota_preco = ?,
        comentario = ?,
        recomendaria = ?,
        status = 'RESPONDIDA',
        data_resposta = CURRENT_TIMESTAMP
      WHERE token = ?
    `);

    update.run(
      nota_atendimento,
      nota_qualidade,
      nota_prazo,
      nota_preco,
      comentario,
      recomendaria ? 1 : 0,
      token
    );

    const pesquisaAtualizada = db.prepare(`
      SELECT * FROM pesquisas_satisfacao WHERE token = ?
    `).get(token);

    // Calcular média
    const media = (nota_atendimento + nota_qualidade + nota_prazo + nota_preco) / 4;

    res.json({
      mensagem: 'Obrigado por sua avaliação!',
      pesquisa: pesquisaAtualizada,
      media_geral: media.toFixed(2)
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
 * GET /api/pesquisas/estatisticas/geral
 * Estatísticas gerais de satisfação
 */
router.get('/estatisticas/geral', (req, res) => {
  const { data_inicio, data_fim } = req.query;
  const db = getDB();

  try {
    let filtroData = '';
    const params = [];

    if (data_inicio && data_fim) {
      filtroData = ` AND ps.criado_em BETWEEN ? AND ?`;
      params.push(data_inicio, data_fim);
    }

    // Estatísticas gerais
    const stats = db.prepare(`
      SELECT * FROM v_estatisticas_satisfacao
    `).get();

    // Distribuição de notas
    const distribuicao = db.prepare(`
      SELECT 
        'Atendimento' AS criterio,
        COUNT(CASE WHEN nota_atendimento = 5 THEN 1 END) AS nota_5,
        COUNT(CASE WHEN nota_atendimento = 4 THEN 1 END) AS nota_4,
        COUNT(CASE WHEN nota_atendimento = 3 THEN 1 END) AS nota_3,
        COUNT(CASE WHEN nota_atendimento = 2 THEN 1 END) AS nota_2,
        COUNT(CASE WHEN nota_atendimento = 1 THEN 1 END) AS nota_1
      FROM pesquisas_satisfacao ps
      WHERE status = 'RESPONDIDA' ${filtroData}
      
      UNION ALL
      
      SELECT 
        'Qualidade' AS criterio,
        COUNT(CASE WHEN nota_qualidade = 5 THEN 1 END),
        COUNT(CASE WHEN nota_qualidade = 4 THEN 1 END),
        COUNT(CASE WHEN nota_qualidade = 3 THEN 1 END),
        COUNT(CASE WHEN nota_qualidade = 2 THEN 1 END),
        COUNT(CASE WHEN nota_qualidade = 1 THEN 1 END)
      FROM pesquisas_satisfacao ps
      WHERE status = 'RESPONDIDA' ${filtroData}
      
      UNION ALL
      
      SELECT 
        'Prazo' AS criterio,
        COUNT(CASE WHEN nota_prazo = 5 THEN 1 END),
        COUNT(CASE WHEN nota_prazo = 4 THEN 1 END),
        COUNT(CASE WHEN nota_prazo = 3 THEN 1 END),
        COUNT(CASE WHEN nota_prazo = 2 THEN 1 END),
        COUNT(CASE WHEN nota_prazo = 1 THEN 1 END)
      FROM pesquisas_satisfacao ps
      WHERE status = 'RESPONDIDA' ${filtroData}
      
      UNION ALL
      
      SELECT 
        'Preço' AS criterio,
        COUNT(CASE WHEN nota_preco = 5 THEN 1 END),
        COUNT(CASE WHEN nota_preco = 4 THEN 1 END),
        COUNT(CASE WHEN nota_preco = 3 THEN 1 END),
        COUNT(CASE WHEN nota_preco = 2 THEN 1 END),
        COUNT(CASE WHEN nota_preco = 1 THEN 1 END)
      FROM pesquisas_satisfacao ps
      WHERE status = 'RESPONDIDA' ${filtroData}
    `).all(...params);

    // Comentários recentes
    const comentarios = db.prepare(`
      SELECT 
        ps.comentario,
        ps.data_resposta,
        c.nome AS cliente_nome,
        os.numero AS os_numero,
        ROUND((ps.nota_atendimento + ps.nota_qualidade + ps.nota_prazo + ps.nota_preco) / 4.0, 2) AS media
      FROM pesquisas_satisfacao ps
      INNER JOIN clientes c ON ps.cliente_id = c.id
      INNER JOIN ordens_servico os ON ps.os_id = os.id
      WHERE ps.status = 'RESPONDIDA' AND ps.comentario IS NOT NULL AND ps.comentario != ''
      ${filtroData}
      ORDER BY ps.data_resposta DESC
      LIMIT 10
    `).all(...params);

    // Piores avaliações (para melhorias)
    const piores = db.prepare(`
      SELECT 
        ps.*,
        c.nome AS cliente_nome,
        os.numero AS os_numero,
        ROUND((ps.nota_atendimento + ps.nota_qualidade + ps.nota_prazo + ps.nota_preco) / 4.0, 2) AS media
      FROM pesquisas_satisfacao ps
      INNER JOIN clientes c ON ps.cliente_id = c.id
      INNER JOIN ordens_servico os ON ps.os_id = os.id
      WHERE ps.status = 'RESPONDIDA'
      ${filtroData}
      ORDER BY media ASC
      LIMIT 5
    `).all(...params);

    res.json({
      estatisticas: stats,
      distribuicao_notas: distribuicao,
      comentarios_recentes: comentarios,
      piores_avaliacoes: piores
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

/**
 * GET /api/pesquisas/estatisticas/nps
 * Cálculo do NPS (Net Promoter Score)
 */
router.get('/estatisticas/nps', (req, res) => {
  const db = getDB();

  try {
    const nps = db.prepare(`
      SELECT 
        COUNT(CASE WHEN recomendaria = 1 THEN 1 END) AS promotores,
        COUNT(CASE WHEN recomendaria = 0 THEN 1 END) AS detratores,
        COUNT(*) AS total_respostas
      FROM pesquisas_satisfacao
      WHERE status = 'RESPONDIDA'
    `).get();

    const percentualPromotores = (nps.promotores / nps.total_respostas) * 100;
    const percentualDetratores = (nps.detratores / nps.total_respostas) * 100;
    const scoreNPS = percentualPromotores - percentualDetratores;

    let classificacao = 'Excelente';
    if (scoreNPS < 0) classificacao = 'Crítico';
    else if (scoreNPS < 30) classificacao = 'Aperfeiçoamento';
    else if (scoreNPS < 50) classificacao = 'Razoável';
    else if (scoreNPS < 75) classificacao = 'Muito Bom';

    res.json({
      nps_score: scoreNPS.toFixed(2),
      classificacao,
      promotores: nps.promotores,
      detratores: nps.detratores,
      total_respostas: nps.total_respostas,
      percentual_promotores: percentualPromotores.toFixed(2),
      percentual_detratores: percentualDetratores.toFixed(2)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// ==========================================
// DELETAR PESQUISA
// ==========================================

/**
 * DELETE /api/pesquisas/:id
 * Remove pesquisa (apenas se não respondida)
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();

  try {
    const pesquisa = db.prepare(`
      SELECT status FROM pesquisas_satisfacao WHERE id = ?
    `).get(id);

    if (!pesquisa) {
      return res.status(404).json({ error: 'Pesquisa não encontrada' });
    }

    if (pesquisa.status === 'RESPONDIDA') {
      return res.status(400).json({ error: 'Não é possível deletar pesquisa já respondida' });
    }

    const del = db.prepare(`DELETE FROM pesquisas_satisfacao WHERE id = ?`);
    del.run(id);

    res.json({ mensagem: 'Pesquisa removida com sucesso' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
