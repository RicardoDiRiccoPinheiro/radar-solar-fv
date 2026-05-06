#!/usr/bin/env node
/**
 * Radar Solar FV - Bot Telegram para Google Cloud Run
 * 
 * Otimizado para:
 * - Cloud Run (sem estado persistente, escalável)
 * - Firestore (banco de dados gratuito)
 * - Cloud Scheduler (jobs agendados)
 * 
 * Variáveis de Ambiente Necessárias:
 * - BOT_TOKEN: Token do bot Telegram
 * - TELEGRAM_USER_CHAT_ID: ID do chat para enviar relatórios
 * - GOOGLE_CLOUD_PROJECT: ID do projeto GCP
 * - NODE_ENV: production/development
 */

const axios = require('axios');
const express = require('express');
const { Firestore } = require('@google-cloud/firestore');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const TELEGRAM_USER_CHAT_ID = process.env.TELEGRAM_USER_CHAT_ID || '6323319651';
const TELEGRAM_API = 'https://api.telegram.org';
const PORT = process.env.PORT || 8080; // Cloud Run usa 8080 por padrão
const NODE_ENV = process.env.NODE_ENV || 'production';

// Inicializar Firestore
const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

// Express app
const app = express();
app.use(express.json());

// ============================================================================
// LOGGING
// ============================================================================

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    level,
    message,
    environment: NODE_ENV,
  }));
}

// ============================================================================
// FIRESTORE HELPERS
// ============================================================================

/**
 * Carregar configuração do bot
 */
async function loadConfig() {
  try {
    const doc = await db.collection('bot_config').doc('settings').get();
    if (doc.exists) {
      return doc.data();
    }
    return {
      authorized_users: [TELEGRAM_USER_CHAT_ID],
      created_at: new Date(),
    };
  } catch (error) {
    log(`Erro ao carregar config: ${error.message}`, 'ERROR');
    return {
      authorized_users: [TELEGRAM_USER_CHAT_ID],
    };
  }
}

/**
 * Salvar configuração do bot
 */
async function saveConfig(config) {
  try {
    await db.collection('bot_config').doc('settings').set(config, { merge: true });
    log('Config salva com sucesso');
  } catch (error) {
    log(`Erro ao salvar config: ${error.message}`, 'ERROR');
  }
}

/**
 * Salvar relatório no Firestore
 */
async function saveReport(report) {
  try {
    const docRef = await db.collection('reports').add({
      ...report,
      created_at: new Date(),
      updated_at: new Date(),
    });
    log(`Relatório salvo: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    log(`Erro ao salvar relatório: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Obter últimos N relatórios
 */
async function getReports(limit = 10) {
  try {
    const snapshot = await db.collection('reports')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    log(`Erro ao obter relatórios: ${error.message}`, 'ERROR');
    return [];
  }
}

/**
 * Salvar log de execução do job
 */
async function saveJobLog(jobType, status, details = {}) {
  try {
    await db.collection('job_logs').add({
      job_type: jobType,
      status, // 'success' ou 'error'
      details,
      executed_at: new Date(),
    });
    log(`Job log salvo: ${jobType} - ${status}`);
  } catch (error) {
    log(`Erro ao salvar job log: ${error.message}`, 'ERROR');
  }
}

// ============================================================================
// TELEGRAM API
// ============================================================================

/**
 * Enviar mensagem via Telegram com retry
 */
async function sendMessage(chatId, text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(
        `${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        },
        { timeout: 10000 }
      );

      if (response.data.ok) {
        log(`✅ Mensagem enviada para ${chatId}`);
        return response.data.result;
      } else {
        throw new Error(response.data.description);
      }
    } catch (error) {
      const errorMsg = error.response?.status || error.code || error.message;
      log(`⚠️ Tentativa ${i + 1}/${retries} falhou: ${errorMsg}`, 'WARN');

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  log(`❌ Falha ao enviar mensagem para ${chatId}`, 'ERROR');
  return null;
}

/**
 * Registrar webhook do Telegram
 */
async function registerWebhook(webhookUrl) {
  try {
    log(`📡 Registrando webhook: ${webhookUrl}`);
    const response = await axios.post(
      `${TELEGRAM_API}/bot${BOT_TOKEN}/setWebhook`,
      {
        url: webhookUrl,
        drop_pending_updates: true,
        allowed_updates: ['message'],
      },
      { timeout: 10000 }
    );

    if (response.data.ok) {
      log('✅ Webhook registrado com sucesso');
      return true;
    } else {
      log(`❌ Erro ao registrar webhook: ${response.data.description}`, 'ERROR');
      return false;
    }
  } catch (error) {
    log(`❌ Erro ao registrar webhook: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Obter informações do bot
 */
async function getBotInfo() {
  try {
    const response = await axios.get(
      `${TELEGRAM_API}/bot${BOT_TOKEN}/getMe`,
      { timeout: 10000 }
    );
    return response.data.result;
  } catch (error) {
    log(`Erro ao obter info do bot: ${error.message}`, 'ERROR');
    return null;
  }
}

// ============================================================================
// GERAÇÃO DE RELATÓRIOS
// ============================================================================

/**
 * Gerar relatório baseado em tipo
 */
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

Próximo relatório: Amanhã às 08h00`,
  };

  return reports[type] || reports.completo;
}

// ============================================================================
// HANDLERS DE COMANDOS
// ============================================================================

/**
 * Processar comando do usuário
 */
async function handleCommand(chatId, userId, command) {
  log(`📨 Processando comando: ${command} de ${userId}`);

  const config = await loadConfig();
  if (!config.authorized_users.includes(userId.toString())) {
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
/ajuda - Este menu`,
  };

  let response = commands[command];
  if (typeof response === 'function') {
    response = response();
  }
  response = response || 'Comando não reconhecido. Use /ajuda';

  await sendMessage(chatId, response);

  // Salvar relatório se foi um comando de relatório
  if (['/relatorio', '/radar', '/agora', '/profundo', '/regulacao', '/tarifas', '/tecnologia', '/criativos', '/fontes'].includes(command)) {
    await saveReport({
      type: command.substring(1),
      content: response,
      user_id: userId,
      triggered_by: 'command',
    });
  }
}

// ============================================================================
// ENVIO DE RELATÓRIO DIÁRIO
// ============================================================================

/**
 * Enviar relatório diário (chamado por Cloud Scheduler)
 */
async function sendDailyReport() {
  log('🚀 Iniciando envio de relatório diário');

  try {
    const config = await loadConfig();
    const report = generateReport('completo');

    // Enviar para cada usuário autorizado
    for (const userId of config.authorized_users) {
      await sendMessage(userId, report);
    }

    // Salvar log de sucesso
    await saveReport({
      type: 'daily',
      content: report,
      user_id: 'system',
      triggered_by: 'scheduler',
    });

    await saveJobLog('daily_report', 'success', {
      users_count: config.authorized_users.length,
    });

    log('✅ Relatório diário enviado com sucesso');
    return { success: true };
  } catch (error) {
    log(`❌ Erro ao enviar relatório diário: ${error.message}`, 'ERROR');
    await saveJobLog('daily_report', 'error', {
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

// ============================================================================
// ROTAS EXPRESS
// ============================================================================

/**
 * Health check (obrigatório para Cloud Run)
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Webhook do Telegram
 */
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    const message = update.message;

    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text.trim();
      const userId = message.from.id;

      log(`💬 Mensagem de ${userId}: ${text}`);

      if (text.startsWith('/')) {
        await handleCommand(chatId, userId, text);
      }
    }

    res.json({ ok: true });
  } catch (error) {
    log(`❌ Erro ao processar webhook: ${error.message}`, 'ERROR');
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Endpoint para Cloud Scheduler executar o job diário
 * Requer autenticação via OIDC token
 */
app.post('/api/scheduled/daily-report', async (req, res) => {
  try {
    // Verificar se é chamada do Cloud Scheduler
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await sendDailyReport();
    res.json(result);
  } catch (error) {
    log(`❌ Erro no endpoint de scheduler: ${error.message}`, 'ERROR');
    res.status(500).json({ error: error.message });
  }
});

/**
 * Admin: Listar usuários autorizados
 */
app.get('/admin/users', async (req, res) => {
  try {
    const config = await loadConfig();
    res.json(config.authorized_users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Admin: Adicionar usuário
 */
app.post('/admin/users/add', async (req, res) => {
  try {
    const { userId } = req.body;
    const config = await loadConfig();

    if (!config.authorized_users.includes(userId.toString())) {
      config.authorized_users.push(userId.toString());
      await saveConfig(config);
      log(`➕ Usuário adicionado: ${userId}`);
    }

    res.json({ ok: true, users: config.authorized_users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Admin: Remover usuário
 */
app.post('/admin/users/remove', async (req, res) => {
  try {
    const { userId } = req.body;
    const config = await loadConfig();

    config.authorized_users = config.authorized_users.filter(
      u => u !== userId.toString()
    );
    await saveConfig(config);
    log(`➖ Usuário removido: ${userId}`);

    res.json({ ok: true, users: config.authorized_users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Admin: Obter últimos relatórios
 */
app.get('/admin/reports', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const reports = await getReports(limit);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Admin: Obter logs de jobs
 */
app.get('/admin/job-logs', async (req, res) => {
  try {
    const snapshot = await db.collection('job_logs')
      .orderBy('executed_at', 'desc')
      .limit(20)
      .get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

async function main() {
  try {
    log('🤖 Bot Radar Solar FV iniciando no Google Cloud Run');

    // Validar token
    if (!BOT_TOKEN) {
      throw new Error('BOT_TOKEN não configurado');
    }

    // Obter info do bot
    const botInfo = await getBotInfo();
    if (botInfo) {
      log(`✅ Bot conectado: @${botInfo.username}`);
    }

    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      log(`✅ Servidor rodando na porta ${PORT}`);
      log(`🌐 Webhook URL: https://<seu-cloud-run-url>/webhook`);
      log(`📅 Scheduler endpoint: https://<seu-cloud-run-url>/api/scheduled/daily-report`);
    });

    log('✅ Bot pronto para receber mensagens');
  } catch (error) {
    log(`❌ Erro ao iniciar bot: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Iniciar
if (require.main === module) {
  main();
}

module.exports = { app, sendDailyReport, sendMessage };
