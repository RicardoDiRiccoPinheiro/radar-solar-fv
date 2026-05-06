# 🐛 Troubleshooting - Radar Solar FV no GCP

Soluções para problemas comuns ao usar o bot no Google Cloud Platform.

---

## 🚨 Problemas de Deploy

### Problema: "Projeto GCP não encontrado"

**Erro:**
```
ERROR: (gcloud.run.deploy) User [seu-email@gmail.com] does not have permission
```

**Solução:**
1. Verifique se você tem permissões no projeto GCP
2. Adicione-se como Owner:
   ```bash
   gcloud projects add-iam-policy-binding radar-solar-fv \
     --member=user:seu-email@gmail.com \
     --role=roles/owner
   ```

### Problema: "Docker build falha"

**Erro:**
```
ERROR: build step 0 "gcr.io/cloud-builders/docker" failed
```

**Solução:**
1. Verifique se o Dockerfile está correto
2. Verifique se package.json existe
3. Tente fazer build local:
   ```bash
   docker build -t radar-solar-bot .
   docker run -p 8080:8080 radar-solar-bot
   ```

### Problema: "Cloud Run deployment timeout"

**Erro:**
```
DEADLINE_EXCEEDED: Deadline exceeded
```

**Solução:**
1. Aumente o timeout:
   ```bash
   gcloud run deploy radar-solar-bot \
     --source . \
     --timeout=600 \
     --region us-central1
   ```
2. Verifique se há muitos arquivos (use .gcloudignore)

---

## 🔌 Problemas de Webhook

### Problema: "Webhook não funciona"

**Sintomas:**
- Bot não responde a mensagens
- Logs mostram "Connection refused"

**Solução:**

1. Verifique se a URL está correta:
   ```bash
   curl https://sua-url-cloud-run/health
   ```
   Deve retornar: `{"status":"ok"}`

2. Registre o webhook novamente:
   ```bash
   curl -X POST https://api.telegram.org/bot<SEU_TOKEN>/setWebhook \
     -H "Content-Type: application/json" \
     -d '{"url": "https://sua-url-cloud-run/webhook"}'
   ```

3. Verifique o status do webhook:
   ```bash
   curl https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo
   ```

4. Verifique os logs:
   ```bash
   gcloud run logs read radar-solar-bot --limit=50
   ```

### Problema: "Webhook retorna erro 401/403"

**Erro:**
```json
{
  "ok": false,
  "error_code": 401,
  "description": "Unauthorized"
}
```

**Solução:**
1. Verifique se o BOT_TOKEN está correto:
   ```bash
   curl https://api.telegram.org/bot<SEU_TOKEN>/getMe
   ```

2. Verifique se a variável de ambiente está configurada:
   ```bash
   gcloud run services describe radar-solar-bot \
     --region us-central1 \
     --format='value(spec.template.spec.containers[0].env)'
   ```

3. Redeploy com as variáveis corretas:
   ```bash
   gcloud run deploy radar-solar-bot \
     --source . \
     --region us-central1 \
     --set-env-vars BOT_TOKEN=seu_token_correto
   ```

### Problema: "Webhook recebe mensagens mas não responde"

**Sintomas:**
- Logs mostram mensagens recebidas
- Mas o Telegram não recebe resposta

**Solução:**
1. Verifique se há erros ao enviar mensagem:
   ```bash
   gcloud run logs read radar-solar-bot --limit=100 | grep -i "error\|fail"
   ```

2. Verifique se o BOT_TOKEN é válido:
   ```bash
   curl https://api.telegram.org/bot<SEU_TOKEN>/getMe
   ```

3. Teste enviar mensagem manualmente:
   ```bash
   curl -X POST https://api.telegram.org/bot<SEU_TOKEN>/sendMessage \
     -H "Content-Type: application/json" \
     -d '{"chat_id": 123456789, "text": "Teste"}'
   ```

---

## ⏰ Problemas de Agendamento

### Problema: "Relatório não é enviado às 08:00"

**Sintomas:**
- Cloud Scheduler job está ativo
- Mas o bot não envia relatório

**Solução:**

1. Verifique se o job existe:
   ```bash
   gcloud scheduler jobs describe daily-report --location=us-central1
   ```

2. Forçe a execução do job:
   ```bash
   gcloud scheduler jobs run daily-report --location=us-central1
   ```

3. Verifique os logs:
   ```bash
   gcloud run logs read radar-solar-bot --limit=50
   ```

4. Verifique a timezone:
   ```bash
   gcloud scheduler jobs describe daily-report --location=us-central1 --format=json | grep -i timezone
   ```
   Deve ser: `America/Sao_Paulo`

5. Se a timezone estiver errada, recrie o job:
   ```bash
   gcloud scheduler jobs delete daily-report --location=us-central1 --quiet
   
   gcloud scheduler jobs create http daily-report \
     --schedule="0 8 * * *" \
     --timezone="America/Sao_Paulo" \
     --uri="https://sua-url-cloud-run/api/scheduled/daily-report" \
     --http-method=POST \
     --location=us-central1
   ```

### Problema: "Job retorna erro 401/403"

**Erro nos logs:**
```
HTTP 401 Unauthorized
```

**Solução:**
1. Verifique se a conta de serviço tem permissão:
   ```bash
   gcloud projects get-iam-policy radar-solar-fv \
     --flatten="bindings[].members" \
     --format="table(bindings.role)" \
     --filter="bindings.members:serviceAccount:*"
   ```

2. Adicione permissão:
   ```bash
   gcloud projects add-iam-policy-binding radar-solar-fv \
     --member=serviceAccount:radar-solar-bot@radar-solar-fv.iam.gserviceaccount.com \
     --role=roles/run.invoker
   ```

### Problema: "Job executa mas não envia mensagem"

**Sintomas:**
- Job mostra sucesso
- Mas nenhuma mensagem é enviada

**Solução:**
1. Verifique se TELEGRAM_USER_CHAT_ID está correto:
   ```bash
   gcloud run services describe radar-solar-bot \
     --region us-central1 \
     --format='value(spec.template.spec.containers[0].env)' | grep TELEGRAM_USER_CHAT_ID
   ```

2. Teste enviar mensagem manualmente:
   ```bash
   curl -X POST https://api.telegram.org/bot<SEU_TOKEN>/sendMessage \
     -H "Content-Type: application/json" \
     -d '{"chat_id": <SEU_ID>, "text": "Teste"}'
   ```

3. Verifique os logs:
   ```bash
   gcloud run logs read radar-solar-bot --limit=100 | grep -i "daily\|report"
   ```

---

## 💾 Problemas de Firestore

### Problema: "Firestore não funciona"

**Sintomas:**
- Logs mostram erros ao salvar dados
- Firestore está vazio

**Solução:**

1. Verifique se Firestore está criado:
   ```bash
   gcloud firestore databases list
   ```

2. Se não existir, crie:
   ```bash
   gcloud firestore databases create --location=us-central1
   ```

3. Verifique permissões:
   ```bash
   gcloud projects get-iam-policy radar-solar-fv
   ```

4. Verifique se a variável GOOGLE_CLOUD_PROJECT está correta:
   ```bash
   gcloud run services describe radar-solar-bot \
     --region us-central1 \
     --format='value(spec.template.spec.containers[0].env)' | grep GOOGLE_CLOUD_PROJECT
   ```

### Problema: "Permission denied ao acessar Firestore"

**Erro:**
```
Error: 7 PERMISSION_DENIED: User does not have permission
```

**Solução:**
1. Verifique a conta de serviço:
   ```bash
   gcloud run services describe radar-solar-bot \
     --region us-central1 \
     --format='value(spec.serviceAccountName)'
   ```

2. Adicione permissão:
   ```bash
   gcloud projects add-iam-policy-binding radar-solar-fv \
     --member=serviceAccount:default@appspot.gserviceaccount.com \
     --role=roles/datastore.user
   ```

---

## 📊 Problemas de Performance

### Problema: "Cloud Run está lento"

**Sintomas:**
- Respostas lentas
- Timeouts frequentes

**Solução:**

1. Aumentar memória:
   ```bash
   gcloud run deploy radar-solar-bot \
     --source . \
     --memory=512Mi \
     --region us-central1
   ```

2. Aumentar timeout:
   ```bash
   gcloud run deploy radar-solar-bot \
     --source . \
     --timeout=300 \
     --region us-central1
   ```

3. Aumentar CPU:
   ```bash
   gcloud run deploy radar-solar-bot \
     --source . \
     --cpu=2 \
     --region us-central1
   ```

4. Verificar métricas:
   - Acesse: https://console.cloud.google.com/run
   - Clique em "radar-solar-bot"
   - Veja "Métricas"

### Problema: "Firestore está lento"

**Solução:**
1. Verifique o índice:
   ```bash
   gcloud firestore indexes list
   ```

2. Crie índices se necessário:
   ```bash
   gcloud firestore indexes create \
     --collection=reports \
     --field-config=field-path=created_at,order=descending
   ```

---

## 🔐 Problemas de Segurança

### Problema: "Token exposto em logs"

**Solução:**
1. Regenere o token do bot:
   - Abra @BotFather no Telegram
   - Selecione seu bot
   - Clique em "Edit Bot"
   - Clique em "Edit Token"

2. Atualize o token no Cloud Run:
   ```bash
   gcloud run deploy radar-solar-bot \
     --source . \
     --set-env-vars BOT_TOKEN=novo_token
   ```

3. Use Secret Manager para maior segurança:
   ```bash
   echo -n "novo_token" | gcloud secrets create bot-token --data-file=-
   
   gcloud run deploy radar-solar-bot \
     --source . \
     --update-secrets BOT_TOKEN=bot-token:latest
   ```

---

## 📝 Verificação de Saúde

### Health Check Completo

Execute este script para verificar tudo:

```bash
#!/bin/bash

echo "🔍 Verificando saúde do bot..."

# 1. Cloud Run
echo "1️⃣  Cloud Run:"
gcloud run services describe radar-solar-bot --region=us-central1 --format='value(status.url)'

# 2. Webhook
echo "2️⃣  Webhook:"
curl -s https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo | jq .

# 3. Cloud Scheduler
echo "3️⃣  Cloud Scheduler:"
gcloud scheduler jobs describe daily-report --location=us-central1 --format='value(state)'

# 4. Firestore
echo "4️⃣  Firestore:"
gcloud firestore databases list

# 5. Logs recentes
echo "5️⃣  Logs recentes:"
gcloud run logs read radar-solar-bot --region=us-central1 --limit=10

echo "✅ Verificação concluída!"
```

---

## 📞 Suporte

Se o problema persistir:

1. Verifique a documentação: [DEPLOY_GCP.md](./DEPLOY_GCP.md)
2. Abra uma issue: https://github.com/RicardoDiRiccoPinheiro/radar-solar-fv/issues
3. Consulte a documentação do GCP:
   - [Cloud Run Docs](https://cloud.google.com/run/docs)
   - [Firestore Docs](https://cloud.google.com/firestore/docs)
   - [Cloud Scheduler Docs](https://cloud.google.com/scheduler/docs)

---

**Última atualização**: Maio de 2026
