// ==========================================
// HİBRİT TARAYICI PANELİ SCRİPTİ
// ==========================================

// Magic Number'ları engellemek için sabit değerler
const SCAN_REDIRECT_DELAY_MS = 800;

// 1. Kamerayı Başlatma Fonksiyonu
async function initScanner() {
    const btnStart = document.getElementById("btnStartScanner");
    const resultBox = document.getElementById('result-box');

    // Çoklu tıklamaları engellemek için butonu kilitleriz
    if (btnStart) btnStart.disabled = true;
    if (resultBox) resultBox.classList.add('d-none');

    try {
        // Motoru çalıştırmadan önce ön izinleri denetler
        if (typeof checkCameraPermission === 'function') {
            await checkCameraPermission();
        }

        // Motoru asenkron olarak bekler ve başlatır
        await startScanner('reader', onScanSuccess, onScanError);

    } catch (error) {
        // Hata durumunda butonu tekrar aktif eder ve hatayı basar
        if (btnStart) btnStart.disabled = false;

        const hataMetni = error?.message ? error.message : "Kameraya erişilemedi veya izin reddedildi.";
        if (typeof uyariGoster === 'function') {
            uyariGoster(hataMetni);
        } else {
            alert(hataMetni);
        }
    }
}

// 2. Kod Başarıyla Okunduğunda Tetiklenecek Fonksiyon
function onScanSuccess(decodedText, decodedResult) {
    const resultBox = document.getElementById('result-box');
    const resultText = document.getElementById('result-text');
    const resultFormat = document.getElementById('result-format');
    const btnStart = document.getElementById("btnStartScanner");

    if (resultBox) resultBox.classList.remove('d-none');

    if (resultFormat) {
        const formatName = decodedResult?.result?.format?.formatName || "Belirlenemedi";
        resultFormat.textContent = formatName;
    }

    if (typeof stopScanner === 'function') {
        stopScanner(); // Kamerayı durdur
    }

    // UI Geri Bildirimi: Kullanıcıya "Aranıyor..." göstergesi
    if (resultText) {
        resultText.innerHTML = `<span class="spinner-border spinner-border-sm text-primary" role="status"></span> Aranıyor...`;
        resultText.classList.remove('text-success');
        resultText.classList.add('text-primary');
    }
    if (btnStart) {
        btnStart.disabled = true;
        btnStart.innerHTML = `<span class="spinner-border spinner-border-sm"></span> İşleniyor...`;
    }

    // Backend Optimizasyonlu Akıllı Arama
    setTimeout(async () => {
        const okunanMetin = decodedText.trim();

        if (okunanMetin.startsWith('http://') || okunanMetin.startsWith('https://')) {
            window.location.href = okunanMetin;
        } else {
            try {
                // ÖNCE RAF (LOCATION) OLARAK KONTROL ET
                try {
                    await apiRequest(`/locations/by-code/${encodeURIComponent(okunanMetin)}`, 'GET');
                    // Hata fırlatmadıysa raf bulunmuştur!
                    window.location.href = `warehouses.html?viewShelfCode=${encodeURIComponent(okunanMetin)}`;
                    return;
                } catch (rafHatasi) {
                    // 404 döndüyse raf değildir, ürün aramaya geç
                }

                // EĞER RAF DEĞİLSE, ÜRÜN (PRODUCT) OLARAK KONTROL ET
                try {
                    await apiRequest(`/products/by-barcode/${encodeURIComponent(okunanMetin)}`, 'GET');
                    // Hata fırlatmadıysa ürün bulunmuştur!
                    window.location.href = `products.html?viewProductBarcode=${encodeURIComponent(okunanMetin)}`;
                    return;
                } catch (urunHatasi) {
                    // 404 döndüyse ürün de değildir.
                }

                // NE RAF NE DE ÜRÜN BULUNAMADI! (UI HATA DURUMU)
                if (resultText) {
                    resultText.textContent = okunanMetin;
                    resultText.classList.remove('text-primary');
                    resultText.classList.add('text-danger');
                }
                if (btnStart) {
                    btnStart.disabled = false;
                    btnStart.innerHTML = `Kamerayı Başlat`;
                }

                if (typeof uyariGoster === 'function') {
                    uyariGoster(`Sistemde "${okunanMetin}" koduna sahip bir raf veya ürün bulunamadı!`);
                } else {
                    alert(`Bulunamadı: ${okunanMetin}`);
                }

            } catch (e) {
                console.error("Genel sorgulama hatası:", e);
                window.location.href = `products.html?viewProductBarcode=${encodeURIComponent(okunanMetin)}`;
            }
        }
    }, SCAN_REDIRECT_DELAY_MS);
}

// 3. Anlık Tarama Hataları
function onScanError(errorMessage) {
    // Tarama karesi yakalama hataları sessize alınmıştır.
}

// 4. Okunan Kodu Panoya Kopyalama
function copyResult() {
    const text = document.getElementById('result-text')?.innerText;
    if (!text || text === '-') return;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            if (typeof basariToast === 'function') {
                basariToast("Kod panoya kopyalandı!");
            }
        }).catch(err => {
            if (typeof hataGoster === 'function') {
                hataGoster("Kopyalama başarısız: " + err.message);
            }
        });
    } else {
        if (typeof hataGoster === 'function') {
            hataGoster("Tarayıcınız panoya kopyalama işlemini desteklemiyor.");
        }
    }
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

            // Kamera durduğu için Başlat butonunu tekrar tıklanabilir yap
            if (btnStart) btnStart.disabled = false;

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