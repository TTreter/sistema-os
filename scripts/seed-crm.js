/**
 * SEED - FASE 4 - Dados de Exemplo CRM
 * 
 * Popula banco com dados de exemplo para:
 * - Lembretes de manutenção
 * - Pesquisas de satisfação
 * - Notificações
 * - Histórico de clientes
 * - Campanhas
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'oficina.db');
const db = new Database(dbPath);

console.log('\n🌱 Populando banco com dados de exemplo - FASE 4 CRM...\n');

try {
  db.exec('BEGIN TRANSACTION');

  // ==========================================
  // 1. HISTÓRICO DE CLIENTES
  // ==========================================
  console.log('📋 Adicionando histórico de clientes...');

  const insertHistorico = db.prepare(`
    INSERT INTO clientes_historico (cliente_id, tipo, descricao, referencia_id, referencia_tabela, usuario, data_hora)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Buscar clientes e OS existentes
  const clientes = db.prepare('SELECT id FROM clientes LIMIT 5').all();
  const ordens = db.prepare('SELECT id, numero, cliente_id FROM ordens_servico LIMIT 10').all();

  if (clientes.length > 0 && ordens.length > 0) {
    // Históricos variados
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const semanaPassada = new Date(hoje);
    semanaPassada.setDate(semanaPassada.getDate() - 7);

    ordens.slice(0, 3).forEach(os => {
      insertHistorico.run(
        os.cliente_id,
        'CONTATO_REALIZADO',
        `Cliente contatado sobre OS ${os.numero}`,
        os.id,
        'ordens_servico',
        'Atendente',
        semanaPassada.toISOString()
      );
    });

    insertHistorico.run(
      clientes[0].id,
      'ORCAMENTO_ENVIADO',
      'Orçamento enviado via WhatsApp',
      1,
      'orcamentos',
      'Sistema',
      ontem.toISOString()
    );

    console.log('   ✓ 4 registros de histórico adicionados');
  }

  // ==========================================
  // 2. LEMBRETES DE MANUTENÇÃO
  // ==========================================
  console.log('⏰ Adicionando lembretes de manutenção...');

  const insertLembrete = db.prepare(`
    INSERT INTO lembretes (
      veiculo_id, cliente_id, tipo, descricao,
      km_atual, km_proximo, data_proxima, status, prioridade
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const veiculos = db.prepare(`
    SELECT v.id, v.cliente_id, v.km_atual, v.placa
    FROM veiculos v
    LIMIT 5
  `).all();

  if (veiculos.length > 0) {
    // Lembrete VENCIDO (troca de óleo)
    const vencido = new Date();
    vencido.setDate(vencido.getDate() - 15);
    insertLembrete.run(
      veiculos[0].id,
      veiculos[0].cliente_id,
      'TROCA_OLEO',
      'Troca de óleo e filtro - VENCIDO',
      veiculos[0].km_atual || 50000,
      (veiculos[0].km_atual || 50000) + 10000,
      vencido.toISOString().split('T')[0],
      'PENDENTE',
      'ALTA'
    );

    // Lembrete PRÓXIMO (revisão)
    const proximo = new Date();
    proximo.setDate(proximo.getDate() + 5);
    insertLembrete.run(
      veiculos[1].id,
      veiculos[1].cliente_id,
      'REVISAO',
      'Revisão periódica dos 15.000 km',
      veiculos[1].km_atual || 14000,
      15000,
      proximo.toISOString().split('T')[0],
      'PENDENTE',
      'ALTA'
    );

    // Lembrete ENVIADO (alinhamento)
    const futuro1 = new Date();
    futuro1.setDate(futuro1.getDate() + 30);
    insertLembrete.run(
      veiculos[2].id,
      veiculos[2].cliente_id,
      'ALINHAMENTO',
      'Alinhamento e balanceamento',
      veiculos[2].km_atual || 30000,
      50000,
      futuro1.toISOString().split('T')[0],
      'ENVIADO',
      'MEDIA'
    );

    // Lembrete FUTURO (freios)
    const futuro2 = new Date();
    futuro2.setDate(futuro2.getDate() + 90);
    insertLembrete.run(
      veiculos[3].id,
      veiculos[3].cliente_id,
      'FREIOS',
      'Verificação do sistema de freios',
      veiculos[3].km_atual || 40000,
      70000,
      futuro2.toISOString().split('T')[0],
      'PENDENTE',
      'MEDIA'
    );

    console.log('   ✓ 4 lembretes adicionados (1 vencido, 1 próximo, 2 futuros)');
  }

  // ==========================================
  // 3. PESQUISAS DE SATISFAÇÃO
  // ==========================================
  console.log('📊 Adicionando pesquisas de satisfação...');

  const insertPesquisa = db.prepare(`
    INSERT INTO pesquisas_satisfacao (
      os_id, cliente_id, nota_atendimento, nota_qualidade, nota_prazo, nota_preco,
      comentario, recomendaria, data_envio, data_resposta, status, meio_envio, token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const osFinalizadas = db.prepare(`
    SELECT id, cliente_id FROM ordens_servico WHERE status = 'FINALIZADA' LIMIT 5
  `).all();

  if (osFinalizadas.length > 0) {
    // Pesquisa RESPONDIDA - Cliente muito satisfeito
    const dataEnvio1 = new Date();
    dataEnvio1.setDate(dataEnvio1.getDate() - 3);
    const dataResposta1 = new Date();
    dataResposta1.setDate(dataResposta1.getDate() - 2);

    insertPesquisa.run(
      osFinalizadas[0].id,
      osFinalizadas[0].cliente_id,
      5, 5, 5, 4, // notas
      'Excelente atendimento! Recomendo muito esta oficina.',
      1, // recomendaria
      dataEnvio1.toISOString(),
      dataResposta1.toISOString(),
      'RESPONDIDA',
      'WHATSAPP',
      'token-' + Math.random().toString(36).substring(7)
    );

    // Pesquisa RESPONDIDA - Cliente satisfeito
    const dataEnvio2 = new Date();
    dataEnvio2.setDate(dataEnvio2.getDate() - 5);
    const dataResposta2 = new Date();
    dataResposta2.setDate(dataResposta2.getDate() - 4);

    insertPesquisa.run(
      osFinalizadas[1].id,
      osFinalizadas[1].cliente_id,
      4, 4, 5, 3,
      'Bom atendimento, mas achei o preço um pouco alto.',
      1,
      dataEnvio2.toISOString(),
      dataResposta2.toISOString(),
      'RESPONDIDA',
      'EMAIL',
      'token-' + Math.random().toString(36).substring(7)
    );

    // Pesquisa RESPONDIDA - Cliente insatisfeito
    const dataEnvio3 = new Date();
    dataEnvio3.setDate(dataEnvio3.getDate() - 7);
    const dataResposta3 = new Date();
    dataResposta3.setDate(dataResposta3.getDate() - 6);

    insertPesquisa.run(
      osFinalizadas[2].id,
      osFinalizadas[2].cliente_id,
      2, 3, 2, 2,
      'Demorou muito e o atendimento não foi bom.',
      0,
      dataEnvio3.toISOString(),
      dataResposta3.toISOString(),
      'RESPONDIDA',
      'SMS',
      'token-' + Math.random().toString(36).substring(7)
    );

    // Pesquisa ENVIADA (sem resposta ainda)
    const dataEnvio4 = new Date();
    dataEnvio4.setDate(dataEnvio4.getDate() - 1);

    insertPesquisa.run(
      osFinalizadas[3].id,
      osFinalizadas[3].cliente_id,
      null, null, null, null,
      null,
      null,
      dataEnvio4.toISOString(),
      null,
      'ENVIADA',
      'WHATSAPP',
      'token-' + Math.random().toString(36).substring(7)
    );

    // Pesquisa PENDENTE
    if (osFinalizadas.length > 4) {
      insertPesquisa.run(
        osFinalizadas[4].id,
        osFinalizadas[4].cliente_id,
        null, null, null, null,
        null,
        null,
        null,
        null,
        'PENDENTE',
        null,
        'token-' + Math.random().toString(36).substring(7)
      );
    }

    console.log('   ✓ 5 pesquisas adicionadas (3 respondidas, 1 enviada, 1 pendente)');
  }

  // ==========================================
  // 4. NOTIFICAÇÕES
  // ==========================================
  console.log('📬 Adicionando notificações...');

  const insertNotificacao = db.prepare(`
    INSERT INTO notificacoes (
      cliente_id, tipo, meio, destinatario, mensagem,
      status, referencia_id, referencia_tabela, data_envio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  if (clientes.length > 0) {
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(clientes[0].id);

    // Notificação ENVIADA - Lembrete
    const dataEnvio1 = new Date();
    dataEnvio1.setDate(dataEnvio1.getDate() - 2);
    insertNotificacao.run(
      cliente.id,
      'LEMBRETE',
      'WHATSAPP',
      cliente.telefone,
      `Olá ${cliente.nome}! Está na hora da revisão do seu veículo. Agende agora!`,
      'ENVIADA',
      1,
      'lembretes',
      dataEnvio1.toISOString()
    );

    // Notificação ENVIADA - Pesquisa
    const dataEnvio2 = new Date();
    dataEnvio2.setDate(dataEnvio2.getDate() - 3);
    insertNotificacao.run(
      cliente.id,
      'PESQUISA',
      'EMAIL',
      cliente.email,
      `Olá ${cliente.nome}! Avalie nosso atendimento: http://localhost:3000/pesquisa/abc123`,
      'ENVIADA',
      1,
      'pesquisas_satisfacao',
      dataEnvio2.toISOString()
    );

    // Notificação PENDENTE
    insertNotificacao.run(
      cliente.id,
      'LEMBRETE',
      'SMS',
      cliente.telefone,
      'Lembrete: Troca de óleo vencida! Entre em contato.',
      'PENDENTE',
      2,
      'lembretes',
      null
    );

    // Notificação ERRO
    const dataEnvio3 = new Date();
    dataEnvio3.setDate(dataEnvio3.getDate() - 1);
    db.prepare(`
      INSERT INTO notificacoes (
        cliente_id, tipo, meio, destinatario, mensagem,
        status, erro_mensagem, tentativas, data_envio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cliente.id,
      'ORCAMENTO',
      'WHATSAPP',
      cliente.telefone,
      'Seu orçamento está pronto!',
      'ERRO',
      'Número de telefone inválido',
      2,
      dataEnvio3.toISOString()
    );

    console.log('   ✓ 4 notificações adicionadas');
  }

  // ==========================================
  // 5. CAMPANHAS
  // ==========================================
  console.log('🎯 Adicionando campanhas...');

  const insertCampanha = db.prepare(`
    INSERT INTO campanhas (
      nome, descricao, tipo, meio, mensagem,
      filtro_clientes, data_inicio, data_fim, status,
      total_destinatarios, total_enviados
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const hoje = new Date();
  const mesPassado = new Date(hoje);
  mesPassado.setMonth(mesPassado.getMonth() - 1);
  const proximoMes = new Date(hoje);
  proximoMes.setMonth(proximoMes.getMonth() + 1);

  // Campanha CONCLUÍDA
  insertCampanha.run(
    'Promoção Troca de Óleo - Março',
    'Promoção especial de troca de óleo com 20% de desconto',
    'PROMOCAO',
    'WHATSAPP',
    'Promoção especial! Troca de óleo com 20% OFF. Válido até 31/03. Agende já!',
    '{"status_retencao": ["ATIVO", "EM_RISCO"]}',
    mesPassado.toISOString().split('T')[0],
    hoje.toISOString().split('T')[0],
    'CONCLUIDA',
    45,
    43
  );

  // Campanha EM_ENVIO
  insertCampanha.run(
    'Lembretes de Revisão - Abril',
    'Envio de lembretes para clientes com revisão próxima',
    'REVISAO',
    'MULTIPLO',
    'Atenção! Sua revisão está próxima. Agende conosco e garanta a saúde do seu veículo!',
    '{"dias_sem_visita": 60}',
    hoje.toISOString().split('T')[0],
    proximoMes.toISOString().split('T')[0],
    'EM_ENVIO',
    28,
    15
  );

  // Campanha AGENDADA
  const futuro = new Date(hoje);
  futuro.setDate(futuro.getDate() + 15);
  insertCampanha.run(
    'Reativação de Clientes Inativos',
    'Campanha para reativar clientes que não visitam há mais de 6 meses',
    'REATIVACAO',
    'EMAIL',
    'Sentimos sua falta! Volte e ganhe 15% de desconto em qualquer serviço.',
    '{"status_retencao": ["INATIVO", "PERDIDO"]}',
    futuro.toISOString().split('T')[0],
    null,
    'AGENDADA',
    67,
    0
  );

  console.log('   ✓ 3 campanhas adicionadas');

  // ==========================================
  // 6. PREFERÊNCIAS DE CLIENTES
  // ==========================================
  console.log('⚙️ Configurando preferências de clientes...');

  // Atualizar algumas preferências
  if (clientes.length >= 2) {
    db.prepare(`
      UPDATE clientes_preferencias
      SET receber_promocoes = 0, meio_preferencial = 'EMAIL'
      WHERE cliente_id = ?
    `).run(clientes[0].id);

    db.prepare(`
      UPDATE clientes_preferencias
      SET receber_lembretes = 0
      WHERE cliente_id = ?
    `).run(clientes[1].id);

    console.log('   ✓ Preferências personalizadas configuradas');
  }

  db.exec('COMMIT');

  console.log('\n✅ Seed CRM concluído com sucesso!');
  console.log('\n📊 Resumo dos dados inseridos:');
  console.log('   • 4 registros de histórico de clientes');
  console.log('   • 4 lembretes de manutenção');
  console.log('   • 5 pesquisas de satisfação');
  console.log('   • 4 notificações');
  console.log('   • 3 campanhas de marketing');
  console.log('   • Preferências de clientes configuradas\n');

  console.log('💡 Teste as APIs:');
  console.log('   curl http://localhost:3000/api/crm/dashboard');
  console.log('   curl http://localhost:3000/api/lembretes/vencidos');
  console.log('   curl http://localhost:3000/api/pesquisas/estatisticas/geral');
  console.log('   curl http://localhost:3000/api/pesquisas/estatisticas/nps');
  console.log('   curl http://localhost:3000/api/notificacoes/pendentes\n');

} catch (error) {
  db.exec('ROLLBACK');
  console.error('❌ Erro ao popular banco:', error.message);
  process.exit(1);
} finally {
  db.close();
}
