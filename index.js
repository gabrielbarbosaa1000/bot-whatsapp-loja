// ======================================
// CONFIGURAÇÕES INICIAIS
// ======================================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000; // Porta alterada para 10000
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Variável de controle de conexão
let isConnected = false;

// Configuração do servidor
app.use(express.static('public'));

// Rotas
app.get('/qrcode', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/qrcode.png'));
});

app.get('/', (req, res) => {
    res.send('🤖 Bot está online! Acesse /qrcode para visualizar o QR Code.');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// ======================================
// CONFIGURAÇÃO DO WHATSAPP CLIENT (OTIMIZADA)
// ======================================
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions',
        clientId: 'bot-loja' // Nome único para a sessão
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ]
    },
    takeoverOnConflict: true,
    restartOnAuthFail: true
});

const delay = ms => new Promise(res => setTimeout(res, ms));

// ======================================
// GERENCIAMENTO DE CONEXÃO
// ======================================
client.on('qr', async qr => {
    if (isConnected) return;
    
    console.log('Gerando QR Code...');
    
    try {
        if (!fs.existsSync('public')) {
            fs.mkdirSync('public');
        }
        
        await qrcode.toFile('public/qrcode.png', qr, {
            width: 300,
            margin: 2,
            errorCorrectionLevel: 'H'
        });
        console.log('✅ QR Code disponível em: /qrcode');
        console.log(`🔗 Acesse: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'seu-bot.onrender.com'}/qrcode`);
    } catch (err) {
        console.error('Erro ao gerar QR Code:', err);
    }
});

client.on('authenticated', () => {
    isConnected = true;
    console.log('✅ Autenticado com sucesso no WhatsApp!');
});

client.on('ready', () => {
    isConnected = true;
    console.log('🚀 Bot pronto para receber mensagens!');
});

client.on('disconnected', async (reason) => {
    isConnected = false;
    console.log('❌ Desconectado do WhatsApp:', reason);
    
    // Reconecta após 10 segundos
    await delay(10000);
    console.log('Tentando reconectar...');
    client.initialize();
});

// ======================================
// FUNÇÕES PRINCIPAIS (SIMPLIFICADAS)
// ======================================
function saudacaoPersonalizada() {
    const hora = new Date().getHours();
    return hora >= 5 && hora < 12 ? 'Bom dia' : 
           hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite';
}

async function enviarComDigitando(chat, mensagem, tempo = 1000) {
    try {
        await chat.sendStateTyping();
        await delay(tempo);
        await client.sendMessage(chat.id._serialized, mensagem);
    } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
    }
}

async function enviarMenu(msg, nome) {
    const chat = await msg.getChat();
    const menu = `
${saudacaoPersonalizada()}, *${nome}*! 👋

🛍️  *[1]* Falar com Vendedor
💰  *[2]* Financeiro
💼  *[3]* Trabalhe Conosco
🔔  *[4]* Ofertas
📍  *[5]* Localização

Digite o número da opção:
`;
    await enviarComDigitando(chat, menu);
}

// ======================================
// HANDLER DE MENSAGENS (OTIMIZADO)
// ======================================
client.on('message', async (msg) => {
    if (msg.fromMe || !isConnected) return;

    try {
        const chat = await msg.getChat();
        const comando = msg.body.trim().toLowerCase();
        const contact = await msg.getContact();
        const nome = contact.pushname || 'Cliente';

        console.log(`Mensagem de ${nome}: ${comando}`);

        // Comandos básicos
        if (/^(menu|oi|olá|ola)$/i.test(comando)) {
            await enviarMenu(msg, nome);
            return;
        }

        // Respostas automáticas
        const respostas = {
            '1': '📞 Um vendedor entrará em contato em breve!',
            '2': '💰 Envie seu CPF/CNPJ para consulta financeira.',
            '3': '💼 Envie seu currículo para: rh@empresa.com',
            '4': '🔔 Cadastro realizado! Você receberá nossas ofertas.',
            '5': '📍 Av. Principal, 123 - Centro\nhttps://maps.app.goo.gl/xxxx'
        };

        if (respostas[comando]) {
            await enviarComDigitando(chat, respostas[comando]);
        } else if (/^[1-5]$/.test(comando)) {
            await enviarComDigitando(chat, '❌ Opção inválida. Digite MENU para ver as opções.');
        }
    } catch (err) {
        console.error('Erro no handler de mensagens:', err);
    }
});

// ======================================
// INICIALIZAÇÃO SEGURA
// ======================================
(async () => {
    try {
        await client.initialize();
        console.log('Inicialização do WhatsApp concluída');
    } catch (err) {
        console.error('Erro na inicialização:', err);
        process.exit(1);
    }
})();