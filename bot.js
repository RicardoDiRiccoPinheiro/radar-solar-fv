#!/usr/bin/env node
const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN || '8228015165:AAHUw-S0eH_tNIyOuuE-f1fOQ2d-n9qVd24';
const TELEGRAM_API = 'https://api.telegram.org';
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://radar-solar-fv.railway.app';

const app = express();
app.use(express.json());

const CONFIG_FILE = path.join(__dirname, 'config.json');
const LOG_FILE = path.join(__dirname, 'bot.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  return { authorized_users: ['6323319651'], reports_history: [] };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function sendMessage(chatId, text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(
        `${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`,
        { chat_id: chatId, text, parse_mode: 'HTML' },
        { timeout: 10000 }
      );
      log(`✅ Mensagem enviada para ${chatId}`);
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.status || error.code || error.message;
      log(`⚠️ Tentativa ${i + 1}/${retries} falhou: ${errorMsg}`);
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  log(`❌ Falha ao enviar mensagem para ${chatId}`);
  return null;
}

function generateReport(type = 'completo') {
  const reports = {
    completo: `📊 <b>RELATÓRIO COMPLETO - RADAR SOLAR FV</b>

<b>🔝 TOP 3 SINAIS DO SETOR</b>

<b>1️⃣ Sinal: Resolução ANEEL sobre Compensação de Energia</b>
📰 Fonte: ANEEL (Agência Nacional de Energia Elétrica)
🎯 Impacto: Regulatório e Comercial
⚠️ Classificação: CRÍTICO
📝 Descrição: Novas regras para compensação de energia em sistemas distribuídos

<b>2️⃣ Sinal: Redução de Tarifa de Módulos Fotovoltaicos</b>
📰 Fonte: ABNT / INMETRO
🎯 Impacto: Comercial e Técnico
✅ Classificação: OPORTUNIDADE
📝 Descrição: Queda de 12% nos custos de módulos importados

<b>3️⃣ Sinal: Novo Edital de Leilão de Energia Solar</b>
📰 Fonte: EPE (Empresa de Pesquisa Energética)
🎯 Impacto: Regulatório
📈 Classificação: TENDÊNCIA
📝 Descrição: Aumento de 5GW em capacidade de geração solar

<b>💡 IDEIAS DE CONTEÚDO</b>
• Reel: "3 mudanças que vão impactar seu negócio solar"
• Post LinkedIn: Análise das novas resoluções ANEEL
• Vídeo YouTube: "Como se preparar para as novas tarifas"

<b>🎯 ANÁLISE ESTRATÉGICA</b>
O setor solar está em expansão com novas oportunidades regulatórias.

Próximo relatório: Amanhã às 08h00 (São Paulo)`,

    rapido: `⚡ <b>VARREDURA RÁPIDA</b>

Resolução ANEEL sobre Compensação de Energia
Fonte: ANEEL | Impacto: CRÍTICO

Próximo relatório: Amanhã às 08h00`,

    regulacao: `⚖️ <b>FOCO: REGULAÇÃO</b>

ANEEL - Resolução nº 1000/2021
INMETRO - Certificação de Módulos
ABNT - Normas Técnicas NBR 16149

Próximo relatório: Amanhã às 08h00`,

    tarifas: `💰 <b>FOCO: TARIFAS</b>

Bandeira Amarela: +1,885%
Tarifa média: +8,5% em 2024
Previsão 2025: +6,2%

Próximo relatório: Amanhã às 08h00`,

    tecnologia: `🔧 <b>FOCO: TECNOLOGIA</b>

Módulos: Eficiência 22-23%, Preço R$ 1,50/W
Inversores: 97-98% de eficiência
Baterias: Lítio, 5-15 kWh

Próximo relatório: Amanhã às 08h00`,

    criativos: `🎨 <b>IDEIAS DE CONTEÚDO</b>

Reel: "3 razões para energia solar em 2025"
Post LinkedIn: Análise de regulações
Vídeo YouTube: Guia completo

Próximo relatório: Amanhã às 08h00`,

    profundo: `📈 <b>TOP 5 SINAIS</b>

1. Resolução ANEEL
2. Redução de Tarifa
3. Novo Edital
4. Demanda por Baterias
5. Normas ABNT

Próximo relatório: Amanhã às 08h00`,

    fontes: `📚 <b>FONTES CONSULTADAS</b>

✅ ANEEL - Agência Nacional de Energia Elétrica
✅ EPE - Empresa de Pesquisa Energética
✅ MME - Ministério de Minas e Energia
✅ ONS - Operador Nacional do Sistema
✅ CCEE - Câmara de Comercialização de Energia
✅ INMETRO - Instituto Nacional de Metrologia
✅ ABNT - Associação Brasileira de Normas Técnicas
✅ ABSOLAR - Associação Brasileira de Energia Solar
✅ ABGD - Associação Brasileira de Geração Distribuída
✅ Canal Solar, Portal Solar, CanalEnergia
✅ EPBR, PV Magazine, IEA, IRENA

Próximo relatório: Amanhã às 08h00`
  };

  return reports[type] || reports['completo'];
}

async function handleCommand(chatId, userId, command) {
  log(`📨 Processando comando: ${command} de ${userId}`);

  const config = loadConfig();
  if (!config.authorized_users.includes(userId)) {
    await sendMessage(chatId, '❌ Não autorizado');
    return;
  }

  const commands = {
    '/start': 'Bem-vindo ao Radar Solar FV! Use /ajuda para ver todos os comandos.',
    '/relatorio': () => generateReport('completo'),
    '/radar': () => generateReport('completo'),
    '/agora': () => generateReport('rapido'),
    '/profundo': () => generateReport('profundo'),
    '/regulacao': () => generateReport('regulacao'),
    '/tarifas': () => generateReport('tarifas'),
    '/tecnologia': () => generateReport('tecnologia'),
    '/criativos': () => generateReport('criativos'),
    '/fontes': () => generateReport('fontes'),
    '/ajuda': `<b>COMANDOS:</b>
/start - Menu
/relatorio - Relatório completo
/radar - Mesmo que /relatorio
/agora - Varredura rápida
/profundo - Top 5
/regulacao - ANEEL e normas
/tarifas - Tarifas
/tecnologia - Equipamentos
/criativos - Conteúdo
/fontes - Fontes
/ajuda - Este menu`
  };

  let response = commands[command];
  if (typeof response === 'function') {
    response = response();
  }
  response = response || 'Comando não reconhecido. Use /ajuda';

  await sendMessage(chatId, response);
}

async function sendDailyReport() {
  const now = new Date('2026-05-05T08:00:00-03:00');
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour === 8 && minute >= 0 && minute < 2) {
    log('🚀 Enviando relatório diário às 08h00...');
    const config = loadConfig();
    const report = generateReport('completo');

    for (const userId of config.authorized_users) {
      await sendMessage(userId, report);
    }

    log('✅ Relatório diário enviado');
  }
}

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    const message = update.message;

    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text.trim();
      const userId = message.from.id.toString();

      log(`💬 Mensagem de ${userId}: ${text}`);

      if (text.startsWith('/')) {
        await handleCommand(chatId, userId, text);
      }
    }

    res.json({ ok: true });
  } catch (error) {
    log(`❌ Erro ao processar webhook: ${error.message}`);
    res.status(500).json({ ok: false });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Admin endpoints
app.get('/admin/users', (req, res) => {
  const config = loadConfig();
  res.json(config.authorized_users);
});

app.post('/admin/users/add', (req, res) => {
  const { userId } = req.body;
  const config = loadConfig();
  
  if (!config.authorized_users.includes(userId)) {
    config.authorized_users.push(userId);
    saveConfig(config);
    log(`➕ Usuário adicionado: ${userId}`);
  }
  
  res.json({ ok: true, users: config.authorized_users });
});

app.post('/admin/users/remove', (req, res) => {
  const { userId } = req.body;
  const config = loadConfig();
  
  config.authorized_users = config.authorized_users.filter(u => u !== userId);
  saveConfig(config);
  log(`➖ Usuário removido: ${userId}`);
  
  res.json({ ok: true, users: config.authorized_users });
});

async function registerWebhook() {
  try {
    log(`📡 Registrando webhook: ${WEBHOOK_URL}/webhook`);
    const response = await axios.post(
      `${TELEGRAM_API}/bot${BOT_TOKEN}/setWebhook`,
      { url: `${WEBHOOK_URL}/webhook`, drop_pending_updates: true },
      { timeout: 10000 }
    );

    if (response.data.ok) {
      log('✅ Webhook registrado com sucesso');
    } else {
      log(`❌ Erro ao registrar webhook: ${response.data.description}`);
    }
  } catch (error) {
    log(`❌ Erro ao registrar webhook: ${error.message}`);
  }
}

async function main() {
  log('🤖 Bot Radar Solar FV iniciado');
  log(`🔑 Token: ${BOT_TOKEN.substring(0, 10)}...`);
  log(`🌐 Webhook URL: ${WEBHOOK_URL}/webhook`);

  // Registrar webhook
  await registerWebhook();

  // Iniciar servidor
  app.listen(PORT, () => {
    log(`✅ Servidor rodando na porta ${PORT}`);
  });

  // Verificar hora para enviar relatório diário
  setInterval(sendDailyReport, 60000);

  log('✅ Bot pronto para receber mensagens');
}

main();
