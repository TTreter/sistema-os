/**
 * Servidor Principal - tGest - Sistema de Gestão de Oficinas
 * Aplicação Local com Node.js + Express + SQLite
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

// Importar rotas
const clientesRoutes = require('./routes/clientes');
const veiculosRoutes = require('./routes/veiculos');
const pecasRoutes = require('./routes/pecas');
const mecanicosRoutes = require('./routes/mecanicos');
const servicosRoutes = require('./routes/servicos');
const osRoutes = require('./routes/ordens-servico');
const fornecedoresRoutes = require('./routes/fornecedores');
const orcamentosRoutes = require('./routes/orcamentos');
const estoqueRoutes = require('./routes/estoque');
const financeiroRoutes = require('./routes/financeiro');
const relatoriosRoutes = require('./routes/relatorios');
// Fase 4 - CRM e Automações
const crmRoutes = require('./routes/crm');
const lembretesRoutes = require('./routes/lembretes');
const pesquisasRoutes = require('./routes/pesquisas');
const notificacoesRoutes = require('./routes/notificacoes');

// Configurações
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Permite acesso via IP local na rede

const app = express();

// Middlewares
app.use(compression()); // Compressão de respostas
app.use(cors()); // CORS habilitado para desenvolvimento
app.use(express.json({ limit: '50mb' })); // Body parser para JSON
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Body parser para forms

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Servir uploads (fotos do checklist)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Logger simples
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// =====================
// ROTAS DA API
// =====================

app.get('/api', (req, res) => {
  res.json({
    message: 'tGest - Sistema de Gestão de Oficinas - API',
    version: '4.0.0',
    fase: 'Fase 4 - CRM e Automações',
    endpoints: {
      clientes: '/api/clientes',
      veiculos: '/api/veiculos',
      pecas: '/api/pecas',
      mecanicos: '/api/mecanicos',
      servicos: '/api/servicos',
      ordens_servico: '/api/ordens-servico',
      fornecedores: '/api/fornecedores',
      orcamentos: '/api/orcamentos',
      estoque: '/api/estoque',
      financeiro: '/api/financeiro',
      relatorios: '/api/relatorios',
      crm: '/api/crm',
      lembretes: '/api/lembretes',
      pesquisas: '/api/pesquisas',
      notificacoes: '/api/notificacoes'
    }
  });
});

// Registrar rotas modulares
app.use('/api/clientes', clientesRoutes);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/pecas', pecasRoutes);
app.use('/api/mecanicos', mecanicosRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/ordens-servico', osRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/relatorios', relatoriosRoutes);
// Fase 4 - CRM e Automações
app.use('/api/crm', crmRoutes);
app.use('/api/lembretes', lembretesRoutes);
app.use('/api/pesquisas', pesquisasRoutes);
app.use('/api/notificacoes', notificacoesRoutes);

// Rota para busca rápida (placa ou nome de cliente)
app.get('/api/busca-rapida', (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Parâmetro de busca (q) é obrigatório' });
  }

  const Database = require('better-sqlite3');
  const db = new Database(path.join(__dirname, 'database/oficina.db'));

  try {
    // Buscar veículo por placa
    const veiculo = db.prepare(`
      SELECT v.*, c.nome AS cliente_nome
      FROM veiculos v
      INNER JOIN clientes c ON v.cliente_id = c.id
      WHERE v.placa LIKE ?
      LIMIT 1
    `).get(`%${q}%`);

    // Buscar clientes por nome
    const clientes = db.prepare(`
      SELECT * FROM clientes
      WHERE nome LIKE ?
      LIMIT 5
    `).all(`%${q}%`);

    res.json({
      veiculo: veiculo || null,
      clientes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    db.close();
  }
});

// =====================
// ROTA PRINCIPAL (SPA)
// =====================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// =====================
// TRATAMENTO DE ERROS
// =====================

app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message
  });
});

// =====================
// INICIALIZAÇÃO
// =====================

// Obter IP local da máquina
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // IPv4 e não loopback
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      🚗 tGest - Sistema de Gestão de Oficinas v3.0.0    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('✅ Servidor rodando com sucesso!\n');
  console.log('📍 Acesso Local (este computador):');
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://127.0.0.1:${PORT}\n`);
  console.log('🌐 Acesso na Rede Local (outros dispositivos):');
  console.log(`   http://${localIP}:${PORT}\n`);
  console.log('📚 API Endpoints:');
  console.log(`   http://localhost:${PORT}/api\n`);
  console.log('⚠️  Para parar o servidor, pressione CTRL+C\n');
  console.log('═══════════════════════════════════════════════════════════\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Servidor sendo encerrado...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Servidor sendo encerrado...');
  process.exit(0);
});
