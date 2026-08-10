// frontend/js/stock-utils.js

function parseQuantityInput(value) {
    if (value === null || value === undefined || value === '') return 0;
    // Virgülü noktaya çevir
    let strVal = value.toString().replace(',', '.');
    let parsed = parseFloat(strVal);
    return isNaN(parsed) ? 0 : parsed;
}

function formatQuantity(value, maxDecimals = 3) {
    if (value === null || value === undefined) return '0';
    let parsed = parseFloat(value);
    if (isNaN(parsed)) return '0';
    
    if (Number.isInteger(parsed)) {
        return parsed.toString();
    }
    
    let strVal = parsed.toFixed(maxDecimals);
    strVal = strVal.replace(/0+$/, '');
    strVal = strVal.replace(/\.$/, '');
    
    return strVal;
}