// ======================================
// CONFIGURAÇÕES INICIAIS
// ======================================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 1000;
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Configuração do servidor
app.use(express.static('public'));

// Rotas
app.get('/qrcode', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/qrcode.png'));
});

app.get('/', (req, res) => {
    res.send('🤖 Bot está online! Acesse /qrcode para visualizar o QR Code.');
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// ======================================
// CONFIGURAÇÃO DO WHATSAPP CLIENT
// ======================================
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

const delay = ms => new Promise(res => setTimeout(res, ms));
const ultimasInteracoes = {};
const iniciadasPeloCliente = {};
const inatividadeNotificada = {};
const TEMPO_AVISO = 5 * 60 * 1000;
const TEMPO_ENCERRAMENTO = 10 * 60 * 1000;

// ======================================
// GERENCIAMENTO DE QR CODE
// ======================================
client.on('qr', async qr => {
    console.log('Gerando QR Code...');
    
    if (!fs.existsSync('public')) fs.mkdirSync('public');
    
    try {
        await qrcode.toFile('public/qrcode.png', qr, {
            width: 300,
            margin: 2,
            errorCorrectionLevel: 'H'
        });
        console.log('✅ QR Code disponível em: /qrcode');
    } catch (err) {
        console.error('Erro ao gerar QR Code:', err);
    }
});

client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado!', reason);
    client.initialize(); // Reconecta automaticamente
});

client.initialize();

// ======================================
// FUNÇÕES AUXILIARES
// ======================================
function saudacaoPersonalizada() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
}

async function enviarComDigitando(chat, mensagem, tempo = 1500) {
    await chat.sendStateTyping();
    await delay(tempo);
    await client.sendMessage(chat.id._serialized, mensagem);
}

async function enviarMenu(msg, nome) {
    const chat = await msg.getChat();
    const saudacao = saudacaoPersonalizada();

    const menuMensagem = `
${saudacao}, *${nome}*! 👋, tudo bem?  

Escolha uma das opções abaixo:  

🛍️  *[1]* Falar com um Vendedor  
💰  *[2]* Financeiro (Boletos, Pagamentos)  
💼  *[3]* Trabalhe Conosco  
🔔  *[4]* Ofertas e Novidades  
📍  *[5]* Localização da Loja  

✳️ _Digite o número da opção desejada._  
❗ _A qualquer momento, envie *MENU* para voltar ao início._  
`;

    await enviarComDigitando(chat, menuMensagem);
}

// ======================================
// HANDLER DE MENSAGENS (SIMPLIFICADO)
// ======================================
client.on('message', async (msg) => {
    if (msg.fromMe) return;

    const chat = await msg.getChat();
    const comando = msg.body.trim().toLowerCase();
    const contact = await msg.getContact();
    const nome = contact.pushname || 'cliente';
    const nomeFormatado = nome.split(" ")[0];

    // Atualiza controle de atividade
    ultimasInteracoes[msg.from] = Date.now();
    inatividadeNotificada[msg.from] = false;

    // Comandos básicos
    if (/^(sair|parar)$/.test(comando)) {
        await enviarComDigitando(chat, '⚠️ Digite *SIM* para confirmar encerramento ou *MENU* para continuar.');
        return;
    }

    if (comando === 'sim') {
        await enviarComDigitando(chat, '✅ Atendimento encerrado. Digite *MENU* quando quiser voltar.');
        return;
    }

    if (/^(oi|olá|ola|menu|bom dia|boa tarde|boa noite)$/i.test(comando)) {
        iniciadasPeloCliente[msg.from] = true;
        await enviarMenu(msg, nomeFormatado);
        return;
    }

    // Menu principal
    switch (comando) {
        case '1':
            await enviarComDigitando(chat, '📞 Um vendedor entrará em contato em breve!');
            break;

        case '2':
            await enviarComDigitando(chat, '💰 Por favor, envie seu *NOME* e *CPF/CNPJ* para consulta.');
            break;

        case '3':
            await enviarComDigitando(chat, '💼 Envie seu CURRÍCULO para este chat com:\n- Nome completo\n- Telefone\n- Vaga desejada');
            break;

        case '4':
            await enviarComDigitando(chat, '🔔 Você agora receberá nossas ofertas!\nSalve nosso contato para não perder.');
            break;

        case '5':
            await enviarComDigitando(chat, '📍 Nossa localização:\nhttps://maps.app.goo.gl/mLiFQuJSGqHb6WvE7');
            break;

        default:
            if (/^\d+$/.test(comando)) {
                await enviarComDigitando(chat, '❌ Opção inválida. Digite *MENU* para ver as opções.');
            }
            break;
    }
});

// ======================================
// VERIFICAÇÃO DE INATIVIDADE
// ======================================
setInterval(() => {
    const agora = Date.now();
    for (const contato in ultimasInteracoes) {
        const tempoSemInteracao = agora - ultimasInteracoes[contato];
        
        if (tempoSemInteracao >= TEMPO_ENCERRAMENTO) {
            client.sendMessage(contato, '🚫 Atendimento encerrado por inatividade. Digite *MENU* para recomeçar.');
            delete ultimasInteracoes[contato];
            delete inatividadeNotificada[contato];
            delete iniciadasPeloCliente[contato];
        } 
        else if (tempoSemInteracao >= TEMPO_AVISO && !inatividadeNotificada[contato]) {
            client.sendMessage(contato, '👋 Ainda estou aqui! Digite algo ou *MENU* para continuar.');
            inatividadeNotificada[contato] = true;
        }
    }
}, 60 * 1000);