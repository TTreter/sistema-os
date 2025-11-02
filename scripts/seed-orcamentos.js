/**
 * Script para popular orçamentos de exemplo - Fase 2
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');
const db = new Database(dbPath);

console.log('🌱 Populando orçamentos de exemplo...\n');

try {
  // ====================
  // ORÇAMENTOS DE EXEMPLO
  // ====================
  console.log('📋 Inserindo orçamentos...');

  // Calcular data de validade (15 dias)
  const dataValidade = new Date();
  dataValidade.setDate(dataValidade.getDate() + 15);
  const dataValidadeStr = dataValidade.toISOString().split('T')[0];

  // Orçamento 1 - Pendente
  const orc1 = db.prepare(`
    INSERT INTO orcamentos (numero, cliente_id, veiculo_id, status, data_validade, descricao_problema, observacoes)
    VALUES ('ORC2024-0001', 5, 6, 'PENDENTE', ?, 'Cliente solicitou orçamento para troca de embreagem', 'Cliente pediu prazo de pagamento')
  `).run(dataValidadeStr);

  db.prepare('INSERT INTO orcamento_servicos (orcamento_id, tipo_servico_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(orc1.lastInsertRowid, 5, 1, 450.00); // Troca embreagem estimada
  db.prepare('INSERT INTO orcamento_pecas (orcamento_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(orc1.lastInsertRowid, 4, 1, 180.00); // Correia dentada

  // Orçamento 2 - Enviado ao cliente
  const orc2 = db.prepare(`
    INSERT INTO orcamentos (numero, cliente_id, veiculo_id, status, data_validade, descricao_problema)
    VALUES ('ORC2024-0002', 2, 3, 'ENVIADO', ?, 'Troca de amortecedores traseiros')
  `).run(dataValidadeStr);

  db.prepare('INSERT INTO orcamento_servicos (orcamento_id, tipo_servico_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(orc2.lastInsertRowid, 7, 1, 200.00); // Troca amortecedores
  db.prepare('INSERT INTO orcamento_pecas (orcamento_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(orc2.lastInsertRowid, 9, 2, 320.00); // 2 amortecedores

  // Orçamento 3 - Aprovado pelo cliente
  const orc3 = db.prepare(`
    INSERT INTO orcamentos (numero, cliente_id, veiculo_id, status, data_validade, descricao_problema, valor_desconto)
    VALUES ('ORC2024-0003', 4, 5, 'APROVADO', ?, 'Revisão completa com troca de óleo', 50.00)
  `).run(dataValidadeStr);

  db.prepare('INSERT INTO orcamento_servicos (orcamento_id, tipo_servico_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(orc3.lastInsertRowid, 12, 1, 350.00); // Revisão preventiva
  db.prepare('INSERT INTO orcamento_pecas (orcamento_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(orc3.lastInsertRowid, 1, 1, 35.00); // Filtro óleo
  db.prepare('INSERT INTO orcamento_pecas (orcamento_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(orc3.lastInsertRowid, 6, 1, 45.00); // Filtro ar
  db.prepare('INSERT INTO orcamento_pecas (orcamento_id, peca_id, quantidade, valor_unitario) VALUES (?, ?, ?, ?)').run(orc3.lastInsertRowid, 7, 4, 65.00); // 4L óleo

  // Orçamento 4 - Recusado
  const dataVencida = new Date();
  dataVencida.setDate(dataVencida.getDate() - 5);
  const dataVencidaStr = dataVencida.toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO orcamentos (numero, cliente_id, veiculo_id, status, data_validade, descricao_problema)
    VALUES ('ORC2024-0004', 1, 2, 'RECUSADO', ?, 'Troca de pneus')
  `).run(dataVencidaStr);

  console.log('✅ 4 orçamentos inseridos\n');

  // ====================
  // MOVIMENTAÇÕES DE ESTOQUE MANUAIS
  // ====================
  console.log('📦 Inserindo movimentações de estoque...');

  // Entrada de estoque
  db.prepare(`
    INSERT INTO estoque_movimentacoes (peca_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo, usuario)
    VALUES (7, 'ENTRADA', 10, 5, 15, 'Compra de emergência', 'admin')
  `).run();

  // Ajuste de estoque
  db.prepare(`
    INSERT INTO estoque_movimentacoes (peca_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo, usuario, observacoes)
    VALUES (3, 'AJUSTE', 2, 10, 12, 'Correção de inventário', 'admin', 'Encontrado estoque não registrado')
  `).run();

  // Atualizar estoque das peças manualmente ajustadas
  db.prepare('UPDATE pecas SET estoque_atual = 15 WHERE id = 7').run();
  db.prepare('UPDATE pecas SET estoque_atual = 12 WHERE id = 3').run();

  console.log('✅ Movimentações de estoque inseridas\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Dados da Fase 2 populados com sucesso!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 Resumo dos dados inseridos:');
  console.log('   - 4 Orçamentos (PENDENTE, ENVIADO, APROVADO, RECUSADO)');
  console.log('   - Serviços e peças vinculadas aos orçamentos');
  console.log('   - Movimentações de estoque de exemplo');
  console.log('\n🎉 Sistema Fase 2 pronto para testes!\n');

} catch (error) {
  console.error('❌ Erro ao popular dados:', error.message);
  process.exit(1);
} finally {
  db.close();
}
