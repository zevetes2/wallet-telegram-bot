function validateAmount(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0 && num < 100000000;
}

function validateDate(value) {
    const date = new Date(value);
    return !isNaN(date.getTime());
}

function validateNote(value) {
    return value && value.length <= 500;
}

function sanitizeInput(value) {
    return value.trim().replace(/[^a-zA-Z0-9áéíóúñÑ\s]/g, '');
}

function formatCurrency(value, currency = 'DOP') {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(value);
}

module.exports = {
    validateAmount,
    validateDate,
    validateNote,
    sanitizeInput,
    formatCurrency
};