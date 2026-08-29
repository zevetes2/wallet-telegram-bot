// ============================================================
// WALLET API CLIENT — VERSIÓN DEFINITIVA
// Basado en la documentación oficial de Wallet API
// Endpoints: /v1/api/accounts, /v1/api/categories, /v1/api/records, /v1/api/budgets
// ============================================================

const axios = require('axios');

class WalletAPI {
    constructor(token) { // 🔧 Sin proxyUrl
        this.token = token;
        this.budgets = [];
        this.budgetMap = {};
        this.accountsCache = null;
        this.categoriesCache = null;
        this.labelsCache = null;
        this.apiBase = 'https://rest.budgetbakers.com/wallet';
    }

    // ============================================================
    // MÉTODO BASE
    // ============================================================

    async request(endpoint, method = 'GET', body = null) {
        if (!this.token) throw new Error('Wallet API Token no configurado');

        const url = `${this.apiBase}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };

        const options = { method, headers, timeout: 30000 };
        if (body) options.data = body;

        try {
            const response = await axios({ ...options, url });
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`API (${error.response.status}): ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`API: ${error.message}`);
        }
    }

    

    async requestDirect(endpoint, method = 'GET', body = null) {
        const url = `${this.apiBase}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };

        const options = { method, headers, timeout: 30000 };
        if (body) options.data = body;

        try {
            const response = await axios({ ...options, url });
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`API (${error.response.status}): ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`API: ${error.message}`);
        }
    }

    // ============================================================
    // CUENTAS (Accounts) — GET /v1/api/accounts CON PAGINACIÓN
    // ============================================================

    async getAccounts(params = {}) {
        // Si tenemos cache y no se pide refresh, devolver cache
        if (this.accountsCache && !params.refresh) {
            console.log(`📦 Devolviendo ${this.accountsCache.length} cuentas desde cache`);
            return this.accountsCache;
        }

        console.log('🔍 Obteniendo cuentas desde la API...');
        
        const allAccounts = [];
        let nextOffset = 0;
        const limit = 200;
        let hasMore = true;
        let pageCount = 0;

        while (hasMore) {
            pageCount++;
            const query = new URLSearchParams();
            query.append('limit', limit);
            query.append('offset', nextOffset);
            
            // Agregar otros filtros
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null && key !== 'refresh') {
                    if (key === 'archived' && typeof value === 'boolean') {
                        query.append(key, value.toString());
                    } else if (key !== 'archived') {
                        query.append(key, value);
                    }
                }
            }

            const queryString = query.toString();
            const endpoint = `/v1/api/accounts${queryString ? '?' + queryString : ''}`;
            
            console.log(`📡 Página ${pageCount}: offset=${nextOffset}, limit=${limit}`);
            
            const data = await this.request(endpoint);
            
            console.log(`📦 Claves: ${Object.keys(data).join(', ')}`);
            console.log(`📦 nextOffset: ${data.nextOffset}`);
            console.log(`📦 limit: ${data.limit}`);
            
            const accounts = data.accounts || data || [];
            
            console.log(`📡 Recibidas ${accounts.length} cuentas en página ${pageCount}`);
            
            if (accounts.length === 0) {
                console.log(`📡 No hay más cuentas, saliendo...`);
                hasMore = false;
            } else {
                allAccounts.push(...accounts);
                console.log(`📡 Acumuladas ${allAccounts.length} cuentas`);
                
                // 🔧 CORREGIDO: Usar nextOffset para saber si hay más páginas
                if (data.nextOffset !== undefined && data.nextOffset > 0) {
                    nextOffset = data.nextOffset;
                    console.log(`📡 Hay más páginas, nextOffset=${nextOffset}`);
                    hasMore = true;
                } else {
                    console.log(`📡 No hay nextOffset, asumiendo última página`);
                    hasMore = false;
                }
            }
        }

        console.log(`✅ Total: ${allAccounts.length} cuentas obtenidas en ${pageCount} páginas`);
        
        console.log('📋 Lista completa de cuentas:');
        allAccounts.forEach(a => {
            console.log(`  - ${a.name} (${a.archived ? 'archivada' : 'activa'})`);
        });

        this.accountsCache = allAccounts;
        return allAccounts;
    }



    async getActiveAccounts() {
        const accounts = await this.getAccounts({ archived: false });
        return accounts;
    }

    // ============================================================
    // CATEGORÍAS (Categories) — GET /v1/api/categories CON PAGINACIÓN
    // ============================================================

    async getCategories(params = {}) {
        // Si tenemos cache y no se pide refresh, devolver cache
        if (this.categoriesCache && !params.refresh) {
            return this.categoriesCache;
        }

        // Obtener TODAS las categorías con paginación
        const allCategories = [];
        let offset = 0;
        const limit = 200; // Máximo permitido
        let hasMore = true;

        while (hasMore) {
            const query = new URLSearchParams();
            query.append('limit', limit);
            query.append('offset', offset);
            
            // Agregar otros filtros
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null && key !== 'refresh') {
                    query.append(key, value);
                }
            }

            const endpoint = `/v1/api/categories${query.toString() ? '?' + query.toString() : ''}`;
            const data = await this.request(endpoint);
            const categories = data.categories || [];
            
            if (categories.length === 0) {
                hasMore = false;
            } else {
                allCategories.push(...categories);
                offset += categories.length;
                // Si recibimos menos del límite, es la última página
                if (categories.length < limit) {
                    hasMore = false;
                }
            }
        }

        this.categoriesCache = allCategories;
        return allCategories;
    }


    async getExpenseCategories() {
        const categories = await this.getCategories();
        return categories.filter(c => c.group?.id !== 'incomes' && c.group?.id !== 'income');
    }

    async getIncomeCategories() {
        const categories = await this.getCategories();
        return categories.filter(c => c.group?.id === 'incomes' || c.group?.id === 'income');
    }

    // ============================================================
    // TRANSACCIONES (Records) — GET /v1/api/records ✅
    // ============================================================

    async getTransactions(params = {}) {
        const query = new URLSearchParams();
        
        const paramMap = {
            'limit': 'limit',
            'offset': 'offset',
            'accountId': 'accountId',
            'categoryId': 'categoryId',
            'labelId': 'labelId',
            'recordType': 'recordType',
            'recordState': 'recordState',
            'isTransfer': 'isTransfer',
            'note': 'note',
            'counterParty': 'counterParty',
            'sortBy': 'sortBy',
            'id': 'id'
        };

        // Filtros de fecha - ahora con soporte para offset
        const dateFilters = ['dateFrom', 'dateTo'];
        const filterPrefixes = {
            'dateFrom': 'gte.',
            'dateTo': 'lt.'
        };

        for (const [key, value] of Object.entries(params)) {
            if (value === undefined || value === null || value === '') continue;
            
            if (dateFilters.includes(key)) {
                const prefix = filterPrefixes[key] || '';
                // Si la fecha no tiene offset, agregar -04:00
                let dateValue = value;
                if (!dateValue.includes('T') && !dateValue.includes('+') && !dateValue.includes('-')) {
                    // Es solo fecha, agregar offset RD
                    dateValue = `${dateValue}T00:00:00-04:00`;
                }
                query.append('recordDate', `${prefix}${dateValue}`);
            } else if (key === 'amountMin') {
                query.append('amount', `gte.${value}`);
            } else if (key === 'amountMax') {
                query.append('amount', `lte.${value}`);
            } else if (paramMap[key]) {
                query.append(paramMap[key], value);
            } else {
                query.append(key, value);
            }
        }

        const queryString = query.toString();
        const endpoint = `/v1/api/records${queryString ? '?' + queryString : ''}`;
        
        const data = await this.request(endpoint);
        return data.records || data || [];
    }

    async getTransaction(transactionId) {
        return this.request(`/records/${transactionId}`);
    }

    // ============================================================
    // CREAR TRANSACCIÓN — POST /v1/api/records ✅
    // ============================================================

    async createTransaction(data) {
        return this.request('/v1/api/records', 'POST', data);
    }

    async createTransactionSimple({ amount, categoryId, accountId, note = '', date = null, counterParty = '', labelName = null }) {
        if (!accountId) {
            const accounts = await this.getActiveAccounts();
            if (accounts.length === 0) {
                throw new Error('No hay cuentas activas disponibles');
            }
            accountId = accounts[0].id;
        }

        // Usar fecha local (República Dominicana UTC-4)
        const now = new Date();
        const targetDate = date ? new Date(date) : now;
        
        // Formatear fecha local correctamente
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const localDateStr = `${year}-${month}-${day}`;

        // 🔧 CORREGIDO: Usar offset de República Dominicana (-04:00)
        const recordDate = `${localDateStr}T00:00:00-04:00`;

        console.log(`📅 Fecha de transacción: ${localDateStr} (hora local RD)`);

        const record = {
            accountId: accountId,
            amount: {
                value: -Math.abs(amount)
            },
            categoryId: categoryId,
            recordDate: recordDate,
        };

        if (note) record.note = note;
        if (counterParty) record.counterParty = counterParty;

        // 🔧 CORREGIDO: Usar labelIds (array de strings) en lugar de labels
        if (labelName) {
            const labelId = await this.getLabelIdByName(labelName);
            if (labelId) {
                record.labelIds = [labelId]; // ✅ Array de IDs
                console.log(`🏷️ Label "${labelName}" asignado (ID: ${labelId})`);
            } else {
                console.log(`⚠️ Label "${labelName}" no encontrado en Wallet`);
            }
        }

        const result = await this.request('/v1/api/records', 'POST', [record]);
        
        const resultItem = result.results?.[0] || result;
        return {
            id: resultItem.id || resultItem.record?.id,
            record: resultItem.record,
            success: resultItem.success !== false,
            error: resultItem.error,
            date: localDateStr,
            label: labelName
        };
    }

    // ============================================================
    // PRESUPUESTOS (Budgets) — GET /v1/api/budgets ✅
    // ============================================================

    async getBudgets(params = {}) {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                query.append(key, value);
            }
        }
        const queryString = query.toString();
        const endpoint = `/v1/api/budgets${queryString ? '?' + queryString : ''}`;
        
        const data = await this.request(endpoint);
        this.budgets = data.budgets || data.items || data || [];
        return this.budgets;
    }

    async loadBudgets(limit = 20) {
        return this.getBudgets({ limit });
    }

    // ============================================================
    // LABELS — GET /v1/api/labels
    // ============================================================

    async getLabels(params = {}) {
        if (this.labelsCache) return this.labelsCache;

        const allLabels = [];
        let nextOffset = 0;
        const limit = 200;
        let hasMore = true;

        while (hasMore) {
            const query = new URLSearchParams();
            query.append('limit', limit);
            query.append('offset', nextOffset);
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null) {
                    query.append(key, value);
                }
            }
            const endpoint = `/v1/api/labels${query.toString() ? '?' + query.toString() : ''}`;
            const data = await this.request(endpoint);
            const labels = data.labels || [];
            if (labels.length === 0) {
                hasMore = false;
            } else {
                allLabels.push(...labels);
                if (data.nextOffset !== undefined && data.nextOffset > 0) {
                    nextOffset = data.nextOffset;
                } else {
                    hasMore = false;
                }
            }
        }

        // Crear mapa nombre → id
        this.labelsCache = {};
        allLabels.forEach(l => {
            this.labelsCache[l.name] = l.id;
        });
        return this.labelsCache;
    }

    async getLabelIdByName(name) {
        const map = await this.getLabels();
        return map[name] || null;
    }

    // ============================================================
    // MÉTODOS UTILITARIOS
    // ============================================================

    async findAccountByName(name) {
        try {
            const accounts = await this.getActiveAccounts();
            return accounts.find(a => 
                a.name && a.name.toLowerCase().includes(name.toLowerCase())
            );
        } catch (e) {
            return null;
        }
    }

    async findCategoryByName(name) {
        try {
            const categories = await this.getCategories();
            return categories.find(c => 
                c.name && c.name.toLowerCase().includes(name.toLowerCase())
            );
        } catch (e) {
            return null;
        }
    }

    async getRecentTransactions(limit = 10) {
        return this.getTransactions({ 
            limit, 
            sortBy: '-recordDate'
        });
    }

    async getMonthlySummary(year, month) {
        // Usar fechas locales con offset
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        // Formatear en local
        const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        
        // Usar offset -04:00 para RD
        const allTransactions = await this.getTransactions({
            recordDate: `gte.${startStr}T00:00:00-04:00`,
            limit: 1000,
            sortBy: '-recordDate'
        });

        const transactionsToEnd = await this.getTransactions({
            recordDate: `lte.${endStr}T23:59:59-04:00`,
            limit: 1000,
            sortBy: '-recordDate'
        });

        const combined = allTransactions.length > transactionsToEnd.length ? allTransactions : transactionsToEnd;

        let income = 0, expense = 0;
        
        combined.forEach(t => {
            const amount = t.amount?.value || 0;
            if (amount > 0) income += amount;
            else expense += Math.abs(amount);
        });

        return { 
            income, 
            expense, 
            balance: income - expense, 
            transactions: combined 
        };
    }

    // ============================================================
    // MÉTODOS PARA PRESUPUESTOS (Mapeo)
    // ============================================================

    setBudgetMapping(localName, budgetId) {
        this.budgetMap[localName] = budgetId;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('wallet_budget_mapping', JSON.stringify(this.budgetMap));
        }
    }

    getBudgetMapping(localName) {
        if (typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem('wallet_budget_mapping');
                if (stored) this.budgetMap = JSON.parse(stored);
            } catch (e) {}
        }
        return this.budgetMap[localName] || null;
    }

    getAllBudgetMappings() {
        if (typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem('wallet_budget_mapping');
                if (stored) this.budgetMap = JSON.parse(stored);
            } catch (e) {}
        }
        return { ...this.budgetMap };
    }

    getPeriodForBudget(budget) {
        const type = budget.type || 'BUDGET_INTERVAL_MONTH';
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        if (type === 'BUDGET_INTERVAL_YEAR') return `${year}`;
        if (type === 'BUDGET_INTERVAL_WEEK') {
            const week = this.getISOWeek(now);
            return `${year}-W${String(week).padStart(2, '0')}`;
        }
        return `${year}-${month}`;
    }

    getISOWeek(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    async syncBudgets(localBudgetData) {
        if (this.budgets.length === 0) await this.loadBudgets();

        const results = { updated: [], skipped: [], errors: [] };
        const updates = [];
        const metaMap = new Map();

        for (const item of (localBudgetData.gastos?.items || [])) {
            const budgetId = this.getBudgetMapping(item.nombre);
            if (!budgetId) {
                results.skipped.push({ name: item.nombre, reason: 'Sin mapeo' });
                continue;
            }

            const budget = this.budgets.find(b => b.id === budgetId);
            if (!budget) {
                results.skipped.push({ name: item.nombre, reason: 'Budget no encontrado' });
                continue;
            }

            const period = this.getPeriodForBudget(budget);
            const newLimit = Math.max(0.01, parseFloat(item.nuevoMonto?.toFixed(2) || 0));

            updates.push({
                id: budgetId,
                limitOverrides: [{ limit: newLimit, period: period }]
            });

            metaMap.set(budgetId, {
                name: item.nombre,
                budgetName: budget.name,
                limit: newLimit,
                period: period
            });
        }

        if (updates.length === 0) return results;

        try {
            const response = await this.request('/budgets', 'PATCH', JSON.stringify(updates));
            const batchResults = response.results || [];

            batchResults.forEach(r => {
                const meta = metaMap.get(r.id) || { name: r.id, budgetName: '?' };
                if (r.success) {
                    results.updated.push({
                        name: meta.name,
                        budgetName: meta.budgetName,
                        limit: meta.limit,
                        period: meta.period
                    });
                } else {
                    results.errors.push({
                        name: meta.name,
                        error: r.error || 'Error desconocido'
                    });
                }
            });
        } catch (err) {
            metaMap.forEach((meta) => {
                results.errors.push({ name: meta.name, error: err.message });
            });
        }

        return results;
    }

    clearCache() {
        this.accountsCache = null;
        this.categoriesCache = null;
    }
}

module.exports = WalletAPI;