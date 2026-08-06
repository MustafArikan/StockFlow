// ==========================================
// HİBRİT TARAYICI TEST PANELİ SCRİPTİ
// ==========================================

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

    if (resultBox) resultBox.classList.remove('d-none');
    if (resultText) resultText.textContent = decodedText;

    if (resultFormat) {
        const formatName = decodedResult?.result?.format?.formatName || "Belirlenemedi";
        resultFormat.textContent = formatName;
    }

    // Barkod okunduğu an kamerayı durdur
    if (typeof stopScanner === 'function') {
        stopScanner(); // Beklemeden durdurma sinyalini gönder
    }

    // İşlem bittiği için Başlat butonunu tekrar aktif et
    const btnStart = document.getElementById("btnStartScanner");
    if (btnStart) btnStart.disabled = false;

    // Yönlendirme yapılır
    setTimeout(async () => {
        // Eğer okunan kod bir URL (QR Kod) ise direkt o URL'ye (ürün kartına) git
        if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
            window.location.href = decodedText;
        } else {
            try {
                // Barkod numarası / kodu bir raf mı diye veritabanından kontrol et
                const rafSonuc = await apiRequest(`/locations?pageSize=10000`, 'GET');
                const raflar = rafSonuc.items || rafSonuc;
                const hedefRaf = raflar.find(r => (r.code || "").toLowerCase() === decodedText.toLowerCase());

                if (hedefRaf) {
                    // Eğer raf ise warehouses sayfasına gönderip rafın içini açtırıyoruz
                    window.location.href = `warehouses.html?viewShelfCode=${encodeURIComponent(decodedText)}`;
                    return;
                }
            } catch (e) {
                console.error("Raf sorgulama hatası:", e);
            }

            // Raf değilse (varsayılan) ürün sayfasına gönder
            window.location.href = `products.html?viewProductBarcode=${encodeURIComponent(decodedText)}`;
        }
    }, 800); // Kullanıcının ekranda yeşil başarılı yazısını görmesi için kısa bir bekleme
}

// 3. Anlık Tarama Hataları (Sessiz Dinleme - Konsol Kirliliğini Önler)
function onScanError(errorMessage) {
    // Tarama esnasındaki kare yakalama denemesi hataları bilinçli olarak sessize alınmıştır.
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
            const btnStart = document.getElementById("btnStartScanner");
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