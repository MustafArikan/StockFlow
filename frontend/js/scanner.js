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

/**
 * StockFlow GS1 Barkod Ayrıştırıcı (Parser)
 * @param {string} code - Taranan ham barkod metni
 */
window.parseGs1Barcode = function (code) {
    let result = {
        gtin: null,
        lotNumber: null,
        expiryDate: null,
        isGs1: false,
        raw: code
    };

    if (!code) return result;

    // Özel sembolojileri ve FNC1 (Grup Ayrıştırıcı) karakterini temizle/normalize et
    code = code.replace(/^\]C1/, ''); // GS1-128 Identifier
    code = code.replace(/\x1d/g, '{GS}'); // ASCII 29 (Group Separator)

    let i = 0;
    let limit = 0; // Sonsuz döngüyü önlemek için

    while (i < code.length && limit++ < 50) {
        // Parantezleri ve GS karakterlerini atla
        if (code[i] === '(' || code[i] === ')') { i++; continue; }
        if (code.substr(i, 4) === '{GS}') { i += 4; continue; }

        let ai = code.substr(i, 2);
        
        if (ai === '01') { // GTIN
            i += 2;
            if (code[i] === ')') i++;
            result.gtin = code.substr(i, 14);
            result.isGs1 = true;
            i += 14;
        }
        else if (ai === '17') { // Expiry Date (YYMMDD)
            i += 2;
            if (code[i] === ')') i++;
            let exp = code.substr(i, 6);
            result.isGs1 = true;
            if (exp.length === 6) {
                let yy = parseInt(exp.substr(0, 2), 10);
                let mm = exp.substr(2, 2);
                let dd = exp.substr(4, 2);
                // Yıl tahmini
                if (yy < 50) yy += 2000; else yy += 1900;
                if (dd === '00') dd = '01'; // 00 ay sonunu ifade edebilir
                result.expiryDate = `${yy}-${mm}-${dd}`;
            }
            i += 6;
        }
        else if (ai === '10') { // Lot Number
            i += 2;
            if (code[i] === ')') i++;
            let endFnc = code.indexOf('{GS}', i);
            let endParen = code.indexOf('(', i);
            let end = code.length;
            if (endFnc !== -1 && endFnc < end) end = endFnc;
            if (endParen !== -1 && endParen < end) end = endParen;
            
            result.lotNumber = code.substring(i, end);
            result.isGs1 = true;
            i = end;
        }
        else if (ai === '21') { // Serial Number (Atlıyoruz)
            i += 2;
            if (code[i] === ')') i++;
            let endFnc = code.indexOf('{GS}', i);
            let endParen = code.indexOf('(', i);
            let end = code.length;
            if (endFnc !== -1 && endFnc < end) end = endFnc;
            if (endParen !== -1 && endParen < end) end = endParen;
            i = end;
        }
        else {
            // Bilinmeyen AI, daha fazla yanlış okuma yapmamak için çık
            break;
        }
    }

    return result;
};