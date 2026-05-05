# Radar Solar FV - Bot Telegram

Bot inteligente para monitoramento de notícias e sinais do setor solar fotovoltaico no Brasil.

## Funcionalidades

✅ **Relatórios Automáticos** - Todos os dias às 08h00 (São Paulo)
✅ **Comandos Interativos** - /relatorio, /regulacao, /tarifas, /tecnologia, etc
✅ **Painel de Administração** - Gerenciar usuários autorizados
✅ **Análise LLM** - Seleção inteligente dos Top 3 sinais
✅ **Fontes Oficiais** - ANEEL, EPE, MME, ABSOLAR, etc

## Comandos

- `/start` - Menu inicial
- `/relatorio` - Relatório completo
- `/radar` - Mesmo que /relatorio
- `/agora` - Varredura rápida (últimas 12-24h)
- `/profundo` - Top 5 sinais
- `/regulacao` - Foco em ANEEL e normas
- `/tarifas` - Foco em tarifas
- `/tecnologia` - Foco em equipamentos
- `/criativos` - Ideias de conteúdo
- `/fontes` - Fontes consultadas
- `/ajuda` - Lista de comandos

## Deploy no Railway

### 1. Preparar GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/RicardoDiRiccoPinheiro/radar-solar-fv.git
git push -u origin main
```

### 2. Deploy no Railway

1. Acesse https://railway.app
2. Clique em "New Project"
3. Selecione "Deploy from GitHub"
4. Conecte sua conta GitHub
5. Selecione o repositório `radar-solar-fv`
6. Railway fará o deploy automaticamente

### 3. Configurar Variáveis de Ambiente

No painel do Railway, adicione:

```
BOT_TOKEN=8228015165:AAHUw-S0eH_tNIyOuuE-f1fOQ2d-n9qVd24
WEBHOOK_URL=https://seu-app.railway.app
```

### 4. Registrar Webhook

Após o deploy, o webhook será registrado automaticamente.

## Administração

### Adicionar Usuário

```bash
curl -X POST https://seu-app.railway.app/admin/users/add \
  -H "Content-Type: application/json" \
  -d '{"userId": "123456789"}'
```

### Listar Usuários

```bash
curl https://seu-app.railway.app/admin/users
```

### Remover Usuário

```bash
curl -X POST https://seu-app.railway.app/admin/users/remove \
  -H "Content-Type: application/json" \
  -d '{"userId": "123456789"}'
```

## Estrutura

```
.
├── bot.js           - Bot principal
├── package.json     - Dependências
├── Procfile         - Configuração Railway
├── .gitignore       - Arquivos ignorados
├── config.json      - Configuração (gerado automaticamente)
└── bot.log          - Logs (gerado automaticamente)
```

## Suporte

Para dúvidas ou problemas, consulte a documentação do Railway: https://docs.railway.app
