// security-utils.js
window.escapeHtml = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};
window.escapeHTML = window.escapeHtml;

// TC Kimlik No Doğrulama Algoritması
window.isValidTC = function(tcNo) {
    if (!tcNo) return true; // Opsiyonelse boş geçilebilir. Zorunluysa formdan "required" kontrolü yapılmalı.
    const tc = String(tcNo).trim();
    if (!/^[1-9][0-9]{10}$/.test(tc)) return false;

    const digits = tc.split('').map(Number);
    const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sumEven = digits[1] + digits[3] + digits[5] + digits[7];
    
    const digit10 = ((sumOdd * 7) - sumEven) % 10;
    if (digit10 !== digits[9]) return false;
    
    const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
    const digit11 = sumFirst10 % 10;
    if (digit11 !== digits[10]) return false;
    
    return true;
};

// Telefon Numarası Doğrulama
window.isValidPhone = function(phone) {
    if (!phone) return true; // Boş bırakıldıysa geçerli sayılabilir, formda zorunluysa ayrı kontrol edilir
    const cleanPhone = String(phone).replace(/[\s\-\(\)]/g, '');
    return /^(05|5)[0-9]{9}$/.test(cleanPhone);
};
