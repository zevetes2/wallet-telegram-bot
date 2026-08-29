// find-api.js
const axios = require('axios');
require('dotenv').config();

const TOKEN = process.env.WALLET_TOKEN;

async function findApiUrl() {
    console.log('🔍 Buscando URL de API correcta...\n');
    console.log(`Token: ${TOKEN.substring(0, 20)}... (${TOKEN.length} chars)\n`);

    // Combinaciones de dominios y rutas
    const domains = [
        'rest.budgetbakers.com',
        'api.budgetbakers.com',
        'budgetbakers.com'
    ];

    const paths = [
        '/wallet/api/v1/accounts',
        '/api/v1/accounts',
        '/wallet/v1/accounts',
        '/v1/accounts',
        '/wallet/accounts',
        '/accounts',
        '/wallet/api/accounts',
        '/api/accounts'
    ];

    for (const domain of domains) {
        for (const path of paths) {
            const url = `https://${domain}${path}`;
            try {
                const response = await axios.get(url, {
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });
                console.log(`✅ FUNCIONA: ${url}`);
                console.log(`   Status: ${response.status}`);
                console.log(`   Keys: ${Object.keys(response.data).join(', ')}`);
                console.log(`   Sample: ${JSON.stringify(response.data).substring(0, 150)}...`);
                return url; // Primera que funciona
            } catch (error) {
                if (error.response) {
                    // Solo mostrar 404 pero no todos
                    if (error.response.status !== 404) {
                        console.log(`⚠️  ${url} → ${error.response.status}`);
                    }
                }
            }
        }
    }

    console.log('\n❌ Ninguna URL funcionó.');
    console.log('\nPosibles problemas:');
    console.log('1. El token es inválido o expiró');
    console.log('2. La API de Wallet está caída');
    console.log('3. El token no tiene permisos para acceder a /accounts');
}

findApiUrl();