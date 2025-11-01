/**
 * Script para popular o banco de dados com dados de exemplo
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');
const db = new Database(dbPath);

console.log('🌱 Populando banco de dados com dados de exemplo...\n');

try {
  // ====================
  // CLIENTES
  // ====================
  console.log('📋 Inserindo clientes...');
  const clientes = [
    ['João Silva', '123.456.789-00', '(11) 98765-4321', 'joao.silva@email.com', 'Rua A, 123', 'São Paulo', 'SP', '01234-567', 'Cliente VIP'],
    ['Maria Santos', '987.654.321-00', '(11) 97654-3210', 'maria.santos@email.com', 'Av. B, 456', 'São Paulo', 'SP', '01234-568', null],
    ['Pedro Oliveira', '456.789.123-00', '(11) 96543-2109', 'pedro@email.com', 'Rua C, 789', 'Guarulhos', 'SP', '07012-345', null],
    ['Ana Costa', '789.123.456-00', '(11) 95432-1098', 'ana.costa@email.com', 'Av. D, 321', 'São Paulo', 'SP', '01234-569', null],
    ['Carlos Ferreira', '321.654.987-00', '(11) 94321-0987', 'carlos.f@email.com', 'Rua E, 654', 'Osasco', 'SP', '06010-123', 'Prefere atendimento pela manhã']
  ];

  const stmtCliente = db.prepare(`
    INSERT INTO clientes (nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  clientes.forEach(c => stmtCliente.run(c));
  console.log(`✅ ${clientes.length} clientes inseridos\n`);

  // ====================
  // VEÍCULOS
  // ====================
  console.log('🚗 Inserindo veículos...');
  const veiculos = [
    [1, 'ABC-1234', 'Civic', 'Honda', 2020, 'Prata', 45000, '9BWZZZ377VT004251'],
    [1, 'DEF-5678', 'Corolla', 'Toyota', 2019, 'Branco', 62000, '9BR53ZEC8K8041234'],
    [2, 'GHI-9012', 'Onix', 'Chevrolet', 2021, 'Preto', 28000, '9BFZT5FA0M8012345'],
    [3, 'JKL-3456', 'HB20', 'Hyundai', 2018, 'Vermelho', 75000, '9BHBH41JP9P012345'],
    [4, 'MNO-7890', 'Gol', 'Volkswagen', 2017, 'Azul', 95000, '9BWAA05U17P012345'],
    [5, 'PQR-2345', 'Palio', 'Fiat', 2016, 'Branco', 110000, '9BD178116G2012345']
  ];

  const stmtVeiculo = db.prepare(`
    INSERT INTO veiculos (cliente_id, placa, modelo, marca, ano, cor, km_atual, chassis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  veiculos.forEach(v => stmtVeiculo.run(v));
  console.log(`✅ ${veiculos.length} veículos inseridos\n`);

  // ====================
  // MECÂNICOS
  // ====================
  console.log('👨‍🔧 Inserindo mecânicos...');
  const mecanicos = [
    ['José Martins', '111.222.333-44', '(11) 91111-2222', 'Motor e Câmbio', 3500.00, 5.0, '2020-01-15'],
    ['Ricardo Alves', '222.333.444-55', '(11) 92222-3333', 'Elétrica e Injeção', 3200.00, 5.0, '2019-05-20'],
    ['Fernando Lima', '333.444.555-66', '(11) 93333-4444', 'Suspensão e Freios', 3000.00, 5.0, '2021-03-10']
  ];

  const stmtMecanico = db.prepare(`
    INSERT INTO mecanicos (nome, cpf, telefone, especialidade, salario, comissao_percentual, data_admissao)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  mecanicos.forEach(m => stmtMecanico.run(m));
  console.log(`✅ ${mecanicos.length} mecânicos inseridos\n`);

  // ====================
  // PEÇAS
  // ====================
  console.log('🔧 Inserindo peças...');
  const pecas = [
    ['P001', 'Filtro de Óleo', 'Filtro de óleo do motor', 'Mann', 15.00, 35.00, 25, 10, 'Prateleira A1'],
    ['P002', 'Pastilha de Freio Dianteira', 'Jogo de pastilhas', 'Bosch', 80.00, 150.00, 15, 8, 'Prateleira B2'],
    ['P003', 'Disco de Freio', 'Par de discos ventilados', 'Fremax', 120.00, 220.00, 10, 6, 'Prateleira B3'],
    ['P004', 'Correia Dentada', 'Correia com 142 dentes', 'Gates', 90.00, 180.00, 8, 5, 'Prateleira C1'],
    ['P005', 'Vela de Ignição', 'Vela iridium', 'NGK', 25.00, 55.00, 30, 12, 'Prateleira D1'],
    ['P006', 'Filtro de Ar', 'Filtro de ar do motor', 'Tecfil', 20.00, 45.00, 20, 10, 'Prateleira A2'],
    ['P007', 'Óleo Motor 5W30', 'Óleo sintético 1L', 'Mobil', 35.00, 65.00, 5, 15, 'Estoque Principal'],
    ['P008', 'Bateria 60Ah', 'Bateria selada', 'Moura', 280.00, 450.00, 4, 5, 'Estoque Principal'],
    ['P009', 'Amortecedor Dianteiro', 'Par de amortecedores', 'Monroe', 180.00, 320.00, 6, 4, 'Prateleira E1'],
    ['P010', 'Lâmpada H4', 'Lâmpada farol', 'Philips', 15.00, 30.00, 35, 15, 'Prateleira F1']
  ];

  const stmtPeca = db.prepare(`
    INSERT INTO pecas (codigo, nome, descricao, marca, preco_custo, preco_venda, estoque_atual, estoque_minimo, localizacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  pecas.forEach(p => stmtPeca.run(p));
  console.log(`✅ ${pecas.length} peças inseridas\n`);

  // ====================
  // TIPOS DE SERVIÇO
  // ====================
  console.log('🛠️ Inserindo tipos de serviço...');
  const servicos = [
    [1, 'Troca de Óleo e Filtro', 'Troca de óleo do motor e filtro', 80.00, 30],
    [1, 'Troca de Correia Dentada', 'Substituição da correia dentada', 250.00, 120],
    [1, 'Retífica de Motor', 'Retífica completa do motor', 2500.00, 480],
    [2, 'Troca de Pastilhas de Freio', 'Substituição das pastilhas dianteiras', 120.00, 60],
    [2, 'Troca de Disco de Freio', 'Substituição dos discos ventilados', 150.00, 90],
    [2, 'Sangria do Sistema de Freio', 'Sangria e troca de fluido', 80.00, 45],
    [3, 'Troca de Amortecedores', 'Substituição dos amortecedores', 200.00, 120],
    [3, 'Alinhamento e Balanceamento', 'Alinhamento de direção e balanceamento de rodas', 100.00, 60],
    [4, 'Diagnóstico de Injeção Eletrônica', 'Leitura de códigos e diagnóstico', 150.00, 60],
    [4, 'Troca de Bateria', 'Substituição e teste da bateria', 50.00, 30],
    [7, 'Montagem de Pneus', 'Montagem e balanceamento de 4 pneus', 80.00, 45],
    [10, 'Revisão Preventiva', 'Revisão completa do veículo', 350.00, 180]
  ];

  const stmtServico = db.prepare(`
    INSERT INTO tipos_servico (categoria_id, nome, descricao, preco_padrao, tempo_estimado)
    VALUES (?, ?, ?, ?, ?)
  `);

  servicos.forEach(s => stmtServico.run(s));
  console.log(`✅ ${servicos.length} tipos de serviço inseridos\n`);

  // ====================
  // FORNECEDORES
  // ====================
  console.log('🚚 Inserindo fornecedores...');
  const fornecedores = [
    ['Auto Peças Central', '12.345.678/0001-90', '(11) 4444-5555', 'vendas@autopecascentral.com.br', 'Av. Industrial, 1000', 'São Paulo', 'SP', 'João Vendedor'],
    ['Distribuidora Premium', '98.765.432/0001-10', '(11) 5555-6666', 'contato@premium.com.br', 'Rua Comércio, 500', 'Guarulhos', 'SP', 'Maria Comercial'],
    ['Peças & Cia', '45.678.901/0001-23', '(11) 6666-7777', 'vendas@pecasecia.com.br', 'Av. Marginal, 2000', 'Osasco', 'SP', 'Pedro Representante']
  ];

  const stmtFornecedor = db.prepare(`
    INSERT INTO fornecedores (nome, cnpj, telefone, email, endereco, cidade, estado, contato_responsavel)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  fornecedores.forEach(f => stmtFornecedor.run(f));
  console.log(`✅ ${fornecedores.length} fornecedores inseridos\n`);

  // ====================
  // ORDENS DE SERVIÇO DE EXEMPLO
  // ====================
  console.log('📝 Inserindo ordens de serviço de exemplo...');
  
  // OS 1 - Aguardando Diagnóstico
  db.prepare(`
    INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, mecanico_id, status, km_entrada, problema_reportado, observacoes)
    VALUES ('OS2024-0001', 1, 1, null, 'AGUARDANDO_DIAGNOSTICO', 45120, 'Motor falhando e luz de injeção acesa', 'Cliente relatou perda de potência')
  `).run();

  // OS 2 - Aguardando Aprovação
  const os2 = db.prepare(`
    INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, mecanico_id, status, km_entrada, problema_reportado, diagnostico, observacoes)
    VALUES ('OS2024-0002', 2, 3, 1, 'AGUARDANDO_APROVACAO', 28350, 'Barulho no motor ao acelerar', 
    'Identificado problema na correia dentada. Necessária substituição urgente.', 'Orçamento enviado ao cliente')
  `).run();

  // Adicionar serviços e peças da OS 2
  db.prepare('INSERT INTO os_servicos (os_id, tipo_servico_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(os2.lastInsertRowid, 2, 1, 250.00);
  db.prepare('INSERT INTO os_pecas (os_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(os2.lastInsertRowid, 4, 1, 180.00);

  // OS 3 - Em Reparo
  const os3 = db.prepare(`
    INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, mecanico_id, status, km_entrada, problema_reportado, diagnostico)
    VALUES ('OS2024-0003', 3, 4, 3, 'EM_REPARO', 75200, 'Freios fazendo barulho', 
    'Pastilhas gastas e discos riscados. Em processo de substituição.')
  `).run();

  db.prepare('INSERT INTO os_servicos (os_id, tipo_servico_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(os3.lastInsertRowid, 4, 1, 120.00);
  db.prepare('INSERT INTO os_servicos (os_id, tipo_servico_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(os3.lastInsertRowid, 5, 1, 150.00);
  db.prepare('INSERT INTO os_pecas (os_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(os3.lastInsertRowid, 2, 1, 150.00);
  db.prepare('INSERT INTO os_pecas (os_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(os3.lastInsertRowid, 3, 1, 220.00);

  // OS 4 - Pronto para Retirada
  const os4 = db.prepare(`
    INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, mecanico_id, status, km_entrada, problema_reportado, diagnostico)
    VALUES ('OS2024-0004', 4, 5, 1, 'PRONTO_RETIRADA', 95450, 'Revisão preventiva', 'Revisão completa realizada com sucesso.')
  `).run();

  db.prepare('INSERT INTO os_servicos (os_id, tipo_servico_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(os4.lastInsertRowid, 12, 1, 350.00);
  db.prepare('INSERT INTO os_pecas (os_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(os4.lastInsertRowid, 1, 1, 35.00);
  db.prepare('INSERT INTO os_pecas (os_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(os4.lastInsertRowid, 6, 1, 45.00);
  db.prepare('INSERT INTO os_pecas (os_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(os4.lastInsertRowid, 7, 4, 65.00);

  console.log('✅ 4 ordens de serviço inseridas\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Banco de dados populado com sucesso!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 Resumo dos dados inseridos:');
  console.log(`   - ${clientes.length} Clientes`);
  console.log(`   - ${veiculos.length} Veículos`);
  console.log(`   - ${mecanicos.length} Mecânicos`);
  console.log(`   - ${pecas.length} Peças`);
  console.log(`   - ${servicos.length} Tipos de Serviço`);
  console.log(`   - ${fornecedores.length} Fornecedores`);
  console.log(`   - 4 Ordens de Serviço`);
  console.log('\n🎉 Pronto para usar!\n');

} catch (error) {
  console.error('❌ Erro ao popular banco de dados:', error.message);
  process.exit(1);
} finally {
  db.close();
}
