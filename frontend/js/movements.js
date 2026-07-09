/**
 * Modül: Stok Hareketleri Yönetimi (Movements)
 * Geliştirici: Ekip Frontend / Sistem Entegrasyon Sorumlusu
 * Açıklama: Bu dosya, C# Web API ile haberleşerek stok hareketlerini çeker, ekler ve günceller.
 * QR Kod (Scanner) modülü ile entegre çalışır.
 */

const API_URL = `${CONFIG.API_BASE_URL}/stock/movements`;
const token = localStorage.getItem('token');

// Güvenlik kontrolü: Token yoksa login'e yönlendir
if (!token) {
    window.location.href = 'login.html';
}

const MAX_ISLEM_ADEDI = 100000;

// XSS koruması için html karakterlerini encode eder
function escapeHtml(text) {
    if (!text) return "";
    return text
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let stokHareketleri = [];
let tumUrunler = [];
let tumLokasyonlar = [];

let aktifFiltre = 'TUMU';
let aktifArama = '';
let tarihArtan = false;

const tabloGovdesi = document.getElementById("hareketTablosuGövdesi");
const aramaKutusu = document.getElementById("aramaKutusu");

let currentPage = 1;
const pageSize = 10;

// API'den hareketleri yükleyen ana fonksiyon
async function hareketleriYukle(page = 1) {
    try {
        const filterType = (aktifFiltre === 'GIRIS') ? 'IN' : (aktifFiltre === 'CIKIS' ? 'OUT' : '');
        const sortParam = tarihArtan ? "asc" : "desc";
        const adres = `${API_URL}?pageNumber=${page}&pageSize=${pageSize}&type=${filterType}&search=${encodeURIComponent(aktifArama)}&sort=${sortParam}`;

        const cevap = await fetch(adres, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) {
            throw new Error("Stok hareketleri yüklenemedi: " + cevap.status);
        }

        const sonuc = await cevap.json();
        stokHareketleri = sonuc.items || [];
        currentPage = sonuc.currentPage || 1;
        
        tabloyuCiz(stokHareketleri);
        sayfalamayiCiz(sonuc.totalPages || 1, currentPage);
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Bağlantı Hatası: ${hata.message}</td></tr>`;
        const paginationContainer = document.getElementById("paginationContainer");
        if(paginationContainer) paginationContainer.innerHTML = "";
        console.error("Hata:", hata);
    }
}

function sayfalamayiCiz(totalPages, currentPage) {
    const container = document.getElementById("paginationContainer");
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = "";
        return;
    }

    let html = `<ul class="pagination pagination-sm mb-0 shadow-sm justify-content-center mt-3">`;

    // Önceki Butonu
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link text-dark" onclick="hareketleriYukle(${currentPage - 1})">«</button>
        </li>
    `;

    // Sayfa Numaraları
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <button class="page-link ${i === currentPage ? 'bg-dark border-dark text-white' : 'text-dark'}" onclick="hareketleriYukle(${i})">${i}</button>
                    </li>
                `;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link text-muted">...</span></li>`;
            }
        } else {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <button class="page-link ${i === currentPage ? 'bg-dark border-dark text-white' : 'text-dark'}" onclick="hareketleriYukle(${i})">${i}</button>
                </li>
            `;
        }
    }

    // Sonraki Butonu
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <button class="page-link text-dark" onclick="hareketleriYukle(${currentPage + 1})">»</button>
        </li>
    `;

    html += `</ul>`;
    container.innerHTML = html;
}

// 2. FİLTRELEME VE SIRALAMA MANTIĞI
function veriyiGuncelle() {
    hareketleriYukle(1);
}

function tabloyuCiz(veriListesi) {
    tabloGovdesi.innerHTML = "";
    if (veriListesi.length === 0) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    let satirlar = [];
    veriListesi.forEach(hareket => {
        let isGiris = hareket.islemTipi === "IN" || hareket.islemTipi === "GIRIS";
        let isTransfer = hareket.islemTipi === "TRANSFER";

        let tipEtiketi = isGiris 
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1 rounded-pill">STOK GİRİŞİ</span>` 
            : isTransfer 
                ? `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1 rounded-pill">STOK TRANSFERİ</span>`
                : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1 rounded-pill">STOK ÇIKIŞI</span>`;

        let adetRengi = isGiris ? "text-success" : isTransfer ? "text-primary" : "text-danger";
        let adetIsareti = isGiris ? "+" : isTransfer ? "⇄" : "-";

        // Tarih formatlama
        const formatliTarih = new Date(hareket.tarih).toLocaleString('tr-TR');

        const satir = `
            <tr>
                <td class="text-muted small text-center border-end align-middle">${escapeHtml(formatliTarih)}</td>
                <td class="fw-bold text-center border-end align-middle">${escapeHtml(hareket.urunKodu)}</td>
                <td class="border-end align-middle">${escapeHtml(hareket.urunAdı)}</td>
                <td class="text-center border-end align-middle">${tipEtiketi}</td>
                <td class="fw-bold text-center border-end align-middle ${adetRengi}">${adetIsareti}${hareket.quantity}</td>
                <td class="text-center align-middle">${escapeHtml(hareket.personel)}</td>
            </tr>`;
        satirlar.push(satir);
    });
    tabloGovdesi.innerHTML = satirlar.join("");
}

// API'den Ürünleri çekip dropdown'a doldurur
async function urunleriYukle() {
    const urunSelect = document.getElementById("urunSecimi");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/products?pageSize=1000`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) throw new Error("Ürünler alınamadı.");

        const data = await cevap.json();
        tumUrunler = data.items || data; // Pagination varsa items kullan, yoksa direkt datayı kullan
        urunSelect.innerHTML = '<option value="" selected disabled>Lütfen bir ürün seçiniz...</option>';
        
        tumUrunler.forEach(urun => {
            const option = document.createElement("option");
            option.value = urun.barcode;
            option.textContent = `[${urun.barcode}] ${urun.name}`;
            urunSelect.appendChild(option);
        });
    } catch (hata) {
        console.error("Ürün yükleme hatası:", hata);
        urunSelect.innerHTML = '<option value="" selected disabled>Ürünler yüklenemedi!</option>';
    }
}

// API'den Lokasyonları çekip dropdown'lara doldurur
async function lokasyonlariYukle() {
    const sourceSelect = document.getElementById("sourceLocationId");
    const targetSelect = document.getElementById("targetLocationId");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations?pageSize=1000`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) throw new Error("Lokasyonlar alınamadı.");

        const data = await cevap.json();
        tumLokasyonlar = data.items || data;
        
        sourceSelect.innerHTML = '<option value="" selected disabled>Kaynak raf seçiniz...</option>';
        targetSelect.innerHTML = '<option value="" selected disabled>Hedef raf seçiniz...</option>';

        tumLokasyonlar.forEach(lok => {
            const optSource = document.createElement("option");
            optSource.value = lok.id;
            optSource.textContent = lok.code;
            sourceSelect.appendChild(optSource);

            const optTarget = document.createElement("option");
            optTarget.value = lok.id;
            optTarget.textContent = lok.code;
            targetSelect.appendChild(optTarget);
        });
    } catch (hata) {
        console.error("Lokasyon yükleme hatası:", hata);
    }
}

// 4. BUTON VE ARAMA DİNLEYİCİLERİ (Kullanıcı hareketlerini yakalar)
document.getElementById("btnTumu").addEventListener("click", () => { aktifFiltre = 'TUMU'; aktifButonuGuncelle("btnTumu"); veriyiGuncelle(); });
document.getElementById("btnGirisler").addEventListener("click", () => { aktifFiltre = 'GIRIS'; aktifButonuGuncelle("btnGirisler"); veriyiGuncelle(); });
document.getElementById("btnCikislar").addEventListener("click", () => { aktifFiltre = 'CIKIS'; aktifButonuGuncelle("btnCikislar"); veriyiGuncelle(); });
aramaKutusu.addEventListener("keyup", (event) => { aktifArama = event.target.value.toLowerCase(); veriyiGuncelle(); });
document.getElementById("tarihBaslik").addEventListener("click", siralaTarih);

function aktifButonuGuncelle(aktifId) {
    const butonlar = ["btnTumu", "btnGirisler", "btnCikislar"];
    butonlar.forEach(id => {
        const btn = document.getElementById(id);
        if (id === aktifId) {
            btn.className = (id === "btnTumu") ? "btn btn-dark btn-sm rounded-pill px-3" : 
                            (id === "btnGirisler") ? "btn btn-success btn-sm rounded-pill px-3 text-white" : 
                            "btn btn-danger btn-sm rounded-pill px-3 text-white";
        } else {
            btn.className = (id === "btnTumu") ? "btn btn-outline-dark btn-sm rounded-pill px-3" : 
                            (id === "btnGirisler") ? "btn btn-outline-success btn-sm rounded-pill px-3" : 
                            "btn btn-outline-danger btn-sm rounded-pill px-3";
        }
    });
}

function siralaTarih() {
    tarihArtan = !tarihArtan;
    document.getElementById("tarihBaslik").innerText = tarihArtan ? "Tarih ↑" : "Tarih ↓";
    veriyiGuncelle();
}

// 5. GÜVENLİK VE FORM KONTROLÜ
function formuDenetle() {
    const tip = document.getElementById("islemTipi").value;
    const urun = document.getElementById("urunSecimi").value;
    const adet = document.getElementById("islemAdedi").value;
    
    const sourceLoc = document.getElementById("sourceLocationId").value;
    const targetLoc = document.getElementById("targetLocationId").value;

    const kaydetButonu = document.getElementById("btnKaydet");

    let gecerli = (tip !== "" && urun !== "" && adet && parseInt(adet) > 0 && parseInt(adet) <= MAX_ISLEM_ADEDI);

    if (gecerli) {
        if (tip === "GIRIS" && targetLoc === "") {
            gecerli = false;
        } else if (tip === "CIKIS" && sourceLoc === "") {
            gecerli = false;
        }
    }

    kaydetButonu.disabled = !gecerli;
}

// Değişiklik olaylarını dinle
document.getElementById("islemTipi").addEventListener("change", (e) => {
    const tip = e.target.value;
    
    const sourceGroup = document.getElementById("sourceLocationGroup");
    const targetGroup = document.getElementById("targetLocationGroup");

    if (tip === "GIRIS") {
        targetGroup.classList.remove("d-none");
        sourceGroup.classList.add("d-none");
        document.getElementById("sourceLocationId").value = "";
    } else if (tip === "CIKIS") {
        sourceGroup.classList.remove("d-none");
        targetGroup.classList.add("d-none");
        document.getElementById("targetLocationId").value = "";
    }

    formuDenetle();
});

document.getElementById("urunSecimi").addEventListener("change", formuDenetle);
document.getElementById("islemAdedi").addEventListener("input", formuDenetle);
document.getElementById("sourceLocationId").addEventListener("change", formuDenetle);
document.getElementById("targetLocationId").addEventListener("change", formuDenetle);

// --- BARCODE SCANNER INTEGRATION ---
const cameraArea = document.getElementById("kameraAlani");
const btnOpenCamera = document.getElementById("btnKameraAc");
const btnCloseCamera = document.getElementById("btnKameraKapat");
const productSelect = document.getElementById("urunSecimi");

btnOpenCamera.addEventListener("click", () => {
    cameraArea.classList.remove("d-none"); // Show camera area
    
    startScanner("reader", (scannedText) => {
        // ON SUCCESSFUL SCAN
        let isProductFound = false;
        
        for (let i = 0; i < productSelect.options.length; i++) {
            if (productSelect.options[i].value === scannedText) {
                productSelect.selectedIndex = i; // Auto-select product
                isProductFound = true;
                break;
            }
        }

        if (isProductFound) {
            // Success beep sound
            let audio = new Audio('https://www.soundjay.com/button/beep-07.wav');
            audio.play().catch(e => {});

            formuDenetle(); // Existing validation function
            closeCamera();  // Hide camera when done
        } else {
            // User-facing error message (Turkish)
            alert(`Taranan barkod (${scannedText}) sistemde kayıtlı hiçbir ürünle eşleşmedi!`);
        }
        
    }, (errorMessage) => {
        // Silent errors during scanning frames
    });
});

btnCloseCamera.addEventListener("click", closeCamera);

function closeCamera() {
    cameraArea.classList.add("d-none"); // Hide camera area
    stopScanner(); // Stop camera hardware
}
// ------------------------------------
// Ekle ve Onayla
document.getElementById("btnKaydet").addEventListener("click", async () => {
    const tip = document.getElementById("islemTipi").value;
    const barcode = document.getElementById("urunSecimi").value;
    const qty = parseInt(document.getElementById("islemAdedi").value);
    
    const sourceLocVal = document.getElementById("sourceLocationId").value;
    const targetLocVal = document.getElementById("targetLocationId").value;

    const payload = {
        productBarcode: barcode,
        movementType: tip, // Backend "IN" veya "OUT" bekliyor olabilir, "GIRIS"->"IN", "CIKIS"->"OUT" olarak map'leyelim:
        quantity: qty,
        sourceLocationId: (tip === "CIKIS" && sourceLocVal) ? parseInt(sourceLocVal) : null,
        targetLocationId: (tip === "GIRIS" && targetLocVal) ? parseInt(targetLocVal) : null,
        description: `${tip === "GIRIS" ? "Stok Girişi" : "Stok Çıkışı"}`
    };

    // Eğer backend IN/OUT bekliyorsa dönüştürelim
    if (payload.movementType === "GIRIS") payload.movementType = "IN";
    if (payload.movementType === "CIKIS") payload.movementType = "OUT";

    try {
        const cevap = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (cevap.status === 409) {
            throw new Error("Stok çakışması hatası (Concurrency Conflict)! Başka bir kullanıcı aynı anda işlem yaptı. Lütfen tekrar deneyin.");
        }

        if (!cevap.ok) {
            const errText = await cevap.text();
            throw new Error(errText || "İşlem kaydedilemedi. Hata kodu: " + cevap.status);
        }

        // Modal kapat ve formu sıfırla
        const modalElement = document.getElementById("stokIslemModal");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("stokIslemFormu").reset();
        document.getElementById("sourceLocationGroup").classList.add("d-none");
        document.getElementById("targetLocationGroup").classList.add("d-none");
        document.getElementById("btnKaydet").disabled = true;

        // Başarılıysa hareketleri yeniden yükle
        await hareketleriYukle();
    } catch (hata) {
        alert("Hata: " + hata.message);
        console.error("Hata:", hata);
    }
});

// Sayfa açıldığında ilk yüklemeleri tetikle
async function baslat() {
    await urunleriYukle();
    await lokasyonlariYukle();
    await hareketleriYukle();
}

baslat();
