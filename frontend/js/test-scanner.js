// Kamerayı başlatma fonksiyonu
function initScanner() {
    document.getElementById('result-box').classList.add('d-none');
    
    // startScanner fonksiyonunu bizim scanner.js'den çağırıyoruz
    startScanner('reader', onScanSuccess, onScanError);
}

// Kod başarıyla okunduğunda tetiklenecek fonksiyon
function onScanSuccess(decodedText, decodedResult) {
    console.log(`Kod Okundu: ${decodedText}`, decodedResult);
    
    document.getElementById('result-box').classList.remove('d-none');
    document.getElementById('result-text').innerText = decodedText;
    
    if (decodedResult && decodedResult.result && decodedResult.result.format) {
        document.getElementById('result-format').innerText = decodedResult.result.format.formatName;
    } else {
        document.getElementById('result-format').innerText = "Belirlenemedi";
    }
}

function onScanError(errorMessage) {
    // Tarama sırasındaki anlık okuma denemesi hataları (opsiyonel dinleme)
}

// Okunan kodu kopyalama
function copyResult() {
    const text = document.getElementById('result-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Kod panoya kopyalandı!");
    });
}

// Olay dinleyicilerini bağla (Satır içi onclick'leri kaldırdık)
document.addEventListener("DOMContentLoaded", () => {
    const btnStart = document.getElementById("btnStartScanner");
    const btnStop = document.getElementById("btnStopScanner");
    const btnCopy = document.getElementById("btnCopyResult");

    if (btnStart) btnStart.addEventListener("click", initScanner);
    if (btnStop) btnStop.addEventListener("click", stopScanner); // stopScanner scanner.js'de tanımlıdır
    if (btnCopy) btnCopy.addEventListener("click", copyResult);
});


