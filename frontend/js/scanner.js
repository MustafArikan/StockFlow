/**
 * StockFlow Hibrit QR ve Barkod Okuyucu Modülü
 */

let html5QrCode = null;
// Bip sesini global olarak bir kez tanımlıyoruz.
const scannerBeepSound = new Audio('audio/beep-07.wav');

// Kamera hatalarını Türkçeye çeviren sözlük
const cameraErrorDictionary = {
    "notallowed": "Kamera erişim izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.",
    "permission denied": "Kamera erişim izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.",
    "notfound": "Sistemde kullanılabilir bir kamera bulunamadı.",
    "devicesnotfound": "Sistemde kullanılabilir bir kamera bulunamadı.",
    "notreadable": "Kamera şu anda başka bir uygulama tarafından kullanılıyor.",
    "overconstrained": "Kamera istenen çözünürlüğü desteklemiyor."
};

/**
 * Gelen ham hatayı sözlükte arar, bulamazsa varsayılan metni döner.
 */
function translateCameraError(err) {
    const errStr = (err?.name || err?.message || (typeof err === 'string' ? err : "")).toLowerCase();

    // Sözlükteki anahtarları dön ve hatanın içinde geçiyor mu diye bak
    for (const [key, trText] of Object.entries(cameraErrorDictionary)) {
        if (errStr.includes(key)) return trText;
    }
    return "Kamera başlatılamadı veya donanım hatası oluştu.";
}

/**
 * KAMERA İZİN KONTROLÜ
 * Arayüz modalı açmadan önce bu fonksiyonu çağırarak kameraya erişim olup olmadığını test eder.
 * @returns {Promise<boolean>} İzin varsa true döner, yoksa hata fırlatır.
 */
async function checkCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

        // Kullanıcı izin verdiyse, kamerayı boşuna açık bırakmamak için akışı hemen durduruyoruz.
        // Amacımız kamerayı kullanmak değil, sadece iznin cepte olduğundan emin olmaktı.
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (err) {
        // Kullanıcı reddetti veya cihazda kamera yok
        console.error("Kamera ön izin kontrolü başarısız:", err);
        // Hatayı çevirmene gönderiyoruz.
        throw new Error(translateCameraError(err));
    }
}

/**
 * Tarayıcıyı programatik olarak başlatır ve asenkron bir Söz (Promise) döndürür.
 * @param {string} elementId - Kameranın yansıtılacağı HTML etiketinin ID'si
 * @param {function} onScanSuccess - Kod başarıyla okunduğunda çalışacak fonksiyon
 * @param {function} onScanFailure - Tarama sırasındaki anlık hatalar için callback
 */
async function startScanner(elementId, onScanSuccess, onScanFailure) {
    if (html5QrCode) {
        await stopScanner().catch(console.error);
    }
    return initializeAndStart(elementId, onScanSuccess, onScanFailure);
}

/**
 * Tarayıcıyı ilklendirir ve kamerayı açar.
 */
function initializeAndStart(elementId, onScanSuccess, onScanFailure) {
    return new Promise((resolve, reject) => {
        try {
            const targetElement = document.getElementById(elementId);
            if (!targetElement) {
                reject(new Error(`Tarayıcı hedef elementi (${elementId}) bulunamadı!`));
                return;
            }

            html5QrCode = new Html5Qrcode(elementId);

            const config = {
                fps: 15,
                qrbox: function (viewfinderWidth, viewfinderHeight) {
                    return {
                        width: Math.floor(viewfinderWidth * 0.95),
                        height: Math.floor(viewfinderHeight * 0.4) < 150 ? 150 : Math.floor(viewfinderHeight * 0.4)
                    };
                }
            };

            // Kütüphane çökmelerini önlemek için tekil objeli config
            const cameraConfig = { facingMode: "environment" };

            const successWrapper = (decodedText, decodedResult) => {
                // Barkod okunduğu an sesi çalıyoruz.
                scannerBeepSound.currentTime = 0;
                scannerBeepSound.play().catch(() => { });

                // Dokunsal Geri Bildirim (Titreşim)
                // Cihaz destekliyorsa 100 milisaniye titretir
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }

                // Sesi çaldıktan sonra orjinal arayüz fonksiyonunu çalıştır ve veriyi yolla.
                if (typeof onScanSuccess === 'function') {
                    onScanSuccess(decodedText, decodedResult);
                }
            };

            html5QrCode.start(
                cameraConfig,
                config,
                successWrapper,
                onScanFailure
            ).then(() => {
                console.log("Kamera başarıyla başlatıldı.");
                resolve();
            }).catch((err) => {
                console.error("Kamera başlatılamadı: ", err);
                try { if (html5QrCode) html5QrCode.clear(); } catch (e) { }
                html5QrCode = null;

                // İngilizce hatayı çevirmene yollayarak reddediyoruz.
                reject(new Error(translateCameraError(err)));
            });
        } catch (e) {
            console.error("Tarayıcı ilklendirme hatası: ", e);
            try { if (html5QrCode) html5QrCode.clear(); } catch (err) { }
            html5QrCode = null;

            // Beklenmedik hataları da çevirmene yolluyoruz.
            reject(new Error(translateCameraError(e)));
        }
    });
}

/**
 * Çalışan tarayıcıyı ve kamerayı güvenle kapatır.
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