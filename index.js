// ============================================================
// PUNTO DE ENTRADA
// ============================================================

require('dotenv').config();
const WalletBot = require('./bot');
const logger = require('./utils/logger');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WALLET_TOKEN = process.env.WALLET_TOKEN;
const PROXY_URL = process.env.API_PROXY_URL || 'https://script.google.com/macros/s/AKfycbzObIy-f6tHL6PABCVDJ--iULCOLZz7jf4umWBqgNV9hOGPoOhDlRkyI5b59zD6DmD2dA/exec';

if (!TOKEN) {
    logger.error('❌ TELEGRAM_BOT_TOKEN no configurado en .env');
    logger.error('1. Ve a @BotFather en Telegram');
    logger.error('2. Usa /newbot para crear un bot');
    logger.error('3. Copia el token en el archivo .env');
    process.exit(1);
}

if (!WALLET_TOKEN) {
    logger.warn('⚠️ WALLET_TOKEN no configurado - algunas funciones no funcionarán');
}

// ✅ CREAR EL BOT (esta línea faltaba)
const bot = new WalletBot(TOKEN, WALLET_TOKEN, PROXY_URL);

logger.info('🚀 Bot iniciado. Esperando mensajes...');
logger.info(`📱 Bot: @${TOKEN.split(':')[0]}`);

// Manejo de señales
process.on('SIGINT', () => {
    logger.info('👋 Deteniendo bot...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason) => {
    logger.error('❌ Promesa rechazada:', reason);
});