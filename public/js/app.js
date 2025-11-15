/**
 * tGest - Sistema de Gestão de Oficinas v4.0.0
 * Frontend Application - Main JavaScript File
 * 
 * Este arquivo contém toda a lógica do frontend do sistema,
 * incluindo gerenciamento de páginas, modais, formulários e integrações com API.
 */

// ========================================
// CONFIGURAÇÃO GLOBAL
// ========================================

/**
 * Instância do Axios configurada para comunicação com a API
 * Timeout de 30 segundos para todas as requisições
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Estado global da aplicação
 * Mantém controle da página atual e cache de dados
 */
const AppState = {
  currentPage: 'dashboard',      // Página atualmente exibida
  currentData: null,              // Dados da página atual (cache)
  clientes: [],                   // Cache de clientes
  veiculos: [],                   // Cache de veículos
  pecas: [],                      // Cache de peças
  mecanicos: [],                  // Cache de mecânicos
  servicos: [],                   // Cache de serviços
  fornecedores: []                // Cache de fornecedores
};

// ========================================
// UTILITÁRIOS
// ========================================

/**
 * Funções utilitárias para formatação e exibição
 */
const Utils = {
  /**
   * Formata valor numérico para moeda brasileira (R$)
   * @param {number} value - Valor a ser formatado
   * @returns {string} Valor formatado (ex: "R$ 1.234,56")
   */
  formatCurrency: (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  },

  /**
   * Formata string de data para formato brasileiro (DD/MM/YYYY)
   * @param {string} dateString - Data em formato ISO
   * @returns {string} Data formatada ou "-" se vazia
   */
  formatDate: (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  },

  /**
   * Formata string de data/hora para formato brasileiro completo
   * @param {string} dateString - Data/hora em formato ISO
   * @returns {string} Data/hora formatada ou "-" se vazia
   */
  formatDateTime: (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  },

  /**
   * Exibe notificação toast no canto superior direito
   * @param {string} message - Mensagem a ser exibida
   * @param {string} type - Tipo de notificação: success, error, warning, info
   */
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

  /**
   * Exibe indicador de carregamento no conteúdo principal
   */
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

  /**
   * Retorna badge HTML colorido baseado no status da OS
   * @param {string} status - Status da ordem de serviço
   * @returns {string} HTML do badge formatado
   */
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

// ========================================
// GERENCIADOR DE PÁGINAS
// ========================================

/**
 * Controla navegação e renderização de páginas
 */
const PageManager = {
  /**
   * Carrega e renderiza uma página específica
   * @param {string} pageName - Nome da página a ser carregada
   */
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

// ========================================
// DEFINIÇÃO DAS PÁGINAS
// ========================================

/**
 * Objeto contendo todas as páginas do sistema
 * Cada página tem um método render() que gera o HTML e faz chamadas à API
 */
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
      try {
        const response = await api.get('/clientes?ativo=true');
        const clientes = response.data;

        content.innerHTML = `
          <div>
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">Clientes</h3>
              <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center">
                <i class="fas fa-plus mr-2"></i>
                Novo Cliente
              </button>
            </div>

            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPF/CNPJ</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Cadastro</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${clientes.map(c => `
                      <tr class="hover:bg-gray-50" data-id="${c.id}">
                        <td class="px-6 py-4">
                          <div class="flex items-center">
                            <div class="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                              <i class="fas fa-user text-blue-600"></i>
                            </div>
                            <div class="ml-4">
                              <div class="text-sm font-medium text-gray-900">${c.nome}</div>
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-600">${c.cpf_cnpj || '-'}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${c.telefone || '-'}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${c.email || '-'}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${Utils.formatDate(c.data_cadastro)}</td>
                        <td class="px-6 py-4 text-center">
                          <button class="text-blue-600 hover:text-blue-800 mx-1" title="Ver Perfil CRM">
                            <i class="fas fa-user-circle"></i>
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

            <div class="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
              <p class="text-sm text-blue-800">
                <i class="fas fa-info-circle mr-2"></i>
                Total de ${clientes.length} cliente(s) cadastrado(s) | 
                Use a API <code class="bg-white px-2 py-1 rounded">/api/clientes</code> para gerenciar
              </p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar clientes</div>`;
      }
    }
  },

  Veiculos: {
    async render() {
      const content = document.getElementById('content');
      try {
        const response = await api.get('/veiculos');
        const veiculos = response.data;

        content.innerHTML = `
          <div>
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">Veículos</h3>
              <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center">
                <i class="fas fa-plus mr-2"></i>
                Novo Veículo
              </button>
            </div>

            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placa</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca/Modelo</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ano</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KM Atual</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${veiculos.map(v => `
                      <tr class="hover:bg-gray-50" data-id="${v.id}">
                        <td class="px-6 py-4">
                          <span class="font-semibold text-gray-800">${v.placa}</span>
                        </td>
                        <td class="px-6 py-4">
                          <div class="text-sm">
                            <div class="font-medium text-gray-900">${v.marca}</div>
                            <div class="text-gray-600">${v.modelo}</div>
                          </div>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-600">${v.ano || '-'}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${v.cliente_nome || '-'}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${v.km_atual ? v.km_atual.toLocaleString() + ' km' : '-'}</td>
                        <td class="px-6 py-4 text-center">
                          <button class="text-blue-600 hover:text-blue-800 mx-1" title="Histórico">
                            <i class="fas fa-history"></i>
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

            <div class="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
              <p class="text-sm text-blue-800">
                <i class="fas fa-info-circle mr-2"></i>
                Total de ${veiculos.length} veículo(s) cadastrado(s) | 
                Use a API <code class="bg-white px-2 py-1 rounded">/api/veiculos</code> para gerenciar
              </p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar veículos</div>`;
      }
    }
  },

  Pecas: {
    async render() {
      const content = document.getElementById('content');
      try {
        const response = await api.get('/pecas');
        const pecas = response.data;

        // Separar peças com estoque baixo
        const pecasBaixas = pecas.filter(p => p.estoque_atual <= p.estoque_minimo);

        content.innerHTML = `
          <div>
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">Peças e Produtos</h3>
              <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center">
                <i class="fas fa-plus mr-2"></i>
                Nova Peça
              </button>
            </div>

            ${pecasBaixas.length > 0 ? `
              <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div class="flex items-start">
                  <i class="fas fa-exclamation-triangle text-red-600 mt-1 mr-3"></i>
                  <div>
                    <h4 class="font-semibold text-red-800">Alerta de Estoque Baixo</h4>
                    <p class="text-red-700 text-sm">${pecasBaixas.length} peça(s) com estoque abaixo do mínimo</p>
                  </div>
                </div>
              </div>
            ` : ''}

            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estoque</th>
                      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço Custo</th>
                      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço Venda</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${pecas.map(p => `
                      <tr class="hover:bg-gray-50" data-id="${p.id}">
                        <td class="px-6 py-4 text-sm font-medium text-gray-900">${p.codigo}</td>
                        <td class="px-6 py-4 text-sm text-gray-900">${p.nome}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${p.categoria || '-'}</td>
                        <td class="px-6 py-4 text-right">
                          <span class="text-sm font-semibold ${p.estoque_atual <= p.estoque_minimo ? 'text-red-600' : 'text-gray-900'}">
                            ${p.estoque_atual || 0}
                          </span>
                          <span class="text-xs text-gray-500"> / ${p.estoque_minimo || 0}</span>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-600 text-right">${Utils.formatCurrency(p.preco_custo)}</td>
                        <td class="px-6 py-4 text-sm font-semibold text-gray-900 text-right">${Utils.formatCurrency(p.preco_venda)}</td>
                        <td class="px-6 py-4 text-center">
                          <button class="text-blue-600 hover:text-blue-800 mx-1" title="Movimentações">
                            <i class="fas fa-exchange-alt"></i>
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

            <div class="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
              <p class="text-sm text-blue-800">
                <i class="fas fa-info-circle mr-2"></i>
                Total de ${pecas.length} peça(s) cadastrada(s) | 
                Use a API <code class="bg-white px-2 py-1 rounded">/api/pecas</code> para gerenciar
              </p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar peças</div>`;
      }
    }
  },

  Servicos: {
    async render() {
      const content = document.getElementById('content');
      try {
        const response = await api.get('/servicos');
        const servicos = response.data;

        // Agrupar por categoria
        const categorias = [...new Set(servicos.map(s => s.categoria))];

        content.innerHTML = `
          <div>
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">Tipos de Serviço</h3>
              <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center">
                <i class="fas fa-plus mr-2"></i>
                Novo Serviço
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              ${categorias.map(cat => {
                const servicosCat = servicos.filter(s => s.categoria === cat);
                const icons = {
                  'MECANICA': 'fa-wrench',
                  'ELETRICA': 'fa-bolt',
                  'FUNILARIA': 'fa-hammer',
                  'PINTURA': 'fa-paint-roller',
                  'PREVENTIVA': 'fa-shield-alt',
                  'DIAGNOSTICO': 'fa-stethoscope'
                };
                return `
                  <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center mb-4">
                      <div class="bg-blue-100 rounded-full p-3 mr-3">
                        <i class="fas ${icons[cat] || 'fa-tools'} text-blue-600"></i>
                      </div>
                      <div>
                        <h4 class="font-semibold text-gray-800">${cat}</h4>
                        <p class="text-sm text-gray-500">${servicosCat.length} serviço(s)</p>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                      <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço Padrão</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tempo Est.</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${servicos.map(s => `
                      <tr class="hover:bg-gray-50" data-id="${s.id}">
                        <td class="px-6 py-4">
                          <div class="text-sm font-medium text-gray-900">${s.nome}</div>
                          ${s.descricao ? `<div class="text-xs text-gray-500">${s.descricao}</div>` : ''}
                        </td>
                        <td class="px-6 py-4">
                          <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            ${s.categoria}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-sm font-semibold text-gray-900 text-right">${Utils.formatCurrency(s.preco_padrao)}</td>
                        <td class="px-6 py-4 text-sm text-gray-600 text-center">${s.tempo_estimado || '-'}</td>
                        <td class="px-6 py-4 text-center">
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

            <div class="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
              <p class="text-sm text-blue-800">
                <i class="fas fa-info-circle mr-2"></i>
                Total de ${servicos.length} tipo(s) de serviço cadastrado(s) | 
                Use a API <code class="bg-white px-2 py-1 rounded">/api/servicos</code> para gerenciar
              </p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar serviços</div>`;
      }
    }
  },

  Mecanicos: {
    async render() {
      const content = document.getElementById('content');
      try {
        const response = await api.get('/mecanicos');
        const mecanicos = response.data;

        content.innerHTML = `
          <div>
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">Mecânicos</h3>
              <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center">
                <i class="fas fa-plus mr-2"></i>
                Novo Mecânico
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              ${mecanicos.map(m => `
                <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition" data-id="${m.id}">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center">
                      <div class="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <i class="fas fa-user-tie text-blue-600 text-xl"></i>
                      </div>
                      <div>
                        <h4 class="font-semibold text-gray-800">${m.nome}</h4>
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${m.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                          ${m.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="space-y-2 text-sm text-gray-600">
                    <p><i class="fas fa-briefcase w-5"></i> ${m.especialidade || 'Sem especialidade'}</p>
                    <p><i class="fas fa-phone w-5"></i> ${m.telefone || '-'}</p>
                    ${m.salario ? `<p><i class="fas fa-dollar-sign w-5"></i> ${Utils.formatCurrency(m.salario)}</p>` : ''}
                    ${m.comissao_percentual ? `<p><i class="fas fa-percentage w-5"></i> Comissão: ${m.comissao_percentual}%</p>` : ''}
                  </div>

                  <div class="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                    <button class="text-blue-600 hover:text-blue-800 mx-1" title="Desempenho">
                      <i class="fas fa-chart-line"></i>
                    </button>
                    <button class="text-green-600 hover:text-green-800 mx-1" title="Editar">
                      <i class="fas fa-edit"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
              <p class="text-sm text-blue-800">
                <i class="fas fa-info-circle mr-2"></i>
                Total de ${mecanicos.length} mecânico(s) cadastrado(s) | 
                Use a API <code class="bg-white px-2 py-1 rounded">/api/mecanicos</code> para gerenciar
              </p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar mecânicos</div>`;
      }
    }
  },

  Fornecedores: {
    async render() {
      const content = document.getElementById('content');
      try {
        const response = await api.get('/fornecedores');
        const fornecedores = response.data;

        content.innerHTML = `
          <div>
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">Fornecedores</h3>
              <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center">
                <i class="fas fa-plus mr-2"></i>
                Novo Fornecedor
              </button>
            </div>

            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razão Social</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNPJ</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${fornecedores.map(f => `
                      <tr class="hover:bg-gray-50" data-id="${f.id}">
                        <td class="px-6 py-4">
                          <div class="flex items-center">
                            <div class="h-10 w-10 flex-shrink-0 bg-green-100 rounded-full flex items-center justify-center">
                              <i class="fas fa-truck text-green-600"></i>
                            </div>
                            <div class="ml-4">
                              <div class="text-sm font-medium text-gray-900">${f.razao_social}</div>
                              ${f.nome_fantasia ? `<div class="text-xs text-gray-500">${f.nome_fantasia}</div>` : ''}
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-600">${f.cnpj || '-'}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${f.contato || '-'}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${f.telefone || '-'}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${f.email || '-'}</td>
                        <td class="px-6 py-4 text-center">
                          <button class="text-blue-600 hover:text-blue-800 mx-1" title="Pedidos">
                            <i class="fas fa-shopping-cart"></i>
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

            <div class="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
              <p class="text-sm text-blue-800">
                <i class="fas fa-info-circle mr-2"></i>
                Total de ${fornecedores.length} fornecedor(es) cadastrado(s) | 
                Use a API <code class="bg-white px-2 py-1 rounded">/api/fornecedores</code> para gerenciar
              </p>
            </div>
          </div>
        `;
      } catch (error) {
        content.innerHTML = `<div class="text-red-600">Erro ao carregar fornecedores</div>`;
      }
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

// ========================================
// SISTEMA DE MODALS
// ========================================

/**
 * Sistema de modal reutilizável para formulários e visualizações
 */
const Modal = {
  /**
   * Exibe modal com título, conteúdo e callback de salvamento
   * @param {string} title - Título do modal
   * @param {string} content - HTML do conteúdo (geralmente um formulário)
   * @param {function} onSave - Callback executado ao clicar em Salvar
   */
  show: (title, content, onSave) => {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" id="modal-backdrop">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 class="text-xl font-semibold text-gray-800">${title}</h3>
            <button onclick="Modal.close()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <div class="p-6" id="modal-content">
            ${content}
          </div>
          <div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button onclick="Modal.close()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button id="modal-save-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Salvar
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('modal-save-btn').onclick = onSave;
    document.getElementById('modal-backdrop').onclick = (e) => {
      if (e.target.id === 'modal-backdrop') Modal.close();
    };
  },
  
  /**
   * Fecha o modal e limpa o container
   */
  close: () => {
    document.getElementById('modal-container').innerHTML = '';
  }
};

// ========================================
// AÇÕES ESPECIAIS
// ========================================

/**
 * Funções especiais como visualização de perfil CRM
 */
const Actions = {
  /**
   * Exibe perfil 360° completo do cliente com histórico, estatísticas e análise
   * @param {number} clienteId - ID do cliente
   */
  async verPerfilCRM(clienteId) {
    try {
      // Busca perfil completo do cliente via API CRM
      const response = await api.get(`/crm/clientes/${clienteId}/perfil-360`);
      const perfil = response.data;
      
      Modal.show(`Perfil CRM - ${perfil.cliente.nome}`, `
        <div class="space-y-6">
          <!-- Dados Básicos -->
          <div class="border-b pb-4">
            <h4 class="font-semibold text-gray-800 mb-3">Dados do Cliente</h4>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-gray-600">CPF/CNPJ:</span> ${perfil.cliente.cpf_cnpj || '-'}</div>
              <div><span class="text-gray-600">Telefone:</span> ${perfil.cliente.telefone || '-'}</div>
              <div><span class="text-gray-600">Email:</span> ${perfil.cliente.email || '-'}</div>
              <div><span class="text-gray-600">Cliente desde:</span> ${Utils.formatDate(perfil.cliente.data_cadastro)}</div>
            </div>
          </div>
          
          <!-- Estatísticas -->
          <div class="border-b pb-4">
            <h4 class="font-semibold text-gray-800 mb-3">Estatísticas</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="bg-blue-50 p-3 rounded">
                <p class="text-2xl font-bold text-blue-600">${perfil.estatisticas.total_os || 0}</p>
                <p class="text-xs text-gray-600">OS Total</p>
              </div>
              <div class="bg-green-50 p-3 rounded">
                <p class="text-2xl font-bold text-green-600">${Utils.formatCurrency(perfil.estatisticas.valor_total_gasto || 0)}</p>
                <p class="text-xs text-gray-600">Gasto Total</p>
              </div>
              <div class="bg-purple-50 p-3 rounded">
                <p class="text-2xl font-bold text-purple-600">${Utils.formatCurrency(perfil.estatisticas.ticket_medio || 0)}</p>
                <p class="text-xs text-gray-600">Ticket Médio</p>
              </div>
              <div class="bg-yellow-50 p-3 rounded">
                <p class="text-2xl font-bold text-yellow-600">${perfil.analise_retencao?.score_risco || 0}</p>
                <p class="text-xs text-gray-600">Risco Perda</p>
              </div>
            </div>
          </div>
          
          <!-- Veículos -->
          <div class="border-b pb-4">
            <h4 class="font-semibold text-gray-800 mb-3">Veículos (${perfil.veiculos.length})</h4>
            ${perfil.veiculos.length > 0 ? `
              <div class="space-y-2">
                ${perfil.veiculos.map(v => `
                  <div class="bg-gray-50 p-3 rounded text-sm">
                    <span class="font-semibold">${v.placa}</span> - ${v.marca} ${v.modelo} (${v.ano || '-'})
                    ${v.km_atual ? ` - ${v.km_atual.toLocaleString()} km` : ''}
                  </div>
                `).join('')}
              </div>
            ` : '<p class="text-sm text-gray-500">Nenhum veículo cadastrado</p>'}
          </div>
          
          <!-- Últimas OS -->
          <div class="border-b pb-4">
            <h4 class="font-semibold text-gray-800 mb-3">Últimas Ordens de Serviço</h4>
            ${perfil.ultimas_os.length > 0 ? `
              <div class="space-y-2 max-h-48 overflow-y-auto">
                ${perfil.ultimas_os.map(os => `
                  <div class="bg-gray-50 p-3 rounded text-sm">
                    <div class="flex justify-between items-start">
                      <div>
                        <span class="font-semibold text-blue-600">${os.numero}</span>
                        <span class="ml-2">${Utils.getStatusBadge(os.status)}</span>
                        <p class="text-xs text-gray-600 mt-1">${Utils.formatDate(os.data_abertura)}</p>
                      </div>
                      <span class="font-semibold">${Utils.formatCurrency(os.valor_total)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<p class="text-sm text-gray-500">Nenhuma OS encontrada</p>'}
          </div>
          
          <!-- Pesquisas de Satisfação -->
          ${perfil.pesquisas_satisfacao && perfil.pesquisas_satisfacao.length > 0 ? `
            <div class="border-b pb-4">
              <h4 class="font-semibold text-gray-800 mb-3">Satisfação</h4>
              <div class="space-y-2">
                ${perfil.pesquisas_satisfacao.map(p => `
                  <div class="bg-gray-50 p-3 rounded text-sm">
                    <div class="flex justify-between">
                      <span>OS ${p.os_numero}</span>
                      <span class="font-semibold ${p.nota_geral >= 8 ? 'text-green-600' : p.nota_geral >= 6 ? 'text-yellow-600' : 'text-red-600'}">
                        ${p.nota_geral || '-'}/10
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- Lembretes Pendentes -->
          ${perfil.lembretes_pendentes && perfil.lembretes_pendentes.length > 0 ? `
            <div>
              <h4 class="font-semibold text-gray-800 mb-3">Lembretes Pendentes (${perfil.lembretes_pendentes.length})</h4>
              <div class="space-y-2">
                ${perfil.lembretes_pendentes.map(l => `
                  <div class="bg-yellow-50 p-3 rounded text-sm border-l-4 border-yellow-400">
                    <p class="font-semibold">${l.tipo_manutencao || 'Manutenção'}</p>
                    <p class="text-xs text-gray-600">${l.descricao}</p>
                    <p class="text-xs text-gray-500 mt-1">Data: ${Utils.formatDate(l.data_proxima)}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `, () => {
        Modal.close();
      });
    } catch (error) {
      Utils.showToast('Erro ao carregar perfil CRM: ' + error.message, 'error');
    }
  }
};

// ========================================
// FORMULÁRIOS DE CADASTRO E EDIÇÃO
// ========================================

/**
 * Objeto contendo todos os formulários de cadastro e edição
 * Cada formulário abre um modal, coleta dados e envia para a API
 */
const Forms = {
  
  // ===== FORMULÁRIOS DE CADASTRO (NOVO) =====
  
  /**
   * Abre modal para cadastrar novo cliente
   */
  novoCliente: () => {
    Modal.show('Novo Cliente', `
      <form id="form-cliente" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" name="nome" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
            <input type="text" name="cpf_cnpj" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
            <input type="text" name="telefone" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input type="text" name="endereco" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input type="text" name="cidade" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input type="text" name="estado" maxlength="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea name="observacoes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
        </div>
      </form>
    `, async () => {
      const form = document.getElementById('form-cliente');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      try {
        await api.post('/clientes', data);
        Utils.showToast('Cliente cadastrado com sucesso!', 'success');
        Modal.close();
        PageManager.loadPage('clientes');
      } catch (error) {
        Utils.showToast('Erro ao cadastrar cliente: ' + error.message, 'error');
      }
    });
  },

  /**
   * Abre modal para cadastrar novo veículo
   * Busca lista de clientes para seleção
   */
  novoVeiculo: async () => {
    const clientes = await api.get('/clientes?ativo=true');
    
    Modal.show('Novo Veículo', `
      <form id="form-veiculo" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
            <input type="text" name="placa" required maxlength="8" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select name="cliente_id" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              ${clientes.data.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
            <input type="text" name="marca" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
            <input type="text" name="modelo" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <input type="number" name="ano" min="1900" max="2099" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cor</label>
            <input type="text" name="cor" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">KM Atual</label>
            <input type="number" name="km_atual" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Chassis</label>
            <input type="text" name="chassis" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
        </div>
      </form>
    `, async () => {
      const form = document.getElementById('form-veiculo');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      try {
        await api.post('/veiculos', data);
        Utils.showToast('Veículo cadastrado com sucesso!', 'success');
        Modal.close();
        PageManager.loadPage('veiculos');
      } catch (error) {
        Utils.showToast('Erro ao cadastrar veículo: ' + error.message, 'error');
      }
    });
  },

  /**
   * Abre modal para cadastrar nova peça/produto
   */
  novaPeca: () => {
    Modal.show('Nova Peça', `
      <form id="form-peca" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Código *</label>
            <input type="text" name="codigo" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" name="nome" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Marca</label>
            <input type="text" name="marca" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <input type="text" name="categoria" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Preço Custo *</label>
            <input type="number" name="preco_custo" required step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Preço Venda *</label>
            <input type="number" name="preco_venda" required step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estoque Atual</label>
            <input type="number" name="estoque_atual" value="0" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
            <input type="number" name="estoque_minimo" value="5" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Localização</label>
            <input type="text" name="localizacao" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
        </div>
      </form>
    `, async () => {
      const form = document.getElementById('form-peca');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      try {
        await api.post('/pecas', data);
        Utils.showToast('Peça cadastrada com sucesso!', 'success');
        Modal.close();
        PageManager.loadPage('pecas');
      } catch (error) {
        Utils.showToast('Erro ao cadastrar peça: ' + error.message, 'error');
      }
    });
  },

  /**
   * Abre modal para criar nova Ordem de Serviço
   * Busca clientes, veículos e mecânicos para seleção
   * Implementa filtro dinâmico de veículos por cliente
   */
  novaOS: async () => {
    const clientes = await api.get('/clientes?ativo=true');
    const veiculos = await api.get('/veiculos');
    const mecanicos = await api.get('/mecanicos');
    
    Modal.show('Nova Ordem de Serviço', `
      <form id="form-os" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select name="cliente_id" required id="os-cliente" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              ${clientes.data.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
            <select name="veiculo_id" required id="os-veiculo" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione um cliente primeiro</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mecânico</label>
            <select name="mecanico_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Nenhum</option>
              ${mecanicos.data.map(m => `<option value="${m.id}">${m.nome} - ${m.especialidade || 'Geral'}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">KM Entrada</label>
            <input type="number" name="km_entrada" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Defeito Reclamado *</label>
            <textarea name="defeito_reclamado" required rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea name="observacoes" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
        </div>
      </form>
      <script>
        document.getElementById('os-cliente').addEventListener('change', async (e) => {
          const clienteId = e.target.value;
          const selectVeiculo = document.getElementById('os-veiculo');
          
          if (!clienteId) {
            selectVeiculo.innerHTML = '<option value="">Selecione um cliente primeiro</option>';
            return;
          }
          
          const veiculos = ${JSON.stringify(veiculos.data)};
          const veiculosCliente = veiculos.filter(v => v.cliente_id == clienteId);
          
          if (veiculosCliente.length === 0) {
            selectVeiculo.innerHTML = '<option value="">Cliente sem veículos cadastrados</option>';
          } else {
            selectVeiculo.innerHTML = '<option value="">Selecione...</option>' + 
              veiculosCliente.map(v => 
                '<option value="' + v.id + '">' + v.placa + ' - ' + v.marca + ' ' + v.modelo + '</option>'
              ).join('');
          }
        });
      </script>
    `, async () => {
      const form = document.getElementById('form-os');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      // Remover campos vazios
      Object.keys(data).forEach(key => {
        if (data[key] === '' || data[key] === null) delete data[key];
      });
      
      try {
        await api.post('/ordens-servico', data);
        Utils.showToast('Ordem de Serviço criada com sucesso!', 'success');
        Modal.close();
        PageManager.loadPage('ordens-servico');
      } catch (error) {
        Utils.showToast('Erro ao criar OS: ' + error.message, 'error');
      }
    });
  },

  /**
   * Abre modal para cadastrar novo serviço
   */
  novoServico: () => {
    Modal.show('Novo Serviço', `
      <form id="form-servico" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" name="nome" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
            <select name="categoria" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              <option value="MECANICA">Mecânica</option>
              <option value="ELETRICA">Elétrica</option>
              <option value="FUNILARIA">Funilaria</option>
              <option value="PINTURA">Pintura</option>
              <option value="PREVENTIVA">Preventiva</option>
              <option value="DIAGNOSTICO">Diagnóstico</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Preço Padrão *</label>
            <input type="number" name="preco_padrao" required step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tempo Estimado</label>
            <input type="text" name="tempo_estimado" placeholder="Ex: 2h, 30min" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea name="descricao" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
        </div>
      </form>
    `, async () => {
      const form = document.getElementById('form-servico');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      try {
        await api.post('/servicos', data);
        Utils.showToast('Serviço cadastrado com sucesso!', 'success');
        Modal.close();
        PageManager.loadPage('servicos');
      } catch (error) {
        Utils.showToast('Erro ao cadastrar serviço: ' + error.message, 'error');
      }
    });
  },

  /**
   * Abre modal para cadastrar novo mecânico
   */
  novoMecanico: () => {
    Modal.show('Novo Mecânico', `
      <form id="form-mecanico" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" name="nome" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">CPF</label>
            <input type="text" name="cpf" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input type="text" name="telefone" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
            <input type="text" name="especialidade" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Salário</label>
            <input type="number" name="salario" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Comissão (%)</label>
            <input type="number" name="comissao_percentual" step="0.01" min="0" max="100" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="ativo" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </select>
          </div>
        </div>
      </form>
    `, async () => {
      const form = document.getElementById('form-mecanico');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      try {
        await api.post('/mecanicos', data);
        Utils.showToast('Mecânico cadastrado com sucesso!', 'success');
        Modal.close();
        PageManager.loadPage('mecanicos');
      } catch (error) {
        Utils.showToast('Erro ao cadastrar mecânico: ' + error.message, 'error');
      }
    });
  },

  /**
   * Abre modal para cadastrar novo fornecedor
   */
  novoFornecedor: () => {
    Modal.show('Novo Fornecedor', `
      <form id="form-fornecedor" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Razão Social *</label>
            <input type="text" name="razao_social" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
            <input type="text" name="nome_fantasia" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">CNPJ *</label>
            <input type="text" name="cnpj" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contato</label>
            <input type="text" name="contato" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input type="text" name="telefone" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input type="text" name="endereco" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input type="text" name="cidade" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input type="text" name="estado" maxlength="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          </div>
        </div>
      </form>
    `, async () => {
      const form = document.getElementById('form-fornecedor');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      try {
        await api.post('/fornecedores', data);
        Utils.showToast('Fornecedor cadastrado com sucesso!', 'success');
        Modal.close();
        PageManager.loadPage('fornecedores');
      } catch (error) {
        Utils.showToast('Erro ao cadastrar fornecedor: ' + error.message, 'error');
      }
    });
  },

  // ===== FORMULÁRIOS DE EDIÇÃO =====
  
  /**
   * Abre modal para editar cliente existente
   * @param {number} id - ID do cliente a ser editado
   */
  editarCliente: async (id) => {
    try {
      const response = await api.get(`/clientes/${id}`);
      const cliente = response.data;
      
      Modal.show('Editar Cliente', `
        <form id="form-cliente-edit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" name="nome" required value="${cliente.nome || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
              <input type="text" name="cpf_cnpj" value="${cliente.cpf_cnpj || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
              <input type="text" name="telefone" required value="${cliente.telefone || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value="${cliente.email || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input type="text" name="endereco" value="${cliente.endereco || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input type="text" name="cidade" value="${cliente.cidade || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input type="text" name="estado" maxlength="2" value="${cliente.estado || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea name="observacoes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">${cliente.observacoes || ''}</textarea>
            </div>
          </div>
        </form>
      `, async () => {
        const form = document.getElementById('form-cliente-edit');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
          await api.put(`/clientes/${id}`, data);
          Utils.showToast('Cliente atualizado com sucesso!', 'success');
          Modal.close();
          PageManager.loadPage('clientes');
        } catch (error) {
          Utils.showToast('Erro ao atualizar cliente: ' + error.message, 'error');
        }
      });
    } catch (error) {
      Utils.showToast('Erro ao carregar dados do cliente: ' + error.message, 'error');
    }
  },

  /**
   * Abre modal para editar veículo existente
   * @param {number} id - ID do veículo a ser editado
   */
  editarVeiculo: async (id) => {
    try {
      const [veiculoRes, clientesRes] = await Promise.all([
        api.get(`/veiculos/${id}`),
        api.get('/clientes?ativo=true')
      ]);
      const veiculo = veiculoRes.data;
      const clientes = clientesRes.data;
      
      Modal.show('Editar Veículo', `
        <form id="form-veiculo-edit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
              <input type="text" name="placa" required maxlength="8" value="${veiculo.placa || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select name="cliente_id" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                ${clientes.map(c => `<option value="${c.id}" ${c.id === veiculo.cliente_id ? 'selected' : ''}>${c.nome}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
              <input type="text" name="marca" required value="${veiculo.marca || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
              <input type="text" name="modelo" required value="${veiculo.modelo || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <input type="number" name="ano" min="1900" max="2099" value="${veiculo.ano || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cor</label>
              <input type="text" name="cor" value="${veiculo.cor || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">KM Atual</label>
              <input type="number" name="km_atual" min="0" value="${veiculo.km_atual || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Chassis</label>
              <input type="text" name="chassis" value="${veiculo.chassis || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
          </div>
        </form>
      `, async () => {
        const form = document.getElementById('form-veiculo-edit');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
          await api.put(`/veiculos/${id}`, data);
          Utils.showToast('Veículo atualizado com sucesso!', 'success');
          Modal.close();
          PageManager.loadPage('veiculos');
        } catch (error) {
          Utils.showToast('Erro ao atualizar veículo: ' + error.message, 'error');
        }
      });
    } catch (error) {
      Utils.showToast('Erro ao carregar dados do veículo: ' + error.message, 'error');
    }
  },

  /**
   * Abre modal para editar peça existente
   * @param {number} id - ID da peça a ser editada
   */
  editarPeca: async (id) => {
    try {
      const response = await api.get(`/pecas/${id}`);
      const peca = response.data;
      
      Modal.show('Editar Peça', `
        <form id="form-peca-edit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Código *</label>
              <input type="text" name="codigo" required value="${peca.codigo || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" name="nome" required value="${peca.nome || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input type="text" name="marca" value="${peca.marca || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input type="text" name="categoria" value="${peca.categoria || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Preço Custo *</label>
              <input type="number" name="preco_custo" required step="0.01" min="0" value="${peca.preco_custo || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Preço Venda *</label>
              <input type="number" name="preco_venda" required step="0.01" min="0" value="${peca.preco_venda || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estoque Atual</label>
              <input type="number" name="estoque_atual" min="0" value="${peca.estoque_atual || 0}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
              <input type="number" name="estoque_minimo" min="0" value="${peca.estoque_minimo || 5}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Localização</label>
              <input type="text" name="localizacao" value="${peca.localizacao || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
          </div>
        </form>
      `, async () => {
        const form = document.getElementById('form-peca-edit');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
          await api.put(`/pecas/${id}`, data);
          Utils.showToast('Peça atualizada com sucesso!', 'success');
          Modal.close();
          PageManager.loadPage('pecas');
        } catch (error) {
          Utils.showToast('Erro ao atualizar peça: ' + error.message, 'error');
        }
      });
    } catch (error) {
      Utils.showToast('Erro ao carregar dados da peça: ' + error.message, 'error');
    }
  },

  /**
   * Abre modal para editar serviço existente
   * @param {number} id - ID do serviço a ser editado
   */
  editarServico: async (id) => {
    try {
      const response = await api.get(`/servicos/${id}`);
      const servico = response.data;
      
      Modal.show('Editar Serviço', `
        <form id="form-servico-edit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" name="nome" required value="${servico.nome || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
              <select name="categoria" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="MECANICA" ${servico.categoria === 'MECANICA' ? 'selected' : ''}>Mecânica</option>
                <option value="ELETRICA" ${servico.categoria === 'ELETRICA' ? 'selected' : ''}>Elétrica</option>
                <option value="FUNILARIA" ${servico.categoria === 'FUNILARIA' ? 'selected' : ''}>Funilaria</option>
                <option value="PINTURA" ${servico.categoria === 'PINTURA' ? 'selected' : ''}>Pintura</option>
                <option value="PREVENTIVA" ${servico.categoria === 'PREVENTIVA' ? 'selected' : ''}>Preventiva</option>
                <option value="DIAGNOSTICO" ${servico.categoria === 'DIAGNOSTICO' ? 'selected' : ''}>Diagnóstico</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Preço Padrão *</label>
              <input type="number" name="preco_padrao" required step="0.01" min="0" value="${servico.preco_padrao || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tempo Estimado</label>
              <input type="text" name="tempo_estimado" value="${servico.tempo_estimado || ''}" placeholder="Ex: 2h, 30min" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea name="descricao" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">${servico.descricao || ''}</textarea>
            </div>
          </div>
        </form>
      `, async () => {
        const form = document.getElementById('form-servico-edit');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
          await api.put(`/servicos/${id}`, data);
          Utils.showToast('Serviço atualizado com sucesso!', 'success');
          Modal.close();
          PageManager.loadPage('servicos');
        } catch (error) {
          Utils.showToast('Erro ao atualizar serviço: ' + error.message, 'error');
        }
      });
    } catch (error) {
      Utils.showToast('Erro ao carregar dados do serviço: ' + error.message, 'error');
    }
  },

  /**
   * Abre modal para editar mecânico existente
   * @param {number} id - ID do mecânico a ser editado
   */
  editarMecanico: async (id) => {
    try {
      const response = await api.get(`/mecanicos/${id}`);
      const mecanico = response.data;
      
      Modal.show('Editar Mecânico', `
        <form id="form-mecanico-edit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" name="nome" required value="${mecanico.nome || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input type="text" name="cpf" value="${mecanico.cpf || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="text" name="telefone" value="${mecanico.telefone || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value="${mecanico.email || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
              <input type="text" name="especialidade" value="${mecanico.especialidade || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Salário</label>
              <input type="number" name="salario" step="0.01" min="0" value="${mecanico.salario || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Comissão (%)</label>
              <input type="number" name="comissao_percentual" step="0.01" min="0" max="100" value="${mecanico.comissao_percentual || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="ativo" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="1" ${mecanico.ativo ? 'selected' : ''}>Ativo</option>
                <option value="0" ${!mecanico.ativo ? 'selected' : ''}>Inativo</option>
              </select>
            </div>
          </div>
        </form>
      `, async () => {
        const form = document.getElementById('form-mecanico-edit');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
          await api.put(`/mecanicos/${id}`, data);
          Utils.showToast('Mecânico atualizado com sucesso!', 'success');
          Modal.close();
          PageManager.loadPage('mecanicos');
        } catch (error) {
          Utils.showToast('Erro ao atualizar mecânico: ' + error.message, 'error');
        }
      });
    } catch (error) {
      Utils.showToast('Erro ao carregar dados do mecânico: ' + error.message, 'error');
    }
  },

  /**
   * Abre modal para editar fornecedor existente
   * @param {number} id - ID do fornecedor a ser editado
   */
  editarFornecedor: async (id) => {
    try {
      const response = await api.get(`/fornecedores/${id}`);
      const fornecedor = response.data;
      
      Modal.show('Editar Fornecedor', `
        <form id="form-fornecedor-edit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Razão Social *</label>
              <input type="text" name="razao_social" required value="${fornecedor.razao_social || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
              <input type="text" name="nome_fantasia" value="${fornecedor.nome_fantasia || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">CNPJ *</label>
              <input type="text" name="cnpj" required value="${fornecedor.cnpj || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contato</label>
              <input type="text" name="contato" value="${fornecedor.contato || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="text" name="telefone" value="${fornecedor.telefone || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value="${fornecedor.email || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input type="text" name="endereco" value="${fornecedor.endereco || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input type="text" name="cidade" value="${fornecedor.cidade || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input type="text" name="estado" maxlength="2" value="${fornecedor.estado || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
          </div>
        </form>
      `, async () => {
        const form = document.getElementById('form-fornecedor-edit');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
          await api.put(`/fornecedores/${id}`, data);
          Utils.showToast('Fornecedor atualizado com sucesso!', 'success');
          Modal.close();
          PageManager.loadPage('fornecedores');
        } catch (error) {
          Utils.showToast('Erro ao atualizar fornecedor: ' + error.message, 'error');
        }
      });
    } catch (error) {
      Utils.showToast('Erro ao carregar dados do fornecedor: ' + error.message, 'error');
    }
  }
};

// ========================================
// EVENT LISTENERS E INICIALIZAÇÃO
// ========================================

/**
 * Inicialização da aplicação quando o DOM estiver pronto
 * Configura todos os event listeners e carrega a página inicial
 */
document.addEventListener('DOMContentLoaded', () => {
  // Navegação da sidebar
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      PageManager.loadPage(link.dataset.page);
    });
  });

  // Botão Nova OS (header)
  document.getElementById('btn-nova-os').addEventListener('click', () => {
    Forms.novaOS();
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

  /**
   * Event delegation para botões dinâmicos
   * Captura cliques em botões gerados dinamicamente pelas páginas
   * Identifica ação com base no texto do botão ou título (title attribute)
   */
  document.getElementById('content').addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    
    // Botões de cadastro
    if (button.textContent.includes('Novo Cliente')) {
      e.preventDefault();
      Forms.novoCliente();
    } else if (button.textContent.includes('Novo Veículo')) {
      e.preventDefault();
      Forms.novoVeiculo();
    } else if (button.textContent.includes('Nova Peça')) {
      e.preventDefault();
      Forms.novaPeca();
    } else if (button.textContent.includes('Novo Serviço')) {
      e.preventDefault();
      Forms.novoServico();
    } else if (button.textContent.includes('Novo Mecânico')) {
      e.preventDefault();
      Forms.novoMecanico();
    } else if (button.textContent.includes('Novo Fornecedor')) {
      e.preventDefault();
      Forms.novoFornecedor();
    } else if (button.textContent.includes('Nova OS') || button.id === 'btn-nova-os-page') {
      e.preventDefault();
      Forms.novaOS();
    }
    
    // Botões de ação (Ver Perfil, Editar, etc.)
    const row = button.closest('tr') || button.closest('[data-id]');
    if (!row) return;
    
    // Ver Perfil CRM
    if (button.title === 'Ver Perfil CRM') {
      e.preventDefault();
      const clienteId = getRowId(row);
      if (clienteId) await Actions.verPerfilCRM(clienteId);
    }
    
    // Editar Cliente
    else if (button.title === 'Editar' && AppState.currentPage === 'clientes') {
      e.preventDefault();
      const clienteId = getRowId(row);
      if (clienteId) await Forms.editarCliente(clienteId);
    }
    
    // Editar Veículo
    else if (button.title === 'Editar' && AppState.currentPage === 'veiculos') {
      e.preventDefault();
      const veiculoId = getRowId(row);
      if (veiculoId) await Forms.editarVeiculo(veiculoId);
    }
    
    // Editar Peça
    else if (button.title === 'Editar' && AppState.currentPage === 'pecas') {
      e.preventDefault();
      const pecaId = getRowId(row);
      if (pecaId) await Forms.editarPeca(pecaId);
    }
    
    // Editar Serviço
    else if (button.title === 'Editar' && AppState.currentPage === 'servicos') {
      e.preventDefault();
      const servicoId = getRowId(row);
      if (servicoId) await Forms.editarServico(servicoId);
    }
    
    // Editar Mecânico
    else if (button.title === 'Editar' && AppState.currentPage === 'mecanicos') {
      e.preventDefault();
      const mecanicoId = getRowId(row);
      if (mecanicoId) await Forms.editarMecanico(mecanicoId);
    }
    
    // Editar Fornecedor
    else if (button.title === 'Editar' && AppState.currentPage === 'fornecedores') {
      e.preventDefault();
      const fornecedorId = getRowId(row);
      if (fornecedorId) await Forms.editarFornecedor(fornecedorId);
    }
  });
  
  /**
   * Helper para extrair ID da row/card
   * @param {HTMLElement} row - Elemento tr (tabela) ou div (card) que contém data-id
   * @returns {number} ID do registro
   */
  function getRowId(row) {
    return row.dataset.id;
  }

  // Carregar página inicial
  PageManager.loadPage('dashboard');
});
