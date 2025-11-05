/**
 * MIGRAÇÃO FASE 4 - CRM e Automações
 * 
 * Adiciona:
 * - Histórico completo do cliente
 * - Sistema de lembretes automáticos
 * - Pesquisas de satisfação
 * - Registro de notificações (WhatsApp/SMS/Email)
 * - Campanhas de relacionamento
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'oficina.db');
const db = new Database(dbPath);

console.log('\n🚀 Iniciando migração FASE 4 - CRM e Automações...\n');

try {
  db.exec('BEGIN TRANSACTION');

  // ===========================================
  // 1. TABELA DE HISTÓRICO DO CLIENTE
  // ===========================================
  console.log('📋 Criando tabela clientes_historico...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes_historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      tipo VARCHAR(50) NOT NULL, -- OS_CRIADA, OS_FINALIZADA, ORCAMENTO_ENVIADO, CONTATO_REALIZADO, LEMBRETE_ENVIADO, PESQUISA_RESPONDIDA
      descricao TEXT NOT NULL,
      referencia_id INTEGER, -- ID da OS, Orçamento, etc
      referencia_tabela VARCHAR(50), -- ordens_servico, orcamentos, lembretes
      usuario VARCHAR(100),
      observacoes TEXT,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_historico_cliente ON clientes_historico(cliente_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_historico_tipo ON clientes_historico(tipo)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_historico_data ON clientes_historico(data_hora)');

  // ===========================================
  // 2. TABELA DE LEMBRETES DE MANUTENÇÃO
  // ===========================================
  console.log('⏰ Criando tabela lembretes...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS lembretes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      veiculo_id INTEGER NOT NULL,
      cliente_id INTEGER NOT NULL,
      tipo VARCHAR(50) NOT NULL, -- TROCA_OLEO, REVISAO, ALINHAMENTO, BALANCEAMENTO, FREIOS, OUTROS
      descricao TEXT NOT NULL,
      km_atual INTEGER,
      km_proximo INTEGER,
      data_proxima DATE,
      status VARCHAR(30) DEFAULT 'PENDENTE', -- PENDENTE, ENVIADO, AGENDADO, CONCLUIDO, IGNORADO
      prioridade VARCHAR(20) DEFAULT 'MEDIA', -- BAIXA, MEDIA, ALTA, URGENTE
      ultimo_envio DATETIME,
      total_envios INTEGER DEFAULT 0,
      observacoes TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_lembretes_veiculo ON lembretes(veiculo_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_lembretes_cliente ON lembretes(cliente_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_lembretes_status ON lembretes(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_lembretes_data ON lembretes(data_proxima)');

  // ===========================================
  // 3. TABELA DE PESQUISAS DE SATISFAÇÃO
  // ===========================================
  console.log('📊 Criando tabela pesquisas_satisfacao...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS pesquisas_satisfacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id INTEGER NOT NULL,
      cliente_id INTEGER NOT NULL,
      nota_atendimento INTEGER, -- 1 a 5
      nota_qualidade INTEGER, -- 1 a 5
      nota_prazo INTEGER, -- 1 a 5
      nota_preco INTEGER, -- 1 a 5
      comentario TEXT,
      recomendaria BOOLEAN,
      data_envio DATETIME,
      data_resposta DATETIME,
      status VARCHAR(30) DEFAULT 'PENDENTE', -- PENDENTE, ENVIADA, RESPONDIDA, EXPIRADA
      meio_envio VARCHAR(30), -- WHATSAPP, SMS, EMAIL
      token VARCHAR(100) UNIQUE, -- Token único para link da pesquisa
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_pesquisas_os ON pesquisas_satisfacao(os_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_pesquisas_cliente ON pesquisas_satisfacao(cliente_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_pesquisas_status ON pesquisas_satisfacao(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_pesquisas_token ON pesquisas_satisfacao(token)');

  // ===========================================
  // 4. TABELA DE NOTIFICAÇÕES
  // ===========================================
  console.log('📬 Criando tabela notificacoes...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS notificacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      tipo VARCHAR(50) NOT NULL, -- LEMBRETE, ORCAMENTO, OS_PRONTA, PESQUISA, CAMPANHA
      meio VARCHAR(30) NOT NULL, -- WHATSAPP, SMS, EMAIL
      destinatario VARCHAR(200) NOT NULL, -- Telefone ou email
      mensagem TEXT NOT NULL,
      status VARCHAR(30) DEFAULT 'PENDENTE', -- PENDENTE, ENVIADA, ERRO, ENTREGUE, LIDA
      referencia_id INTEGER,
      referencia_tabela VARCHAR(50),
      tentativas INTEGER DEFAULT 0,
      erro_mensagem TEXT,
      data_envio DATETIME,
      data_leitura DATETIME,
      custo DECIMAL(10,2) DEFAULT 0.00,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_notificacoes_cliente ON notificacoes(cliente_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON notificacoes(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notificacoes_meio ON notificacoes(meio)');

  // ===========================================
  // 5. TABELA DE CAMPANHAS
  // ===========================================
  console.log('🎯 Criando tabela campanhas...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS campanhas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome VARCHAR(200) NOT NULL,
      descricao TEXT,
      tipo VARCHAR(50) NOT NULL, -- PROMOCAO, REVISAO, RETENCAO, REATIVACAO, ANIVERSARIO
      meio VARCHAR(30) NOT NULL, -- WHATSAPP, SMS, EMAIL, MULTIPLO
      mensagem TEXT NOT NULL,
      filtro_clientes TEXT, -- JSON com critérios de filtro
      data_inicio DATE NOT NULL,
      data_fim DATE,
      status VARCHAR(30) DEFAULT 'RASCUNHO', -- RASCUNHO, AGENDADA, EM_ENVIO, CONCLUIDA, CANCELADA
      total_destinatarios INTEGER DEFAULT 0,
      total_enviados INTEGER DEFAULT 0,
      total_erros INTEGER DEFAULT 0,
      custo_total DECIMAL(10,2) DEFAULT 0.00,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_campanhas_data ON campanhas(data_inicio)');

  // ===========================================
  // 6. TABELA DE PREFERÊNCIAS DE COMUNICAÇÃO
  // ===========================================
  console.log('⚙️ Criando tabela clientes_preferencias...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes_preferencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER UNIQUE NOT NULL,
      receber_lembretes BOOLEAN DEFAULT 1,
      receber_promocoes BOOLEAN DEFAULT 1,
      receber_pesquisas BOOLEAN DEFAULT 1,
      meio_preferencial VARCHAR(30) DEFAULT 'WHATSAPP', -- WHATSAPP, SMS, EMAIL
      melhor_horario VARCHAR(50), -- Ex: "Manhã (8h-12h)"
      observacoes TEXT,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    )
  `);

  // ===========================================
  // 7. VIEWS OTIMIZADAS
  // ===========================================
  console.log('👁️ Criando views otimizadas...');

  // View: Histórico completo do cliente
  db.exec(`
    CREATE VIEW IF NOT EXISTS v_clientes_historico_completo AS
    SELECT 
      h.id,
      h.cliente_id,
      c.nome AS cliente_nome,
      c.telefone AS cliente_telefone,
      h.tipo,
      h.descricao,
      h.referencia_id,
      h.referencia_tabela,
      h.usuario,
      h.observacoes,
      h.data_hora,
      CASE 
        WHEN h.referencia_tabela = 'ordens_servico' THEN (SELECT numero FROM ordens_servico WHERE id = h.referencia_id)
        WHEN h.referencia_tabela = 'orcamentos' THEN (SELECT 'ORC-' || id FROM orcamentos WHERE id = h.referencia_id)
        ELSE NULL
      END AS referencia_numero
    FROM clientes_historico h
    INNER JOIN clientes c ON h.cliente_id = c.id
    ORDER BY h.data_hora DESC
  `);

  // View: Lembretes vencidos ou próximos
  db.exec(`
    CREATE VIEW IF NOT EXISTS v_lembretes_vencidos AS
    SELECT 
      l.*,
      c.nome AS cliente_nome,
      c.telefone AS cliente_telefone,
      c.email AS cliente_email,
      v.placa AS veiculo_placa,
      v.modelo AS veiculo_modelo,
      v.marca AS veiculo_marca,
      CASE 
        WHEN l.data_proxima < DATE('now') THEN 'VENCIDO'
        WHEN l.data_proxima <= DATE('now', '+7 days') THEN 'PROXIMO'
        ELSE 'FUTURO'
      END AS urgencia,
      CAST(julianday(l.data_proxima) - julianday('now') AS INTEGER) AS dias_restantes
    FROM lembretes l
    INNER JOIN clientes c ON l.cliente_id = c.id
    INNER JOIN veiculos v ON l.veiculo_id = v.id
    WHERE l.status IN ('PENDENTE', 'ENVIADO')
    ORDER BY l.data_proxima ASC
  `);

  // View: Estatísticas de satisfação
  db.exec(`
    CREATE VIEW IF NOT EXISTS v_estatisticas_satisfacao AS
    SELECT 
      COUNT(*) AS total_pesquisas,
      COUNT(CASE WHEN status = 'RESPONDIDA' THEN 1 END) AS total_respondidas,
      ROUND(AVG(CASE WHEN status = 'RESPONDIDA' THEN nota_atendimento END), 2) AS media_atendimento,
      ROUND(AVG(CASE WHEN status = 'RESPONDIDA' THEN nota_qualidade END), 2) AS media_qualidade,
      ROUND(AVG(CASE WHEN status = 'RESPONDIDA' THEN nota_prazo END), 2) AS media_prazo,
      ROUND(AVG(CASE WHEN status = 'RESPONDIDA' THEN nota_preco END), 2) AS media_preco,
      ROUND(AVG(CASE WHEN status = 'RESPONDIDA' THEN (nota_atendimento + nota_qualidade + nota_prazo + nota_preco) / 4.0 END), 2) AS media_geral,
      ROUND(COUNT(CASE WHEN recomendaria = 1 THEN 1 END) * 100.0 / COUNT(CASE WHEN status = 'RESPONDIDA' THEN 1 END), 2) AS percentual_recomendaria,
      ROUND(COUNT(CASE WHEN status = 'RESPONDIDA' THEN 1 END) * 100.0 / COUNT(*), 2) AS taxa_resposta
    FROM pesquisas_satisfacao
  `);

  // View: Perfil completo do cliente (360°)
  db.exec(`
    CREATE VIEW IF NOT EXISTS v_clientes_perfil_360 AS
    SELECT 
      c.id,
      c.nome,
      c.cpf_cnpj,
      c.telefone,
      c.email,
      c.data_cadastro,
      -- Estatísticas de OS
      COUNT(DISTINCT os.id) AS total_os,
      SUM(CASE WHEN os.status = 'FINALIZADA' THEN os.valor_total ELSE 0 END) AS total_faturado,
      MAX(os.data_abertura) AS ultima_visita,
      -- Estatísticas de veículos
      COUNT(DISTINCT v.id) AS total_veiculos,
      -- Satisfação
      ROUND(AVG(CASE WHEN ps.status = 'RESPONDIDA' THEN (ps.nota_atendimento + ps.nota_qualidade + ps.nota_prazo + ps.nota_preco) / 4.0 END), 2) AS nota_satisfacao_media,
      -- Lembretes pendentes
      COUNT(DISTINCT CASE WHEN l.status = 'PENDENTE' THEN l.id END) AS lembretes_pendentes,
      -- Preferências
      COALESCE(cp.receber_lembretes, 1) AS aceita_lembretes,
      COALESCE(cp.receber_promocoes, 1) AS aceita_promocoes,
      COALESCE(cp.meio_preferencial, 'WHATSAPP') AS meio_preferencial
    FROM clientes c
    LEFT JOIN veiculos v ON v.cliente_id = c.id
    LEFT JOIN ordens_servico os ON os.cliente_id = c.id
    LEFT JOIN pesquisas_satisfacao ps ON ps.cliente_id = c.id
    LEFT JOIN lembretes l ON l.cliente_id = c.id AND l.status = 'PENDENTE'
    LEFT JOIN clientes_preferencias cp ON cp.cliente_id = c.id
    GROUP BY c.id
  `);

  // View: Análise de retenção de clientes
  db.exec(`
    CREATE VIEW IF NOT EXISTS v_analise_retencao AS
    SELECT 
      c.id AS cliente_id,
      c.nome AS cliente_nome,
      COUNT(os.id) AS total_visitas,
      MAX(os.data_abertura) AS ultima_visita,
      CAST(julianday('now') - julianday(MAX(os.data_abertura)) AS INTEGER) AS dias_sem_visita,
      CASE 
        WHEN MAX(os.data_abertura) IS NULL THEN 'SEM_HISTORICO'
        WHEN julianday('now') - julianday(MAX(os.data_abertura)) <= 90 THEN 'ATIVO'
        WHEN julianday('now') - julianday(MAX(os.data_abertura)) <= 180 THEN 'EM_RISCO'
        WHEN julianday('now') - julianday(MAX(os.data_abertura)) <= 365 THEN 'INATIVO'
        ELSE 'PERDIDO'
      END AS status_retencao,
      SUM(os.valor_total) AS valor_total_historico,
      ROUND(AVG(os.valor_total), 2) AS ticket_medio
    FROM clientes c
    LEFT JOIN ordens_servico os ON os.cliente_id = c.id AND os.status = 'FINALIZADA'
    GROUP BY c.id
  `);

  // ===========================================
  // 8. TRIGGERS AUTOMÁTICOS
  // ===========================================
  console.log('⚡ Criando triggers automáticos...');

  // Trigger: Registrar histórico ao criar OS
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_historico_os_criada
    AFTER INSERT ON ordens_servico
    BEGIN
      INSERT INTO clientes_historico (cliente_id, tipo, descricao, referencia_id, referencia_tabela)
      VALUES (
        NEW.cliente_id,
        'OS_CRIADA',
        'OS ' || NEW.numero || ' criada',
        NEW.id,
        'ordens_servico'
      );
    END;
  `);

  // Trigger: Registrar histórico ao finalizar OS
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_historico_os_finalizada
    AFTER UPDATE OF status ON ordens_servico
    WHEN NEW.status = 'FINALIZADA' AND OLD.status != 'FINALIZADA'
    BEGIN
      INSERT INTO clientes_historico (cliente_id, tipo, descricao, referencia_id, referencia_tabela)
      VALUES (
        NEW.cliente_id,
        'OS_FINALIZADA',
        'OS ' || NEW.numero || ' finalizada - R$ ' || printf('%.2f', NEW.valor_total),
        NEW.id,
        'ordens_servico'
      );
    END;
  `);

  // Trigger: Criar pesquisa de satisfação ao finalizar OS
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_criar_pesquisa_satisfacao
    AFTER UPDATE OF status ON ordens_servico
    WHEN NEW.status = 'FINALIZADA' AND OLD.status != 'FINALIZADA'
    BEGIN
      INSERT INTO pesquisas_satisfacao (os_id, cliente_id, token)
      VALUES (
        NEW.id,
        NEW.cliente_id,
        lower(hex(randomblob(16)))
      );
    END;
  `);

  // Trigger: Registrar histórico ao responder pesquisa
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_historico_pesquisa_respondida
    AFTER UPDATE OF status ON pesquisas_satisfacao
    WHEN NEW.status = 'RESPONDIDA' AND OLD.status != 'RESPONDIDA'
    BEGIN
      INSERT INTO clientes_historico (cliente_id, tipo, descricao, referencia_id, referencia_tabela)
      VALUES (
        NEW.cliente_id,
        'PESQUISA_RESPONDIDA',
        'Pesquisa respondida - Nota média: ' || ROUND((NEW.nota_atendimento + NEW.nota_qualidade + NEW.nota_prazo + NEW.nota_preco) / 4.0, 1),
        NEW.id,
        'pesquisas_satisfacao'
      );
    END;
  `);

  // Trigger: Atualizar timestamp de lembretes
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_atualizar_lembrete_timestamp
    AFTER UPDATE ON lembretes
    BEGIN
      UPDATE lembretes SET atualizado_em = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  // Trigger: Atualizar timestamp de campanhas
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_atualizar_campanha_timestamp
    AFTER UPDATE ON campanhas
    BEGIN
      UPDATE campanhas SET atualizado_em = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  // ===========================================
  // 9. INSERIR PREFERÊNCIAS PADRÃO PARA CLIENTES EXISTENTES
  // ===========================================
  console.log('👥 Configurando preferências padrão para clientes existentes...');
  db.exec(`
    INSERT OR IGNORE INTO clientes_preferencias (cliente_id)
    SELECT id FROM clientes WHERE id NOT IN (SELECT cliente_id FROM clientes_preferencias)
  `);

  // ===========================================
  // 10. CONFIGURAÇÕES DO SISTEMA
  // ===========================================
  console.log('⚙️ Atualizando configurações do sistema...');
  
  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO configuracoes (chave, valor, descricao)
    VALUES (?, ?, ?)
  `);

  const configs = [
    ['crm_lembretes_ativo', '1', 'Ativar envio automático de lembretes'],
    ['crm_lembretes_dias_antecedencia', '7', 'Dias de antecedência para enviar lembretes'],
    ['crm_pesquisas_ativo', '1', 'Ativar envio automático de pesquisas de satisfação'],
    ['crm_pesquisas_horas_apos_finalizacao', '24', 'Horas após finalização da OS para enviar pesquisa'],
    ['crm_whatsapp_api_key', '', 'API Key para integração WhatsApp Business'],
    ['crm_sms_api_key', '', 'API Key para envio de SMS'],
    ['crm_email_smtp_host', '', 'Servidor SMTP para envio de emails'],
    ['crm_email_smtp_porta', '587', 'Porta SMTP'],
    ['crm_email_usuario', '', 'Usuário SMTP'],
    ['crm_email_senha', '', 'Senha SMTP'],
    ['crm_email_remetente', '', 'Email remetente padrão']
  ];

  configs.forEach(([chave, valor, descricao]) => {
    insertConfig.run(chave, valor, descricao);
  });

  db.exec('COMMIT');

  console.log('\n✅ Migração FASE 4 concluída com sucesso!');
  console.log('\n📊 Resumo da migração:');
  console.log('   ✓ 6 novas tabelas criadas');
  console.log('   ✓ 5 views otimizadas');
  console.log('   ✓ 6 triggers automáticos');
  console.log('   ✓ 11 configurações adicionadas');
  console.log('\n🎯 Tabelas criadas:');
  console.log('   • clientes_historico - Histórico completo do cliente');
  console.log('   • lembretes - Lembretes de manutenção');
  console.log('   • pesquisas_satisfacao - Pesquisas de satisfação');
  console.log('   • notificacoes - Registro de notificações');
  console.log('   • campanhas - Campanhas de marketing');
  console.log('   • clientes_preferencias - Preferências de comunicação');
  console.log('\n💡 Próximos passos:');
  console.log('   1. Configure as APIs de WhatsApp/SMS/Email nas configurações');
  console.log('   2. Use a API /api/crm para gerenciar relacionamento com clientes');
  console.log('   3. Use a API /api/notificacoes para enviar mensagens');
  console.log('\n');

} catch (error) {
  db.exec('ROLLBACK');
  console.error('❌ Erro na migração:', error.message);
  process.exit(1);
} finally {
  db.close();
}
