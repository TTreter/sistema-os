/**
 * Script de Migração - Fase 3
 * Adiciona módulo Financeiro e Relatórios Avançados
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');
const db = new Database(dbPath);

console.log('🔄 Migrando banco de dados para Fase 3...\n');

try {
  // ====================
  // TABELA: Plano de Contas
  // ====================
  console.log('💰 Criando tabela de plano de contas...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS plano_contas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      descricao TEXT NOT NULL,
      tipo TEXT CHECK(tipo IN ('RECEITA', 'DESPESA')) NOT NULL,
      categoria TEXT NOT NULL,
      ativo INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_plano_contas_tipo ON plano_contas(tipo);

    -- Inserir plano de contas padrão
    INSERT OR IGNORE INTO plano_contas (codigo, descricao, tipo, categoria) VALUES
      ('1.01', 'Receita de Serviços', 'RECEITA', 'Serviços Automotivos'),
      ('1.02', 'Receita de Peças', 'RECEITA', 'Venda de Peças'),
      ('1.03', 'Outras Receitas', 'RECEITA', 'Diversas'),
      ('2.01', 'Compra de Peças', 'DESPESA', 'Custo de Mercadorias'),
      ('2.02', 'Salários e Encargos', 'DESPESA', 'Pessoal'),
      ('2.03', 'Aluguel', 'DESPESA', 'Ocupação'),
      ('2.04', 'Energia Elétrica', 'DESPESA', 'Utilidades'),
      ('2.05', 'Água', 'DESPESA', 'Utilidades'),
      ('2.06', 'Internet e Telefone', 'DESPESA', 'Comunicação'),
      ('2.07', 'Material de Escritório', 'DESPESA', 'Administrativo'),
      ('2.08', 'Manutenção de Equipamentos', 'DESPESA', 'Manutenção'),
      ('2.09', 'Combustível', 'DESPESA', 'Operacional'),
      ('2.10', 'Impostos e Taxas', 'DESPESA', 'Tributos'),
      ('2.11', 'Marketing e Publicidade', 'DESPESA', 'Comercial'),
      ('2.12', 'Outras Despesas', 'DESPESA', 'Diversas');
  `);

  // ====================
  // TABELA: Contas a Receber
  // ====================
  console.log('💵 Criando tabela de contas a receber...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS contas_receber (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id INTEGER,
      cliente_id INTEGER NOT NULL,
      plano_conta_id INTEGER NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      data_emissao DATE NOT NULL,
      data_vencimento DATE NOT NULL,
      data_recebimento DATE,
      status TEXT DEFAULT 'ABERTO' CHECK(status IN ('ABERTO', 'RECEBIDO', 'ATRASADO', 'CANCELADO')),
      forma_recebimento TEXT,
      observacoes TEXT,
      FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (plano_conta_id) REFERENCES plano_contas(id)
    );

    CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON contas_receber(status);
    CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON contas_receber(data_vencimento);
    CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente ON contas_receber(cliente_id);
  `);

  // ====================
  // TABELA: Contas a Pagar
  // ====================
  console.log('💸 Criando tabela de contas a pagar...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS contas_pagar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oc_id INTEGER,
      fornecedor_id INTEGER,
      plano_conta_id INTEGER NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      data_emissao DATE NOT NULL,
      data_vencimento DATE NOT NULL,
      data_pagamento DATE,
      status TEXT DEFAULT 'ABERTO' CHECK(status IN ('ABERTO', 'PAGO', 'ATRASADO', 'CANCELADO')),
      forma_pagamento TEXT,
      observacoes TEXT,
      FOREIGN KEY (oc_id) REFERENCES ordens_compra(id),
      FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
      FOREIGN KEY (plano_conta_id) REFERENCES plano_contas(id)
    );

    CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
    CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
    CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON contas_pagar(fornecedor_id);
  `);

  // ====================
  // TABELA: Fluxo de Caixa
  // ====================
  console.log('📊 Criando tabela de fluxo de caixa...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS fluxo_caixa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data DATE NOT NULL,
      tipo TEXT CHECK(tipo IN ('ENTRADA', 'SAIDA')) NOT NULL,
      categoria TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      referencia_tipo TEXT,
      referencia_id INTEGER,
      plano_conta_id INTEGER,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plano_conta_id) REFERENCES plano_contas(id)
    );

    CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_data ON fluxo_caixa(data);
    CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_tipo ON fluxo_caixa(tipo);
  `);

  // ====================
  // TRIGGERS: Atualizar status de contas atrasadas
  // ====================
  db.exec(`
    -- Não é possível criar triggers baseados em tempo no SQLite
    -- A atualização de status atrasado será feita via consulta
  `);

  // ====================
  // TRIGGERS: Registrar no fluxo de caixa ao receber/pagar
  // ====================
  db.exec(`
    -- Trigger para registrar recebimento no fluxo de caixa
    CREATE TRIGGER IF NOT EXISTS trg_registrar_recebimento_fluxo
    AFTER UPDATE OF status ON contas_receber
    WHEN NEW.status = 'RECEBIDO' AND OLD.status != 'RECEBIDO'
    BEGIN
      INSERT INTO fluxo_caixa (data, tipo, categoria, descricao, valor, referencia_tipo, referencia_id, plano_conta_id)
      SELECT 
        NEW.data_recebimento,
        'ENTRADA',
        pc.categoria,
        NEW.descricao,
        NEW.valor,
        'CONTA_RECEBER',
        NEW.id,
        NEW.plano_conta_id
      FROM plano_contas pc
      WHERE pc.id = NEW.plano_conta_id;
    END;

    -- Trigger para registrar pagamento no fluxo de caixa
    CREATE TRIGGER IF NOT EXISTS trg_registrar_pagamento_fluxo
    AFTER UPDATE OF status ON contas_pagar
    WHEN NEW.status = 'PAGO' AND OLD.status != 'PAGO'
    BEGIN
      INSERT INTO fluxo_caixa (data, tipo, categoria, descricao, valor, referencia_tipo, referencia_id, plano_conta_id)
      SELECT 
        NEW.data_pagamento,
        'SAIDA',
        pc.categoria,
        NEW.descricao,
        NEW.valor,
        'CONTA_PAGAR',
        NEW.id,
        NEW.plano_conta_id
      FROM plano_contas pc
      WHERE pc.id = NEW.plano_conta_id;
    END;

    -- Trigger para criar conta a receber ao finalizar OS
    CREATE TRIGGER IF NOT EXISTS trg_criar_conta_receber_os
    AFTER UPDATE OF status ON ordens_servico
    WHEN NEW.status = 'FINALIZADA' AND OLD.status != 'FINALIZADA' AND NEW.valor_total > 0
    BEGIN
      INSERT INTO contas_receber (os_id, cliente_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento)
      VALUES (
        NEW.id,
        NEW.cliente_id,
        (SELECT id FROM plano_contas WHERE codigo = '1.01' LIMIT 1),
        'OS ' || NEW.numero || ' - ' || (SELECT nome FROM clientes WHERE id = NEW.cliente_id),
        NEW.valor_total,
        DATE('now'),
        DATE('now', '+30 days')
      );
    END;
  `);

  // ====================
  // VIEWS: Consultas financeiras
  // ====================
  db.exec(`
    -- View de contas a receber com informações completas
    CREATE VIEW IF NOT EXISTS v_contas_receber AS
    SELECT
      cr.id,
      cr.os_id,
      cr.descricao,
      cr.valor,
      cr.data_emissao,
      cr.data_vencimento,
      cr.data_recebimento,
      cr.status,
      cr.forma_recebimento,
      c.nome AS cliente_nome,
      c.telefone AS cliente_telefone,
      pc.descricao AS plano_conta_descricao,
      pc.categoria AS plano_conta_categoria,
      CASE 
        WHEN cr.status = 'ABERTO' AND DATE(cr.data_vencimento) < DATE('now') THEN 1
        ELSE 0
      END AS atrasado,
      CAST(julianday('now') - julianday(cr.data_vencimento) AS INTEGER) AS dias_atraso
    FROM contas_receber cr
    INNER JOIN clientes c ON cr.cliente_id = c.id
    INNER JOIN plano_contas pc ON cr.plano_conta_id = pc.id;

    -- View de contas a pagar com informações completas
    CREATE VIEW IF NOT EXISTS v_contas_pagar AS
    SELECT
      cp.id,
      cp.oc_id,
      cp.descricao,
      cp.valor,
      cp.data_emissao,
      cp.data_vencimento,
      cp.data_pagamento,
      cp.status,
      cp.forma_pagamento,
      f.nome AS fornecedor_nome,
      f.telefone AS fornecedor_telefone,
      pc.descricao AS plano_conta_descricao,
      pc.categoria AS plano_conta_categoria,
      CASE 
        WHEN cp.status = 'ABERTO' AND DATE(cp.data_vencimento) < DATE('now') THEN 1
        ELSE 0
      END AS atrasado,
      CAST(julianday('now') - julianday(cp.data_vencimento) AS INTEGER) AS dias_atraso
    FROM contas_pagar cp
    LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
    INNER JOIN plano_contas pc ON cp.plano_conta_id = pc.id;

    -- View de fluxo de caixa consolidado
    CREATE VIEW IF NOT EXISTS v_fluxo_caixa_consolidado AS
    SELECT
      DATE(data) as data,
      SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE 0 END) as total_entradas,
      SUM(CASE WHEN tipo = 'SAIDA' THEN valor ELSE 0 END) as total_saidas,
      SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE -valor END) as saldo_dia
    FROM fluxo_caixa
    GROUP BY DATE(data)
    ORDER BY data;

    -- View de rentabilidade por OS
    CREATE VIEW IF NOT EXISTS v_rentabilidade_os AS
    SELECT
      os.id,
      os.numero,
      os.data_abertura,
      os.data_conclusao,
      os.status,
      c.nome AS cliente_nome,
      v.placa,
      os.valor_servicos AS receita_servicos,
      os.valor_pecas AS receita_pecas,
      (SELECT COALESCE(SUM(op.quantidade * p.preco_custo), 0)
       FROM os_pecas op
       INNER JOIN pecas p ON op.peca_id = p.id
       WHERE op.os_id = os.id) AS custo_pecas,
      os.valor_servicos + os.valor_pecas AS receita_total,
      (SELECT COALESCE(SUM(op.quantidade * p.preco_custo), 0)
       FROM os_pecas op
       INNER JOIN pecas p ON op.peca_id = p.id
       WHERE op.os_id = os.id) AS custo_total,
      (os.valor_servicos + os.valor_pecas) - 
      (SELECT COALESCE(SUM(op.quantidade * p.preco_custo), 0)
       FROM os_pecas op
       INNER JOIN pecas p ON op.peca_id = p.id
       WHERE op.os_id = os.id) AS lucro_bruto,
      CASE 
        WHEN (os.valor_servicos + os.valor_pecas) > 0 THEN
          ROUND(((os.valor_servicos + os.valor_pecas) - 
          (SELECT COALESCE(SUM(op.quantidade * p.preco_custo), 0)
           FROM os_pecas op
           INNER JOIN pecas p ON op.peca_id = p.id
           WHERE op.os_id = os.id)) * 100.0 / (os.valor_servicos + os.valor_pecas), 2)
        ELSE 0
      END AS margem_lucro_percentual
    FROM ordens_servico os
    INNER JOIN clientes c ON os.cliente_id = c.id
    INNER JOIN veiculos v ON os.veiculo_id = v.id
    WHERE os.status = 'FINALIZADA';

    -- View de performance por mecânico
    CREATE VIEW IF NOT EXISTS v_performance_mecanico AS
    SELECT
      m.id,
      m.nome AS mecanico_nome,
      COUNT(os.id) AS total_os,
      SUM(os.valor_total) AS valor_total_servicos,
      AVG(os.valor_total) AS ticket_medio,
      SUM(CASE WHEN os.status = 'FINALIZADA' THEN 1 ELSE 0 END) AS os_finalizadas,
      AVG(CAST(julianday(os.data_conclusao) - julianday(os.data_abertura) AS REAL)) AS tempo_medio_dias
    FROM mecanicos m
    LEFT JOIN ordens_servico os ON m.id = os.mecanico_id
    WHERE m.ativo = 1
    GROUP BY m.id, m.nome;

    -- View de performance por categoria de serviço
    CREATE VIEW IF NOT EXISTS v_performance_categoria AS
    SELECT
      cs.id,
      cs.nome AS categoria_nome,
      COUNT(DISTINCT os.os_id) AS total_os,
      COUNT(os.id) AS total_servicos,
      SUM(os.valor_total) AS faturamento_total,
      AVG(os.valor_total) AS valor_medio_servico,
      SUM(os.quantidade) AS quantidade_total
    FROM categorias_servico cs
    INNER JOIN tipos_servico ts ON cs.id = ts.categoria_id
    INNER JOIN os_servicos os ON ts.id = os.tipo_servico_id
    GROUP BY cs.id, cs.nome
    ORDER BY faturamento_total DESC;
  `);

  console.log('✅ Tabelas financeiras criadas');
  console.log('✅ Triggers configurados');
  console.log('✅ Views de relatórios criadas');
  console.log('✅ Plano de contas padrão inserido\n');

  // Verificar tabelas criadas
  const novasTables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name IN ('plano_contas', 'contas_receber', 'contas_pagar', 'fluxo_caixa')
  `).all();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Migração para Fase 3 concluída com sucesso!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 Novas tabelas criadas:');
  novasTables.forEach(t => console.log(`   ✅ ${t.name}`));
  console.log('\n🎉 Sistema pronto para Fase 3 - Inteligência de Negócios!\n');

} catch (error) {
  console.error('❌ Erro na migração:', error.message);
  process.exit(1);
} finally {
  db.close();
}
