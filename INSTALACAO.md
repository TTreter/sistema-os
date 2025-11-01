# 🚀 Guia de Instalação Rápida

## Para Usuários Windows (Método Simples)

### Passo 1: Instalar Node.js

1. Acesse: https://nodejs.org/
2. Clique em "Download" na versão LTS (recomendada)
3. Execute o instalador baixado
4. Clique em "Next" → "Next" → "Install"
5. Aguarde a instalação terminar

### Passo 2: Obter o Sistema

Você receberá uma pasta chamada `webapp` contendo todos os arquivos do sistema.

### Passo 3: Executar o Sistema

1. Entre na pasta `webapp`
2. **Duplo clique** no arquivo `start.cmd`
3. Uma janela preta (terminal) vai abrir
4. Aguarde a mensagem de inicialização
5. Abra seu navegador e acesse: **http://localhost:3000**

✅ **Pronto! O sistema está funcionando!**

---

## Para Usuários Linux/macOS

### Passo 1: Instalar Node.js

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nodejs npm
```

**macOS (com Homebrew):**
```bash
brew install node
```

**Outras distribuições:**
- Acesse: https://nodejs.org/ e baixe o instalador para seu sistema

### Passo 2: Executar o Sistema

```bash
# Entre na pasta do projeto
cd webapp

# Torne o script executável (apenas primeira vez)
chmod +x start.sh

# Execute o sistema
./start.sh
```

Abra seu navegador e acesse: **http://localhost:3000**

---

## Acessar de Outros Dispositivos na Rede

### Descobrir seu IP Local

**Windows:**
1. Pressione `Windows + R`
2. Digite `cmd` e pressione Enter
3. Digite `ipconfig` e pressione Enter
4. Procure por "Endereço IPv4" (ex: 192.168.1.100)

**Linux/macOS:**
```bash
ip addr  # ou ifconfig
```

### Acessar de Outro Dispositivo

No navegador do outro dispositivo (celular, tablet, outro computador):
- Digite: `http://SEU_IP:3000`
- Exemplo: `http://192.168.1.100:3000`

**Importante**: Ambos os dispositivos devem estar na mesma rede WiFi/cabo.

---

## Populando com Dados de Exemplo

Para testar o sistema com dados pré-cadastrados:

**Windows:**
```cmd
cd webapp
npm run seed-db
```

**Linux/macOS:**
```bash
cd webapp
npm run seed-db
```

Isso criará:
- 5 Clientes
- 6 Veículos
- 3 Mecânicos
- 10 Peças
- 12 Tipos de Serviço
- 4 Ordens de Serviço

---

## Solução de Problemas Comuns

### ❌ "Node não é reconhecido como comando"

**Solução**: Node.js não está instalado ou não está no PATH do sistema.
- Reinstale o Node.js
- Reinicie o computador após a instalação

### ❌ "Porta 3000 já está em uso"

**Solução**: Outro programa está usando a porta 3000.

**Windows:**
```cmd
netstat -ano | findstr :3000
taskkill /PID [número_do_processo] /F
```

**Linux/macOS:**
```bash
lsof -i :3000
kill -9 [PID]
```

### ❌ Erro ao instalar dependências

**Solução**:
```bash
# Delete a pasta node_modules
rm -rf node_modules

# Delete o arquivo package-lock.json
rm package-lock.json

# Reinstale
npm install
```

### ❌ Sistema não abre no navegador

**Verificações**:
1. O terminal/cmd mostra a mensagem "Servidor rodando"?
2. Tente acessar: http://127.0.0.1:3000
3. Tente outro navegador
4. Desative temporariamente antivírus/firewall

---

## Primeiros Passos Após Instalação

### 1. Acesse o Dashboard
- URL: http://localhost:3000
- Você verá os KPIs e status das ordens de serviço

### 2. Explore o Sistema
- **Dashboard**: Visão geral da oficina
- **Ordens de Serviço**: Lista de todas as OS
- **Kanban**: Visualização do fluxo de trabalho
- **Cadastros**: Clientes, Veículos, Peças, etc.

### 3. Criar sua Primeira OS
1. Clique em "Nova OS" (botão azul no topo)
2. Selecione o cliente e veículo
3. Preencha as informações
4. Salve a OS

### 4. Adicionar Serviços e Peças
1. Abra uma OS existente
2. Clique em "Adicionar Serviço" ou "Adicionar Peça"
3. Os valores serão calculados automaticamente

### 5. Atualizar Status
- Arraste os cards no Kanban para mudar o status
- Ou use os botões de ação na lista de OS

---

## Backup dos Dados

### Fazer Backup

**Arquivos importantes:**
- `database/oficina.db` - Banco de dados
- `uploads/` - Fotos do checklist

**Como fazer:**
1. Copie esses arquivos para um local seguro
2. Ou compacte toda a pasta `webapp` em um ZIP

### Restaurar Backup

1. Substitua os arquivos originais pelos do backup
2. Reinicie o sistema

---

## Comandos Úteis

```bash
# Iniciar o servidor
npm start

# Inicializar banco de dados (limpa tudo)
npm run init-db

# Popular com dados de exemplo
npm run seed-db

# Testar se o servidor está rodando
curl http://localhost:3000/api
```

---

## Próximos Passos

Após a instalação bem-sucedida:

1. ✅ Leia o arquivo `README.md` para conhecer todas as funcionalidades
2. ✅ Cadastre seus clientes reais
3. ✅ Cadastre seu estoque de peças
4. ✅ Configure os tipos de serviço da sua oficina
5. ✅ Comece a criar ordens de serviço

---

## Suporte

Se você tiver problemas não listados aqui:

1. Verifique os logs no arquivo `server.log`
2. Consulte o `README.md` completo
3. Verifique se todas as dependências foram instaladas

---

**Sistema desenvolvido para rodar 100% local, sem necessidade de internet!** 🚀
