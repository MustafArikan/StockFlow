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
            qrbox: function (width, height) {
                const minEdge = Math.min(width, height);
                const qrboxSize = Math.floor(minEdge * 0.6);
                return {
                    width: qrboxSize < 220 ? 220 : qrboxSize,
                    height: qrboxSize < 220 ? 220 : qrboxSize
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
        if (html5QrCode.isScanning) {
            return html5QrCode.stop()
                .then(() => {
                    console.log("Kamera ve tarayıcı kapatıldı.");
                    html5QrCode = null;
                })
                .catch((err) => {
                    console.error("Kamera kapatılırken hata oluştu: ", err);
                    html5QrCode = null;
                });
        } else {
            html5QrCode = null;
        }
    }

    return Promise.resolve();
}