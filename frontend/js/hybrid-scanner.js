
// Okunan barkodun ürün detayını açar.
// Masaüstü kabuğunda AYRI PENCEREDE açılır; tarayıcı ekranı yerinde kalır ve
// arka arkaya okutmaya devam edilebilir. Kabuk yoksa (bağımsız sayfa) eski
// davranışa düşer ve Ürünler sayfasına gidilir.
function urunDetayiniAc(barkod) {
    if (window.ModalWindow &&
        ModalWindow.open('urunDetayModal', { barcode: barkod }, 'Ürün Detayı', { page: 'products.html' })) {
        return;
    }
    window.location.href = `products.html?viewProductBarcode=${encodeURIComponent(barkod)}`;
}
// ==========================================
// HİBRİT TARAYICI PANELİ SCRİPTİ
// ==========================================

// Magic Number'ları engellemek için sabit değerler
const SCAN_REDIRECT_DELAY_MS = 800;

// 1. Kamerayı Başlatma Fonksiyonu
async function initScanner() {
    const btnStart = document.getElementById("btnStartScanner");
    const btnStop = document.getElementById("btnStopScanner");
    const resultBox = document.getElementById('result-box');

    // Çoklu tıklamaları engellemek için başlat butonunu kilitleriz
    if (btnStart) btnStart.disabled = true;
    if (resultBox) resultBox.classList.add('d-none');

    try {
        // Motoru çalıştırmadan önce ön izinleri denetler
        if (typeof checkCameraPermission === 'function') {
            await checkCameraPermission();
        }

        // Motoru asenkron olarak bekler ve başlatır
        await startScanner('reader', onScanSuccess, onScanError);

        // Kamera başarıyla açıldıysa: Başlat butonunu gizle, Durdur butonunu göster
        if (btnStart) btnStart.classList.add('d-none');
        if (btnStop) btnStop.classList.remove('d-none');

    } catch (error) {
        // Hata durumunda başlat butonunu tekrar aktif ederiz
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
    const btnStop = document.getElementById("btnStopScanner");

    if (resultBox) resultBox.classList.remove('d-none');

    if (resultFormat) {
        const formatName = decodedResult?.result?.format?.formatName || "Belirlenemedi";
        resultFormat.textContent = formatName;
    }

    if (typeof stopScanner === 'function') {
        stopScanner(); // Kamerayı durdur
    }

    // Kamera kapandığı için butonları eski haline getir (Durdur'u gizle, Başlat'ı göster)
    if (btnStop) btnStop.classList.add('d-none');
    if (btnStart) {
        btnStart.classList.remove('d-none');
        btnStart.disabled = true;
        btnStart.innerHTML = `<span class="spinner-border spinner-border-sm"></span> İşleniyor...`;
    }

    // UI Geri Bildirimi: Kullanıcıya "Aranıyor..." göstergesi
    if (resultText) {
        resultText.innerHTML = `<span class="spinner-border spinner-border-sm text-primary" role="status"></span> Aranıyor...`;
        resultText.classList.remove('text-success');
        resultText.classList.add('text-primary');
    }

    // Backend Optimizasyonlu Akıllı Arama
    setTimeout(async () => {
        let okunanMetin = decodedText.trim();

        // URL KONTROLÜ VE GÜVENLİ AYRIŞTIRMA
        if (okunanMetin.startsWith('http://') || okunanMetin.startsWith('https://')) {
            // Kendi domain'imiz mi kontrol eder
            if (okunanMetin.includes(window.location.hostname)) {
                window.location.href = okunanMetin;
                return;
            } else {
                // Harici URL ise tarayıcının donmasını önlemek için son path parçasını barkod olarak almayı dene
                try {
                    const urlObj = new URL(okunanMetin);
                    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
                    if (pathSegments.length > 0) {
                        okunanMetin = pathSegments[pathSegments.length - 1];
                    }
                } catch (err) {
                    // Parçalanamazsa orijinal metinle devam et
                }
            }
        }

        // ARAMA MOTORU (Raf ve Ürün Kontrolü)
        try {
            // ÖNCE GS1 BARKOD RESOLVER API (Faz 3 Entegrasyonu)
            try {
                const formatName = decodedResult?.result?.format?.formatName || '';
                const resolveRes = await apiRequest('/barcodes/resolve', 'POST', {
                    rawCode: okunanMetin,
                    symbologyFormat: formatName
                });
            
                switch (resolveRes.kind) {
                    case 'product':
                        urunDetayiniAc(okunanMetin);
                        return;
                    case 'product_packaging':
                        // Tarayıcı ekranı yerinde kalsın: arka arkaya okutmaya devam edilebilir
                        uygulamaAc(`movements.html?productId=${resolveRes.productId}&inputUnitId=${resolveRes.inputUnitId}&qty=1`, 'Stok Hareketleri');
                        return;
                    case 'product_with_batch':
                        const params = new URLSearchParams({
                            productId: resolveRes.productId,
                            lotNumber: resolveRes.lotNumber || '',
                            expiryDate: resolveRes.expiryDate || '',
                            qty: resolveRes.variableQuantity || ''
                        });
                        uygulamaAc(`movements.html?${params.toString()}`, 'Stok Hareketleri');
                        return;
                    case 'pallet':
                        // DİKKAT: pallets.html projede YOK; buraya gidilirse 404 alınırdı.
                        // Sayfa yazılana kadar kullanıcıya açık bilgi verilir.
                        hataGoster('Palet ekranı henüz hazır değil. Okunan SSCC: ' + resolveRes.sscc);
                        return;
                }
            } catch (resolveHatasi) {
                // 404/400 ise eski akışa (raf/ürün arama) düş - geriye dönük uyumluluk korunur
            }

            let arananKod = okunanMetin;
            let queryParams = "";
            
            // DÜZ ARAMALAR İÇİN ESKİ YAPI DEVAM EDER
            if (typeof window.parseGs1Barcode === 'function') {
                const parsedGs1 = window.parseGs1Barcode(okunanMetin);
                if (parsedGs1.isGs1 && parsedGs1.gtin) {
                    arananKod = parsedGs1.gtin;
                }
            }

            // ÖNCE RAF (LOCATION) OLARAK KONTROL ET
            try {
                await apiRequest(`/locations/by-code/${encodeURIComponent(arananKod)}`, 'GET');
                uygulamaAc(`warehouses.html?viewShelfCode=${encodeURIComponent(arananKod)}`, 'Depolar');
                return;
            } catch (rafHatasi) {}

            // EĞER RAF DEĞİLSE, ÜRÜN (PRODUCT) OLARAK KONTROL ET
            try {
                await apiRequest(`/products/by-barcode/${encodeURIComponent(arananKod)}`, 'GET');
                urunDetayiniAc(arananKod);
                return;
            } catch (urunHatasi) {}

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
            if (btnStart) {
                btnStart.disabled = false;
                btnStart.innerHTML = `Kamerayı Başlat`;
            }
            if (typeof uyariGoster === 'function') {
                uyariGoster(`Sorgulama sırasında bir hata oluştu: ${okunanMetin}`);
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

            // Kamera durduğu için Durdur butonunu gizle, Başlat butonunu tekrar göster ve aktif et
            if (btnStop) btnStop.classList.add('d-none');
            if (btnStart) {
                btnStart.classList.remove('d-none');
                btnStart.disabled = false;
                btnStart.innerHTML = `Kamerayı Başlat`;
            }

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