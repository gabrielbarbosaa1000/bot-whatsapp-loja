// ======================================
// CONFIGURAÇÕES INICIAIS
// ======================================
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Configuração do Puppeteer Extra
const puppeteer = addExtra(require('puppeteer-core'));
puppeteer.use(StealthPlugin());

// Debug inicial
console.log('=== VERIFICAÇÃO DE AMBIENTE ===');
console.log('Node.js Version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('Chromium Path:', process.env.CHROMIUM_PATH || '/usr/bin/google-chrome-stable');
console.log('DISPLAY:', process.env.DISPLAY || ':99');

// ======================================
// CONFIGURAÇÃO PERSONALIZÁVEL (EDITÁVEL)
// ======================================
const CONFIG = {
  respostas: {
    '1': '📞 Um vendedor entrará em contato em breve! Seu número de atendimento: #' + Math.floor(Math.random() * 10000),
    '2': '💰 Para consultar pagamentos, envie:\n• CPF/CNPJ\n• Nome completo\n• Valor do boleto',
    '3': '💼 Envie seu currículo para rh@loja.com com:\n- Nome completo\n- Vaga de interesse\n- Telefone',
    '4': '🔔 Você agora receberá nossas promoções exclusivas!',
    '5': '📍 Nossa loja física:\nAv. Principal, 123\nHorário: 9h às 18h\nhttps://maps.app.goo.gl/xxxx',
    'menu': 'Escolha uma opção:\n1. Atendimento\n2. Financeiro\n3. Trabalhe conosco\n4. Ofertas\n5. Localização'
  },
  tempoDigitacao: 2000,
  reconexao: {
    tentativasMaximas: 5,
    intervalo: 15000
  }
};

// ======================================
// CONFIGURAÇÃO DO WHATSAPP CLIENT (ATUALIZADA)
// ======================================
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './sessions',
    clientId: 'bot-loja'
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--use-gl=egl',
      '--remote-debugging-port=9222',
      '--remote-debugging-address=0.0.0.0'
    ],
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: ['--disable-extensions']
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});

console.log('\n=== CONFIGURAÇÃO DO CLIENTE ===');
console.log('Browser Path:', client.options.puppeteer.executablePath);
console.log('Puppeteer Args:', client.options.puppeteer.args);

// ======================================
// INICIALIZAÇÃO DO SISTEMA
// ======================================
console.log('\n=== INICIANDO BOT ===');
console.log('Modo:', process.env.NODE_ENV || 'development');
console.log('Porta:', PORT);

// Controle de conexão
let isConnected = false;
let reconexoes = 0;

// ======================================
// GERENCIAMENTO DE CONEXÃO
// ======================================
client.on('qr', async qr => {
  if (isConnected) return;
  
  console.log('\n🔵 QR Code gerado');
  try {
    if (!fs.existsSync('public')) fs.mkdirSync('public');
    
    await qrcode.toFile('public/qrcode.png', qr, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H'
    });
    
    console.log('📲 Acesse o QR Code em: /qrcode');
  } catch (err) {
    console.error('❌ Falha ao gerar QR:', err);
  }
});

client.on('authenticated', () => {
  isConnected = true;
  reconexoes = 0;
  console.log('\n✅ Autenticado no WhatsApp!');
});

client.on('ready', () => {
  isConnected = true;
  console.log('\n🚀 Bot pronto para atendimento!');
});

client.on('disconnected', async (reason) => {
  isConnected = false;
  reconexoes++;
  
  console.log('\n⚠️ Desconectado:', reason);
  console.log(`Tentativa ${reconexoes}/${CONFIG.reconexao.tentativasMaximas}`);
  
  if (reconexoes <= CONFIG.reconexao.tentativasMaximas) {
    console.log(`⏳ Reconectando em ${CONFIG.reconexao.intervalo/1000}s...`);
    await delay(CONFIG.reconexao.intervalo);
    client.initialize();
  } else {
    console.error('❌ Limite de reconexões atingido!');
    process.exit(1);
  }
});

// ======================================
// FUNÇÕES PRINCIPAIS
// ======================================
async function enviarComDigitando(chat, mensagem) {
  try {
    await chat.sendStateTyping();
    await delay(CONFIG.tempoDigitacao);
    await client.sendMessage(chat.id._serialized, mensagem);
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
  }
}

async function handleMensagem(msg) {
  try {
    if (msg.fromMe || !isConnected) return;

    const chat = await msg.getChat();
    const comando = msg.body.trim().toLowerCase();
    const contact = await msg.getContact();
    const nome = contact.pushname || 'Cliente';

    console.log(`📩 ${nome}: ${comando}`);

    if (CONFIG.respostas[comando]) {
      await enviarComDigitando(chat, CONFIG.respostas[comando]);
      return;
    }

    if (/^[1-5]$/.test(comando)) {
      await enviarComDigitando(chat, CONFIG.respostas[comando] || 'Opção inválida');
    } else if (comando === 'menu') {
      await enviarComDigitando(chat, CONFIG.respostas.menu);
    }
  } catch (err) {
    console.error('Erro no handler:', err);
  }
}

// ======================================
// CONFIGURAÇÃO DO SERVIDOR WEB
// ======================================
app.use(express.static('public'));

app.get('/qrcode', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/qrcode.png'));
});

app.get('/status', (req, res) => {
  res.json({
    status: isConnected ? 'online' : 'offline',
    reconexoes,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    chromiumPath: process.env.CHROMIUM_PATH || 'default',
    nodeVersion: process.version
  });
});

app.listen(PORT, () => {
  console.log(`\n🌐 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Endpoints:
  /status       - Verificar status do bot
  /qrcode       - Obter QR Code de conexão`);
});

// ======================================
// INICIALIZAÇÃO
// ======================================
client.on('message', handleMensagem);

// Verifica e cria diretórios necessários
if (!fs.existsSync('./sessions')) {
  fs.mkdirSync('./sessions', { recursive: true });
  console.log('Diretório sessions criado');
}
if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
  console.log('Diretório public criado');
}

client.initialize().catch(err => {
  console.error('❌ Falha na inicialização:', err);
  
  if (err.message.includes('ENOENT')) {
    console.error('\n⚠️ Solução alternativa:');
    console.error('1. Verifique se o Chrome está instalado corretamente no prestart.sh');
    console.error('2. Confirme as variáveis de ambiente no Render');
    console.error('3. Verifique os logs completos do prestart.sh');
  }
  
  process.exit(1);
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('\n=== SISTEMA INICIALIZADO ===');
console.log('Aguardando eventos...');