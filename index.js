// ======================================
// CONFIGURAÇÕES INICIAIS (ATUALIZADAS)
// ======================================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Debug inicial
console.log('=== INICIALIZANDO BOT ===');
console.log('Node.js:', process.version);
console.log('Memória:', JSON.stringify(process.memoryUsage()));
console.log('=========================');

// Controle de conexão reforçado
let isConnected = false;
let reconexoes = 0;
const MAX_RECONEXOES = 3;

// Configuração do servidor
app.use(express.static('public'));

// Rotas
app.get('/qrcode', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/qrcode.png'));
});

app.get('/health', (req, res) => {
    res.status(isConnected ? 200 : 503).json({
        status: isConnected ? 'online' : 'offline',
        reconexoes
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>🤖 Bot WhatsApp</h1>
        <p>Status: ${isConnected ? 'ONLINE' : 'OFFLINE'}</p>
        <a href="/qrcode">Ver QR Code</a>
    `);
});

// ======================================
// CLIENT WHATSAPP (CONFIGURAÇÃO FORTALECIDA)
// ======================================
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions',
        clientId: 'bot-loja-' + Math.random().toString(36).substring(2) // ID único
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
});

// ======================================
// GERENCIAMENTO DE CONEXÃO (REVISADO)
// ======================================
client.on('qr', async qr => {
    console.log('\n=== NOVO QR CODE GERADO ===');
    try {
        if (!fs.existsSync('public')) fs.mkdirSync('public');
        
        await qrcode.toFile('public/qrcode.png', qr, {
            width: 400,
            margin: 2,
            errorCorrectionLevel: 'H'
        });
        
        console.log('📲 QR Code disponível em: /qrcode');
        console.log(`⏳ Validade: ~2 minutos`);
    } catch (err) {
        console.error('❌ Erro ao gerar QR:', err);
    }
});

client.on('authenticated', () => {
    isConnected = true;
    reconexoes = 0;
    console.log('\n✅ AUTENTICADO NO WHATSAPP!');
});

client.on('ready', () => {
    isConnected = true;
    console.log('\n🚀 BOT PRONTO PARA MENSAGENS!');
    console.log('💬 Envie "menu" para testar');
});

client.on('disconnected', async (reason) => {
    isConnected = false;
    reconexoes++;
    
    console.log('\n=== DESCONEXÃO DETECTADA ===');
    console.log('Motivo:', reason);
    console.log('Tentativas de reconexão:', reconexoes);
    
    if (reconexoes <= MAX_RECONEXOES) {
        console.log(`⏳ Reconectando em 15s... (${reconexoes}/${MAX_RECONEXOES})`);
        await delay(15000);
        client.initialize();
    } else {
        console.log('❌ Limite de reconexões atingido!');
        process.exit(1);
    }
});

// ======================================
// HANDLER DE MENSAGENS (COM DEBUG)
// ======================================
client.on('message', async (msg) => {
    try {
        console.log('\n📩 Mensagem recebida:', {
            from: msg.from,
            body: msg.body,
            type: msg.type,
            isGroupMsg: msg.isGroupMsg
        });

        // Ignora mensagens do próprio bot ou quando offline
        if (msg.fromMe || !isConnected) {
            console.log('Ignorando mensagem (fromMe ou offline)');
            return;
        }

        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const nome = contact.pushname || 'Cliente';
        const comando = msg.body.trim().toLowerCase();

        console.log('Processando comando:', comando);

        // Fluxo principal
        if (/^(menu|oi|ola|olá|inicio|início)$/i.test(comando)) {
            await enviarMenu(chat, nome);
            return;
        }

        // Respostas automáticas
        const respostas = {
            '1': '📞 Um vendedor entrará em contato em breve! (Número do pedido: #' + Math.floor(Math.random() * 1000) + ')',
            '2': '💰 Para consultar pagamentos, envie:\n• CPF/CNPJ\n• Nome completo',
            '3': '💼 Envie seu CV para rh@empresa.com com:\n- Nome\n- Vaga desejada\n- Telefone',
            '4': '🔔 Você agora receberá nossas promoções!',
            '5': '📍 Nossa loja física:\nAv. Principal, 123\nHorário: 9h-18h\nhttps://maps.app.goo.gl/xxxx'
        };

        if (respostas[comando]) {
            await enviarComDigitando(chat, respostas[comando]);
        } else if (/^[1-5]$/.test(comando)) {
            await enviarComDigitando(chat, '❌ Opção inválida. Digite *MENU* para ver as opções.');
        }
    } catch (err) {
        console.error('❌ ERRO NO HANDLER:', err);
    }
});

// ======================================
// FUNÇÕES AUXILIARES
// ======================================
async function enviarComDigitando(chat, mensagem, tempo = 2000) {
    try {
        await chat.sendStateTyping();
        await delay(tempo);
        const msgEnviada = await client.sendMessage(chat.id._serialized, mensagem);
        console.log('✓ Mensagem enviada:', msgEnviada.body);
    } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
        throw err;
    }
}

async function enviarMenu(chat, nome) {
    const menu = `
*${saudacao()} ${nome}!* 👋

Escolha uma opção:
1️⃣ Atendimento
2️⃣ Financeiro
3️⃣ Trabalhe conosco
4️⃣ Promoções
5️⃣ Localização

_Digite o número da opção_
`;
    await enviarComDigitando(chat, menu);
}

function saudacao() {
    const hora = new Date().getHours();
    return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ======================================
// INICIALIZAÇÃO SEGURA
// ======================================
console.log('\n=== INICIANDO BOT ===');
client.initialize()
    .then(() => console.log('Inicialização iniciada...'))
    .catch(err => {
        console.error('❌ FALHA NA INICIALIZAÇÃO:', err);
        process.exit(1);
    });

app.listen(PORT, () => {
    console.log(`\n🌐 Servidor rodando na porta ${PORT}`);
    console.log(`🔍 Health check: /health`);
    console.log(`📲 QR Code: /qrcode`);
});