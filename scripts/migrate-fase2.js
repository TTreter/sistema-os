/**
 * Script de Migração - Fase 2
 * Adiciona tabelas e funcionalidades de Orçamentos e Estoque Avançado
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');
const db = new Database(dbPath);

console.log('🔄 Migrando banco de dados para Fase 2...\n');

try {
  // ====================
  // TABELA: Orçamentos
  // ====================
  console.log('📋 Criando tabela de orçamentos...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS orcamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      cliente_id INTEGER NOT NULL,
      veiculo_id INTEGER NOT NULL,
      data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
      data_validade DATE,
      status TEXT DEFAULT 'PENDENTE' CHECK(status IN (
        'PENDENTE',
        'ENVIADO',
        'APROVADO',
        'RECUSADO',
        'EXPIRADO',
        'CONVERTIDO'
      )),
      descricao_problema TEXT,
      observacoes TEXT,
      valor_pecas REAL DEFAULT 0,
      valor_servicos REAL DEFAULT 0,
      valor_desconto REAL DEFAULT 0,
      valor_total REAL DEFAULT 0,
      os_id INTEGER,
      criado_por TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
      FOREIGN KEY (os_id) REFERENCES ordens_servico(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orcamentos_numero ON orcamentos(numero);
    CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente ON orcamentos(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);
  `);

  // ====================
  // TABELA: Itens do Orçamento - Serviços
  // ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS orcamento_servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orcamento_id INTEGER NOT NULL,
      tipo_servico_id INTEGER NOT NULL,
      descricao TEXT,
      quantidade REAL DEFAULT 1,
      valor_unitario REAL NOT NULL,
      valor_total REAL GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
      FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
      FOREIGN KEY (tipo_servico_id) REFERENCES tipos_servico(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orc_servicos_orcamento ON orcamento_servicos(orcamento_id);
  `);

  // ====================
  // TABELA: Itens do Orçamento - Peças
  // ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS orcamento_pecas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orcamento_id INTEGER NOT NULL,
      peca_id INTEGER NOT NULL,
      quantidade REAL NOT NULL,
      valor_unitario REAL NOT NULL,
      valor_total REAL GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
      FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
      FOREIGN KEY (peca_id) REFERENCES pecas(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orc_pecas_orcamento ON orcamento_pecas(orcamento_id);
  `);

  // ====================
  // TABELA: Histórico de Movimentação de Estoque
  // ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      peca_id INTEGER NOT NULL,
      tipo TEXT CHECK(tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE', 'DEVOLUCAO')) NOT NULL,
      quantidade REAL NOT NULL,
      estoque_anterior REAL NOT NULL,
      estoque_novo REAL NOT NULL,
      motivo TEXT NOT NULL,
      referencia_tipo TEXT,
      referencia_id INTEGER,
      usuario TEXT,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      observacoes TEXT,
      FOREIGN KEY (peca_id) REFERENCES pecas(id)
    );

    CREATE INDEX IF NOT EXISTS idx_estoque_mov_peca ON estoque_movimentacoes(peca_id);
    CREATE INDEX IF NOT EXISTS idx_estoque_mov_data ON estoque_movimentacoes(data_hora);
  `);

  // ====================
  // TRIGGERS: Atualizar totais do Orçamento
  // ====================
  db.exec(`
    -- Trigger para atualizar valor_pecas no orçamento
    CREATE TRIGGER IF NOT EXISTS trg_atualizar_valor_pecas_orcamento
    AFTER INSERT ON orcamento_pecas
    BEGIN
      UPDATE orcamentos
      SET valor_pecas = (
        SELECT COALESCE(SUM(valor_total), 0)
        FROM orcamento_pecas
        WHERE orcamento_id = NEW.orcamento_id
      ),
      valor_total = valor_pecas + valor_servicos - valor_desconto
      WHERE id = NEW.orcamento_id;
    END;

    -- Trigger para atualizar valor_servicos no orçamento
    CREATE TRIGGER IF NOT EXISTS trg_atualizar_valor_servicos_orcamento
    AFTER INSERT ON orcamento_servicos
    BEGIN
      UPDATE orcamentos
      SET valor_servicos = (
        SELECT COALESCE(SUM(valor_total), 0)
        FROM orcamento_servicos
        WHERE orcamento_id = NEW.orcamento_id
      ),
      valor_total = valor_pecas + valor_servicos - valor_desconto
      WHERE id = NEW.orcamento_id;
    END;

    -- Trigger para registrar movimentação ao adicionar peça na OS
    CREATE TRIGGER IF NOT EXISTS trg_registrar_saida_estoque_os
    AFTER INSERT ON os_pecas
    BEGIN
      INSERT INTO estoque_movimentacoes (
        peca_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo, referencia_tipo, referencia_id
      )
      SELECT 
        NEW.peca_id,
        'SAIDA',
        NEW.quantidade,
        p.estoque_atual + NEW.quantidade,
        p.estoque_atual,
        'Utilização em Ordem de Serviço',
        'OS',
        NEW.os_id
      FROM pecas p
      WHERE p.id = NEW.peca_id;
    END;

    -- Trigger para registrar movimentação ao receber ordem de compra
    CREATE TRIGGER IF NOT EXISTS trg_registrar_entrada_estoque_oc
    AFTER UPDATE OF status ON ordens_compra
    WHEN NEW.status = 'RECEBIDA' AND OLD.status != 'RECEBIDA'
    BEGIN
      INSERT INTO estoque_movimentacoes (peca_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo, referencia_tipo, referencia_id)
      SELECT 
        oci.peca_id,
        'ENTRADA',
        oci.quantidade,
        p.estoque_atual - oci.quantidade,
        p.estoque_atual,
        'Recebimento de Ordem de Compra',
        'OC',
        NEW.id
      FROM oc_itens oci
      INNER JOIN pecas p ON oci.peca_id = p.id
      WHERE oci.oc_id = NEW.id;
    END;
  `);

  // ====================
  // VIEWS: Consultas úteis
  // ====================
  db.exec(`
    -- View de orçamentos completos
    CREATE VIEW IF NOT EXISTS v_orcamentos_completos AS
    SELECT
      o.id,
      o.numero,
      o.status,
      o.data_criacao,
      o.data_validade,
      c.nome AS cliente_nome,
      c.telefone AS cliente_telefone,
      c.email AS cliente_email,
      v.placa,
      v.modelo,
      v.marca,
      o.valor_total,
      o.descricao_problema,
      CASE 
        WHEN DATE(o.data_validade) < DATE('now') AND o.status = 'PENDENTE' THEN 1
        WHEN DATE(o.data_validade) < DATE('now') AND o.status = 'ENVIADO' THEN 1
        ELSE 0
      END AS expirado
    FROM orcamentos o
    INNER JOIN clientes c ON o.cliente_id = c.id
    INNER JOIN veiculos v ON o.veiculo_id = v.id;

    -- View de movimentações de estoque com detalhes
    CREATE VIEW IF NOT EXISTS v_estoque_movimentacoes AS
    SELECT
      em.id,
      em.tipo,
      em.quantidade,
      em.estoque_anterior,
      em.estoque_novo,
      em.motivo,
      em.data_hora,
      p.codigo AS peca_codigo,
      p.nome AS peca_nome,
      em.referencia_tipo,
      em.referencia_id
    FROM estoque_movimentacoes em
    INNER JOIN pecas p ON em.peca_id = p.id;

    -- View de estatísticas de orçamentos
    CREATE VIEW IF NOT EXISTS v_estatisticas_orcamentos AS
    SELECT
      status,
      COUNT(*) as quantidade,
      SUM(valor_total) as valor_total
    FROM orcamentos
    GROUP BY status;
  `);

  // ====================
  // Adicionar campo de configuração de validade padrão de orçamento
  // ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      descricao TEXT,
      tipo TEXT CHECK(tipo IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON'))
    );

    INSERT OR IGNORE INTO configuracoes (chave, valor, descricao, tipo) VALUES
      ('orcamento_validade_dias', '15', 'Validade padrão de orçamentos (em dias)', 'NUMBER'),
      ('estoque_alerta_dias', '30', 'Dias para alertar sobre peças sem movimentação', 'NUMBER'),
      ('margem_lucro_padrao', '40', 'Margem de lucro padrão sobre peças (%)', 'NUMBER');
  `);

  console.log('✅ Tabela de orçamentos criada');
  console.log('✅ Tabela de movimentações de estoque criada');
  console.log('✅ Triggers atualizados');
  console.log('✅ Views criadas');
  console.log('✅ Configurações inicializadas\n');

  // Verificar tabelas criadas
  const novasTables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name IN ('orcamentos', 'orcamento_servicos', 'orcamento_pecas', 'estoque_movimentacoes', 'configuracoes')
  `).all();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Migração para Fase 2 concluída com sucesso!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 Novas tabelas criadas:');
  novasTables.forEach(t => console.log(`   ✅ ${t.name}`));
  console.log('\n🎉 Sistema pronto para Fase 2!\n');

} catch (error) {
  console.error('❌ Erro na migração:', error.message);
  process.exit(1);
} finally {
  db.close();
}
