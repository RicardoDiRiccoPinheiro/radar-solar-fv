# 🤖 Radar Solar FV - Bot Telegram no Google Cloud Platform

Bot inteligente para monitoramento de notícias e sinais do setor solar fotovoltaico no Brasil, hospedado **gratuitamente** no Google Cloud Platform.

## ✨ Características

✅ **Relatórios Automáticos** - Todos os dias às 08h00 (São Paulo)  
✅ **Comandos Interativos** - /relatorio, /regulacao, /tarifas, /tecnologia, etc  
✅ **Banco de Dados Gratuito** - Firestore (1GB + 50K leituras/dia)  
✅ **Escalável** - Cloud Run (2M requisições/mês grátis)  
✅ **Seguro** - Hospedado na Google Cloud com HTTPS  
✅ **Monitoramento** - Logs em tempo real e alertas  

## 🚀 Quick Start (5 minutos)

### 1. Pré-requisitos

- Conta Google (Gmail)
- Token do Bot Telegram (de @BotFather)
- Seu ID de chat Telegram

### 2. Deploy Automático

```bash
# Clonar repositório
git clone https://github.com/RicardoDiRiccoPinheiro/radar-solar-fv.git
cd radar-solar-fv

# Instalar Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Executar setup automático
chmod +x setup-gcp.sh
./setup-gcp.sh
```

O script fará tudo automaticamente! ✨

### 3. Testar Bot

Abra o Telegram e envie:

```
/start
/relatorio
/ajuda
```

**Pronto!** Seu bot está rodando no GCP 🎉

---

## 📖 Guias Detalhados

| Guia | Descrição |
|------|-----------|
| [QUICKSTART_GCP.md](./QUICKSTART_GCP.md) | Deploy em 5 minutos (resumido) |
| [DEPLOY_GCP.md](./DEPLOY_GCP.md) | Guia completo passo-a-passo |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Solução de problemas |

---

## 📱 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `/start` | Menu inicial |
| `/relatorio` | Relatório completo |
| `/radar` | Mesmo que /relatorio |
| `/agora` | Varredura rápida |
| `/profundo` | Top 5 sinais |
| `/regulacao` | Foco em ANEEL e normas |
| `/tarifas` | Foco em tarifas |
| `/tecnologia` | Foco em equipamentos |
| `/criativos` | Ideias de conteúdo |
| `/fontes` | Fontes consultadas |
| `/ajuda` | Lista de comandos |

---

## 💰 Custos

**100% GRATUITO** com os limites do free tier do GCP:

| Serviço | Limite | Custo |
|---------|--------|-------|
| Cloud Run | 2M requisições/mês | **GRÁTIS** |
| Firestore | 1GB + 50K leituras/dia | **GRÁTIS** |
| Cloud Scheduler | 3 jobs/mês | **GRÁTIS** |
| **Total** | | **$0/mês** ✅ |

Se exceder os limites, o custo será:
- Cloud Run: $0.40 por 1M requisições
- Firestore: $0.06 por 100K leituras
- **Estimado: < $5/mês** com uso moderado

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                  Google Cloud Platform                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Cloud Run (Bot Service)                │   │
│  │  - Express.js server                              │   │
│  │  - Telegram webhook (/webhook)                    │   │
│  │  - Scheduler endpoint (/api/scheduled/...)        │   │
│  │  - Admin endpoints (/admin/...)                   │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↕                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Firestore Database                        │   │
│  │  - bot_config (configuração)                      │   │
│  │  - reports (relatórios gerados)                   │   │
│  │  - job_logs (logs de execução)                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │      Cloud Scheduler (Relatório Diário)          │   │
│  │  - Executa job às 08:00 AM (São Paulo)           │   │
│  │  - Chama /api/scheduled/daily-report              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
         ↕                                    ↕
    Telegram API                         External APIs
    (sendMessage)                    (News, LLM, etc)
```

---

## 📁 Estrutura de Arquivos

```
radar-solar-fv/
├── bot-gcp.js                 # Bot otimizado para Cloud Run
├── package-gcp.json           # Dependências para GCP
├── Dockerfile                 # Imagem Docker para Cloud Run
├── .gcloudignore             # Arquivos ignorados no deploy
├── cloud-run-config.yaml     # Configuração do Cloud Run
├── .env.example              # Variáveis de ambiente (exemplo)
├── setup-gcp.sh              # Script de setup automático
├── DEPLOY_GCP.md             # Guia completo de deploy
├── QUICKSTART_GCP.md         # Quick start (5 min)
├── TROUBLESHOOTING.md        # Solução de problemas
└── README_GCP.md             # Este arquivo
```

---

## 🔧 Configuração Manual

Se preferir fazer deploy manualmente:

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

### 4. Deploy

```bash
cp package-gcp.json package.json
cp bot-gcp.js bot.js

gcloud run deploy radar-solar-bot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars \
    BOT_TOKEN=seu_token,\
    TELEGRAM_USER_CHAT_ID=seu_id,\
    GOOGLE_CLOUD_PROJECT=radar-solar-fv,\
    NODE_ENV=production
```

### 5. Registrar Webhook

```bash
CLOUD_RUN_URL=$(gcloud run services describe radar-solar-bot \
  --platform managed --region us-central1 \
  --format='value(status.url)')

curl -X POST https://api.telegram.org/bot<SEU_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$CLOUD_RUN_URL/webhook\"}"
```

### 6. Criar Cloud Scheduler Job

```bash
gcloud scheduler jobs create http daily-report \
  --schedule="0 8 * * *" \
  --timezone="America/Sao_Paulo" \
  --uri="$CLOUD_RUN_URL/api/scheduled/daily-report" \
  --http-method=POST \
  --location=us-central1
```

---

## 🔐 Segurança

### Boas Práticas

1. **Nunca exponha tokens** em código ou logs
2. **Use variáveis de ambiente** para credenciais
3. **Restrinja permissões** da conta de serviço
4. **Monitore logs** regularmente
5. **Faça backup** de dados importantes

### Secret Manager (Recomendado)

Para maior segurança, use Google Secret Manager:

```bash
# Criar secret
echo -n "seu_token_aqui" | gcloud secrets create bot-token --data-file=-

# Usar em Cloud Run
gcloud run deploy radar-solar-bot \
  --update-secrets BOT_TOKEN=bot-token:latest
```

---

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
gcloud run logs read radar-solar-bot --region=us-central1 --limit=50 --follow
```

### Ver Métricas

1. Acesse: https://console.cloud.google.com/run
2. Clique em "radar-solar-bot"
3. Veja "Métricas" e "Logs"

### Alertas

Configure alertas no Cloud Monitoring:

1. Acesse: https://console.cloud.google.com/monitoring
2. Clique em "Políticas de alertas"
3. Crie alertas para erros e latência

---

## 🐛 Troubleshooting

### Bot não responde

```bash
# Verificar logs
gcloud run logs read radar-solar-bot --region=us-central1

# Verificar webhook
curl https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo

# Testar health check
curl https://seu-cloud-run-url/health
```

### Relatório não é enviado

```bash
# Verificar job
gcloud scheduler jobs describe daily-report --location=us-central1

# Forçar execução
gcloud scheduler jobs run daily-report --location=us-central1

# Ver logs do job
gcloud scheduler jobs describe daily-report --location=us-central1 --format=json
```

### Firestore não funciona

```bash
# Verificar se está criado
gcloud firestore databases list

# Verificar permissões
gcloud projects get-iam-policy radar-solar-fv
```

---

## 🚀 Próximos Passos

1. ✅ Deploy concluído
2. ⏭️ Integrar APIs de notícias (NewsAPI, Google News)
3. ⏭️ Melhorar análise com LLM
4. ⏭️ Adicionar mais comandos
5. ⏭️ Criar dashboard web

---

## 📚 Recursos

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Google Cloud Pricing](https://cloud.google.com/pricing)

---

## 💬 Suporte

Dúvidas ou problemas?

1. Verifique [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Abra uma issue: https://github.com/RicardoDiRiccoPinheiro/radar-solar-fv/issues
3. Consulte a documentação do GCP

---

## 📄 Licença

MIT License - Veja LICENSE para detalhes

---

## 👨‍💻 Desenvolvido com ❤️

Para o setor solar brasileiro

**Autor**: Ricardo Di Riccò Pinheiro  
**Repositório**: https://github.com/RicardoDiRiccoPinheiro/radar-solar-fv

---

**Última atualização**: Maio de 2026
