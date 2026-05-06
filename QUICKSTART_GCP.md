# ⚡ Quick Start: Deploy em 5 Minutos

Se você quer fazer deploy **rápido** no Google Cloud Platform, siga este guia simplificado.

## 📋 O que você precisa

1. Conta Google (Gmail)
2. Token do Bot Telegram
3. Seu ID de chat Telegram (ex: `6323319651`)

## 🚀 Deploy Automático (Recomendado)

### 1. Instalar Google Cloud SDK

**macOS:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

**Windows:**
Baixe em: https://cloud.google.com/sdk/docs/install-gcloud-cli

### 2. Executar Script de Setup

```bash
cd radar-solar-fv
chmod +x setup-gcp.sh
./setup-gcp.sh
```

O script vai:
- ✅ Ativar APIs necessárias
- ✅ Criar Firestore Database
- ✅ Fazer deploy no Cloud Run
- ✅ Registrar webhook do Telegram
- ✅ Criar job agendado para 08:00 AM

**Pronto! Seu bot está rodando no GCP!** 🎉

---

## 🔧 Deploy Manual (Se preferir)

### 1. Criar Projeto GCP

```bash
gcloud projects create radar-solar-fv
gcloud config set project radar-solar-fv
```

### 2. Ativar APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 3. Criar Firestore

```bash
gcloud firestore databases create --location=us-central1
```

### 4. Deploy no Cloud Run

```bash
cp package-gcp.json package.json
cp bot-gcp.js bot.js

gcloud run deploy radar-solar-bot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars BOT_TOKEN=seu_token,TELEGRAM_USER_CHAT_ID=seu_id,GOOGLE_CLOUD_PROJECT=radar-solar-fv,NODE_ENV=production
```

### 5. Obter URL

```bash
gcloud run services describe radar-solar-bot --platform managed --region us-central1 --format='value(status.url)'
```

### 6. Registrar Webhook

```bash
curl -X POST https://api.telegram.org/bot<SEU_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://sua-url-cloud-run/webhook"}'
```

### 7. Criar Cloud Scheduler Job

```bash
gcloud scheduler jobs create http daily-report \
  --schedule="0 8 * * *" \
  --timezone="America/Sao_Paulo" \
  --uri="https://sua-url-cloud-run/api/scheduled/daily-report" \
  --http-method=POST \
  --location=us-central1
```

---

## ✅ Testar Bot

Abra o Telegram e envie:

```
/start
/relatorio
/ajuda
```

---

## 💰 Custos

- **Cloud Run**: 2M requisições/mês = **GRÁTIS**
- **Firestore**: 1GB + 50K leituras/dia = **GRÁTIS**
- **Cloud Scheduler**: 3 jobs/mês = **GRÁTIS**

**Total: $0/mês** ✅

---

## 🐛 Troubleshooting

### Bot não responde

1. Verifique logs:
```bash
gcloud run logs read radar-solar-bot --region=us-central1 --limit=50
```

2. Verifique webhook:
```bash
curl https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo
```

### Relatório não é enviado às 08:00

1. Verifique job:
```bash
gcloud scheduler jobs describe daily-report --location=us-central1
```

2. Force execução:
```bash
gcloud scheduler jobs run daily-report --location=us-central1
```

---

## 📚 Documentação Completa

Para mais detalhes, veja: `DEPLOY_GCP.md`

---

**Desenvolvido com ❤️ para o setor solar**
