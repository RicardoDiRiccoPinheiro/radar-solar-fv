#!/bin/bash

##############################################################################
# Script de Setup Automático - Radar Solar FV no Google Cloud Platform
# 
# Este script automatiza o deploy no GCP com um único comando
# 
# Uso:
#   chmod +x setup-gcp.sh
#   ./setup-gcp.sh
##############################################################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

##############################################################################
# VERIFICAÇÕES INICIAIS
##############################################################################

log_info "Verificando pré-requisitos..."

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  log_error "gcloud CLI não está instalado"
  echo "Instale em: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

log_success "gcloud CLI encontrado"

# Verificar se Docker está instalado (opcional)
if ! command -v docker &> /dev/null; then
  log_warning "Docker não está instalado (opcional para testes locais)"
fi

##############################################################################
# COLETAR INFORMAÇÕES DO USUÁRIO
##############################################################################

log_info "Coletando informações necessárias..."

# Verificar autenticação
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
  log_info "Autenticando com Google Cloud..."
  gcloud auth login
fi

# Obter projeto atual
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  log_error "Nenhum projeto GCP configurado"
  echo "Execute: gcloud config set project <PROJECT_ID>"
  exit 1
fi

log_success "Projeto GCP: $PROJECT_ID"

# Solicitar token do Telegram
read -p "📱 Digite seu BOT_TOKEN do Telegram: " BOT_TOKEN
if [ -z "$BOT_TOKEN" ]; then
  log_error "BOT_TOKEN não pode estar vazio"
  exit 1
fi

# Solicitar ID do chat
read -p "👤 Digite seu TELEGRAM_USER_CHAT_ID (ex: 6323319651): " TELEGRAM_USER_CHAT_ID
if [ -z "$TELEGRAM_USER_CHAT_ID" ]; then
  log_error "TELEGRAM_USER_CHAT_ID não pode estar vazio"
  exit 1
fi

log_success "Informações coletadas"

##############################################################################
# ATIVAR APIs
##############################################################################

log_info "Ativando APIs necessárias..."

APIS=(
  "run.googleapis.com"
  "firestore.googleapis.com"
  "cloudscheduler.googleapis.com"
  "cloudbuild.googleapis.com"
  "iam.googleapis.com"
)

for api in "${APIS[@]}"; do
  log_info "Ativando $api..."
  gcloud services enable "$api" --project="$PROJECT_ID" || true
done

log_success "APIs ativadas"

##############################################################################
# CRIAR FIRESTORE DATABASE
##############################################################################

log_info "Verificando Firestore Database..."

if gcloud firestore databases describe --project="$PROJECT_ID" &> /dev/null; then
  log_success "Firestore Database já existe"
else
  log_info "Criando Firestore Database..."
  gcloud firestore databases create \
    --project="$PROJECT_ID" \
    --location=us-central1 \
    --type=firestore-native || log_warning "Firestore Database pode já existir"
fi

##############################################################################
# PREPARAR CÓDIGO
##############################################################################

log_info "Preparando código para deploy..."

# Copiar arquivos
cp package-gcp.json package.json
cp bot-gcp.js bot.js

log_success "Código preparado"

##############################################################################
# DEPLOY NO CLOUD RUN
##############################################################################

log_info "Fazendo deploy no Cloud Run..."
log_info "Isso pode levar 5-10 minutos..."

SERVICE_NAME="radar-solar-bot"
REGION="us-central1"

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars \
    BOT_TOKEN="$BOT_TOKEN",\
    TELEGRAM_USER_CHAT_ID="$TELEGRAM_USER_CHAT_ID",\
    GOOGLE_CLOUD_PROJECT="$PROJECT_ID",\
    NODE_ENV=production \
  --project="$PROJECT_ID"

log_success "Deploy concluído!"

##############################################################################
# OBTER URL DO CLOUD RUN
##############################################################################

log_info "Obtendo URL do Cloud Run..."

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --format='value(status.url)' \
  --project="$PROJECT_ID")

log_success "URL do Cloud Run: $SERVICE_URL"

##############################################################################
# REGISTRAR WEBHOOK DO TELEGRAM
##############################################################################

log_info "Registrando webhook do Telegram..."

WEBHOOK_URL="$SERVICE_URL/webhook"

WEBHOOK_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$WEBHOOK_URL\", \"drop_pending_updates\": true}")

if echo "$WEBHOOK_RESPONSE" | grep -q '"ok":true'; then
  log_success "Webhook registrado: $WEBHOOK_URL"
else
  log_error "Erro ao registrar webhook"
  echo "$WEBHOOK_RESPONSE"
  exit 1
fi

##############################################################################
# CRIAR CLOUD SCHEDULER JOB
##############################################################################

log_info "Criando Cloud Scheduler job para relatório diário..."

JOB_NAME="daily-report"
SCHEDULE="0 8 * * *"  # 08:00 todos os dias
TIMEZONE="America/Sao_Paulo"

# Obter email da conta de serviço
SERVICE_ACCOUNT=$(gcloud iam service-accounts list \
  --project="$PROJECT_ID" \
  --format='value(email)' \
  --limit=1)

if [ -z "$SERVICE_ACCOUNT" ]; then
  log_warning "Nenhuma conta de serviço encontrada. Criando uma..."
  SERVICE_ACCOUNT="radar-solar-bot@$PROJECT_ID.iam.gserviceaccount.com"
  gcloud iam service-accounts create radar-solar-bot \
    --project="$PROJECT_ID" || true
fi

log_info "Usando conta de serviço: $SERVICE_ACCOUNT"

# Conceder permissões necessárias
log_info "Concedendo permissões à conta de serviço..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/run.invoker" \
  --quiet || true

# Criar ou atualizar job
gcloud scheduler jobs delete "$JOB_NAME" \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --quiet 2>/dev/null || true

gcloud scheduler jobs create http "$JOB_NAME" \
  --schedule="$SCHEDULE" \
  --timezone="$TIMEZONE" \
  --uri="$SERVICE_URL/api/scheduled/daily-report" \
  --http-method=POST \
  --oidc-service-account-email="$SERVICE_ACCOUNT" \
  --oidc-token-audience="$SERVICE_URL" \
  --project="$PROJECT_ID" \
  --location="$REGION"

log_success "Cloud Scheduler job criado"

##############################################################################
# TESTE DO BOT
##############################################################################

log_info "Testando bot..."

HEALTH_CHECK=$(curl -s "$SERVICE_URL/health")

if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
  log_success "Bot está respondendo corretamente"
else
  log_warning "Não foi possível verificar saúde do bot"
fi

##############################################################################
# RESUMO
##############################################################################

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 Informações do Deploy:${NC}"
echo "  Projeto GCP: $PROJECT_ID"
echo "  Serviço: $SERVICE_NAME"
echo "  Região: $REGION"
echo "  URL: $SERVICE_URL"
echo "  Webhook: $WEBHOOK_URL"
echo ""
echo -e "${BLUE}⏰ Agendamento:${NC}"
echo "  Job: $JOB_NAME"
echo "  Horário: 08:00 (America/Sao_Paulo)"
echo "  Frequência: Todos os dias"
echo ""
echo -e "${BLUE}🧪 Próximos Passos:${NC}"
echo "  1. Abra o Telegram e envie /start para seu bot"
echo "  2. Teste os comandos: /relatorio, /agora, /ajuda"
echo "  3. Monitore os logs: gcloud run logs read $SERVICE_NAME --region=$REGION"
echo "  4. Verifique o Firestore: https://console.firebase.google.com"
echo ""
echo -e "${BLUE}📚 Documentação:${NC}"
echo "  Guia Completo: ./DEPLOY_GCP.md"
echo "  Cloud Run: https://console.cloud.google.com/run"
echo "  Firestore: https://console.firebase.google.com"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

log_success "Setup concluído!"
