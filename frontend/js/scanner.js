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
                console.error("Old browser cannot be stopped:", err);
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
        html5QrCode = new Html5Qrcode(elementId);
        
        const config = { 
            fps: 15, // Tarama hızı (kare/saniye)
            qrbox: function(width, height) {
                // Ekran genişliğine göre tarama kutusunu dinamik ayarla
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
            console.log("Camera started successfully.");
        }).catch((err) => {
            console.error("Failed to start camera: ", err);
            // Kullanıcıya uyarı göster
            hataGoster("Failed to access camera. Please check camera permissions." + err.message) 
        });
    } catch (e) {
        hataGoster("Tarayıcı başlatılamadı: " + e.message);

    }
}

/**
 * Çalışan tarayıcıyı ve kamerayı kapatır
 * @returns {Promise}
 */
function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        return html5QrCode.stop()
            .then(() => {
                console.log("Camera and scanner closed.");
                html5QrCode = null;
            })
            .catch((err) => {
                console.error("Error occurred while stopping camera: ", err);
            });
    }
    return Promise.resolve();
}

