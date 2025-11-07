// Configuração global do Axios
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Estado global da aplicação
const AppState = {
  currentPage: 'dashboard',
  currentData: null,
  clientes: [],
  veiculos: [],
  pecas: [],
  mecanicos: [],
  servicos: [],
  fornecedores: []
};

// Utilitários
const Utils = {
  formatCurrency: (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  },

  formatDate: (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  },

  formatDateTime: (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  },

  showToast: (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const bgColors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.className = `${bgColors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-in`;
    toast.innerHTML = `
      <i class="fas ${icons[type]}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  showLoading: () => {
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Carregando...</p>
        </div>
      </div>
    `;
  },

  getStatusBadge: (status) => {
    const statusMap = {
      'AGUARDANDO_DIAGNOSTICO': { color: 'yellow', text: 'Aguardando Diagnóstico' },
      'AGUARDANDO_APROVACAO': { color: 'orange', text: 'Aguardando Aprovação' },
      'EM_REPARO': { color: 'blue', text: 'Em Reparo' },
      'PRONTO_RETIRADA': { color: 'green', text: 'Pronto para Retirada' },
      'FINALIZADA': { color: 'gray', text: 'Finalizada' },
      'CANCELADA': { color: 'red', text: 'Cancelada' }
    };

    const info = statusMap[status] || { color: 'gray', text: status };
    
    return `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-${info.color}-100 text-${info.color}-800">${info.text}</span>`;
  }
};

// Gerenciador de Páginas
const PageManager = {
  async loadPage(pageName) {
    AppState.currentPage = pageName;
    
    // Atualizar sidebar
    document.querySelectorAll('[data-page]').forEach(link => {
      link.classList.remove('sidebar-active');
      if (link.dataset.page === pageName) {
        link.classList.add('sidebar-active');
      }
    });

    // Atualizar título
    const titles = {
      'dashboard': 'Dashboard',
      'ordens-servico': 'Ordens de Serviço',
      'kanban': 'Kanban - Fluxo de OS',
      'clientes': 'Clientes',
      'veiculos': 'Veículos',
      'pecas': 'Peças',
      'servicos': 'Tipos de Serviço',
      'mecanicos': 'Mecânicos',
      'fornecedores': 'Fornecedores'
    };
    
    document.getElementById('page-title').textContent = titles[pageName] || pageName;

    // Mostrar loading
    Utils.showLoading();

    // Carregar conteúdo da página
    try {
      switch (pageName) {
        case 'dashboard':
          await Pages.Dashboard.render();
          break;
        case 'ordens-servico':
          await Pages.OrdensServico.render();
          break;
        case 'kanban':
          await Pages.Kanban.render();
          break;
        case 'orcamentos':
          await Pages.Orcamentos.render();
          break;
        case 'clientes':
          await Pages.Clientes.render();
          break;
        case 'veiculos':
          await Pages.Veiculos.render();
          break;
        case 'pecas':
          await Pages.Pecas.render();
          break;
        case 'servicos':
          await Pages.Servicos.render();
          break;
        case 'mecanicos':
          await Pages.Mecanicos.render();
          break;
        case 'fornecedores':
          await Pages.Fornecedores.render();
          break;
        case 'estoque':
          await Pages.Estoque.render();
          break;
        case 'financeiro':
          await Pages.Financeiro.render();
          break;
        case 'relatorios':
          await Pages.Relatorios.render();
          break;
        case 'crm':
          await Pages.CRM.render();
          break;
        case 'lembretes':
          await Pages.Lembretes.render();
          break;
        case 'pesquisas':
          await Pages.Pesquisas.render();
          break;
        case 'notificacoes':
          await Pages.Notificacoes.render();
          break;
        default:
          document.getElementById('content').innerHTML = '<p class="text-center text-gray-500">Página não encontrada</p>';
      }
    } catch (error) {
      console.error('Erro ao carregar página:', error);
      Utils.showToast('Erro ao carregar página: ' + error.message, 'error');
    }
  }
};

// Definição das Páginas (será estendido nos próximos arquivos)
const Pages = {
  Dashboard: {
    async render() {
      const content = document.getElementById('content');
      
      // Buscar dados do dashboard
      const [osData, pecasBaixas] = await Promise.all([
        api.get('/ordens-servico/kanban'),
        api.get('/pecas?estoque_baixo=true')
      ]);

      const osKanban = osData.data;
      const totalOS = Object.values(osKanban).reduce((acc, arr) => acc + arr.length, 0);

      content.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- KPI Cards -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm">OS Abertas</p>
                <p class="text-3xl font-bold text-blue-600">${totalOS}</p>
              </div>
              <div class="bg-blue-100 rounded-full p-4">
                <i class="fas fa-clipboard-list text-blue-600 text-2xl"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm">Aguardando Aprovação</p>
                <p class="text-3xl font-bold text-orange-600">${osKanban.AGUARDANDO_APROVACAO.length}</p>
              </div>
              <div class="bg-orange-100 rounded-full p-4">
                <i class="fas fa-clock text-orange-600 text-2xl"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm">Em Reparo</p>
                <p class="text-3xl font-bold text-blue-600">${osKanban.EM_REPARO.length}</p>
              </div>
              <div class="bg-blue-100 rounded-full p-4">
                <i class="fas fa-wrench text-blue-600 text-2xl"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm">Pronto p/ Retirada</p>
                <p class="text-3xl font-bold text-green-600">${osKanban.PRONTO_RETIRADA.length}</p>
              </div>
              <div class="bg-green-100 rounded-full p-4">
                <i class="fas fa-check-circle text-green-600 text-2xl"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Alertas -->
        ${pecasBaixas.data.length > 0 ? `
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <div class="flex items-start">
              <i class="fas fa-exclamation-triangle text-yellow-600 mt-1 mr-3"></i>
              <div>
                <h3 class="font-semibold text-yellow-800">Alerta de Estoque Baixo</h3>
                <p class="text-yellow-700 text-sm">
                  ${pecasBaixas.data.length} peça(s) com estoque abaixo do mínimo.
                  <a href="#" data-page="pecas" class="underline font-semibold">Ver detalhes</a>
                </p>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer" data-page="ordens-servico">
            <div class="flex items-center space-x-4">
              <div class="bg-blue-100 rounded-full p-4">
                <i class="fas fa-plus text-blue-600 text-xl"></i>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">Nova Ordem de Serviço</h3>
                <p class="text-gray-500 text-sm">Criar nova OS</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer" data-page="kanban">
            <div class="flex items-center space-x-4">
              <div class="bg-green-100 rounded-full p-4">
                <i class="fas fa-columns text-green-600 text-xl"></i>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">Ver Kanban</h3>
                <p class="text-gray-500 text-sm">Fluxo de trabalho</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer" data-page="clientes">
            <div class="flex items-center space-x-4">
              <div class="bg-purple-100 rounded-full p-4">
                <i class="fas fa-user-plus text-purple-600 text-xl"></i>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">Novo Cliente</h3>
                <p class="text-gray-500 text-sm">Cadastrar cliente</p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Adicionar event listeners para quick actions
      content.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          PageManager.loadPage(el.dataset.page);
        });
      });
    }
  },

  Kanban: {
    async render() {
      const content = document.getElementById('content');
      const response = await api.get('/ordens-servico/kanban');
      const kanban = response.data;

      content.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          ${this.renderColumn('AGUARDANDO_DIAGNOSTICO', 'Aguardando Diagnóstico', kanban.AGUARDANDO_DIAGNOSTICO, 'yellow')}
          ${this.renderColumn('AGUARDANDO_APROVACAO', 'Aguardando Aprovação', kanban.AGUARDANDO_APROVACAO, 'orange')}
          ${this.renderColumn('EM_REPARO', 'Em Reparo', kanban.EM_REPARO, 'blue')}
          ${this.renderColumn('PRONTO_RETIRADA', 'Pronto p/ Retirada', kanban.PRONTO_RETIRADA, 'green')}
        </div>
      `;
    },

    renderColumn(status, title, items, color) {
      return `
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-800">${title}</h3>
            <span class="bg-${color}-100 text-${color}-800 px-2 py-1 rounded-full text-xs font-semibold">${items.length}</span>
          </div>
          
          <div class="space-y-3">
            ${items.map(os => `
              <div class="bg-white rounded-lg shadow-sm p-4 kanban-card cursor-pointer hover:shadow-md border-l-4 border-${color}-500"
                   onclick="PageManager.loadPage('ordens-servico')">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-semibold text-gray-800">${os.numero}</span>
                  <span class="text-xs text-gray-500">${os.dias_aberta}d</span>
                </div>
                <p class="text-sm text-gray-600 mb-2">${os.cliente_nome}</p>
                <p class="text-xs text-gray-500">
                  <i class="fas fa-car mr-1"></i>${os.placa} - ${os.modelo}
                </p>
              </div>
            `).join('')}
            
            ${items.length === 0 ? '<p class="text-center text-gray-400 text-sm py-8">Nenhuma OS</p>' : ''}
          </div>
        </div>
      `;
    }
  },

  OrdensServico: {
    async render() {
      const content = document.getElementById('content');
      const response = await api.get('/ordens-servico');
      const ordens = response.data.data;

      content.innerHTML = `
        <div class="bg-white rounded-lg shadow-md">
          <div class="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-800">Lista de Ordens de Serviço</h3>
            <button id="btn-nova-os-page" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center">
              <i class="fas fa-plus mr-2"></i>
              Nova OS
            </button>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veículo</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Abertura</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${ordens.map(os => `
                  <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="font-semibold text-blue-600">${os.numero}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">${os.cliente_nome}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm">
                        <div class="font-medium">${os.placa}</div>
                        <div class="text-gray-500">${os.modelo}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">${Utils.getStatusBadge(os.status)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Utils.formatDate(os.data_abertura)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">${Utils.formatCurrency(os.valor_total)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                      <button class="text-blue-600 hover:text-blue-800 mx-1" title="Ver Detalhes">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button class="text-green-600 hover:text-green-800 mx-1" title="Editar">
                        <i class="fas fa-edit"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  },

  Clientes: {
    async render() {
      const content = document.getElementById('content');
      const response = await api.get('/clientes?ativo=true');
      const clientes = response.data;

      content.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Módulo de Clientes - Em Desenvolvimento</h3>
          <p class="text-gray-600">Total de clientes: ${clientes.length}</p>
        </div>
      `;
    }
  },

  Veiculos: {
    async render() {
      const content = document.getElementById('content');
      content.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Módulo de Veículos - Em Desenvolvimento</h3>
        </div>
      `;
    }
  },

  Pecas: {
    async render() {
      const content = document.getElementById('content');
      content.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Módulo de Peças - Em Desenvolvimento</h3>
        </div>
      `;
    }
  },

  Servicos: {
    async render() {
      const content = document.getElementById('content');
      content.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Módulo de Serviços - Em Desenvolvimento</h3>
        </div>
      `;
    }
  },

  Mecanicos: {
    async render() {
      const content = document.getElementById('content');
      content.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Módulo de Mecânicos - Em Desenvolvimento</h3>
        </div>
      `;
    }
  },

  Fornecedores: {
    async render() {
      const content = document.getElementById('content');
      content.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Módulo de Fornecedores - Em Desenvolvimento</h3>
        </div>
      `;
    }
  },

  // ===== FASE 2 =====
  Orcamentos: {
    async render() {
      const content = document.getElementById('content');
      try {
        const response = await api.get('/orcamentos');
        const stats = await api.get('/orcamentos/estatisticas');
        
        content.innerHTML = `
          <div>
            <h3 class="text-2xl font-bold text-gray-800 mb-6">Orçamentos</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Total</p>
                <p class="text-3xl font-bold text-gray-800">${stats.data.total || 0}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Pendentes</p>
                <p class="text-3xl font-bold text-yellow-600">${stats.data.pendentes || 0}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Aprovados</p>
                <p class="text-3xl font-bold text-green-600">${stats.data.aprovados || 0}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Taxa Conversão</p>
                <p class="text-3xl font-bold text-blue-600">${stats.data.taxa_conversao || 0}%</p>
              </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
              <h4 class="text-lg font-semibold mb-4">Lista de Orçamentos</h4>
              <div class="text-sm text-gray-600">
                <p>Total de ${response.data.total || 0} orçamento(s) cadastrado(s)</p>
                <p class="mt-2 text-blue-600">Use a API /api/orcamentos para gerenciar orçamentos</p>
              </div>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar orçamentos</div>`;
      }
    }
  },

  Estoque: {
    async render() {
      const content = document.getElementById('content');
      try {
        const response = await api.get('/estoque/estatisticas');
        
        content.innerHTML = `
          <div>
            <h3 class="text-2xl font-bold text-gray-800 mb-6">Controle de Estoque</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Valor Total em Estoque</p>
                <p class="text-3xl font-bold text-gray-800">${Utils.formatCurrency(response.data.valor_total_estoque || 0)}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Peças com Estoque Baixo</p>
                <p class="text-3xl font-bold text-red-600">${response.data.pecas_estoque_baixo || 0}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Total de Movimentações</p>
                <p class="text-3xl font-bold text-blue-600">${response.data.total_movimentacoes || 0}</p>
              </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
              <h4 class="text-lg font-semibold mb-4">Gestão de Estoque Avançada</h4>
              <div class="text-sm text-gray-600">
                <p>✅ Controle de movimentações (Entrada, Saída, Ajuste, Devolução)</p>
                <p>✅ Rastreamento completo de histórico</p>
                <p>✅ Alertas de estoque baixo automáticos</p>
                <p class="mt-4 text-blue-600">Use a API /api/estoque para gerenciar o estoque</p>
              </div>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar estatísticas de estoque</div>`;
      }
    }
  },

  // ===== FASE 3 =====
  Financeiro: {
    async render() {
      const content = document.getElementById('content');
      try {
        const response = await api.get('/financeiro/resumo');
        
        content.innerHTML = `
          <div>
            <h3 class="text-2xl font-bold text-gray-800 mb-6">Financeiro</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Contas a Receber</p>
                <p class="text-2xl font-bold text-green-600">${Utils.formatCurrency(response.data.total_receber || 0)}</p>
                <p class="text-xs text-gray-500 mt-1">${response.data.contas_receber_abertas || 0} abertas</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Contas a Pagar</p>
                <p class="text-2xl font-bold text-red-600">${Utils.formatCurrency(response.data.total_pagar || 0)}</p>
                <p class="text-xs text-gray-500 mt-1">${response.data.contas_pagar_abertas || 0} abertas</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Saldo Projetado</p>
                <p class="text-2xl font-bold text-blue-600">${Utils.formatCurrency(response.data.saldo_projetado || 0)}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Contas Vencidas</p>
                <p class="text-2xl font-bold text-orange-600">${response.data.contas_vencidas || 0}</p>
              </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
              <h4 class="text-lg font-semibold mb-4">Módulo Financeiro Completo</h4>
              <div class="text-sm text-gray-600">
                <p>✅ Contas a Receber e Pagar</p>
                <p>✅ Fluxo de Caixa Automático</p>
                <p>✅ Plano de Contas Configurável</p>
                <p>✅ Alertas de Vencimento</p>
                <p class="mt-4 text-blue-600">Use a API /api/financeiro para gerenciar finanças</p>
              </div>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar resumo financeiro</div>`;
      }
    }
  },

  Relatorios: {
    async render() {
      const content = document.getElementById('content');
      try {
        const dashboard = await api.get('/relatorios/dashboard?periodo=30');
        
        content.innerHTML = `
          <div>
            <h3 class="text-2xl font-bold text-gray-800 mb-6">Relatórios e Business Intelligence</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">OS Finalizadas (30d)</p>
                <p class="text-3xl font-bold text-gray-800">${dashboard.data.total_os_finalizadas || 0}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Faturamento (30d)</p>
                <p class="text-2xl font-bold text-green-600">${Utils.formatCurrency(dashboard.data.faturamento_total || 0)}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Margem Média</p>
                <p class="text-3xl font-bold text-blue-600">${dashboard.data.margem_media || 0}%</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Ticket Médio</p>
                <p class="text-2xl font-bold text-purple-600">${Utils.formatCurrency(dashboard.data.ticket_medio || 0)}</p>
              </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
              <h4 class="text-lg font-semibold mb-4">Relatórios Disponíveis</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p>✅ Análise de Rentabilidade por OS</p>
                  <p>✅ Curva ABC de Clientes</p>
                  <p>✅ Curva ABC de Peças</p>
                </div>
                <div>
                  <p>✅ Performance por Categoria</p>
                  <p>✅ Performance por Mecânico</p>
                  <p>✅ Dashboard Consolidado</p>
                </div>
              </div>
              <p class="mt-4 text-blue-600">Use a API /api/relatorios para gerar relatórios</p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar dashboard</div>`;
      }
    }
  },

  // ===== FASE 4 - CRM =====
  CRM: {
    async render() {
      const content = document.getElementById('content');
      try {
        const dashboard = await api.get('/crm/dashboard');
        
        content.innerHTML = `
          <div>
            <h3 class="text-2xl font-bold text-gray-800 mb-6">CRM Dashboard</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Lembretes Vencidos</p>
                <p class="text-3xl font-bold text-red-600">${dashboard.data.lembretes.vencidos || 0}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Lembretes Próximos</p>
                <p class="text-3xl font-bold text-yellow-600">${dashboard.data.lembretes.proximos || 0}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Satisfação Média</p>
                <p class="text-3xl font-bold text-blue-600">${dashboard.data.pesquisas.media_geral || '-'}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Taxa de Resposta</p>
                <p class="text-3xl font-bold text-green-600">${dashboard.data.pesquisas.taxa_resposta || 0}%</p>
              </div>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
              <h4 class="text-lg font-semibold mb-4">Funcionalidades CRM</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p>✅ Perfil 360° do Cliente</p>
                  <p>✅ Histórico Completo de Interações</p>
                  <p>✅ Análise de Retenção e Risco</p>
                  <p>✅ Preferências de Comunicação</p>
                </div>
                <div>
                  <p>✅ Lembretes Automáticos de Manutenção</p>
                  <p>✅ Pesquisas de Satisfação com NPS</p>
                  <p>✅ Notificações WhatsApp/SMS/Email</p>
                  <p>✅ Campanhas de Marketing</p>
                </div>
              </div>
              <p class="mt-4 text-blue-600">Use a API /api/crm para acessar funcionalidades CRM</p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar CRM dashboard</div>`;
      }
    }
  },

  Lembretes: {
    async render() {
      const content = document.getElementById('content');
      try {
        const response = await api.get('/lembretes/vencidos');
        
        let lembretesHtml = '';
        if (response.data.lembretes && response.data.lembretes.length > 0) {
          lembretesHtml = response.data.lembretes.map(l => `
            <div class="border-b border-gray-200 py-4 last:border-0">
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-semibold text-gray-800">${l.cliente_nome}</p>
                  <p class="text-sm text-gray-600">${l.veiculo_marca} ${l.veiculo_modelo} - ${l.veiculo_placa}</p>
                  <p class="text-sm text-gray-700 mt-1">${l.descricao}</p>
                  <p class="text-xs text-gray-500 mt-1">
                    Data: ${Utils.formatDate(l.data_proxima)} | 
                    ${l.km_proximo ? 'KM: ' + l.km_proximo.toLocaleString() : ''}
                  </p>
                </div>
                <span class="px-3 py-1 text-xs font-semibold rounded-full ${
                  l.urgencia === 'VENCIDO' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }">${l.urgencia}</span>
              </div>
            </div>
          `).join('');
        } else {
          lembretesHtml = '<p class="text-gray-500 text-center py-8">Nenhum lembrete vencido ou próximo</p>';
        }
        
        content.innerHTML = `
          <div>
            <h3 class="text-2xl font-bold text-gray-800 mb-6">Lembretes de Manutenção</h3>
            
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
              <h4 class="text-lg font-semibold mb-4">Lembretes Vencidos e Próximos (${response.data.total || 0})</h4>
              ${lembretesHtml}
            </div>
            
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p class="text-sm text-blue-800">
                <i class="fas fa-info-circle mr-2"></i>
                Lembretes são criados automaticamente ao finalizar OS. Use a API /api/lembretes para gerenciar.
              </p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar lembretes</div>`;
      }
    }
  },

  Pesquisas: {
    async render() {
      const content = document.getElementById('content');
      try {
        const stats = await api.get('/pesquisas/estatisticas/geral');
        const nps = await api.get('/pesquisas/estatisticas/nps');
        
        content.innerHTML = `
          <div>
            <h3 class="text-2xl font-bold text-gray-800 mb-6">Pesquisas de Satisfação</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Atendimento</p>
                <p class="text-3xl font-bold text-blue-600">${stats.data.estatisticas.media_atendimento || '-'}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Qualidade</p>
                <p class="text-3xl font-bold text-green-600">${stats.data.estatisticas.media_qualidade || '-'}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Prazo</p>
                <p class="text-3xl font-bold text-yellow-600">${stats.data.estatisticas.media_prazo || '-'}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Preço</p>
                <p class="text-3xl font-bold text-orange-600">${stats.data.estatisticas.media_preco || '-'}</p>
              </div>
              <div class="bg-white rounded-lg shadow-md p-6">
                <p class="text-gray-500 text-sm">Média Geral</p>
                <p class="text-3xl font-bold text-purple-600">${stats.data.estatisticas.media_geral || '-'}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div class="bg-white rounded-lg shadow-md p-6">
                <h4 class="text-lg font-semibold mb-4">NPS (Net Promoter Score)</h4>
                <p class="text-5xl font-bold text-center ${
                  parseFloat(nps.data.nps_score) >= 50 ? 'text-green-600' : 
                  parseFloat(nps.data.nps_score) >= 0 ? 'text-yellow-600' : 'text-red-600'
                }">${nps.data.nps_score || 0}</p>
                <p class="text-center text-gray-600 mt-2">${nps.data.classificacao || '-'}</p>
                <div class="mt-4 text-sm text-gray-600">
                  <p>Promotores: ${nps.data.promotores || 0} (${nps.data.percentual_promotores || 0}%)</p>
                  <p>Detratores: ${nps.data.detratores || 0} (${nps.data.percentual_detratores || 0}%)</p>
                </div>
              </div>
              
              <div class="bg-white rounded-lg shadow-md p-6">
                <h4 class="text-lg font-semibold mb-4">Taxa de Resposta</h4>
                <p class="text-5xl font-bold text-center text-blue-600">${stats.data.estatisticas.taxa_resposta || 0}%</p>
                <div class="mt-4 text-sm text-gray-600">
                  <p>Total de Pesquisas: ${stats.data.estatisticas.total_pesquisas || 0}</p>
                  <p>Respondidas: ${stats.data.estatisticas.total_respondidas || 0}</p>
                  <p>Recomendariam: ${stats.data.estatisticas.percentual_recomendaria || 0}%</p>
                </div>
              </div>
            </div>
            
            <div class="bg-green-50 border-l-4 border-green-400 p-4">
              <p class="text-sm text-green-800">
                <i class="fas fa-check-circle mr-2"></i>
                Pesquisas são criadas automaticamente ao finalizar OS. Clientes respondem via link único.
              </p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar estatísticas de pesquisas</div>`;
      }
    }
  },

  Notificacoes: {
    async render() {
      const content = document.getElementById('content');
      try {
        const stats = await api.get('/notificacoes/estatisticas/geral');
        const pendentes = await api.get('/notificacoes/pendentes');
        
        content.innerHTML = `
          <div>
            <h3 class="text-2xl font-bold text-gray-800 mb-6">Sistema de Notificações</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              ${stats.data.por_meio.map(m => `
                <div class="bg-white rounded-lg shadow-md p-6">
                  <p class="text-gray-500 text-sm">${m.meio}</p>
                  <p class="text-3xl font-bold text-gray-800">${m.total || 0}</p>
                  <p class="text-xs text-gray-500 mt-1">
                    Enviadas: ${m.enviadas || 0} | Erros: ${m.erros || 0}
                  </p>
                </div>
              `).join('')}
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
              <h4 class="text-lg font-semibold mb-4">Notificações Pendentes (${pendentes.data.total || 0})</h4>
              ${pendentes.data.total > 0 ? `
                <div class="text-sm text-gray-600">
                  <p>Existem ${pendentes.data.total} notificação(ões) pendente(s) de envio.</p>
                </div>
              ` : `
                <p class="text-gray-500 text-center py-4">Nenhuma notificação pendente</p>
              `}
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
              <h4 class="text-lg font-semibold mb-4">Canais de Comunicação</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <p class="font-semibold mb-2"><i class="fab fa-whatsapp text-green-600"></i> WhatsApp</p>
                  <p>Ideal para lembretes rápidos e atualizações de status</p>
                </div>
                <div>
                  <p class="font-semibold mb-2"><i class="fas fa-sms text-blue-600"></i> SMS</p>
                  <p>Confiável para avisos importantes e urgentes</p>
                </div>
                <div>
                  <p class="font-semibold mb-2"><i class="fas fa-envelope text-purple-600"></i> Email</p>
                  <p>Perfeito para orçamentos e documentos</p>
                </div>
              </div>
              <p class="mt-4 text-blue-600">Use a API /api/notificacoes para enviar mensagens</p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar estatísticas de notificações</div>`;
      }
    }
  }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Navegação da sidebar
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      PageManager.loadPage(link.dataset.page);
    });
  });

  // Botão Nova OS
  document.getElementById('btn-nova-os').addEventListener('click', () => {
    PageManager.loadPage('ordens-servico');
  });

  // Busca rápida
  let searchTimeout;
  document.getElementById('busca-rapida').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length >= 3) {
      searchTimeout = setTimeout(async () => {
        try {
          const response = await api.get(`/busca-rapida?q=${encodeURIComponent(query)}`);
          console.log('Resultados da busca:', response.data);
          // TODO: Implementar exibição de resultados
        } catch (error) {
          console.error('Erro na busca:', error);
        }
      }, 500);
    }
  });

  // Carregar página inicial
  PageManager.loadPage('dashboard');
});
