/**
 * Script para popular dados financeiros de exemplo - Fase 3
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/oficina.db');
const db = new Database(dbPath);

console.log('🌱 Populando dados financeiros de exemplo...\n');

try {
  // ====================
  // CONTAS A PAGAR
  // ====================
  console.log('💸 Inserindo contas a pagar...');

  const hoje = new Date().toISOString().split('T')[0];
  const vencimento30 = new Date();
  vencimento30.setDate(vencimento30.getDate() + 30);
  const venc30Str = vencimento30.toISOString().split('T')[0];

  // Conta paga (aluguel)
  db.prepare(`
    INSERT INTO contas_pagar (fornecedor_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento, data_pagamento, status, forma_pagamento)
    VALUES (NULL, (SELECT id FROM plano_contas WHERE codigo = '2.03'), 'Aluguel - Janeiro 2024', 3500.00, '2024-01-01', '2024-01-10', '2024-01-08', 'PAGO', 'Transferência')
  `).run();

  // Conta em aberto (energia)
  db.prepare(`
    INSERT INTO contas_pagar (fornecedor_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento, status)
    VALUES (NULL, (SELECT id FROM plano_contas WHERE codigo = '2.04'), 'Energia Elétrica - Janeiro 2024', 850.00, ?, ?, 'ABERTO')
  `).run(hoje, venc30Str);

  // Conta atrasada (fornecedor)
  db.prepare(`
    INSERT INTO contas_pagar (fornecedor_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento, status)
    VALUES (1, (SELECT id FROM plano_contas WHERE codigo = '2.01'), 'Compra de peças - Lote 123', 4500.00, '2024-01-05', '2024-01-20', 'ABERTO')
  `).run();

  console.log('✅ 3 contas a pagar inseridas\n');

  // ====================
  // CONTAS A RECEBER
  // ====================
  console.log('💵 Inserindo contas a receber...');

  // Buscar uma OS finalizada
  const osFinalizada = db.prepare("SELECT id, cliente_id, valor_total FROM ordens_servico WHERE status = 'FINALIZADA' LIMIT 1").get();

  if (osFinalizada) {
    // Conta recebida
    db.prepare(`
      INSERT INTO contas_receber (os_id, cliente_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento, data_recebimento, status, forma_recebimento)
      VALUES (?, ?, (SELECT id FROM plano_contas WHERE codigo = '1.01'), 'Pagamento OS finalizada', ?, '2024-01-10', '2024-02-10', '2024-02-05', 'RECEBIDO', 'Dinheiro')
    `).run(osFinalizada.id, osFinalizada.cliente_id, osFinalizada.valor_total);
  }

  // Conta em aberto
  db.prepare(`
    INSERT INTO contas_receber (os_id, cliente_id, plano_conta_id, descricao, valor, data_emissao, data_vencimento, status)
    VALUES (NULL, 2, (SELECT id FROM plano_contas WHERE codigo = '1.02'), 'Venda de peças avulsa', 350.00, ?, ?, 'ABERTO')
  `).run(hoje, venc30Str);

  console.log('✅ 2 contas a receber inseridas\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Dados financeiros populados com sucesso!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 Resumo dos dados inseridos:');
  console.log('   - 3 Contas a Pagar (1 PAGA, 1 ABERTA, 1 ATRASADA)');
  console.log('   - 2 Contas a Receber (1 RECEBIDA, 1 ABERTA)');
  console.log('   - Fluxo de caixa automaticamente registrado pelos triggers');
  console.log('\n🎉 Sistema Fase 3 pronto para testes!\n');

} catch (error) {
  console.error('❌ Erro ao popular dados:', error.message);
  process.exit(1);
} finally {
  db.close();
}
