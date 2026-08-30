// ============================================================
// TELEGRAM BOT PRINCIPAL
// ============================================================

const TelegramBot = require('node-telegram-bot-api');
const WalletAPI = require('./wallet-api');
const logger = require('./utils/logger');

// ============================================================
// MAPEO DE CATEGORÍAS A LABELS (SOLO LOS 7 LABELS)
// ============================================================

const LABEL_CATEGORIES = {
    'Donativos': [
        'Amigos', 'Ayuda', 'Donativos', 'Familia', 'Iglesia', 'Mon Amour', 'Regalo',
        'Abuela', 'Aporte', 'Ayuda Individual', 'Junior y Johanny', 'Mami', 'Misiones',
        'Ofrenda', 'Otro Familiar', 'Papi', 'Propina', 'Rachel'
    ],
    'Inversión': [
        'Collections', 'Inversiones financieras', 'Inversión y Ahorros', 'Negocios',
        'Vehicles, chattels', 'Acciones', 'Bonos', 'Cryptomonedas',
        'Equipos y herramientas para negocio', 'ETFs', 'Expansión de operaciones',
        'Fondos mutuos', 'Goarbit', 'Goarbit Rachel', 'Inversion', 'Publicidad y marketing'
    ],
    'Entretenimiento': [
        'Actividades al aire libre', 'Actividades de ocio', 'Cine', 'Comida especial',
        'Conciertos', 'Cumpleaños', 'Education & development', 'Entretenimiento',
        'Eventos en casa', 'Hobbies y pasatiempos', 'Peluquería', 'Salidas sociales',
        'Teatro', 'Viajes de entretenimiento', 'Boliche', 'Clases recreativas',
        'Cruceros', 'Escapadas de fin de semana', 'Juegos',
        'Juegos de mesa o karaoke', 'Parques temáticos o de atracciones',
        'Restaurantes y cafés', 'Reuniones con amigos o familiares', 'Tours turísticos'
    ],
    'Modeco': [
        'Administracion y Legales - OPEX', 'Artículos en venta', 'Comisiones',
        'Compras y Materia Prima - COGS', 'Depreciacion de Activos - Modeco',
        'Desarrollo y Formacion - OPEX', 'Fondo Misiones - Modeco', 'Impuestos - Modeco',
        'Impuestos otros', 'Intereses y Comisiones Bancarias - Modeco', 'Licencias',
        'Logística Directa de Entrega - COGS', 'Maquinaria, Herramientas y Muebles - CAPEX',
        'Marketing y Comercializacion - OPEX', 'Mermas / Desperdicio - COGS',
        'Operaciones y Planta - OPEX', 'Otros Gastos - Modeco',
        'Recursos Humanos - OPEX', 'Reparaciones mantenimiento - COGS',
        'Tecnología y Software - OPEX', 'Viajes y Representación - OPEX'
    ],
    'Educación': [
        'Actividades extracurriculares', 'Cursos y talleres', 'Educación',
        'Materiales educativos', 'Matrícula y colegiaturas', 'Otros gastos relacionados',
        'Universidad', 'Certificaciones y diplomados', 'Clases de música, danza o arte',
        'Cuadernos y papelería', 'Cursos', 'Cursos en línea', 'Cursos presenciales',
        'Escuelas', 'Excursiones y campamentos', 'Libros y manuales',
        'Materiales de arte y diseño', 'Software educativo',
        'Suscripciones o recursos educativos en línea', 'Tutorías', 'Universidades'
    ],
    'Ahorros': [
        'Ahorro a corto plazo', 'Ahorro a largo plazo', 'Ahorro para eventos',
        'Ahorro para grandes compras'
    ]
};

const DEFAULT_LABEL = 'Básica';

// Función para obtener el label de una categoría
function getLabelForCategory(categoryName) {
    for (const [label, categories] of Object.entries(LABEL_CATEGORIES)) {
        if (categories.includes(categoryName)) {
            return label;
        }
    }
    return DEFAULT_LABEL;
}

class WalletBot {
    constructor(token, walletToken, proxyUrl) {
        // ⚠️ WalletAPI ya no acepta proxyUrl
        this.bot = new TelegramBot(token, { polling: true });
        this.wallet = new WalletAPI(walletToken); // 🔧 Sin proxyUrl
        this.userStates = new Map();
        this.setupHandlers();
    }

    setupHandlers() {
        this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
        this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
        this.bot.onText(/\/add(?:\s+(.+))?/, (msg, match) => this.handleAdd(msg, match));
        this.bot.onText(/\/list/, (msg) => this.handleList(msg));
        this.bot.onText(/\/summary/, (msg) => this.handleSummary(msg));
        this.bot.onText(/\/accounts/, (msg) => this.handleAccounts(msg));
        this.bot.onText(/\/categories/, (msg) => this.handleCategories(msg));
        this.bot.onText(/\/cancel/, (msg) => this.handleCancel(msg));
        this.bot.onText(/\/buscar(?:\s+(.+))?/, (msg, match) => this.handleSearch(msg, match));
        this.bot.onText(/\/allaccounts/, (msg) => this.handleAllAccounts(msg));
        this.bot.onText(/\/autocomplete(?:\s+(.+))?/, (msg, match) => this.handleAutocomplete(msg, match));

        this.bot.on('message', (msg) => {
            if (!msg.text || msg.text.startsWith('/')) return;
            this.handleConversation(msg);
        });

        this.bot.on('error', (error) => {
            logger.error('Error del bot:', error);
        });

        logger.info('🤖 Bot de Wallet iniciado correctamente');
    }

    // ============================================================
    // COMANDOS
    // ============================================================

    async handleStart(msg) {
        const chatId = msg.chat.id;
        const firstName = msg.from.first_name || 'usuario';
        
        const welcomeMessage = `
🎯 *Bienvenido a Wallet Bot, ${firstName}!*

Este bot te permite gestionar tus finanzas en Wallet by BudgetBakers directamente desde Telegram.

📋 *Comandos disponibles:*

💳 \`/add [monto] [categoría] [cuenta]\` - Agregar transacción
📊 \`/list\` - Ver transacciones recientes
📈 \`/summary\` - Resumen del mes actual
🏦 \`/accounts\` - Listar cuentas
📂 \`/categories\` - Listar categorías
❌ \`/cancel\` - Cancelar operación en curso
ℹ️ \`/help\` - Mostrar esta ayuda

💡 *Ejemplos:*
\`/add 500 Comida CuentaPrincipal\`
`;

        await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    }

    async handleHelp(msg) {
        const chatId = msg.chat.id;
        const helpMessage = `
    📖 *Ayuda de Wallet Bot*

    *Agregar transacción:*
    \`/add [monto] [categoría] [cuenta] [opciones]\`

    *Opciones:*
    • \`#Categoría\` - Obligatorio (o entre comillas)
    • \`@Cuenta\` - Opcional (por defecto la primera activa)
    • \`date:YYYY-MM-DD\` - Fecha opcional (por defecto hoy)
    • \`note:"Texto"\` - Nota opcional

    *Ejemplos:*
    • \`/add 500 #Motor @Cash\`
    • \`/add 1500 #Supermercado date:2024-01-15\`
    • \`/add 300 #Comida note:"Cena con amigos"\`
    • \`/add 200 #Transporte @Crédito date:2024-01-20 note:"Viaje"\`

    *Múltiples transacciones:*
    \`/add 500 Motor Cash ; 200 #Comida @Cash\`

    *Buscar interactivamente:*
    \`/autocomplete [texto]\` - Muestra categorías y cuentas

    *Otros comandos:*
    \`/list\` - Últimas 10 transacciones
    \`/summary\` - Resumen del mes actual
    \`/accounts\` - Lista de cuentas
    \`/categories\` - Lista de categorías
    \`/cancel\` - Cancelar operación
    `;
        await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    }

    // Nuevo método
    async handleSearch(msg, match) {
        const chatId = msg.chat.id;
        const searchText = match && match[1] ? match[1].toLowerCase() : '';
        
        if (!searchText) {
            await this.bot.sendMessage(chatId, '❌ Escribe algo para buscar.\nEjemplo: /buscar motor');
            return;
        }
        
        try {
            const categories = await this.wallet.getCategories();
            const results = categories.filter(c => 
                c.name.toLowerCase().includes(searchText) ||
                (c.group?.name && c.group.name.toLowerCase().includes(searchText))
            );
            
            if (results.length === 0) {
                await this.bot.sendMessage(chatId, `🔍 No encontré categorías con "${searchText}"`);
                return;
            }
            
            let message = `🔍 *Resultados para "${searchText}":*\n\n`;
            results.forEach(c => {
                const type = c.group?.id === 'incomes' || c.group?.id === 'income' ? '🟢 Ingreso' : '🔴 Gasto';
                message += `${type}: ${c.name}`;
                if (c.group?.name) message += ` (${c.group.name})`;
                message += '\n';
            });
            
            await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Error en handleSearch:', error);
            await this.bot.sendMessage(chatId, `❌ Error al buscar: ${error.message}`);
        }
    }

    // ============================================================
    // AGREGAR TRANSACCIÓN
    // ============================================================

    // ============================================================
    // AGREGAR TRANSACCIÓN - CON BÚSQUEDA MEJORADA
    // ============================================================

    async handleAdd(msg, match) {
        const chatId = msg.chat.id;
        const text = match && match[1] ? match[1] : '';

        console.log(`📝 Texto recibido: "${text}"`);

        if (!text) {
            // Iniciar conversación paso a paso
            this.userStates.set(chatId, { step: 'add_amount' });
            await this.bot.sendMessage(chatId, 
                '💸 *Agregar transacción*\n\n' +
                '1️⃣ ¿Cuánto? (ej: 1500.50)\n' +
                '2️⃣ ¿Categoría? (ej: Motor)\n' +
                '3️⃣ ¿Cuenta? (ej: Cash)\n\n' +
                '💡 También puedes usar: /add 30 "Frutas y verduras" "Emely Cash"\n' +
                '💡 Para múltiples transacciones, usa ; o | como separador:\n' +
                '/add 500 Motor Cash ; 200 Comida Cash\n' +
                'Responde paso a paso o escribe /cancel para cancelar.',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        try {
            // 🔧 Dividir por líneas o por separadores (; o |)
            let lines = text
                .split(/\r?\n/)  // Primero intentar saltos de línea
                .flatMap(line => line.split(/[;|]/)) // También separar por ; o |
                .map(line => line.trim())
                .filter(line => line.length > 0);

            // Si una línea tiene "/add", eliminarlo (para cuando usan /add en cada línea)
            lines = lines.map(line => {
                if (line.startsWith('/add')) {
                    return line.substring(4).trim();
                }
                return line;
            });

            console.log(`📝 Líneas encontradas: ${lines.length}`);
            console.log(`📝 Contenido:`, lines);

            // Si es una sola línea, procesar normalmente
            if (lines.length === 1) {
                await this.processSingleTransaction(chatId, lines[0]);
                return;
            }

            // Múltiples líneas → procesar cada una
            await this.bot.sendMessage(chatId, `📋 Procesando ${lines.length} transacciones...\n⏳ Por favor espera...`);

            const results = [];
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                try {
                    const result = await this.processSingleTransaction(chatId, line, true);
                    results.push({ ...result, line: line });
                    if (result.success) successCount++;
                    else errorCount++;
                    
                    // Pequeña pausa entre transacciones
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    errorCount++;
                    results.push({ 
                        success: false, 
                        error: error.message,
                        line: line 
                    });
                }
            }

            // Enviar resumen detallado
            let summary = `📊 *Resumen de ${results.length} transacciones:*\n\n`;
            summary += `✅ Exitosas: ${successCount}\n`;
            summary += `❌ Fallidas: ${errorCount}\n\n`;

            if (successCount > 0) {
                summary += '*✅ Exitosas:*\n';
                results.filter(r => r.success).forEach((r) => {
                    summary += `• ${r.details || 'Transacción agregada'}\n`;
                });
            }

            if (errorCount > 0) {
                summary += '\n*❌ Fallidas:*\n';
                results.filter(r => !r.success).forEach((r, i) => {
                    summary += `• Línea ${i+1}: ${r.error || 'Error desconocido'}\n`;
                });
            }

            // Si el resumen es muy largo, enviar como archivo
            if (summary.length > 4000) {
                await this.bot.sendMessage(chatId, 
                    `📊 *Resumen rápido:* ${successCount} ✅ / ${errorCount} ❌`,
                    { parse_mode: 'Markdown' }
                );
                
                const buffer = Buffer.from(summary, 'utf-8');
                await this.bot.sendDocument(chatId, buffer, {
                    filename: 'transacciones.txt',
                    caption: '📋 Detalles de las transacciones'
                });
            } else {
                await this.bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
            }

        } catch (error) {
            logger.error('Error en handleAdd:', error);
            await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async processSingleTransaction(chatId, line, silent = false) {
        // 🔧 Parser mejorado: soporta #categoría, @cuenta, date:, note:
        let amount = null;
        let categoryName = '';
        let accountName = '';
        let dateStr = null;
        let note = '';

        // 1. Extraer el monto (primer número)
        const amountMatch = line.match(/^(\d+(?:\.\d+)?)/);
        if (!amountMatch) {
            throw new Error('Formato incorrecto: se necesita un monto (ej: 500)');
        }
        amount = parseFloat(amountMatch[1]);
        if (isNaN(amount) || amount <= 0) {
            throw new Error('El monto debe ser un número positivo');
        }
        
        // 2. Remover el monto
        let rest = line.substring(amountMatch[0].length).trim();
        
        // 3. Extraer fecha (si existe)
        const dateRegex = /date:\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})/i;
        const dateMatch = rest.match(dateRegex);
        if (dateMatch) {
            dateStr = dateMatch[1];
            rest = rest.replace(dateMatch[0], '').trim();
        }
        
        // 4. Extraer nota (si existe)
        const noteRegex = /note:\s*(.+)/i;
        const noteMatch = rest.match(noteRegex);
        if (noteMatch) {
            note = noteMatch[1].trim();
            // Si la nota tiene comillas al inicio y final, quitarlas
            if ((note.startsWith('"') && note.endsWith('"')) || (note.startsWith('"') && note.endsWith('"'))) {
                note = note.substring(1, note.length - 1);
            }
            rest = rest.replace(noteMatch[0], '').trim();
        }
        
        // 5. Extraer categoría y cuenta usando # y @
        const categoryMatch = rest.match(/#([^@]*?)(?=\s*@|\s*$)/);
        const accountMatch = rest.match(/@([^#]*?)(?=\s*#|\s*$)/);
        
        if (categoryMatch) {
            categoryName = categoryMatch[1].trim();
            rest = rest.replace(`#${categoryMatch[1]}`, '').trim();
        }
        
        if (accountMatch) {
            accountName = accountMatch[1].trim();
            rest = rest.replace(`@${accountMatch[1]}`, '').trim();
        }
        
        // 6. Si no se encontraron prefijos, intentar parsear con comillas o espacios (compatibilidad)
        if (!categoryName && !accountName && rest) {
            // Intentar con comillas (rectas y curvas)
            const args = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < rest.length; i++) {
                const char = rest[i];
                if (char === '"' || char === '"' || char === '"' || char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ' ' && !inQuotes) {
                    if (current) {
                        args.push(current);
                        current = '';
                    }
                } else {
                    current += char;
                }
            }
            if (current) args.push(current);
            
            if (args.length >= 1) {
                categoryName = args[0];
                if (args.length >= 2) {
                    accountName = args.slice(1).join(' ');
                }
            }
        }
        
        // 7. Si aún no hay categoría, error
        if (!categoryName) {
            throw new Error('No se especificó categoría. Usa: /add 500 #Categoría @Cuenta date:YYYY-MM-DD note:"Nota"');
        }
        
        // 8. Buscar categoría
        const categories = await this.wallet.getCategories({ refresh: true });
        let category = null;
        
        // Coincidencia exacta
        category = categories.find(c => 
            c.name && c.name.toLowerCase() === categoryName.toLowerCase()
        );
        
        if (!category) {
            category = categories.find(c => 
                c.name && c.name.toLowerCase().includes(categoryName.toLowerCase())
            );
        }
        
        if (!category) {
            category = categories.find(c => 
                c.group?.name && 
                c.group.name.toLowerCase().includes(categoryName.toLowerCase())
            );
        }
        
        if (!category) {
            const suggestions = categories
                .filter(c => c.group?.id !== 'incomes' && c.group?.id !== 'income')
                .filter(c => c.name.toLowerCase().includes(categoryName.substring(0, 3).toLowerCase()))
                .slice(0, 5)
                .map(c => `#${c.name}`)
                .join(', ');
            throw new Error(
                `No se encontró la categoría "${categoryName}".\n` +
                `${suggestions ? `💡 ¿Quisiste decir: ${suggestions}?` : ''}\n` +
                `💡 Usa /autocomplete [texto] para buscar interactivamente.`
            );
        }
        
        // 9. Obtener label de la categoría
        const labelName = getLabelForCategory(category.name);
        
        // 10. Buscar cuenta
        const accounts = await this.wallet.getAccounts();
        let account = null;
        
        if (accountName) {
            account = accounts.find(a => 
                a.name && a.name.toLowerCase() === accountName.toLowerCase()
            );
            if (!account) {
                account = accounts.find(a => 
                    a.name && a.name.toLowerCase().includes(accountName.toLowerCase())
                );
            }
        }
        
        if (!account) {
            const activeAccounts = accounts.filter(a => !a.archived);
            if (activeAccounts.length > 0) {
                account = activeAccounts[0];
                if (!silent) {
                    await this.bot.sendMessage(chatId, 
                        `ℹ️ Usando cuenta "${account.name}" por defecto.`
                    );
                }
            } else {
                throw new Error('No hay cuentas disponibles');
            }
        }
        
        // 11. Procesar fecha
        let targetDate = null;
        if (dateStr) {
            // Intentar parsear diferentes formatos
            let parsedDate = null;
            // YYYY-MM-DD
            let match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (match) {
                parsedDate = new Date(parseInt(match[1]), parseInt(match[2])-1, parseInt(match[3]));
            } else {
                // DD/MM/YYYY o DD-MM-YYYY
                match = dateStr.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
                if (match) {
                    parsedDate = new Date(parseInt(match[3]), parseInt(match[2])-1, parseInt(match[1]));
                }
            }
            if (parsedDate && !isNaN(parsedDate.getTime())) {
                targetDate = parsedDate;
            } else {
                throw new Error(`Formato de fecha inválido: "${dateStr}". Usa YYYY-MM-DD o DD/MM/YYYY.`);
            }
        }
        
        // 12. Crear transacción
        const result = await this.wallet.createTransactionSimple({
            amount: amount,
            categoryId: category.id,
            accountId: account.id,
            note: note || `Agregado desde Telegram: ${categoryName}`,
            counterParty: 'Telegram Bot',
            labelName: labelName,
            date: targetDate || new Date(), // Si no hay fecha, usar hoy
        });
        
        const transId = result.id || result.record?.id || 'N/A';
        const dateDisplay = targetDate ? targetDate.toISOString().split('T')[0] : 'hoy';
        const details = `💰 ${Number(amount).toFixed(2)} DOP | 📂 ${category.name} | 🏷️ ${labelName} | 📅 ${dateDisplay}`;
        
        if (!silent) {
            let responseMsg = `✅ *Transacción agregada!*\n\n` +
                `💰 Monto: ${Number(amount).toFixed(2)} DOP\n` +
                `📂 Categoría: ${category.name}\n` +
                `🏷️ Label: ${labelName}\n` +
                `🏦 Cuenta: ${account.name}\n` +
                `📅 Fecha: ${dateDisplay}`;
            if (note) {
                responseMsg += `\n📝 Nota: ${note}`;
            }
            responseMsg += `\n🆔 ID: ${transId}`;
            await this.bot.sendMessage(chatId, responseMsg, { parse_mode: 'Markdown' });
        }
        
        return { 
            success: true, 
            details, 
            id: transId,
            category: category.name,
            label: labelName,
            account: account.name,
            amount: amount,
            date: dateDisplay,
            note: note
        };
    }


    // ============================================================
    // LISTAR TRANSACCIONES - CORREGIDO
    // ============================================================

    async handleList(msg) {
        const chatId = msg.chat.id;
        try {
            const transactions = await this.wallet.getRecentTransactions(10);
            const accounts = await this.wallet.getAccounts();
            const categories = await this.wallet.getCategories();

            if (!transactions || transactions.length === 0) {
                await this.bot.sendMessage(chatId, '📭 No hay transacciones recientes.');
                return;
            }

            let message = '📊 *Últimas 10 transacciones:*\n\n';
            
            transactions.slice(0, 10).forEach(t => {
                const amount = t.amount?.value || 0;
                const sign = amount >= 0 ? '+' : '-';
                const absAmount = Math.abs(amount);
                
                const account = accounts.find(a => a.id === t.accountId);
                const category = categories.find(c => c.id === t.categoryId);
                
                const date = t.recordDate ? new Date(t.recordDate).toLocaleDateString('es-DO') : '';
                
                message += `${sign} *${Number(absAmount).toFixed(2)}* DOP `;
                if (category) message += `📂 ${category.name} `;
                if (account) message += `🏦 ${account.name}`;
                if (date) message += `\n   📅 ${date}`;
                if (t.note) message += `\n   📝 ${t.note.substring(0, 50)}`;
                message += '\n\n';
            });

            await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Error en handleList:', error);
            await this.bot.sendMessage(chatId, `❌ Error al listar transacciones: ${error.message}`);
        }
    }

    // ============================================================
    // RESUMEN MENSUAL - CORREGIDO
    // ============================================================

    async handleSummary(msg) {
        const chatId = msg.chat.id;
        try {
            const now = new Date();
            const summary = await this.wallet.getMonthlySummary(now.getFullYear(), now.getMonth() + 1);
            
            const monthName = now.toLocaleString('es', { month: 'long' });
            const message = `
📈 *Resumen de ${monthName} ${now.getFullYear()}*

💰 *Ingresos:* ${Number(summary.income).toFixed(2)} DOP
💸 *Gastos:* ${Number(summary.expense).toFixed(2)} DOP
📊 *Balance:* ${Number(summary.balance).toFixed(2)} DOP

📝 Transacciones: ${summary.transactions?.length || 0}
`;

            await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Error en handleSummary:', error);
            await this.bot.sendMessage(chatId, `❌ Error al obtener resumen: ${error.message}`);
        }
    }

    // ============================================================
    // LISTAR CUENTAS - CORREGIDO
    // ============================================================

    async handleAccounts(msg) {
        const chatId = msg.chat.id;
        try {
            // 🔧 Obtener SOLO cuentas activas (archived: false)
            const accounts = await this.wallet.getAccounts({ refresh: true, archived: false });
            
            if (!accounts || accounts.length === 0) {
                await this.bot.sendMessage(chatId, '📭 No hay cuentas activas.');
                return;
            }

            let message = `🏦 *Cuentas activas:*\n\n`;
            accounts.forEach(a => {
                const balance = a.balance?.currentBalance || a.balance?.rawCurrentBalance || 0;
                const currency = a.currencyCode || 'DOP';
                message += `• ${a.name}: ${Number(balance).toFixed(2)} ${currency}\n`;
                if (a.accountType) message += `  Tipo: ${a.accountType}\n`;
            });
            
            message += `\n📊 Total: ${accounts.length} cuentas activas`;

            await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        } catch (error) {
            logger.error('Error en handleAccounts:', error);
            await this.bot.sendMessage(chatId, `❌ Error al listar cuentas: ${error.message}`);
        }
    }

    // ============================================================
    // LISTAR CATEGORÍAS
    // ============================================================

    async handleCategories(msg) {
        const chatId = msg.chat.id;
        try {
            // Forzar recarga de categorías (sin cache)
            const categories = await this.wallet.getCategories({ refresh: true });
            
            if (!categories || categories.length === 0) {
                await this.bot.sendMessage(chatId, '📭 No hay categorías disponibles.');
                return;
            }

            const incomeCats = categories.filter(c => c.group?.id === 'incomes' || c.group?.id === 'income');
            const expenseCats = categories.filter(c => c.group?.id !== 'incomes' && c.group?.id !== 'income');

            // Crear mensaje con todas las categorías
            let message = `📂 *Categorías disponibles:*\n`;
            message += `📊 Total: ${categories.length} (${incomeCats.length} ingresos, ${expenseCats.length} gastos)\n\n`;
            
            message += '🟢 *Ingresos:*\n';
            incomeCats.forEach(c => {
                message += `• ${c.name}${c.group?.name ? ` (${c.group.name})` : ''}\n`;
            });

            message += '\n🔴 *Gastos:*\n';
            expenseCats.forEach(c => {
                message += `• ${c.name}${c.group?.name ? ` (${c.group.name})` : ''}\n`;
            });

            // Si el mensaje es muy largo, dividirlo
            if (message.length > 4000) {
                const parts = this.splitMessage(message);
                for (let i = 0; i < parts.length; i++) {
                    const prefix = parts.length > 1 ? `📄 *Parte ${i + 1}/${parts.length}*\n\n` : '';
                    await this.bot.sendMessage(chatId, prefix + parts[i], { parse_mode: 'Markdown' });
                }
            } else {
                await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            }

        } catch (error) {
            logger.error('Error en handleCategories:', error);
            await this.bot.sendMessage(chatId, `❌ Error al listar categorías: ${error.message}`);
        }
    }

    splitMessage(text, maxLength = 4000) {
        const parts = [];
        let currentPart = '';
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (currentPart.length + line.length + 1 > maxLength) {
                parts.push(currentPart);
                currentPart = '';
            }
            currentPart += line + '\n';
        }
        if (currentPart) parts.push(currentPart);
        return parts;
    }

    splitMessage(text, maxLength = 4000) {
        const parts = [];
        let currentPart = '';
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (currentPart.length + line.length + 1 > maxLength) {
                parts.push(currentPart);
                currentPart = '';
            }
            currentPart += line + '\n';
        }
        if (currentPart) parts.push(currentPart);
        return parts;
    }
    // ============================================================
    // CANCELAR OPERACIÓN
    // ============================================================

    async handleCancel(msg) {
        const chatId = msg.chat.id;
        if (this.userStates.has(chatId)) {
            this.userStates.delete(chatId);
            await this.bot.sendMessage(chatId, '✅ Operación cancelada.');
        } else {
            await this.bot.sendMessage(chatId, 'ℹ️ No hay ninguna operación en curso.');
        }
    }

    // ============================================================
    // MANEJO DE CONVERSACIONES
    // ============================================================

    async handleConversation(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!this.userStates.has(chatId)) return;

        const state = this.userStates.get(chatId);
        const step = state.step;

        try {
            if (step === 'add_amount') {
                const amount = parseFloat(text.replace(',', '.'));
                if (isNaN(amount) || amount <= 0) {
                    await this.bot.sendMessage(chatId, '❌ Ingresa un número válido (ej: 1500.50)');
                    return;
                }
                
                state.amount = amount;
                state.step = 'add_category';
                this.userStates.set(chatId, state);
                
                const categories = await this.wallet.getCategories();
                const expenseCats = categories.filter(c => c.group?.id !== 'incomes');
                const suggestions = expenseCats.slice(0, 5).map(c => c.name).join(', ');
                
                await this.bot.sendMessage(chatId, 
                    `✅ Monto: ${Number(amount).toFixed(2)} DOP\n\n` +
                    `2️⃣ ¿Categoría?\n` +
                    `Ejemplos: ${suggestions}\n` +
                    `O escribe el nombre de una categoría.`
                );
                return;
            }

            if (step === 'add_category') {
                // Obtener todas las categorías (sin cache)
                const categories = await this.wallet.getCategories({ refresh: true });

                // Buscar coincidencia
                let category = null;
                const searchTerm = text.toLowerCase();

                // 1. Coincidencia exacta
                category = categories.find(c => 
                    c.name && c.name.toLowerCase() === searchTerm
                );

                // 2. Coincidencia parcial en nombre
                if (!category) {
                    category = categories.find(c => 
                        c.name && c.name.toLowerCase().includes(searchTerm)
                    );
                }
                // 3. Coincidencia en grupo padre
                if (!category) {
                    category = categories.find(c => 
                        c.group?.name && 
                        c.group.name.toLowerCase().includes(searchTerm)
                    );
                }
                // 4. Mostrar sugerencias si no encuentra
                if (!category) {
                    const suggestions = categories
                        .filter(c => 
                            c.group?.id !== 'incomes' && 
                            c.group?.id !== 'income' &&
                            c.name && 
                            c.name.toLowerCase().includes(searchTerm.substring(0, 3))
                        )
                        .slice(0, 5)
                        .map(c => c.name)
                        .join(', ');
                    
                    await this.bot.sendMessage(chatId, 
                        `❌ No encontré "${text}".\n` +
                        `${suggestions ? `💡 ¿Quisiste decir: ${suggestions}?` : ''}\n` +
                        `Usa /categories para ver todas las categorías.`
                    );
                    return;
                }

                state.category = category;
                state.step = 'add_account';
                this.userStates.set(chatId, state);

                const accounts = await this.wallet.getAccounts();
                const activeAccounts = accounts.filter(a => !a.archived);
                const suggestions = activeAccounts.slice(0, 5).map(a => a.name).join(', ');

                await this.bot.sendMessage(chatId, 
                    `✅ Categoría: ${category.name}\n\n` +
                    `3️⃣ ¿Cuenta?\n` +
                    `Ejemplos: ${suggestions}\n` +
                    `O escribe el nombre de una cuenta.`
                );
                return;
            }

            if (step === 'add_account') {
                const accounts = await this.wallet.getAccounts();
                const searchTerm = text.toLowerCase();
                
                // Buscar coincidencia exacta primero
                let account = accounts.find(a => 
                    a.name && a.name.toLowerCase() === searchTerm
                );
                
                // Si no, buscar coincidencia parcial
                if (!account) {
                    account = accounts.find(a => 
                        a.name && a.name.toLowerCase().includes(searchTerm)
                    );
                }

                if (!account) {
                    const activeAccounts = accounts.filter(a => !a.archived);
                    if (activeAccounts.length > 0) {
                        account = activeAccounts[0];
                        await this.bot.sendMessage(chatId, 
                            `ℹ️ No encontré "${text}". Usando cuenta "${account.name}" por defecto.`
                        );
                    } else {
                        await this.bot.sendMessage(chatId, 
                            '❌ No hay cuentas disponibles.'
                        );
                        return;
                    }
                }
                const result = await this.wallet.createTransactionSimple({
                    amount: state.amount,
                    categoryId: state.category.id,
                    accountId: account.id,
                    note: `Agregado desde Telegram: ${state.category.name}`,
                    counterParty: 'Telegram Bot'
                });

                const transId = result.id || result.record?.id || 'N/A';
                await this.bot.sendMessage(chatId, 
                    `✅ *Transacción agregada!*\n\n` +
                    `💰 Monto: ${Number(state.amount).toFixed(2)} DOP\n` +
                    `📂 Categoría: ${state.category.name}\n` +
                    `🏦 Cuenta: ${account.name}\n` +
                    `🆔 ID: ${transId}`,
                    { parse_mode: 'Markdown' }
                );

                this.userStates.delete(chatId);
            }
        } catch (error) {
            logger.error('Error en conversación:', error);
            await this.bot.sendMessage(chatId, 
                `❌ Error: ${error.message}\n` +
                `Usa /cancel para reiniciar.`
            );
        }
    }

    async handleAllAccounts(msg) {
        const chatId = msg.chat.id;
        try {
            // 🔧 CORREGIDO: Omitir archived para obtener TODAS las cuentas
            const accounts = await this.wallet.getAccounts({ refresh: true });
            
            if (!accounts || accounts.length === 0) {
                await this.bot.sendMessage(chatId, '📭 No hay cuentas.');
                return;
            }

            // Separar activas y archivadas
            const active = accounts.filter(a => !a.archived);
            const archived = accounts.filter(a => a.archived);

            let message = `📊 *TODAS las cuentas:*\n\n`;
            message += `📊 Total: ${accounts.length} (${active.length} activas, ${archived.length} archivadas)\n\n`;
            
            if (active.length > 0) {
                message += '🟢 *Activas:*\n';
                active.forEach(a => {
                    const balance = a.balance?.currentBalance || a.balance?.rawCurrentBalance || 0;
                    const currency = a.currencyCode || 'DOP';
                    message += `• ${a.name}: ${Number(balance).toFixed(2)} ${currency}\n`;
                });
            }
            
            if (archived.length > 0) {
                message += '\n🔒 *Archivadas:*\n';
                archived.forEach(a => {
                    const balance = a.balance?.currentBalance || a.balance?.rawCurrentBalance || 0;
                    const currency = a.currencyCode || 'DOP';
                    message += `• ${a.name}: ${Number(balance).toFixed(2)} ${currency}\n`;
                });
            }

            // Si el mensaje es muy largo, dividirlo
            if (message.length > 4000) {
                const parts = this.splitMessage(message);
                for (let i = 0; i < parts.length; i++) {
                    const prefix = parts.length > 1 ? `📄 *Parte ${i + 1}/${parts.length}*\n\n` : '';
                    await this.bot.sendMessage(chatId, prefix + parts[i], { parse_mode: 'Markdown' });
                }
            } else {
                await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            }
            
        } catch (error) {
            logger.error('Error en handleAllAccounts:', error);
            await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }
    
    async handleAutocomplete(msg, match) {
        const chatId = msg.chat.id;
        const searchText = match && match[1] ? match[1].trim() : '';
        
        if (!searchText) {
            await this.bot.sendMessage(chatId, 
                '🔍 *Autocompletado de categorías y cuentas*\n\n' +
                'Escribe: `/autocomplete [texto]`\n' +
                'Ejemplo: `/autocomplete motor`\n\n' +
                'También puedes usar # y @ directamente en /add:\n' +
                '`/add 500 #Motor @Cash`',
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        try {
            const [categories, accounts] = await Promise.all([
                this.wallet.getCategories({ refresh: true }),
                this.wallet.getAccounts({ refresh: true })
            ]);
            
            const expenseCats = categories.filter(c => 
                c.group?.id !== 'incomes' && 
                c.group?.id !== 'income' &&
                c.name.toLowerCase().includes(searchText.toLowerCase())
            ).slice(0, 10);
            
            const activeAccounts = accounts
                .filter(a => !a.archived && a.name.toLowerCase().includes(searchText.toLowerCase()))
                .slice(0, 10);
            
            if (expenseCats.length === 0 && activeAccounts.length === 0) {
                await this.bot.sendMessage(chatId, `🔍 No encontré nada con "${searchText}"`);
                return;
            }
            
            let message = `🔍 *Resultados para "${searchText}":*\n\n`;
            
            if (expenseCats.length > 0) {
                message += '📂 *Categorías:*\n';
                expenseCats.forEach(c => {
                    message += `• #${c.name}\n`;
                });
            }
            
            if (activeAccounts.length > 0) {
                message += '\n🏦 *Cuentas:*\n';
                activeAccounts.forEach(a => {
                    message += `• @${a.name}\n`;
                });
            }
            
            message += '\n💡 Copia el nombre con # o @ y úsalo en:\n`/add 500 #Categoría @Cuenta`';
            
            await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            
        } catch (error) {
            logger.error('Error en autocomplete:', error);
            await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }
}

module.exports = WalletBot;