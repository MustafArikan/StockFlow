/**
 * StockFlow Hibrit QR ve Barkod Okuyucu Modülü
 */

let html5QrCode = null;

/**
 * Tarayıcıyı programatik olarak başlatır (Kamerayı direkt açar)
 * @param {string} elementId - Kameranın yansıtılacağı HTML etiketinin ID'si (örn: 'reader')
 * @param {function} onScanSuccess - Kod başarıyla okunduğunda çalışacak fonksiyon
 * @param {function} onScanFailure - Tarama sırasındaki anlık hatalar için callback
 */
function startScanner(elementId, onScanSuccess, onScanFailure) {
    // Eğer halihazırda çalışan bir tarayıcı varsa önce durdur, sonra başlat
    if (html5QrCode) {
        stopScanner()
            .then(() => {
                initializeAndStart(elementId, onScanSuccess, onScanFailure);
            })
            .catch((err) => {
                console.error("Önceki tarayıcı kapatılamadı:", err);
                initializeAndStart(elementId, onScanSuccess, onScanFailure);
            });
    } else {
        initializeAndStart(elementId, onScanSuccess, onScanFailure);
    }
}

/**
 * Tarayıcıyı ilklendirir ve kamerayı açar
 */
function initializeAndStart(elementId, onScanSuccess, onScanFailure) {
    try {
        // Element kontrolü (Sayfada reader ID'li eleman yoksa çökmeyi önle)
        const targetElement = document.getElementById(elementId);
        if (!targetElement) {
            console.error(`Tarayıcı hedef elementi (${elementId}) bulunamadı!`);
            return;
        }

        html5QrCode = new Html5Qrcode(elementId);

        const config = {
            fps: 15, // Tarama hızı (kare/saniye)
            qrbox: function (viewfinderWidth, viewfinderHeight) {
                // Uzun barkodların kenarlardan kesilmemesi için okuma alanını (crop box) alabildiğince geniş (dikdörtgen) yapıyoruz
                const qrWidth = Math.floor(viewfinderWidth * 0.95); // Genişliğin %95'i
                const qrHeight = Math.floor(viewfinderHeight * 0.6); // Yüksekliğin %60'ı
                return {
                    width: qrWidth,
                    height: qrHeight
                };
            },
            aspectRatio: 1.0
        };

        // facingMode: "environment" -> Arka kamerayı tercih et (mobil uyumluluk için)
        html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
        ).then(() => {
            console.log("Kamera başarıyla başlatıldı.");
        }).catch((err) => {
            console.error("Kamera başlatılamadı: ", err);
            if (typeof hataGoster === 'function') {
                hataGoster("Kameraya erişilemedi. Lütfen tarayıcı izinlerini kontrol edin: " + err.message);
            }
        });
    } catch (e) {
        console.error("Tarayıcı ilklendirme hatası: ", e);
        if (typeof hataGoster === 'function') {
            hataGoster("Tarayıcı başlatılamadı: " + e.message);
        }
    }
}

/**
 * Çalışan tarayıcıyı ve kamerayı kapatır
 * @returns {Promise}
 */

function stopScanner() {
    if (html5QrCode) {
        const isCameraActive = html5QrCode.isScanning || (typeof html5QrCode.getState === 'function' && html5QrCode.getState() === 3);

        if (isCameraActive) {
            return html5QrCode.stop()
                .then(() => {
                    try { html5QrCode.clear(); } catch (e) { }
                    console.log("Kamera ve tarayıcı tamamen kapatıldı.");
                    html5QrCode = null;
                })
                .catch((err) => {
                    console.error("Kamera kapatılırken hata oluştu: ", err);
                    try { html5QrCode.clear(); } catch (e) { }
                    html5QrCode = null;
                });
        } else {
            try { html5QrCode.clear(); } catch (e) { }
            html5QrCode = null;
        }
    }
    return Promise.resolve();
}