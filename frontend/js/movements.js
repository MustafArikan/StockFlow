const API_URL = `${CONFIG.API_BASE_URL}/stock/movements`;
const token = localStorage.getItem('token');

if (!token) window.location.href = 'login.html';

const MAX_ISLEM_ADEDI = 100000;

function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// GLOBAL DEĞİŞKENLER
let stokHareketleri = [];
let tumUrunler = [];
let tumLokasyonlar = [];

const tabloGovdesi = document.getElementById("hareketTablosuGövdesi");
const aramaKutusu = document.getElementById("aramaKutusu");

// Sayfalama, Arama ve Sıralama Durumları
let currentPage = 1;
const pageSize = 10;
let aktifFiltre = 'TUMU';
let aktifArama = '';
let siralamaSutunu = 'tarih';
let siralamaYonu = 'desc';

// ==========================================
// 1. ARAMA, FİLTRELEME VE KUSURSUZ SIRALAMA
// ==========================================
function veriyiGuncelle() {
    // 1. Buton Filtresi
    let islenmisVeri = stokHareketleri;
    if (aktifFiltre !== 'TUMU') {
        const fTipi = aktifFiltre === 'GIRIS' ? 'IN' : 'OUT';
        islenmisVeri = islenmisVeri.filter(h => (h.movementType || h.islemTipi) === fTipi || (h.movementType || h.islemTipi) === aktifFiltre);
    }

    // 2. Arama Çubuğu
    if (aktifArama.trim() !== '') {
        islenmisVeri = islenmisVeri.filter(h =>
            ((h.urunAdı || h.urunAdi || h.productName || "").toLowerCase().includes(aktifArama)) ||
            ((h.urunKodu || "").toLowerCase().includes(aktifArama)) ||
            ((h.personel || "").toLowerCase().includes(aktifArama))
        );
    }

    // 3. Sıralama Motoru (Tarih, Sayı ve Türkçe A-Z)
    islenmisVeri.sort((a, b) => {
        let valA = a[siralamaSutunu];
        let valB = b[siralamaSutunu];

        if (siralamaSutunu === "urunAdi") {
            valA = a.urunAdi || a.urunAdı || a.productName || '';
            valB = b.urunAdi || b.urunAdı || b.productName || '';
        } else if (siralamaSutunu === "islemTipi") {
            valA = (a.islemTipi || a.movementType) === 'IN' || (a.islemTipi || a.movementType) === 'GIRIS' ? 'GIRIS' : 'CIKIS';
            valB = (b.islemTipi || b.movementType) === 'IN' || (b.islemTipi || b.movementType) === 'GIRIS' ? 'GIRIS' : 'CIKIS';
        } else {
            valA = valA != null ? valA : '';
            valB = valB != null ? valB : '';
        }

        if (siralamaSutunu === 'tarih') {
            const tarihA = new Date(valA).getTime() || 0;
            const tarihB = new Date(valB).getTime() || 0;
            return siralamaYonu === 'asc' ? tarihA - tarihB : tarihB - tarihA;
        }

        if (siralamaSutunu === 'quantity') {
            return siralamaYonu === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }

        valA = valA.toString();
        valB = valB.toString();
        return siralamaYonu === 'asc' ? valA.localeCompare(valB, 'tr') : valB.localeCompare(valA, 'tr');
    });

    // 4. Sayfalama Kesimi
    const toplamSayfa = Math.ceil(islenmisVeri.length / pageSize) || 1;
    if (currentPage > toplamSayfa) currentPage = toplamSayfa;

    const baslangic = (currentPage - 1) * pageSize;
    const bitis = baslangic + pageSize;
    const sayfadakiVeriler = islenmisVeri.slice(baslangic, bitis);

    tabloyuCiz(sayfadakiVeriler);
    sayfalamayiCiz(toplamSayfa, currentPage);
}

function sirala(sutun) {
    if (siralamaSutunu === sutun) {
        siralamaYonu = siralamaYonu === 'asc' ? 'desc' : 'asc';
    } else {
        siralamaSutunu = sutun;
        siralamaYonu = 'asc';
    }

    const sutunlar = { tarih: 'tarihBaslik', urunKodu: 'thUrunKodu', urunAdi: 'thUrunAdi', islemTipi: 'thIslemTipi', quantity: 'thAdet', personel: 'thPersonel' };
    const metinler = { tarih: 'Tarih', urunKodu: 'Ürün Kodu', urunAdi: 'Ürün Adı', islemTipi: 'İşlem Tipi', quantity: 'Adet', personel: 'Personel' };

    Object.keys(sutunlar).forEach(key => {
        const el = document.getElementById(sutunlar[key]);
        if (el) {
            el.innerText = siralamaSutunu === key ? (siralamaYonu === 'asc' ? `${metinler[key]} ↑` : `${metinler[key]} ↓`) : `${metinler[key]} ↕`;
        }
    });

    veriyiGuncelle();
}

// ==========================================
// 2. API'DEN TÜM VERİYİ ÇEKME
// ==========================================
async function hareketleriYukle() {
    try {
        const adres = `${API_URL}?pageNumber=1&pageSize=10000`;
        const cevap = await fetch(adres, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (cevap.status === 401) { localStorage.removeItem('token'); window.location.href = 'login.html'; return; }
        if (!cevap.ok) throw new Error("Stok hareketleri yüklenemedi");

        const sonuc = await cevap.json();
        stokHareketleri = sonuc.items || sonuc || [];

        veriyiGuncelle();
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Bağlantı Hatası: ${hata.message}</td></tr>`;
        const paginationContainer = document.getElementById("paginationContainer");
        if (paginationContainer) paginationContainer.innerHTML = "";
    }
}

// ==========================================
// 3. TABLO ÇİZİMİ VE SAYFALAMA 
// ==========================================
function parseJwt(t) {
    try {
        return JSON.parse(decodeURIComponent(atob(t.split('.')[1]).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    } catch (e) { return null; }
}
const currentPayload = parseJwt(token);
const isAdmin = currentPayload && currentPayload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] === "admin";

function tabloyuCiz(veriListesi) {
    tabloGovdesi.innerHTML = "";
    if (veriListesi.length === 0) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    let satirlar = [];
    veriListesi.forEach(hareket => {
        let nType = hareket.movementType || hareket.islemTipi;
        let isGiris = nType === "IN" || nType === "GIRIS";

        let tipEtiketi = isGiris
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1 rounded-pill">STOK GİRİŞİ</span>`
            : nType === "TRANSFER"
                ? `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1 rounded-pill">STOK TRANSFERİ</span>`
                : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1 rounded-pill">STOK ÇIKIŞI</span>`;

        let adetRengi = isGiris ? "text-success" : nType === "TRANSFER" ? "text-primary" : "text-danger";
        let adetIsareti = isGiris ? "+" : nType === "TRANSFER" ? "⇄" : "-";

        const formatliTarih = new Date(hareket.tarih).toLocaleString('tr-TR');
        let pName = hareket.urunAdı || hareket.urunAdi || hareket.productName || '';

        let kisiIsmi = hareket.personelName || hareket.personel;
        let finalKisiHtml = "";
        
        if (isAdmin && hareket.userId) {
            finalKisiHtml = `<a href="#" onclick="kullaniciProfiliGoster(${hareket.userId}); return false;" class="text-decoration-none fw-bold text-primary"><i class="bi bi-person-badge me-1"></i>${escapeHtml(kisiIsmi)}</a><br><small class="text-muted">${escapeHtml(hareket.personel)}</small>`;
        } else {
            finalKisiHtml = `<span>${escapeHtml(kisiIsmi)}</span><br><small class="text-muted">${escapeHtml(hareket.personel)}</small>`;
        }

        const satir = `
            <tr>
                <td class="text-muted small align-middle fw-bold text-center">${escapeHtml(formatliTarih)}</td>
                <td class="fw-bold align-middle d-none d-md-table-cell text-center">${escapeHtml(hareket.urunKodu)}</td>
                <td class="align-middle">${escapeHtml(pName)}</td>
                <td class="text-center align-middle">${tipEtiketi}</td>
                <td class="fw-bold text-center align-middle ${adetRengi}">${adetIsareti}${hareket.quantity}</td>
                <td class="text-center align-middle">${finalKisiHtml}</td>
            </tr>`;
        satirlar.push(satir);
    });
    tabloGovdesi.innerHTML = satirlar.join("");
}

function sayfalamayiCiz(totalPages, curPage) {
    const container = document.getElementById("paginationContainer");
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<nav><ul class="pagination pagination-sm mb-0 shadow-sm justify-content-center mt-4">`;
    html += `<li class="page-item ${curPage === 1 ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${curPage - 1}">« Önceki</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= curPage - 1 && i <= curPage + 1)) {
                html += `<li class="page-item ${i === curPage ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link text-muted">...</span></li>`;
            }
        } else {
            html += `<li class="page-item ${i === curPage ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
        }
    }

    html += `<li class="page-item ${curPage === totalPages ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${curPage + 1}">Sonraki »</a></li>`;
    html += `</ul></nav>`;
    container.innerHTML = html;
}

// ==========================================
// 4. EVENT LISTENER (DİNLEYİCİLER)
// ==========================================
document.getElementById("paginationContainer").addEventListener("click", (e) => {
    e.preventDefault();
    const btn = e.target.closest(".page-action");
    if (btn) {
        const parentLi = btn.closest(".page-item");
        if (parentLi && (parentLi.classList.contains("disabled") || parentLi.classList.contains("active"))) return;

        const page = parseInt(btn.getAttribute("data-page"));
        if (!isNaN(page)) {
            currentPage = page;
            veriyiGuncelle();
        }
    }
});

function aktifButonuGuncelle(aktifId) {
    const butonlar = ["btnTumu", "btnGirisler", "btnCikislar"];
    butonlar.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (id === aktifId) {
            btn.className = (id === "btnTumu") ? "btn btn-secondary btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani" :
                (id === "btnGirisler") ? "btn btn-success btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani" :
                    "btn btn-danger btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani";
        } else {
            btn.className = (id === "btnTumu") ? "btn btn-outline-secondary btn-sm rounded-pill px-3 shadow-sm filtre-elemani" :
                (id === "btnGirisler") ? "btn btn-outline-success btn-sm rounded-pill px-3 shadow-sm filtre-elemani" :
                    "btn btn-outline-danger btn-sm rounded-pill px-3 shadow-sm filtre-elemani";
        }
    });
}

document.getElementById("btnTumu").addEventListener("click", () => { aktifFiltre = 'TUMU'; aktifButonuGuncelle("btnTumu"); currentPage = 1; veriyiGuncelle(); });
document.getElementById("btnGirisler").addEventListener("click", () => { aktifFiltre = 'GIRIS'; aktifButonuGuncelle("btnGirisler"); currentPage = 1; veriyiGuncelle(); });
document.getElementById("btnCikislar").addEventListener("click", () => { aktifFiltre = 'CIKIS'; aktifButonuGuncelle("btnCikislar"); currentPage = 1; veriyiGuncelle(); });

document.getElementById("aramaKutusu").addEventListener("keyup", (event) => {
    aktifArama = event.target.value.toLowerCase();
    currentPage = 1;
    veriyiGuncelle();
});

// Başlıklara Tıklama Olayları
if (document.getElementById("tarihBaslik")) document.getElementById("tarihBaslik").addEventListener("click", () => sirala("tarih"));
if (document.getElementById("thUrunKodu")) document.getElementById("thUrunKodu").addEventListener("click", () => sirala("urunKodu"));
if (document.getElementById("thUrunAdi")) document.getElementById("thUrunAdi").addEventListener("click", () => sirala("urunAdi"));
if (document.getElementById("thIslemTipi")) document.getElementById("thIslemTipi").addEventListener("click", () => sirala("islemTipi"));
if (document.getElementById("thAdet")) document.getElementById("thAdet").addEventListener("click", () => sirala("quantity"));
if (document.getElementById("thPersonel")) document.getElementById("thPersonel").addEventListener("click", () => sirala("personel"));

// ==========================================
// 5. DROPDOWNS VE YENİ KAYIT FORMU 
// ==========================================
async function dropdownUrunleriYukle() {
    const urunSelect = document.getElementById("urunSecimi");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/products?pageSize=1000`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Ürünler alınamadı.");

        const data = await cevap.json();
        tumUrunler = data.items || data;

        urunSelect.innerHTML = '<option value="" selected disabled>Lütfen bir ürün seçiniz...</option>';
        tumUrunler.forEach(urun => {
            const option = document.createElement("option");
            option.value = urun.barcode;
            option.textContent = `[${urun.barcode}] ${urun.name}`;
            urunSelect.appendChild(option);
        });
    } catch (hata) {
        urunSelect.innerHTML = '<option value="" selected disabled>Ürünler yüklenemedi!</option>';
    }
}

async function dropdownLokasyonlariYukle() {
    const sourceSelect = document.getElementById("sourceLocationId");
    const targetSelect = document.getElementById("targetLocationId");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations?pageSize=1000`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Lokasyonlar alınamadı.");

        const data = await cevap.json();
        tumLokasyonlar = data.items || data;

        sourceSelect.innerHTML = '<option value="" selected disabled>Kaynak raf seçiniz...</option>';
        targetSelect.innerHTML = '<option value="" selected disabled>Hedef raf seçiniz...</option>';

        tumLokasyonlar.forEach(lok => {
            const optSource = document.createElement("option"); optSource.value = lok.id; optSource.textContent = lok.code;
            const optTarget = document.createElement("option"); optTarget.value = lok.id; optTarget.textContent = lok.code;
            sourceSelect.appendChild(optSource);
            targetSelect.appendChild(optTarget);
        });
    } catch (hata) {
        console.error("Lokasyon yükleme hatası:", hata);
    }
}

function formuDenetle() {
    const tip = document.getElementById("islemTipi").value;
    const urun = document.getElementById("urunSecimi").value;
    const adet = document.getElementById("islemAdedi").value;
    const sourceLoc = document.getElementById("sourceLocationId").value;
    const targetLoc = document.getElementById("targetLocationId").value;
    const kaydetButonu = document.getElementById("btnKaydet");

    let gecerli = (tip !== "" && urun !== "" && adet && parseInt(adet) > 0 && parseInt(adet) <= MAX_ISLEM_ADEDI);

    if (gecerli) {
        if (tip === "GIRIS" && targetLoc === "") gecerli = false;
        else if (tip === "CIKIS" && sourceLoc === "") gecerli = false;
        else if (tip === "TRANSFER" && (sourceLoc === "" || targetLoc === "" || sourceLoc === targetLoc)) gecerli = false;
    }
    kaydetButonu.disabled = !gecerli;
}

document.getElementById("islemTipi").addEventListener("change", (e) => {
    const tip = e.target.value;
    const sourceGroup = document.getElementById("sourceLocationGroup");
    const targetGroup = document.getElementById("targetLocationGroup");

    const tGroup = document.getElementById("tedarikciGroup");
    const cGroup = document.getElementById("cikisNoktasiGroup");

    if (tip === "GIRIS") {
        targetGroup.classList.remove("d-none"); sourceGroup.classList.add("d-none");
        tGroup.classList.remove("d-none"); cGroup.classList.add("d-none");
        document.getElementById("sourceLocationId").value = "";
    } else if (tip === "CIKIS") {
        sourceGroup.classList.remove("d-none"); targetGroup.classList.add("d-none");
        cGroup.classList.remove("d-none"); tGroup.classList.add("d-none");
        document.getElementById("targetLocationId").value = "";
    } else if (tip === "TRANSFER") {
        sourceGroup.classList.remove("d-none"); targetGroup.classList.remove("d-none");
        tGroup.classList.add("d-none"); cGroup.classList.add("d-none");
    }
    formuDenetle();
});

document.getElementById("urunSecimi").addEventListener("change", formuDenetle);
document.getElementById("islemAdedi").addEventListener("input", formuDenetle);
document.getElementById("sourceLocationId").addEventListener("change", formuDenetle);
document.getElementById("targetLocationId").addEventListener("change", formuDenetle);

document.getElementById("stokIslemFormu").addEventListener("submit", async (e) => {
    e.preventDefault();

    const tip = document.getElementById("islemTipi").value;
    const barcode = document.getElementById("urunSecimi").value;
    const qty = parseInt(document.getElementById("islemAdedi").value);
    const sourceLocVal = document.getElementById("sourceLocationId").value;
    const targetLocVal = document.getElementById("targetLocationId").value;
    const kaydetButonu = document.getElementById("btnKaydet");

    const bFiyat = parseFloat(document.getElementById("birimFiyat").value) || 0;
    const fNo = document.getElementById("faturaNo").value;
    const tId = document.getElementById("tedarikciSecimi").value;
    const cNoktasi = document.getElementById("cikisNoktasi").value;

    const payload = {
        productBarcode: barcode,
        movementType: tip === "GIRIS" ? "IN" : tip === "CIKIS" ? "OUT" : "TRANSFER",
        quantity: qty,
        sourceLocationId: ((tip === "CIKIS" || tip === "TRANSFER") && sourceLocVal) ? parseInt(sourceLocVal) : null,
        targetLocationId: ((tip === "GIRIS" || tip === "TRANSFER") && targetLocVal) ? parseInt(targetLocVal) : null,
        description: tip === "GIRIS" ? "Stok Girişi" : tip === "CIKIS" ? "Stok Çıkışı" : "Raf Arası Transfer",
        unitPrice: bFiyat,
        documentNumber: fNo ? fNo : null,
        supplierId: (tip === "GIRIS" && tId) ? parseInt(tId) : null,
        destinationId: (tip === "CIKIS" && cNoktasi) ? cNoktasi : null
    };

    try {
        const orjinalMetin = kaydetButonu.innerText;
        kaydetButonu.disabled = true;
        kaydetButonu.innerText = "İşleniyor...";

        const cevap = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (cevap.status === 401) { localStorage.removeItem('token'); window.location.href = 'login.html'; return; }
        if (cevap.status === 409) throw new Error("Stok çakışması hatası! Lütfen tekrar deneyin.");
        if (!cevap.ok) throw new Error(await cevap.text() || "İşlem kaydedilemedi.");

        const modalElement = document.getElementById("stokIslemModal");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("stokIslemFormu").reset();
        document.getElementById("sourceLocationGroup").classList.add("d-none");
        document.getElementById("targetLocationGroup").classList.add("d-none");

        await hareketleriYukle();
        kaydetButonu.innerText = orjinalMetin;
    } catch (hata) {
        alert("Hata: " + hata.message);
        kaydetButonu.disabled = false;
        kaydetButonu.innerText = "Ekle ve Onayla";
    }
});

// ==========================================
// 6. KAMERA BARKOD OKUYUCU MANTIĞI
// ==========================================
const cameraArea = document.getElementById("kameraAlani");
const btnOpenCamera = document.getElementById("btnKameraAc");
const btnCloseCamera = document.getElementById("btnKameraKapat");
const productSelect = document.getElementById("urunSecimi");

if (btnOpenCamera) {
    btnOpenCamera.addEventListener("click", () => {
        cameraArea.classList.remove("d-none");
        startScanner("reader", (scannedText) => {
            let isProductFound = false;
            for (let i = 0; i < productSelect.options.length; i++) {
                if (productSelect.options[i].value === scannedText) {
                    productSelect.selectedIndex = i;
                    isProductFound = true;
                    break;
                }
            }
            if (isProductFound) {
                let audio = new Audio('https://www.soundjay.com/button/beep-07.wav');
                audio.play().catch(() => { });
                formuDenetle();
                closeCamera();
            } else {
                alert(`Taranan barkod (${scannedText}) bulunamadı!`);
            }
        }, () => { });
    });
}

if (btnCloseCamera) btnCloseCamera.addEventListener("click", closeCamera);
function closeCamera() {
    if (cameraArea) cameraArea.classList.add("d-none");
    stopScanner();
}

// BAŞLATICI
async function dropdownTedarikcileriYukle() {
    const tedarikciSelect = document.getElementById("tedarikciSecimi");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/suppliers`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Tedarikçiler alınamadı.");
        const data = await cevap.json();
        tedarikciSelect.innerHTML = '<option value="" selected disabled>Tedarikçi seçiniz (Opsiyonel)</option>';
        data.forEach(t => {
            const option = document.createElement("option");
            option.value = t.id;
            option.textContent = t.name;
            tedarikciSelect.appendChild(option);
        });
    } catch (hata) {
        if(tedarikciSelect) tedarikciSelect.innerHTML = '<option value="" selected disabled>Yüklenemedi!</option>';
    }
}

async function baslat() {
    await dropdownTedarikcileriYukle();
    await dropdownUrunleriYukle();
    await dropdownLokasyonlariYukle();
    await hareketleriYukle();
}
baslat();

async function kullaniciProfiliGoster(userId) {
    try {
        const yanit = await fetch(`${CONFIG.API_BASE_URL}/users/${userId}`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });
        if (!yanit.ok) throw new Error("Kullanıcı bilgileri alınamadı.");
        const user = await yanit.json();
        
        document.getElementById('upmName').textContent = `${user.firstName || ''} ${user.lastName || ''}`;
        document.getElementById('upmEmail').textContent = user.email || '';
        document.getElementById('upmRole').textContent = user.role || 'viewer';
        document.getElementById('upmDate').textContent = new Date(user.createdAt).toLocaleDateString("tr-TR");
        
        const emailStatusSpan = document.getElementById('upmEmailStatus');
        if (user.isEmailConfirmed) {
            emailStatusSpan.innerHTML = '<span class="badge bg-success rounded-pill"><i class="bi bi-check-lg"></i> Onaylı</span>';
        } else {
            emailStatusSpan.innerHTML = '<span class="badge bg-danger rounded-pill">Onaysız</span>';
        }
        
        bootstrap.Modal.getOrCreateInstance(document.getElementById('userProfileModal')).show();
    } catch (hata) {
        alert("Profil yüklenirken bir hata oluştu: " + hata.message);
    }
}

