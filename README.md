# 🚗 Sistema de Gestão para Oficina Mecânica

Sistema completo de gestão operacional para oficinas mecânicas, desenvolvido com Node.js, Express e SQLite. Execução 100% local, sem necessidade de internet ou servidores externos.

## 📋 Sobre o Projeto

**Nome**: Sistema de Gestão para Oficina Mecânica  
**Versão**: 1.0.0 (Fase 1 - MVP)  
**Objetivo**: Digitalizar e otimizar a operação de oficinas mecânicas, desde o cadastro de clientes até o controle completo de ordens de serviço.

## ✨ Funcionalidades Implementadas (Fase 1)

### Dashboard Principal
- ✅ KPIs em tempo real (OS Abertas, Aguardando Aprovação, Em Reparo, Pronto para Retirada)
- ✅ Alertas de estoque baixo
- ✅ Acesso rápido às funcionalidades principais
- ✅ Busca rápida por placa ou nome do cliente

### Módulo de Ordens de Serviço (OS)
- ✅ Criação de OS com número automático (OS2024-XXXX)
- ✅ Gestão de status via Kanban:
  - Aguardando Diagnóstico
  - Aguardando Aprovação
  - Em Reparo
  - Pronto para Retirada
  - Finalizada
  - Cancelada
- ✅ Checklist de entrada com fotos
- ✅ Adição de peças e serviços à OS
- ✅ Cálculo automático de valores
- ✅ Histórico de comunicação
- ✅ Baixa automática de estoque ao adicionar peças

### Módulos de Cadastro
- ✅ **Clientes**: Nome, CPF/CNPJ, contatos, endereço, observações
- ✅ **Veículos**: Placa, modelo, marca, ano, cor, KM, chassis
- ✅ **Peças**: Código, nome, estoque, preços, localização
- ✅ **Mecânicos**: Dados pessoais, especialidade, salário, comissão
- ✅ **Tipos de Serviço**: Organizados por categoria, preço padrão, tempo estimado
- ✅ **Fornecedores**: Dados completos para gestão de compras

### Banco de Dados
- ✅ SQLite local (arquivo oficina.db)
- ✅ 14 tabelas relacionais
- ✅ Triggers automáticos para:
  - Atualização de valores da OS
  - Baixa automática de estoque
  - Entrada de estoque via ordem de compra
- ✅ Views otimizadas para consultas frequentes
- ✅ Índices para melhor performance

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **better-sqlite3** - Banco de dados SQLite
- **Multer** - Upload de arquivos
- **CORS** - Segurança de requisições
- **Compression** - Compressão de respostas

### Frontend
- **HTML5** - Estrutura
- **Tailwind CSS** (via CDN) - Estilização responsiva
- **Font Awesome** - Ícones
- **Axios** - Cliente HTTP
- **JavaScript ES6+** - Lógica da aplicação

## 📦 Requisitos do Sistema

- **Sistema Operacional**: Windows 10/11, Linux ou macOS
- **Node.js**: Versão 14 ou superior
- **RAM**: Mínimo 2GB
- **Espaço em Disco**: 100MB para aplicação + dados
- **Navegador**: Chrome, Firefox, Edge ou Safari (versões recentes)

## 🚀 Como Executar

### No Windows (Simples)

1. **Instalar Node.js** (se não tiver):
   - Baixe em: https://nodejs.org/
   - Instale a versão LTS (recomendada)

2. **Executar o sistema**:
   - Duplo clique no arquivo `start.cmd`
   - O sistema irá:
     - Verificar dependências
     - Instalar pacotes necessários (primeira vez)
     - Inicializar o banco de dados (primeira vez)
     - Iniciar o servidor

3. **Acessar o sistema**:
   - Abra o navegador e acesse: `http://localhost:3000`

### Instalação Manual (Todas as Plataformas)

```bash
# 1. Instalar dependências
npm install

# 2. Inicializar banco de dados (primeira vez)
npm run init-db

# 3. Popular com dados de exemplo (opcional)
npm run seed-db

# 4. Iniciar servidor
npm start
```

## 🌐 Acesso na Rede Local

O sistema pode ser acessado por outros dispositivos na mesma rede:

1. Descubra o IP do computador onde o sistema está rodando:
   - **Windows**: Execute `ipconfig` no CMD
   - **Linux/Mac**: Execute `ifconfig` ou `ip addr`

2. Acesse de outro dispositivo: `http://IP_DO_COMPUTADOR:3000`
   - Exemplo: `http://192.168.1.100:3000`

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `clientes` | Cadastro de clientes |
| `veiculos` | Veículos vinculados aos clientes |
| `categorias_servico` | Categorias de serviços (Motor, Freios, etc.) |
| `tipos_servico` | Tipos de serviços oferecidos |
| `pecas` | Catálogo de peças com controle de estoque |
| `mecanicos` | Cadastro de mecânicos |
| `ordens_servico` | Ordens de serviço (OS) |
| `os_servicos` | Serviços incluídos em cada OS |
| `os_pecas` | Peças utilizadas em cada OS |
| `checklist_entrada` | Checklist com fotos do veículo |
| `historico_comunicacao` | Histórico de comunicações da OS |
| `fornecedores` | Cadastro de fornecedores |
| `ordens_compra` | Ordens de compra de peças |
| `oc_itens` | Itens de cada ordem de compra |

### Relacionamentos
- Cliente → Veículos (1:N)
- OS → Cliente (N:1)
- OS → Veículo (N:1)
- OS → Mecânico (N:1)
- OS → Serviços/Peças (1:N)
- Tipo de Serviço → Categoria (N:1)

## 📡 API Endpoints

### Principais Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api` | Informações da API |
| `GET` | `/api/clientes` | Listar clientes |
| `POST` | `/api/clientes` | Criar cliente |
| `GET` | `/api/veiculos` | Listar veículos |
| `POST` | `/api/veiculos` | Criar veículo |
| `GET` | `/api/pecas` | Listar peças |
| `GET` | `/api/pecas?estoque_baixo=true` | Peças com estoque baixo |
| `GET` | `/api/servicos` | Listar tipos de serviço |
| `GET` | `/api/servicos/categorias` | Listar categorias |
| `GET` | `/api/ordens-servico` | Listar OS |
| `GET` | `/api/ordens-servico/kanban` | OS organizadas por status |
| `POST` | `/api/ordens-servico` | Criar nova OS |
| `PATCH` | `/api/ordens-servico/:id/status` | Atualizar status da OS |
| `POST` | `/api/ordens-servico/:id/servicos` | Adicionar serviço à OS |
| `POST` | `/api/ordens-servico/:id/pecas` | Adicionar peça à OS |
| `POST` | `/api/ordens-servico/:id/checklist` | Adicionar item ao checklist |
| `GET` | `/api/busca-rapida?q=termo` | Busca rápida |

## 📸 Upload de Fotos

As fotos do checklist são armazenadas localmente em:
- Pasta: `uploads/`
- Formatos suportados: JPG, PNG, GIF, WEBP
- Tamanho máximo: 10MB por arquivo

## 🗂️ Estrutura de Arquivos

```
webapp/
├── database/
│   └── oficina.db              # Banco de dados SQLite
├── public/
│   ├── index.html              # Interface principal
│   └── js/
│       └── app.js              # Lógica do frontend
├── routes/
│   ├── clientes.js             # Rotas de clientes
│   ├── veiculos.js             # Rotas de veículos
│   ├── pecas.js                # Rotas de peças
│   ├── mecanicos.js            # Rotas de mecânicos
│   ├── servicos.js             # Rotas de serviços
│   ├── fornecedores.js         # Rotas de fornecedores
│   └── ordens-servico.js       # Rotas de OS
├── scripts/
│   ├── init-database.js        # Script de inicialização do BD
│   └── seed-database.js        # Script de dados de exemplo
├── uploads/                    # Fotos do checklist
├── server.js                   # Servidor principal
├── start.cmd                   # Arquivo de inicialização Windows
├── package.json                # Dependências do projeto
└── README.md                   # Esta documentação
```

## 💾 Backup e Restauração

### Fazer Backup

Copie os seguintes arquivos/pastas:
- `database/oficina.db` - Banco de dados
- `uploads/` - Fotos do checklist

### Restaurar Backup

Substitua os arquivos originais pelos arquivos do backup.

## 🔜 Próximas Fases (Roadmap)

### Fase 2 - Gestão de Estoque e Orçamentos
- [ ] Módulo completo de Orçamentos
- [ ] Envio de orçamentos por WhatsApp/Email
- [ ] Conversão de orçamento em OS
- [ ] Módulo de Ordem de Compra
- [ ] Controle avançado de estoque

### Fase 3 - Inteligência de Negócios
- [ ] Módulo Financeiro (Contas a Pagar/Receber)
- [ ] Relatórios por categoria de serviço
- [ ] Análise de rentabilidade
- [ ] Gráficos e dashboards avançados
- [ ] Relatório de produtividade por mecânico

### Fase 4 - CRM e Automações
- [ ] Lembretes automáticos de revisão
- [ ] Histórico completo do cliente
- [ ] Pesquisas de satisfação
- [ ] Integrações com WhatsApp Business API
- [ ] Notificações por SMS

## 🐛 Solução de Problemas

### Servidor não inicia

1. Verifique se o Node.js está instalado: `node --version`
2. Verifique se a porta 3000 está livre
3. Reinstale as dependências: `npm install`

### Erro ao acessar o sistema

1. Verifique se o servidor está rodando
2. Tente acessar: `http://127.0.0.1:3000`
3. Limpe o cache do navegador

### Banco de dados corrompido

1. Faça backup do arquivo atual
2. Delete `database/oficina.db`
3. Execute: `npm run init-db`
4. Execute: `npm run seed-db` (para dados de exemplo)

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema:
- Consulte esta documentação
- Verifique os logs do servidor em `server.log`

## 📄 Licença

MIT License - Uso livre para fins comerciais e pessoais.

## 🎉 Dados de Exemplo

O sistema inclui dados de demonstração que podem ser carregados com:

```bash
npm run seed-db
```

Isso criará:
- 5 Clientes de exemplo
- 6 Veículos
- 3 Mecânicos
- 10 Peças
- 12 Tipos de Serviço
- 3 Fornecedores
- 4 Ordens de Serviço (em diferentes status)

---

**Desenvolvido para otimizar a gestão de oficinas mecânicas** 🚗⚙️
