// ==========================================
// HİBRİT TARAYICI TEST PANELİ SCRİPTİ
// ==========================================

// 1. Kamerayı Başlatma Fonksiyonu
function initScanner() {
    const resultBox = document.getElementById('result-box');
    if (resultBox) resultBox.classList.add('d-none');

    // scanner.js içindeki ortak startScanner fonksiyonu çağrılır
    startScanner('reader', onScanSuccess, onScanError);
}

// 2. Kod Başarıyla Okunduğunda Tetiklenecek Fonksiyon
function onScanSuccess(decodedText, decodedResult) {
    const resultBox = document.getElementById('result-box');
    const resultText = document.getElementById('result-text');
    const resultFormat = document.getElementById('result-format');

    if (resultBox) resultBox.classList.remove('d-none');
    if (resultText) resultText.textContent = decodedText;

    if (resultFormat) {
        const formatName = decodedResult?.result?.format?.formatName || "Belirlenemedi";
        resultFormat.textContent = formatName;
    }
}

// 3. Anlık Tarama Hataları (Sessiz Dinleme - Konsol Kirliliğini Önler)
function onScanError(errorMessage) {
    // Tarama esnasındaki kare yakalama denemesi hataları bilinçli olarak sessize alınmıştır.
}

// 4. Okunan Kodu Panoya Kopyalama
function copyResult() {
    const text = document.getElementById('result-text')?.innerText;
    if (!text || text === '-') return;

    navigator.clipboard.writeText(text).then(() => {
        if (typeof basariToast === 'function') {
            basariToast("Kod panoya kopyalandı!");
        }
    }).catch(err => {
        if (typeof hataGoster === 'function') {
            hataGoster("Kopyalama başarısız: " + err.message);
        }
    });
}

// 5. Olay Dinleyicilerini Bağlama (DOMContentLoaded)
document.addEventListener("DOMContentLoaded", () => {
    const btnStart = document.getElementById("btnStartScanner");
    const btnStop = document.getElementById("btnStopScanner");
    const btnCopy = document.getElementById("btnCopyResult");

    btnStart?.addEventListener("click", initScanner);
    btnStop?.addEventListener("click", async () => {
        if (typeof stopScanner === 'function') {
            await stopScanner();
            if (typeof basariToast === 'function') {
                basariToast("Kamera durduruldu.");
            }
        }
    });
    btnCopy?.addEventListener("click", copyResult);
});

// 6. Sayfadan Ayrılırken Bellek Sızıntısı (Memory Leak) Koruması
window.addEventListener('beforeunload', () => {
    if (typeof stopScanner === 'function') {
        stopScanner();
    }
});