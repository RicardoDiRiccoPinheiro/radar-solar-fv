# 🚀 Guia Completo: Deploy do Radar Solar FV no Google Cloud Platform

Este guia passo-a-passo mostra como fazer deploy da solução de bot Telegram no Google Cloud Platform de forma **gratuita e escalável**.

## 📋 Pré-requisitos

- Conta Google (Gmail)
- Projeto GCP criado (gratuito)
- Token do Bot Telegram (`BOT_TOKEN`)
- ID do seu chat Telegram (`TELEGRAM_USER_CHAT_ID`)

---

## 🎯 PASSO 1: Criar Projeto GCP

### 1.1 Acessar Google Cloud Console

1. Acesse: **https://console.cloud.google.com**
2. Faça login com sua conta Google
3. Clique em **"Selecionar um projeto"** (canto superior esquerdo)
4. Clique em **"NOVO PROJETO"**

### 1.2 Criar Novo Projeto

- **Nome do projeto**: `radar-solar-fv`
- **ID do projeto**: `radar-solar-fv` (será gerado automaticamente)
- Clique em **"CRIAR"**

Aguarde 2-3 minutos para o projeto ser criado.

### 1.3 Ativar Billing (Necessário para Cloud Run)

1. No menu esquerdo, clique em **"Faturamento"**
2. Clique em **"Vincular uma conta de faturamento"**
3. Selecione ou crie uma conta de faturamento
4. Clique em **"VINCULAR"**

> **Nota**: Você receberá **$300 de crédito gratuito** por 90 dias. Cloud Run é **gratuito** com 2 milhões de requisições/mês.

---

## 🔧 PASSO 2: Ativar APIs Necessárias

### 2.1 Ativar Cloud Run API

1. No menu esquerdo, clique em **"APIs e Serviços"** → **"Biblioteca"**
2. Procure por **"Cloud Run API"**
3. Clique em **"Cloud Run API"**
4. Clique em **"ATIVAR"**

### 2.2 Ativar Firestore API

1. Volte à biblioteca
2. Procure por **"Cloud Firestore API"**
3. Clique em **"Cloud Firestore API"**
4. Clique em **"ATIVAR"**

### 2.3 Ativar Cloud Scheduler API

1. Volte à biblioteca
2. Procure por **"Cloud Scheduler API"**
3. Clique em **"Cloud Scheduler API"**
4. Clique em **"ATIVAR"**

### 2.4 Ativar Cloud Build API

1. Volte à biblioteca
2. Procure por **"Cloud Build API"**
3. Clique em **"Cloud Build API"**
4. Clique em **"ATIVAR"**

---

## 📦 PASSO 3: Criar Banco de Dados Firestore

### 3.1 Criar Firestore Database

1. No menu esquerdo, clique em **"Firestore"**
2. Clique em **"CRIAR BANCO DE DADOS"**
3. Selecione **"Modo Nativo"** (recomendado)
4. Escolha a localização: **"us-central1"** (mais barato)
5. Clique em **"CRIAR"**

Aguarde 1-2 minutos para o banco ser criado.

### 3.2 Criar Coleções

O Firestore criará as coleções automaticamente quando o bot enviar dados. Mas você pode criar manualmente:

1. No Firestore, clique em **"+ Iniciar coleção"**
2. Crie as seguintes coleções:
   - `bot_config` (configuração do bot)
   - `reports` (relatórios gerados)
   - `job_logs` (logs de execução)

---

## 🔐 PASSO 4: Criar Service Account

### 4.1 Gerar Chave de Serviço

1. No menu esquerdo, clique em **"APIs e Serviços"** → **"Credenciais"**
2. Clique em **"+ CRIAR CREDENCIAIS"** → **"Conta de Serviço"**
3. Preencha:
   - **Nome da conta de serviço**: `radar-solar-bot`
   - **ID da conta de serviço**: `radar-solar-bot` (gerado automaticamente)
   - Clique em **"CRIAR E CONTINUAR"**

### 4.2 Conceder Permissões

1. Clique em **"Conceder acesso a este projeto"**
2. Selecione o papel: **"Editor"** (temporário, você pode restringir depois)
3. Clique em **"CONTINUAR"**
4. Clique em **"CONCLUÍDO"**

### 4.3 Gerar Chave JSON

1. Na página de "Credenciais", clique em **"Contas de Serviço"**
2. Clique em **"radar-solar-bot"**
3. Clique na aba **"Chaves"**
4. Clique em **"+ ADICIONAR CHAVE"** → **"Criar nova chave"**
5. Selecione **"JSON"**
6. Clique em **"CRIAR"**

Um arquivo JSON será baixado. **Guarde este arquivo com segurança!**

---

## 🐳 PASSO 5: Deploy no Cloud Run

### 5.1 Preparar Código

1. Abra um terminal no seu computador
2. Clone o repositório:

```bash
git clone https://github.com/RicardoDiRiccoPinheiro/radar-solar-fv.git
cd radar-solar-fv
```

3. Renomeie os arquivos:

```bash
cp package-gcp.json package.json
cp bot-gcp.js bot.js
```

### 5.2 Deploy via Google Cloud Console

#### Opção A: Deploy via Cloud Console (Mais Fácil)

1. Acesse: **https://console.cloud.google.com**
2. No menu esquerdo, clique em **"Cloud Run"**
3. Clique em **"CRIAR SERVIÇO"**
4. Selecione **"Fazer deploy de um repositório Git"**
5. Clique em **"CONFIGURAR NOVO REPOSITÓRIO"**
6. Selecione **"GitHub"** como provedor
7. Autorize o Google Cloud a acessar seu GitHub
8. Selecione o repositório: **`RicardoDiRiccoPinheiro/radar-solar-fv`**
9. Selecione a branch: **`master`**
10. Clique em **"SALVAR"**

#### Configurar Serviço

1. **Nome do serviço**: `radar-solar-bot`
2. **Região**: `us-central1` (mais barato)
3. **Autenticação**: Selecione **"Exigir autenticação"** (mais seguro)
4. Clique em **"EXPANDIR CONFIGURAÇÕES OPCIONAIS"**

#### Variáveis de Ambiente

5. Na seção **"Variáveis de Ambiente"**, adicione:

| Variável | Valor |
|----------|-------|
| `BOT_TOKEN` | Seu token do Telegram |
| `TELEGRAM_USER_CHAT_ID` | Seu ID de chat (ex: 6323319651) |
| `GOOGLE_CLOUD_PROJECT` | ID do seu projeto GCP (ex: radar-solar-fv) |
| `NODE_ENV` | `production` |

6. Clique em **"CRIAR"**

Aguarde 5-10 minutos para o deploy ser concluído.

#### Opção B: Deploy via gcloud CLI (Mais Rápido)

```bash
# 1. Instalar Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# 2. Autenticar
gcloud auth login

# 3. Definir projeto
gcloud config set project radar-solar-fv

# 4. Deploy
gcloud run deploy radar-solar-bot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars BOT_TOKEN=seu_token_aqui,TELEGRAM_USER_CHAT_ID=6323319651,GOOGLE_CLOUD_PROJECT=radar-solar-fv,NODE_ENV=production
```

### 5.3 Obter URL do Cloud Run

Após o deploy bem-sucedido, você receberá uma URL como:

```
https://radar-solar-bot-xxxxx-uc.a.run.app
```

**Guarde esta URL!** Você precisará dela para registrar o webhook.

---

## 📡 PASSO 6: Registrar Webhook do Telegram

### 6.1 Registrar Webhook

Abra um terminal e execute:

```bash
curl -X POST https://api.telegram.org/bot<SEU_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://radar-solar-bot-xxxxx-uc.a.run.app/webhook"}'
```

Substitua:
- `<SEU_BOT_TOKEN>` pelo seu token do Telegram
- `https://radar-solar-bot-xxxxx-uc.a.run.app` pela URL do Cloud Run

**Resposta esperada:**

```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### 6.2 Verificar Webhook

```bash
curl https://api.telegram.org/bot<SEU_BOT_TOKEN>/getWebhookInfo
```

Você deve ver:

```json
{
  "ok": true,
  "result": {
    "url": "https://radar-solar-bot-xxxxx-uc.a.run.app/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "...",
    "last_error_date": 0,
    "last_error_message": "",
    "last_synchronization_error_date": 0,
    "max_connections": 40,
    "allowed_updates": ["message"]
  }
}
```

---

## ⏰ PASSO 7: Configurar Cloud Scheduler (Relatório Diário às 08:00)

### 7.1 Criar Job Agendado

1. No menu esquerdo, clique em **"Cloud Scheduler"**
2. Clique em **"+ CRIAR JOB"**
3. Preencha:
   - **Nome**: `daily-report`
   - **Frequência**: `0 8 * * *` (08:00 todos os dias)
   - **Timezone**: `America/Sao_Paulo`
   - Clique em **"CONTINUAR"**

### 7.2 Configurar Execução

1. **Tipo de execução**: Selecione **"HTTP"**
2. **URL**: Cole a URL do Cloud Run + `/api/scheduled/daily-report`
   - Exemplo: `https://radar-solar-bot-xxxxx-uc.a.run.app/api/scheduled/daily-report`
3. **Método HTTP**: Selecione **"POST"**
4. **Autenticação**: Selecione **"Adicionar cabeçalho OIDC"**
5. **Conta de serviço**: Selecione a conta de serviço que criou (ex: `radar-solar-bot@...iam.gserviceaccount.com`)
6. Clique em **"CRIAR"**

### 7.3 Testar Job

1. Na lista de jobs, clique em **"daily-report"**
2. Clique em **"FORÇAR EXECUÇÃO"**
3. Você deve receber um relatório no Telegram em poucos segundos!

---

## ✅ PASSO 8: Testar Bot

### 8.1 Testar Webhook

Abra o Telegram e envie uma mensagem para seu bot:

```
/start
```

Você deve receber:

```
Bem-vindo ao Radar Solar FV! Use /ajuda para ver todos os comandos.
```

### 8.2 Testar Comandos

Teste os comandos:

```
/relatorio      # Relatório completo
/agora          # Varredura rápida
/regulacao      # Foco em regulação
/tarifas        # Foco em tarifas
/tecnologia     # Foco em tecnologia
/ajuda          # Lista de comandos
```

### 8.3 Verificar Logs

1. No Cloud Run, clique em **"radar-solar-bot"**
2. Clique na aba **"Logs"**
3. Você verá todos os eventos do bot em tempo real

---

## 💰 Custos Estimados

| Serviço | Limite Gratuito | Custo Acima |
|---------|-----------------|------------|
| Cloud Run | 2M requisições/mês | $0.40 por 1M |
| Firestore | 1GB storage + 50K leituras/dia | $0.06 por 100K leituras |
| Cloud Scheduler | 3 jobs/mês | $0.10 por job |
| **Total Estimado** | **Gratuito** | **< $5/mês** |

---

## 🔒 Segurança

### Boas Práticas

1. **Nunca exponha tokens** em código ou logs
2. **Use variáveis de ambiente** para credenciais
3. **Restrinja permissões** da conta de serviço
4. **Monitore logs** regularmente
5. **Faça backup** de dados importantes

### Remover Webhook (Opcional)

```bash
curl -X POST https://api.telegram.org/bot<SEU_BOT_TOKEN>/deleteWebhook
```

---

## 🐛 Troubleshooting

### Problema: Webhook não funciona

**Solução:**
1. Verifique se a URL do Cloud Run está correta
2. Verifique se o BOT_TOKEN está correto
3. Verifique os logs do Cloud Run
4. Tente registrar o webhook novamente

### Problema: Bot não envia relatório diário

**Solução:**
1. Verifique se o Cloud Scheduler job está ativo
2. Verifique se a timezone está correta (America/Sao_Paulo)
3. Verifique os logs do Cloud Scheduler
4. Tente forçar a execução do job

### Problema: Firestore não funciona

**Solução:**
1. Verifique se Firestore API está ativada
2. Verifique se a variável GOOGLE_CLOUD_PROJECT está correta
3. Verifique as permissões da conta de serviço
4. Verifique os logs do Cloud Run

---

## 📚 Recursos Adicionais

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

## 🎉 Próximos Passos

1. ✅ Deploy concluído
2. ⏭️ Integrar APIs de notícias (NewsAPI, Google News, etc)
3. ⏭️ Melhorar análise com LLM
4. ⏭️ Adicionar mais comandos
5. ⏭️ Criar dashboard web

---

**Desenvolvido com ❤️ para o setor solar brasileiro**

Dúvidas? Abra uma issue no GitHub: https://github.com/RicardoDiRiccoPinheiro/radar-solar-fv/issues
