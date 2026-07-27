// API adresi ve yetkilendirme token bilgisini ayarlar
const API_URL = `${CONFIG.API_BASE_URL}/stock/movements`;
const token = localStorage.getItem('token');

if (!token) window.location.href = 'login.html';

const MAX_ISLEM_ADEDI = 100000;

// XSS koruması
function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const urlParams = new URLSearchParams(window.location.search);
const urlFilter = urlParams.get('filter');

let stokHareketleri = [];
let tumUrunler = [];
let tumLokasyonlar = [];

const tabloGovdesi = document.getElementById("hareketTablosuGövdesi");
const aramaKutusu = document.getElementById("aramaKutusu");

let currentPage = 1;
let pageSize = 10;
let aktifFiltre = urlFilter ? urlFilter : 'TUMU';
let aktifArama = '';
let siralamaSutunu = 'tarih';
let siralamaYonu = 'desc';

function veriyiGuncelle() {
    let islenmisVeri = stokHareketleri || [];

    if (aktifFiltre !== 'TUMU') {
        if (aktifFiltre === 'GIRIS') {
            islenmisVeri = islenmisVeri.filter(h => {
                let type = h.movementType || h.islemTipi || h.type;
                return type === 'IN' || type === 'GIRIS';
            });
        } else if (aktifFiltre === 'CIKIS') {
            islenmisVeri = islenmisVeri.filter(h => {
                let type = h.movementType || h.islemTipi || h.type;
                return type === 'OUT' || type === 'CIKIS';
            });
        } else if (aktifFiltre === 'TRANSFER') {
            islenmisVeri = islenmisVeri.filter(h => {
                let type = h.movementType || h.islemTipi || h.type;
                return type === 'TRANSFER';
            });
        }
    }

    if (aktifArama.trim() !== '') {
        islenmisVeri = islenmisVeri.filter(h => {
            let uAdi = h.urunAdi || h.urunAdı || h.productName || h.name || "";
            let uKodu = h.urunKodu || h.productCode || h.barcode || "";
            let personel = h.personelName || h.personel || h.userName || h.fullName || h.userEmail || "";
            return uAdi.toLowerCase().includes(aktifArama) ||
                uKodu.toLowerCase().includes(aktifArama) ||
                personel.toLowerCase().includes(aktifArama);
        });
    }

    // KESİN ÇÖZÜM: TÜRKÇE ALFABETİK SIRALAMA MOTORU
    islenmisVeri.sort((a, b) => {
        let valA = '';
        let valB = '';

        if (siralamaSutunu === "urunAdi") {
            valA = a.urunAdi || a.urunAdı || a.productName || a.name || '';
            valB = b.urunAdi || b.urunAdı || b.productName || b.name || '';
        } else if (siralamaSutunu === "urunKodu") {
            valA = a.urunKodu || a.productCode || a.barcode || '';
            valB = b.urunKodu || b.productCode || b.barcode || '';
        } else if (siralamaSutunu === "islemTipi") {
            let typeA = a.movementType || a.islemTipi || a.type || '';
            let typeB = b.movementType || b.islemTipi || b.type || '';
            valA = (typeA === 'IN' || typeA === 'GIRIS') ? 'Stok Girişi' : (typeA === 'TRANSFER' ? 'Stok Transferi' : 'Stok Çıkışı');
            valB = (typeB === 'IN' || typeB === 'GIRIS') ? 'Stok Girişi' : (typeB === 'TRANSFER' ? 'Stok Transferi' : 'Stok Çıkışı');
        } else if (siralamaSutunu === "personel") {
            valA = a.personelName || a.personel || a.userName || a.fullName || a.userEmail || '';
            valB = b.personelName || b.personel || b.userName || b.fullName || b.userEmail || '';
        } else if (siralamaSutunu === "tarih") {
            valA = a.tarih || a.createdAt || a.date || 0;
            valB = b.tarih || b.createdAt || b.date || 0;
        } else if (siralamaSutunu === "quantity") {
            valA = Number(a.quantity) || 0;
            valB = Number(b.quantity) || 0;
        }

        if (siralamaSutunu === 'tarih') {
            const tarihA = new Date(valA).getTime() || 0;
            const tarihB = new Date(valB).getTime() || 0;
            return siralamaYonu === 'asc' ? tarihA - tarihB : tarihB - tarihA;
        }

        if (siralamaSutunu === 'quantity') {
            return siralamaYonu === 'asc' ? valA - valB : valB - valA;
        }

        // Ç, Ğ, İ, Ö, Ş, Ü harflerini kusursuz sıralayan Intl.Collator API'si
        const trCollator = new Intl.Collator('tr-TR', { numeric: true, sensitivity: 'base' });
        return siralamaYonu === 'asc'
            ? trCollator.compare(valA.toString(), valB.toString())
            : trCollator.compare(valB.toString(), valA.toString());
    });

    const toplamSayfa = Math.ceil(islenmisVeri.length / pageSize) || 1;
    if (currentPage > toplamSayfa) currentPage = toplamSayfa;

    const baslangic = (currentPage - 1) * pageSize;
    const bitis = baslangic + pageSize;
    const sayfadakiVeriler = islenmisVeri.slice(baslangic, bitis);

    tabloyuCiz(sayfadakiVeriler);
    sayfalamayiCiz(islenmisVeri.length, currentPage);
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

async function hareketleriYukle() {
    try {
        const sonuc = await apiRequest('/stock/movements?pageSize=100000', 'GET');
        stokHareketleri = sonuc.items || sonuc.data || sonuc || [];
        veriyiGuncelle();
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Bağlantı Hatası: ${hata.message}</td></tr>`;
        const paginationContainer = document.getElementById("paginationContainer");
        if (paginationContainer) paginationContainer.innerHTML = "";
    }
}

function parseJwt(t) {
    try {
        return JSON.parse(decodeURIComponent(atob(t.split('.')[1]).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    } catch (e) { return null; }
}
const isAdmin = ["admin", "superadmin"].includes(getUserRole());

function tabloyuCiz(veriListesi) {
    tabloGovdesi.innerHTML = "";
    if (!veriListesi || veriListesi.length === 0) {
        tabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    let satirlar = [];
    veriListesi.forEach(hareket => {
        let nType = hareket.movementType || hareket.islemTipi || hareket.type;
        let isGiris = nType === "IN" || nType === "GIRIS";

        let tipEtiketi = isGiris
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1 rounded-pill">STOK GİRİŞİ</span>`
            : nType === "TRANSFER"
                ? `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1 rounded-pill">STOK TRANSFERİ</span>`
                : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1 rounded-pill">STOK ÇIKIŞI</span>`;

        let adetRengi = isGiris ? "text-success" : nType === "TRANSFER" ? "text-primary" : "text-danger";
        let adetIsareti = isGiris ? "+" : nType === "TRANSFER" ? "⇄" : "-";

        const formatliTarih = new Date(hareket.tarih || hareket.createdAt || hareket.date || Date.now()).toLocaleString('tr-TR');

        let pCode = hareket.urunKodu || hareket.productCode || hareket.barcode || '-';
        let pName = hareket.urunAdi || hareket.urunAdı || hareket.productName || hareket.name || '-';

        let kisiIsmi = hareket.personelName || hareket.personel || hareket.userName || hareket.fullName || 'Sistem';
        let kisiMail = hareket.userEmail || hareket.email || '';
        let finalKisiHtml = "";

        let uId = hareket.userId || hareket.id;

        // ADMIN OLMAYANLAR DA PROFİLE TIKLAYABİLSİN
        if (uId) {
            finalKisiHtml = `
            <div class="d-flex flex-column align-items-center justify-content-center">
                <a href="#" data-action="view-profile" data-user-id="${uId}" class="text-decoration-none fw-bold text-primary text-truncate" style="max-width: 150px;">
                    <i class="bi bi-person-badge me-1"></i>${escapeHtml(kisiIsmi)}
                </a>
                ${kisiMail ? `<small class="text-muted text-truncate" style="max-width: 150px; font-size: 0.75rem;">${escapeHtml(kisiMail)}</small>` : ''}
            </div>`;
        } else {
            finalKisiHtml = `
            <div class="d-flex flex-column align-items-center justify-content-center">
                <span class="fw-bold text-secondary text-truncate" style="max-width: 150px;">${escapeHtml(kisiIsmi)}</span>
                ${kisiMail ? `<small class="text-muted text-truncate" style="max-width: 150px; font-size: 0.75rem;">${escapeHtml(kisiMail)}</small>` : ''}
            </div>`;
        }

        const satir = `
            <tr>
                <td class="text-muted small align-middle fw-bold text-center">${escapeHtml(formatliTarih)}</td>
                <td class="fw-bold align-middle d-none d-md-table-cell text-center">${escapeHtml(pCode)}</td>
                <td class="align-middle">${escapeHtml(pName)}</td>
                <td class="text-center align-middle">${tipEtiketi}</td>
                <td class="fw-bold text-center align-middle ${adetRengi}">${adetIsareti}${hareket.quantity}</td>
                <td class="text-center align-middle">${finalKisiHtml}</td>
            </tr>`;
        satirlar.push(satir);
    });
    tabloGovdesi.innerHTML = satirlar.join("");
}

function sayfalamayiCiz(totalItems, curPage) {
    buildPagination(
        "paginationContainer",
        totalItems,
        curPage,
        pageSize,
        (newPage) => {
            currentPage = newPage;
            veriyiGuncelle();
        },
        (newSize) => {
            pageSize = newSize;
            currentPage = 1;
            veriyiGuncelle();
        }
    );
}

tabloGovdesi.addEventListener('click', (e) => {
    const profileLink = e.target.closest('[data-action="view-profile"]');
    if (profileLink) {
        e.preventDefault();
        const userId = profileLink.getAttribute('data-user-id');
        if (userId) {
            kullaniciProfiliGoster(userId);
        }
    }
});

function aktifButonuGuncelle(aktifId) {
    const butonlar = ["btnTumu", "btnGirisler", "btnCikislar", "btnTransferler"];
    butonlar.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (id === aktifId) {
            if (id === "btnTumu") btn.className = "btn btn-secondary btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani";
            else if (id === "btnGirisler") btn.className = "btn btn-success btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani";
            else if (id === "btnCikislar") btn.className = "btn btn-danger btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani";
            else if (id === "btnTransferler") btn.className = "btn btn-info btn-sm rounded-pill px-3 shadow-sm text-white filtre-elemani";
        } else {
            if (id === "btnTumu") btn.className = "btn btn-outline-secondary btn-sm rounded-pill px-3 shadow-sm filtre-elemani";
            else if (id === "btnGirisler") btn.className = "btn btn-outline-success btn-sm rounded-pill px-3 shadow-sm filtre-elemani";
            else if (id === "btnCikislar") btn.className = "btn btn-outline-danger btn-sm rounded-pill px-3 shadow-sm filtre-elemani";
            else if (id === "btnTransferler") btn.className = "btn btn-outline-info btn-sm rounded-pill px-3 shadow-sm filtre-elemani";
        }
    });
}

document.getElementById("btnTumu").addEventListener("click", () => {
    aktifFiltre = 'TUMU';
    aktifButonuGuncelle("btnTumu");
    currentPage = 1;
    window.history.pushState({}, document.title, window.location.pathname);
    veriyiGuncelle();
});

document.getElementById("btnGirisler").addEventListener("click", () => {
    aktifFiltre = 'GIRIS';
    aktifButonuGuncelle("btnGirisler");
    currentPage = 1;
    window.history.pushState({}, document.title, `${window.location.pathname}?filter=GIRIS`);
    veriyiGuncelle();
});

document.getElementById("btnCikislar").addEventListener("click", () => {
    aktifFiltre = 'CIKIS';
    aktifButonuGuncelle("btnCikislar");
    currentPage = 1;
    window.history.pushState({}, document.title, `${window.location.pathname}?filter=CIKIS`);
    veriyiGuncelle();
});

const btnTransferler = document.getElementById("btnTransferler");
if (btnTransferler) {
    btnTransferler.addEventListener("click", () => {
        aktifFiltre = 'TRANSFER';
        aktifButonuGuncelle("btnTransferler");
        currentPage = 1;
        window.history.pushState({}, document.title, `${window.location.pathname}?filter=TRANSFER`);
        veriyiGuncelle();
    });
}

if (aramaKutusu) {
    aramaKutusu.addEventListener("keyup", (event) => {
        aktifArama = event.target.value.toLowerCase();
        currentPage = 1;
        veriyiGuncelle();
    });
}

if (document.getElementById("tarihBaslik")) document.getElementById("tarihBaslik").addEventListener("click", () => sirala("tarih"));
if (document.getElementById("thUrunKodu")) document.getElementById("thUrunKodu").addEventListener("click", () => sirala("urunKodu"));
if (document.getElementById("thUrunAdi")) document.getElementById("thUrunAdi").addEventListener("click", () => sirala("urunAdi"));
if (document.getElementById("thIslemTipi")) document.getElementById("thIslemTipi").addEventListener("click", () => sirala("islemTipi"));
if (document.getElementById("thAdet")) document.getElementById("thAdet").addEventListener("click", () => sirala("quantity"));
if (document.getElementById("thPersonel")) document.getElementById("thPersonel").addEventListener("click", () => sirala("personel"));

async function dropdownUrunleriYukle() {
    const urunSelect = document.getElementById("urunSecimi");
    try {
        const data = await apiRequest('/products?pageSize=10000', 'GET');
        tumUrunler = data.items || data;

        if (urunSelect) {
            urunSelect.innerHTML = '<option value="" selected disabled>Lütfen bir ürün seçiniz...</option>';
            tumUrunler.forEach(urun => {
                const option = document.createElement("option");
                option.value = urun.barcode;
                option.textContent = `[${urun.barcode}] ${urun.name}`;
                urunSelect.appendChild(option);
            });
        }
    } catch (hata) {
        if (urunSelect) urunSelect.innerHTML = '<option value="" selected disabled>Ürünler yüklenemedi!</option>';
    }
}

async function dropdownIslemDepolariYukle() {
    const sourceSelect = document.getElementById("sourceWarehouseId");
    const targetSelect = document.getElementById("targetWarehouseId");

    try {
        const data = await apiRequest('/warehouses?pageSize=1000', 'GET');
        const depolar = data.items || data;

        if (sourceSelect) sourceSelect.innerHTML = '<option value="" selected disabled>Önce depo seçiniz...</option>';
        if (targetSelect) targetSelect.innerHTML = '<option value="" selected disabled>Önce depo seçiniz...</option>';

        depolar.forEach(d => {
            if (sourceSelect) sourceSelect.innerHTML += `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
            if (targetSelect) targetSelect.innerHTML += `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
        });
    } catch (hata) {
        console.error("Depo yükleme hatası:", hata);
        if (sourceSelect) sourceSelect.innerHTML = '<option value="" selected disabled>Depolar yüklenemedi!</option>';
        if (targetSelect) targetSelect.innerHTML = '<option value="" selected disabled>Depolar yüklenemedi!</option>';
    }
}

async function loadLocationsForWarehouse(warehouseId, targetDropdownId) {
    const select = document.getElementById(targetDropdownId);
    if (!select) return;

    if (!warehouseId) {
        select.innerHTML = '<option value="">Önce depo seçin...</option>';
        select.disabled = true;
        return;
    }

    select.innerHTML = '<option value="">Yükleniyor...</option>';
    select.disabled = false;

    try {
        const data = await apiRequest(`/locations/by-warehouse/${warehouseId}?pageSize=1000`, 'GET');
        const raflar = data.items || data;

        select.innerHTML = '<option value="" selected disabled>Raf seçiniz...</option>';
        raflar.forEach(r => {
            select.innerHTML += `<option value="${r.id}">${escapeHtml(r.code)}</option>`;
        });
    } catch (hata) {
        select.innerHTML = '<option value="">Hata oluştu!</option>';
    }
}

const sWarehouseDropdown = document.getElementById("sourceWarehouseId");
const tWarehouseDropdown = document.getElementById("targetWarehouseId");
if (sWarehouseDropdown) sWarehouseDropdown.addEventListener("change", function () { loadLocationsForWarehouse(this.value, "sourceLocationId"); });
if (tWarehouseDropdown) tWarehouseDropdown.addEventListener("change", function () { loadLocationsForWarehouse(this.value, "targetLocationId"); });

function formuDenetle() {
    const tip = document.getElementById("islemTipi").value;
    const urun = document.getElementById("urunSecimi").value;
    const adet = document.getElementById("islemAdedi").value;
    const sourceLoc = document.getElementById("sourceLocationId").value;
    const targetLoc = document.getElementById("targetLocationId").value;
    const kaydetButonu = document.getElementById("btnKaydet");

    if (!kaydetButonu) return;

    let gecerli = (tip !== "" && urun !== "" && adet && parseInt(adet) > 0 && parseInt(adet) <= MAX_ISLEM_ADEDI);

    if (gecerli) {
        if (tip === "GIRIS" && targetLoc === "") gecerli = false;
        else if (tip === "CIKIS" && sourceLoc === "") gecerli = false;
        else if (tip === "TRANSFER" && (sourceLoc === "" || targetLoc === "" || sourceLoc === targetLoc)) gecerli = false;
    }
    kaydetButonu.disabled = !gecerli;
}

const islemTipiDropdown = document.getElementById("islemTipi");
if (islemTipiDropdown) {
    islemTipiDropdown.addEventListener("change", (e) => {
        const tip = e.target.value;
        const sourceGroup = document.getElementById("sourceLocationGroup");
        const targetGroup = document.getElementById("targetLocationGroup");

        const tGroup = document.getElementById("tedarikciGroup");
        const cGroup = document.getElementById("cikisNoktasiGroup");

        if (tip === "GIRIS") {
            if (targetGroup) targetGroup.classList.remove("d-none");
            if (sourceGroup) sourceGroup.classList.add("d-none");
            if (tGroup) tGroup.classList.remove("d-none");
            if (cGroup) cGroup.classList.add("d-none");
            const sLoc = document.getElementById("sourceLocationId");
            if (sLoc) sLoc.value = "";
        } else if (tip === "CIKIS") {
            if (sourceGroup) sourceGroup.classList.remove("d-none");
            if (targetGroup) targetGroup.classList.add("d-none");
            if (cGroup) cGroup.classList.remove("d-none");
            if (tGroup) tGroup.classList.add("d-none");
            const tLoc = document.getElementById("targetLocationId");
            if (tLoc) tLoc.value = "";
        } else if (tip === "TRANSFER") {
            if (sourceGroup) sourceGroup.classList.remove("d-none");
            if (targetGroup) targetGroup.classList.remove("d-none");
            if (tGroup) tGroup.classList.add("d-none");
            if (cGroup) cGroup.classList.add("d-none");
        }
        formuDenetle();
    });
}

["urunSecimi", "islemAdedi", "sourceLocationId", "targetLocationId"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", formuDenetle);
});
const islemAdediInput = document.getElementById("islemAdedi");
if (islemAdediInput) islemAdediInput.addEventListener("input", formuDenetle);

// TEST KULLANICISININ KAYIT ETMESİNİ ENGELLEYEN HATA GİDERİLDİ
const stokIslemFormu = document.getElementById("stokIslemFormu");
if (stokIslemFormu) {
    stokIslemFormu.addEventListener("submit", async (e) => {
        e.preventDefault();

        const tip = document.getElementById("islemTipi").value;
        const barcode = document.getElementById("urunSecimi").value;
        const qty = parseInt(document.getElementById("islemAdedi").value);

        const sourceLocElement = document.getElementById("sourceLocationId");
        const targetLocElement = document.getElementById("targetLocationId");
        const sourceLocVal = sourceLocElement ? sourceLocElement.value : null;
        const targetLocVal = targetLocElement ? targetLocElement.value : null;

        const kaydetButonu = document.getElementById("btnKaydet");

        const bFiyatElement = document.getElementById("birimFiyat");
        const fNoElement = document.getElementById("faturaNo");
        const tIdElement = document.getElementById("tedarikciSecimi");
        const cNoktasiElement = document.getElementById("cikisNoktasi");

        const bFiyat = bFiyatElement ? parseFloat(bFiyatElement.value) || 0 : 0;
        const fNo = fNoElement ? fNoElement.value : null;
        const tId = tIdElement ? tIdElement.value : null;
        const cNoktasi = cNoktasiElement ? cNoktasiElement.value : null;

        const payload = {
            productBarcode: barcode,
            movementType: tip === "GIRIS" ? "IN" : tip === "CIKIS" ? "OUT" : "TRANSFER",
            quantity: qty,
            sourceLocationId: ((tip === "CIKIS" || tip === "TRANSFER") && sourceLocVal && !isNaN(parseInt(sourceLocVal))) ? parseInt(sourceLocVal) : null,
            targetLocationId: ((tip === "GIRIS" || tip === "TRANSFER") && targetLocVal && !isNaN(parseInt(targetLocVal))) ? parseInt(targetLocVal) : null,
            description: tip === "GIRIS" ? "Stok Girişi" : tip === "CIKIS" ? "Stok Çıkışı" : "Raf Arası Transfer",
            unitPrice: bFiyat,
            documentNumber: fNo && fNo.trim() !== "" ? fNo : null,
            supplierId: (tip === "GIRIS" && tId && tId !== "" && !isNaN(parseInt(tId))) ? parseInt(tId) : null,
            destinationId: (tip === "CIKIS" && cNoktasi && cNoktasi.trim() !== "") ? cNoktasi : null
        };

        try {
            const orjinalMetin = kaydetButonu.innerText;
            kaydetButonu.disabled = true;
            kaydetButonu.innerText = "İşleniyor...";

            await apiRequest('/stock/movements', 'POST', payload);

            const modalElement = document.getElementById("stokIslemModal");
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();

            document.getElementById("stokIslemFormu").reset();

            const sourceGroup = document.getElementById("sourceLocationGroup");
            const targetGroup = document.getElementById("targetLocationGroup");
            if (sourceGroup) sourceGroup.classList.add("d-none");
            if (targetGroup) targetGroup.classList.add("d-none");

            await hareketleriYukle();
            basariToast("Stok hareketi kaydedildi");
            kaydetButonu.innerText = orjinalMetin;
        } catch (hata) {
            hataGoster("Hata: " + hata.message);
            kaydetButonu.disabled = false;
            kaydetButonu.innerText = "Ekle ve Onayla";
        }
    });
}

const modalTrigger = document.querySelector('[data-bs-target="#stokIslemModal"]');
if (modalTrigger) {
    modalTrigger.addEventListener("click", () => {
        const form = document.getElementById("stokIslemFormu");
        if (form) form.reset();

        const sourceGroup = document.getElementById("sourceLocationGroup");
        const targetGroup = document.getElementById("targetLocationGroup");
        if (sourceGroup) sourceGroup.classList.add("d-none");
        if (targetGroup) targetGroup.classList.add("d-none");

        const btn = document.getElementById("btnKaydet");
        if (btn) btn.disabled = true;

        dropdownIslemDepolariYukle();
        dropdownUrunleriYukle();
    });
}

const cameraArea = document.getElementById("kameraAlani");
const btnOpenCamera = document.getElementById("btnKameraAc");
const btnCloseCamera = document.getElementById("btnKameraKapat");
const productSelect = document.getElementById("urunSecimi");

if (btnOpenCamera) {
    btnOpenCamera.addEventListener("click", async () => {
        // 1. ÇİFTE TIKLAMA KORUMASI: Buton zaten işlem yapıyorsa durdur
        if (btnOpenCamera.disabled) return;

        const originalText = btnOpenCamera.innerHTML;
        btnOpenCamera.disabled = true; // Butonu kilitle
        btnOpenCamera.innerHTML = `<span class="spinner-border spinner-border-sm"></span> İzin Bekleniyor...`;

        try {
            // 2. KUTUYU AÇMADAN ÖNCE KAMERA İZNİNİ KONTROL ET
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            
            // İzin başarılı oldu! Arka planda açılan test kamerasını kapatıyoruz
            stream.getTracks().forEach(track => track.stop());

            // 3. İZİN VARSA SİYAH KUTUYU GÖSTER VE KÜTÜPHANEYİ BAŞLAT
            cameraArea.classList.remove("d-none");
            btnOpenCamera.innerHTML = originalText; 

            startScanner("reader", (scannedText) => {
                let isProductFound = false;
                if (productSelect) {
                    for (let i = 0; i < productSelect.options.length; i++) {
                        if (productSelect.options[i].value === scannedText) {
                            productSelect.selectedIndex = i;
                            isProductFound = true;
                            break;
                        }
                    }
                }
                if (isProductFound) {
                    let audio = new Audio('https://www.soundjay.com/button/beep-07.wav');
                    audio.play().catch(() => { });
                    formuDenetle();
                    closeCamera();
                } else {
                    uyariGoster(`Taranan barkod (${scannedText}) bulunamadı!`);
                }
            }, () => { });

        } catch (error) {
            // 4. İZİN REDDEDİLDİ VEYA KAMERA YOKSA (SİYAH KUTU ASLA AÇILMAZ)
            uyariGoster("Kameraya erişilemedi! Lütfen tarayıcı adres çubuğundaki kilit/kamera simgesinden izin verin.");
            btnOpenCamera.disabled = false; // Buton kilidini aç
            btnOpenCamera.innerHTML = originalText;
        }
    });
}

if (btnCloseCamera) btnCloseCamera.addEventListener("click", closeCamera);

function closeCamera() {
    if (cameraArea) cameraArea.classList.add("d-none");
    if (btnOpenCamera) {
        btnOpenCamera.disabled = false;
        btnOpenCamera.innerHTML = `<i class="bi bi-upc-scan me-1"></i> Barkod Okut`;
    }
    stopScanner();
}

async function dropdownTedarikcileriYukle() {
    const tedarikciSelect = document.getElementById("tedarikciSecimi");
    try {
        const data = await apiRequest('/suppliers', 'GET');
        if (tedarikciSelect) {
            tedarikciSelect.innerHTML = '<option value="" selected disabled>Tedarikçi seçiniz (Opsiyonel)</option>';
            data.forEach(t => {
                const option = document.createElement("option");
                option.value = t.id;
                option.textContent = t.name;
                tedarikciSelect.appendChild(option);
            });
        }
    } catch (hata) {
        if (tedarikciSelect) tedarikciSelect.innerHTML = '<option value="" selected disabled>Yüklenemedi!</option>';
    }
}

async function baslat() {
    await dropdownTedarikcileriYukle();
    await hareketleriYukle();

    if (aktifFiltre === 'GIRIS') {
        aktifButonuGuncelle("btnGirisler");
    } else if (aktifFiltre === 'CIKIS') {
        aktifButonuGuncelle("btnCikislar");
    } else if (aktifFiltre === 'TRANSFER') {
        aktifButonuGuncelle("btnTransferler");
    } else {
        aktifButonuGuncelle("btnTumu");
    }
}
baslat();

async function kullaniciProfiliGoster(userId) {
    try {
        const user = await apiRequest(`/users/${userId}`, 'GET');

        document.getElementById('upmName').textContent = `${user.firstName || ''} ${user.lastName || ''}`;
        document.getElementById('upmEmail').textContent = (user.email || '') + (user.phoneNumber ? ' | 📞 ' + user.phoneNumber : '');
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
        hataGoster("Profil yüklenirken bir hata oluştu: " + hata.message);
    }
}

// Yetkiye göre buton/kolon gizleme
document.addEventListener("DOMContentLoaded", () => {
    if (typeof hasPermission === "function" && !hasPermission("Movement.Add")) {
        const btnYeniIslem = document.getElementById("btnYeniIslem");
        if (btnYeniIslem) btnYeniIslem.classList.add('d-none');
    }
});