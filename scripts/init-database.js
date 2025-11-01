/**
 * Script de inicialização do banco de dados
 * Cria todas as tabelas, triggers e índices necessários
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Garantir que o diretório database existe
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'oficina.db');
const db = new Database(dbPath);

console.log('🔧 Inicializando banco de dados SQLite...');

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// ====================
// TABELA: Clientes
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT UNIQUE,
    telefone TEXT NOT NULL,
    email TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    ativo INTEGER DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
  CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
`);

// ====================
// TABELA: Veículos
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS veiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    placa TEXT NOT NULL UNIQUE,
    modelo TEXT NOT NULL,
    marca TEXT NOT NULL,
    ano INTEGER,
    cor TEXT,
    km_atual INTEGER,
    chassis TEXT,
    observacoes TEXT,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  );

  CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
  CREATE INDEX IF NOT EXISTS idx_veiculos_cliente ON veiculos(cliente_id);
`);

// ====================
// TABELA: Categorias de Serviço
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS categorias_servico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    ativo INTEGER DEFAULT 1
  );

  -- Inserir categorias padrão
  INSERT OR IGNORE INTO categorias_servico (nome, descricao) VALUES
    ('Motor', 'Serviços relacionados ao motor'),
    ('Freios', 'Sistema de freios'),
    ('Suspensão', 'Sistema de suspensão e amortecedores'),
    ('Elétrica', 'Sistema elétrico e eletrônico'),
    ('Transmissão', 'Câmbio e embreagem'),
    ('Ar Condicionado', 'Sistema de climatização'),
    ('Pneus e Rodas', 'Troca e alinhamento'),
    ('Funilaria', 'Reparos de lataria'),
    ('Pintura', 'Serviços de pintura'),
    ('Revisão', 'Manutenções preventivas');
`);

// ====================
// TABELA: Tipos de Serviço
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS tipos_servico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_padrao REAL DEFAULT 0,
    tempo_estimado INTEGER DEFAULT 60,
    ativo INTEGER DEFAULT 1,
    FOREIGN KEY (categoria_id) REFERENCES categorias_servico(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tipos_servico_categoria ON tipos_servico(categoria_id);
`);

// ====================
// TABELA: Peças
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS pecas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE,
    nome TEXT NOT NULL,
    descricao TEXT,
    marca TEXT,
    preco_custo REAL DEFAULT 0,
    preco_venda REAL DEFAULT 0,
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 5,
    localizacao TEXT,
    ativo INTEGER DEFAULT 1,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_pecas_codigo ON pecas(codigo);
  CREATE INDEX IF NOT EXISTS idx_pecas_nome ON pecas(nome);
  CREATE INDEX IF NOT EXISTS idx_pecas_estoque ON pecas(estoque_atual);
`);

// ====================
// TABELA: Mecânicos
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS mecanicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE,
    telefone TEXT,
    especialidade TEXT,
    salario REAL,
    comissao_percentual REAL DEFAULT 0,
    data_admissao DATE,
    ativo INTEGER DEFAULT 1
  );
`);

// ====================
// TABELA: Ordens de Serviço (OS)
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS ordens_servico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL,
    cliente_id INTEGER NOT NULL,
    veiculo_id INTEGER NOT NULL,
    mecanico_id INTEGER,
    data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_prevista DATE,
    data_conclusao DATETIME,
    status TEXT DEFAULT 'AGUARDANDO_DIAGNOSTICO' CHECK(status IN (
      'AGUARDANDO_DIAGNOSTICO',
      'AGUARDANDO_APROVACAO',
      'EM_REPARO',
      'PRONTO_RETIRADA',
      'FINALIZADA',
      'CANCELADA'
    )),
    km_entrada INTEGER,
    problema_reportado TEXT,
    diagnostico TEXT,
    observacoes TEXT,
    valor_pecas REAL DEFAULT 0,
    valor_servicos REAL DEFAULT 0,
    valor_desconto REAL DEFAULT 0,
    valor_total REAL DEFAULT 0,
    forma_pagamento TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
    FOREIGN KEY (mecanico_id) REFERENCES mecanicos(id)
  );

  CREATE INDEX IF NOT EXISTS idx_os_numero ON ordens_servico(numero);
  CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_os_veiculo ON ordens_servico(veiculo_id);
  CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);
  CREATE INDEX IF NOT EXISTS idx_os_data ON ordens_servico(data_abertura);
`);

// ====================
// TABELA: Checklist de Entrada
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS checklist_entrada (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    os_id INTEGER NOT NULL,
    item TEXT NOT NULL,
    status TEXT CHECK(status IN ('OK', 'AVARIADO', 'NAO_VERIFICADO')),
    observacao TEXT,
    foto_url TEXT,
    FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_checklist_os ON checklist_entrada(os_id);
`);

// ====================
// TABELA: Serviços da OS
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS os_servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    os_id INTEGER NOT NULL,
    tipo_servico_id INTEGER NOT NULL,
    descricao TEXT,
    quantidade REAL DEFAULT 1,
    valor_unitario REAL NOT NULL,
    valor_total REAL GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_servico_id) REFERENCES tipos_servico(id)
  );

  CREATE INDEX IF NOT EXISTS idx_os_servicos_os ON os_servicos(os_id);
`);

// ====================
// TABELA: Peças da OS
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS os_pecas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    os_id INTEGER NOT NULL,
    peca_id INTEGER NOT NULL,
    quantidade REAL NOT NULL,
    valor_unitario REAL NOT NULL,
    valor_total REAL GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
    FOREIGN KEY (peca_id) REFERENCES pecas(id)
  );

  CREATE INDEX IF NOT EXISTS idx_os_pecas_os ON os_pecas(os_id);
`);

// ====================
// TABELA: Histórico de Comunicação
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS historico_comunicacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    os_id INTEGER NOT NULL,
    tipo TEXT CHECK(tipo IN ('EMAIL', 'SMS', 'WHATSAPP', 'TELEFONE', 'SISTEMA')),
    mensagem TEXT NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    enviado_por TEXT,
    FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_historico_os ON historico_comunicacao(os_id);
`);

// ====================
// TABELA: Fornecedores
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    contato_responsavel TEXT,
    observacoes TEXT,
    ativo INTEGER DEFAULT 1,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ====================
// TABELA: Ordens de Compra
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS ordens_compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE NOT NULL,
    fornecedor_id INTEGER NOT NULL,
    data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_prevista_entrega DATE,
    data_entrega DATETIME,
    status TEXT DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'APROVADA', 'RECEBIDA', 'CANCELADA')),
    valor_total REAL DEFAULT 0,
    observacoes TEXT,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
  );

  CREATE INDEX IF NOT EXISTS idx_oc_numero ON ordens_compra(numero);
  CREATE INDEX IF NOT EXISTS idx_oc_fornecedor ON ordens_compra(fornecedor_id);
`);

// ====================
// TABELA: Itens da Ordem de Compra
// ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS oc_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oc_id INTEGER NOT NULL,
    peca_id INTEGER NOT NULL,
    quantidade REAL NOT NULL,
    valor_unitario REAL NOT NULL,
    valor_total REAL GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    FOREIGN KEY (oc_id) REFERENCES ordens_compra(id) ON DELETE CASCADE,
    FOREIGN KEY (peca_id) REFERENCES pecas(id)
  );
`);

// ====================
// TRIGGERS: Atualizar totais da OS
// ====================
db.exec(`
  -- Trigger para atualizar valor_pecas na OS
  CREATE TRIGGER IF NOT EXISTS trg_atualizar_valor_pecas_os
  AFTER INSERT ON os_pecas
  BEGIN
    UPDATE ordens_servico
    SET valor_pecas = (
      SELECT COALESCE(SUM(valor_total), 0)
      FROM os_pecas
      WHERE os_id = NEW.os_id
    ),
    valor_total = valor_pecas + valor_servicos - valor_desconto
    WHERE id = NEW.os_id;
  END;

  -- Trigger para atualizar valor_servicos na OS
  CREATE TRIGGER IF NOT EXISTS trg_atualizar_valor_servicos_os
  AFTER INSERT ON os_servicos
  BEGIN
    UPDATE ordens_servico
    SET valor_servicos = (
      SELECT COALESCE(SUM(valor_total), 0)
      FROM os_servicos
      WHERE os_id = NEW.os_id
    ),
    valor_total = valor_pecas + valor_servicos - valor_desconto
    WHERE id = NEW.os_id;
  END;

  -- Trigger para dar baixa no estoque ao adicionar peça na OS
  CREATE TRIGGER IF NOT EXISTS trg_baixa_estoque_peca
  AFTER INSERT ON os_pecas
  BEGIN
    UPDATE pecas
    SET estoque_atual = estoque_atual - NEW.quantidade
    WHERE id = NEW.peca_id;
  END;

  -- Trigger para atualizar estoque ao receber ordem de compra
  CREATE TRIGGER IF NOT EXISTS trg_entrada_estoque_oc
  AFTER UPDATE OF status ON ordens_compra
  WHEN NEW.status = 'RECEBIDA' AND OLD.status != 'RECEBIDA'
  BEGIN
    UPDATE pecas
    SET estoque_atual = estoque_atual + (
      SELECT quantidade
      FROM oc_itens
      WHERE oc_id = NEW.id AND peca_id = pecas.id
    )
    WHERE id IN (
      SELECT peca_id FROM oc_itens WHERE oc_id = NEW.id
    );
  END;
`);

// ====================
// VIEWS: Consultas úteis
// ====================
db.exec(`
  -- View de OS com informações completas
  CREATE VIEW IF NOT EXISTS v_os_completa AS
  SELECT
    os.id,
    os.numero,
    os.status,
    os.data_abertura,
    os.data_conclusao,
    c.nome AS cliente_nome,
    c.telefone AS cliente_telefone,
    v.placa,
    v.modelo,
    v.marca,
    m.nome AS mecanico_nome,
    os.valor_total,
    os.km_entrada
  FROM ordens_servico os
  INNER JOIN clientes c ON os.cliente_id = c.id
  INNER JOIN veiculos v ON os.veiculo_id = v.id
  LEFT JOIN mecanicos m ON os.mecanico_id = m.id;

  -- View de peças com estoque baixo
  CREATE VIEW IF NOT EXISTS v_pecas_estoque_baixo AS
  SELECT
    id,
    codigo,
    nome,
    marca,
    estoque_atual,
    estoque_minimo,
    preco_venda
  FROM pecas
  WHERE estoque_atual <= estoque_minimo AND ativo = 1;

  -- View de OS por status (para o Kanban)
  CREATE VIEW IF NOT EXISTS v_os_kanban AS
  SELECT
    os.id,
    os.numero,
    os.status,
    c.nome AS cliente_nome,
    v.placa,
    v.modelo,
    os.data_abertura,
    CAST(julianday('now') - julianday(os.data_abertura) AS INTEGER) AS dias_aberta
  FROM ordens_servico os
  INNER JOIN clientes c ON os.cliente_id = c.id
  INNER JOIN veiculos v ON os.veiculo_id = v.id
  WHERE os.status != 'FINALIZADA' AND os.status != 'CANCELADA';
`);

console.log('✅ Banco de dados inicializado com sucesso!');
console.log(`📍 Localização: ${dbPath}`);

// Mostrar estatísticas
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log(`📊 Total de tabelas criadas: ${tables.length}`);
tables.forEach(t => console.log(`   - ${t.name}`));

db.close();
console.log('🔒 Conexão com banco de dados fechada.');
