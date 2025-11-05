# 🚀 tGest - FASE 4 - CRM e Automações

## ✅ IMPLEMENTAÇÃO COMPLETA

---

## 📊 **VISÃO GERAL DA FASE 4**

A Fase 4 adiciona **Customer Relationship Management (CRM)** completo com automações inteligentes para melhorar o relacionamento com clientes e aumentar a retenção.

### **Principais Funcionalidades**
- ✅ Perfil 360° do cliente com histórico completo
- ✅ Lembretes automáticos de manutenção
- ✅ Pesquisas de satisfação pós-atendimento
- ✅ Sistema de notificações (WhatsApp/SMS/Email)
- ✅ Análise de retenção e risco de perda
- ✅ Campanhas de marketing e relacionamento
- ✅ NPS (Net Promoter Score) automático

---

## 📂 **ESTRUTURA DO BANCO DE DADOS**

### **Novas Tabelas Criadas**

#### **1. clientes_historico**
Registra todas as interações e eventos do cliente
```sql
- id, cliente_id, tipo, descricao
- referencia_id, referencia_tabela
- usuario, observacoes, data_hora
```

**Tipos de Evento:**
- `OS_CRIADA`, `OS_FINALIZADA`
- `ORCAMENTO_ENVIADO`, `CONTATO_REALIZADO`
- `LEMBRETE_CRIADO`, `LEMBRETE_ENVIADO`, `LEMBRETE_CONCLUIDO`
- `PESQUISA_RESPONDIDA`

#### **2. lembretes**
Gerencia lembretes de manutenção preventiva
```sql
- id, veiculo_id, cliente_id
- tipo (TROCA_OLEO, REVISAO, ALINHAMENTO, FREIOS, OUTROS)
- descricao, km_atual, km_proximo, data_proxima
- status (PENDENTE, ENVIADO, AGENDADO, CONCLUIDO, IGNORADO)
- prioridade (BAIXA, MEDIA, ALTA, URGENTE)
- ultimo_envio, total_envios
```

#### **3. pesquisas_satisfacao**
Coleta feedback dos clientes após serviços
```sql
- id, os_id, cliente_id
- nota_atendimento, nota_qualidade, nota_prazo, nota_preco (1-5)
- comentario, recomendaria
- data_envio, data_resposta
- status (PENDENTE, ENVIADA, RESPONDIDA, EXPIRADA)
- meio_envio (WHATSAPP, SMS, EMAIL)
- token (link único para resposta)
```

#### **4. notificacoes**
Registro de todas as comunicações enviadas
```sql
- id, cliente_id, tipo, meio
- destinatario, mensagem
- status (PENDENTE, ENVIADA, ERRO, ENTREGUE, LIDA)
- tentativas, erro_mensagem
- data_envio, data_leitura, custo
```

#### **5. campanhas**
Campanhas de marketing e relacionamento
```sql
- id, nome, descricao, tipo, meio
- mensagem, filtro_clientes (JSON)
- data_inicio, data_fim
- status (RASCUNHO, AGENDADA, EM_ENVIO, CONCLUIDA, CANCELADA)
- total_destinatarios, total_enviados, total_erros
```

#### **6. clientes_preferencias**
Preferências de comunicação do cliente
```sql
- id, cliente_id
- receber_lembretes, receber_promocoes, receber_pesquisas
- meio_preferencial (WHATSAPP, SMS, EMAIL)
- melhor_horario, observacoes
```

### **Views Otimizadas**

#### **v_clientes_historico_completo**
Histórico completo com nomes legíveis

#### **v_lembretes_vencidos**
Lembretes pendentes com urgência calculada

#### **v_estatisticas_satisfacao**
Médias de notas e taxa de resposta

#### **v_clientes_perfil_360**
Visão completa do cliente com todas as métricas

#### **v_analise_retencao**
Análise de retenção por cliente

### **Triggers Automáticos**

- `trg_historico_os_criada` - Registra criação de OS
- `trg_historico_os_finalizada` - Registra finalização de OS
- `trg_criar_pesquisa_satisfacao` - Cria pesquisa ao finalizar OS
- `trg_historico_pesquisa_respondida` - Registra resposta de pesquisa
- `trg_atualizar_lembrete_timestamp` - Atualiza timestamp
- `trg_atualizar_campanha_timestamp` - Atualiza timestamp

---

## 🔌 **API ENDPOINTS**

### **Módulo CRM - /api/crm**

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/clientes/:id/perfil-360` | Perfil completo do cliente |
| `GET` | `/clientes/:id/historico` | Histórico de interações |
| `POST` | `/clientes/:id/historico` | Adicionar entrada manual ao histórico |
| `GET` | `/clientes/:id/risco-perda` | Avaliação de risco de perda |
| `GET` | `/retencao` | Análise de retenção de clientes |
| `GET` | `/clientes/:id/preferencias` | Buscar preferências |
| `PUT` | `/clientes/:id/preferencias` | Atualizar preferências |
| `GET` | `/dashboard` | Dashboard CRM com métricas |

**Exemplo: Perfil 360°**
```bash
curl http://localhost:3000/api/crm/clientes/1/perfil-360
```

**Resposta:**
```json
{
  "perfil": {
    "id": 1,
    "nome": "João Silva",
    "total_os": 8,
    "total_faturado": 4500.00,
    "ultima_visita": "2024-03-15",
    "total_veiculos": 2,
    "nota_satisfacao_media": 4.5,
    "lembretes_pendentes": 2
  },
  "veiculos": [...],
  "ultimas_os": [...],
  "pesquisas_satisfacao": [...],
  "lembretes_pendentes": [...],
  "preferencias": {...}
}
```

**Exemplo: Análise de Risco**
```bash
curl http://localhost:3000/api/crm/clientes/1/risco-perda
```

**Resposta:**
```json
{
  "cliente_id": 1,
  "score_risco": 45,
  "classificacao_risco": "MÉDIO",
  "cor": "#3B82F6",
  "recomendacao": "Monitorar cliente e manter engajamento.",
  "fatores_risco": [
    {
      "fator": "Mais de 3 meses sem visita",
      "peso": 15,
      "critico": false
    }
  ],
  "dias_sem_visita": 95
}
```

### **Módulo Lembretes - /api/lembretes**

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Listar lembretes com filtros |
| `GET` | `/vencidos` | Lembretes vencidos ou próximos |
| `GET` | `/:id` | Buscar lembrete específico |
| `POST` | `/` | Criar novo lembrete |
| `PUT` | `/:id` | Atualizar lembrete |
| `PATCH` | `/:id/status` | Atualizar status |
| `POST` | `/:id/enviar` | Enviar lembrete ao cliente |
| `POST` | `/auto-criar` | Criar lembretes automáticos pós-OS |
| `DELETE` | `/:id` | Remover lembrete |

**Exemplo: Lembretes Vencidos**
```bash
curl http://localhost:3000/api/lembretes/vencidos
```

**Exemplo: Criar Lembrete**
```bash
curl -X POST http://localhost:3000/api/lembretes \
  -H "Content-Type: application/json" \
  -d '{
    "veiculo_id": 1,
    "cliente_id": 1,
    "tipo": "TROCA_OLEO",
    "descricao": "Troca de óleo e filtro",
    "km_atual": 50000,
    "km_proximo": 60000,
    "data_proxima": "2024-06-15",
    "prioridade": "ALTA"
  }'
```

**Exemplo: Criar Lembretes Automáticos**
```bash
curl -X POST http://localhost:3000/api/lembretes/auto-criar \
  -H "Content-Type: application/json" \
  -d '{"os_id": 5}'
```

### **Módulo Pesquisas - /api/pesquisas**

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Listar pesquisas |
| `GET` | `/pendentes` | Pesquisas pendentes |
| `GET` | `/:id` | Buscar pesquisa por ID |
| `GET` | `/token/:token` | Buscar por token (público) |
| `POST` | `/:id/enviar` | Enviar pesquisa ao cliente |
| `POST` | `/responder/:token` | Responder pesquisa (público) |
| `GET` | `/estatisticas/geral` | Estatísticas gerais |
| `GET` | `/estatisticas/nps` | Cálculo do NPS |
| `DELETE` | `/:id` | Remover pesquisa |

**Exemplo: Estatísticas de Satisfação**
```bash
curl http://localhost:3000/api/pesquisas/estatisticas/geral
```

**Resposta:**
```json
{
  "estatisticas": {
    "total_pesquisas": 150,
    "total_respondidas": 98,
    "media_atendimento": 4.3,
    "media_qualidade": 4.5,
    "media_prazo": 4.1,
    "media_preco": 3.8,
    "media_geral": 4.18,
    "percentual_recomendaria": 85.71,
    "taxa_resposta": 65.33
  },
  "distribuicao_notas": [...],
  "comentarios_recentes": [...],
  "piores_avaliacoes": [...]
}
```

**Exemplo: NPS (Net Promoter Score)**
```bash
curl http://localhost:3000/api/pesquisas/estatisticas/nps
```

**Resposta:**
```json
{
  "nps_score": "52.50",
  "classificacao": "Muito Bom",
  "promotores": 85,
  "detratores": 15,
  "total_respostas": 100,
  "percentual_promotores": "85.00",
  "percentual_detratores": "15.00"
}
```

**Exemplo: Cliente Respondendo Pesquisa**
```bash
curl -X POST http://localhost:3000/api/pesquisas/responder/abc123xyz \
  -H "Content-Type: application/json" \
  -d '{
    "nota_atendimento": 5,
    "nota_qualidade": 5,
    "nota_prazo": 4,
    "nota_preco": 4,
    "comentario": "Excelente serviço!",
    "recomendaria": true
  }'
```

### **Módulo Notificações - /api/notificacoes**

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Listar notificações |
| `GET` | `/pendentes` | Notificações pendentes |
| `GET` | `/:id` | Buscar notificação |
| `POST` | `/enviar` | Enviar notificação |
| `POST` | `/enviar-em-lote` | Enviar para múltiplos clientes |
| `POST` | `/:id/reenviar` | Reenviar notificação com erro |
| `GET` | `/estatisticas/geral` | Estatísticas de envio |
| `GET` | `/configuracoes` | Buscar configurações |
| `PUT` | `/configuracoes` | Atualizar configurações |

**Exemplo: Enviar Notificação**
```bash
curl -X POST http://localhost:3000/api/notificacoes/enviar \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "tipo": "LEMBRETE",
    "meio": "WHATSAPP",
    "mensagem": "Olá! Está na hora da revisão do seu veículo."
  }'
```

**Exemplo: Envio em Lote**
```bash
curl -X POST http://localhost:3000/api/notificacoes/enviar-em-lote \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_ids": [1, 2, 3, 4, 5],
    "tipo": "CAMPANHA",
    "meio": "WHATSAPP",
    "mensagem": "Promoção especial! 20% OFF em troca de óleo."
  }'
```

---

## 🤖 **AUTOMAÇÕES IMPLEMENTADAS**

### **1. Criação Automática de Pesquisa**
- **Trigger:** Ao finalizar OS
- **Ação:** Cria pesquisa de satisfação com token único
- **Status inicial:** PENDENTE

### **2. Registro de Histórico**
- **Trigger:** Criar/Finalizar OS, Responder Pesquisa
- **Ação:** Adiciona entrada automática no histórico do cliente

### **3. Criação de Lembretes Inteligentes**
- **Endpoint:** `POST /api/lembretes/auto-criar`
- **Lógica:**
  - Troca de óleo: +10.000 km ou 6 meses
  - Revisão: +15.000 km ou 1 ano
  - Alinhamento: +20.000 km ou 6 meses
  - Freios: +30.000 km ou 1 ano

### **4. Análise de Risco de Perda**
- **Score 0-100** baseado em:
  - Tempo sem visita (peso 40%)
  - Frequência histórica (peso 30%)
  - Ticket médio (peso 20%)
  - Lembretes não atendidos (peso 10%)

**Classificações:**
- **0-29:** BAIXO (verde)
- **30-49:** MÉDIO (azul)
- **50-69:** ALTO (amarelo)
- **70-100:** CRÍTICO (vermelho)

---

## 📱 **INTEGRAÇÃO COM SERVIÇOS EXTERNOS**

### **Configurações Necessárias**

O sistema está preparado para integração com serviços externos de comunicação. Configure através da tabela `configuracoes`:

```sql
-- WhatsApp Business API
crm_whatsapp_api_key = 'sua_api_key_aqui'

-- Provedor de SMS (Twilio, Nexmo, etc)
crm_sms_api_key = 'sua_api_key_aqui'

-- Email SMTP
crm_email_smtp_host = 'smtp.gmail.com'
crm_email_smtp_porta = '587'
crm_email_usuario = 'seu_email@gmail.com'
crm_email_senha = 'sua_senha_app'
crm_email_remetente = 'oficina@exemplo.com'
```

**Atualizar via API:**
```bash
curl -X PUT http://localhost:3000/api/notificacoes/configuracoes \
  -H "Content-Type: application/json" \
  -d '{
    "crm_whatsapp_api_key": "abc123",
    "crm_email_usuario": "oficina@gmail.com"
  }'
```

### **Simulação vs Produção**

**Modo Atual:** SIMULAÇÃO
- Notificações são registradas no banco
- Envio é simulado (90% taxa de sucesso)
- Logs mostram detalhes da "comunicação"

**Modo Produção:** 
- Implementar chamadas reais para APIs externas
- Substituir função `simularEnvioNotificacao()` em `routes/notificacoes.js`
- Exemplos de integração:
  - **WhatsApp:** WhatsApp Business API, Twilio WhatsApp
  - **SMS:** Twilio, Nexmo, AWS SNS
  - **Email:** Nodemailer, SendGrid, AWS SES

---

## 🎯 **CASOS DE USO**

### **Caso 1: Lembrete Automático de Troca de Óleo**
1. Cliente finaliza OS com troca de óleo
2. Sistema cria lembrete automático para +10.000 km ou 6 meses
3. 7 dias antes da data, sistema envia WhatsApp
4. Cliente agenda novo serviço
5. Status do lembrete: AGENDADO → CONCLUIDO

### **Caso 2: Pesquisa de Satisfação**
1. OS finalizada → Pesquisa criada automaticamente
2. Sistema espera 24h
3. Envia link único via WhatsApp
4. Cliente responde com notas e comentário
5. Sistema calcula NPS e registra no histórico

### **Caso 3: Retenção de Cliente em Risco**
1. Dashboard CRM identifica cliente INATIVO (180+ dias sem visita)
2. Gerente visualiza análise de risco: score 65 (ALTO)
3. Cria campanha de reativação com 15% desconto
4. Sistema envia mensagem personalizada
5. Cliente retorna e é reclassificado como ATIVO

### **Caso 4: Campanha de Promoção**
1. Oficina planeja promoção de revisão
2. Cria campanha para clientes com status ATIVO e EM_RISCO
3. Mensagem: "Revisão com 20% OFF - válido até 31/03"
4. Sistema filtra 45 clientes elegíveis
5. Envia automaticamente via WhatsApp
6. Rastreia taxa de abertura e conversão

---

## 📊 **MÉTRICAS E KPIs**

### **Dashboard CRM**
```bash
curl http://localhost:3000/api/crm/dashboard
```

**Retorna:**
- Distribuição de clientes por status de retenção
- Lembretes vencidos e próximos
- Estatísticas de pesquisas de satisfação
- Top 10 clientes por faturamento
- Notificações dos últimos 30 dias

### **Indicadores Principais**
- **Taxa de Resposta:** % de pesquisas respondidas
- **NPS (Net Promoter Score):** Lealdade do cliente
- **Taxa de Retenção:** % de clientes ativos
- **Tempo Médio de Retorno:** Dias entre visitas
- **Taxa de Conversão de Lembretes:** % de lembretes atendidos

---

## 🧪 **TESTES RÁPIDOS**

```bash
# 1. Verificar API
curl http://localhost:3000/api

# 2. Dashboard CRM
curl http://localhost:3000/api/crm/dashboard

# 3. Perfil 360° de um cliente
curl http://localhost:3000/api/crm/clientes/1/perfil-360

# 4. Análise de retenção
curl http://localhost:3000/api/crm/retencao

# 5. Lembretes vencidos
curl http://localhost:3000/api/lembretes/vencidos

# 6. Estatísticas de satisfação
curl http://localhost:3000/api/pesquisas/estatisticas/geral

# 7. NPS
curl http://localhost:3000/api/pesquisas/estatisticas/nps

# 8. Notificações pendentes
curl http://localhost:3000/api/notificacoes/pendentes

# 9. Criar lembretes automáticos
curl -X POST http://localhost:3000/api/lembretes/auto-criar \
  -H "Content-Type: application/json" \
  -d '{"os_id": 1}'
```

---

## 🚀 **PRÓXIMOS PASSOS**

1. **Integrar APIs reais** de WhatsApp/SMS/Email
2. **Desenvolver frontend** para módulos CRM
3. **Criar dashboards visuais** com gráficos
4. **Implementar agendamento** automático de envios
5. **Adicionar relatórios** personalizados de CRM
6. **Machine Learning** para prever churn de clientes

---

## 📦 **ARQUIVOS DA FASE 4**

- `scripts/migrate-fase4.js` - Migração do banco
- `scripts/seed-crm.js` - Dados de exemplo
- `routes/crm.js` - API de CRM
- `routes/lembretes.js` - API de Lembretes
- `routes/pesquisas.js` - API de Pesquisas
- `routes/notificacoes.js` - API de Notificações

---

## ✅ **CHECKLIST DE IMPLEMENTAÇÃO**

- ✅ Migração do banco de dados
- ✅ 6 novas tabelas criadas
- ✅ 5 views otimizadas
- ✅ 6 triggers automáticos
- ✅ 4 módulos de API completos
- ✅ ~40 endpoints REST
- ✅ Seeds de dados de exemplo
- ✅ Documentação completa

---

**Sistema v4.0.0 - CRM Completo!** 🎉
