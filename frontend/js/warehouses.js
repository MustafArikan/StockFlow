const API_URL = `${CONFIG.API_BASE_URL}/warehouses`;
const token = localStorage.getItem('token');

const userRole = typeof getUserRole === "function" ? getUserRole() : "User";

if (!token) {
    window.location.href = 'login.html';
}

let tumDepolar = [];
let seciliRafUrunleri = [];
let aktifDepoId = null;
let aktifRafId = null;

const depoView = createDataView({
    containerId: "depoKartlariContainer",
    paginationContainerId: "depoPaginationContainer",
    mode: 'grid',
    emptyMessage: "Kriterlere uygun depo bulunamadı.",
    searchFields: ['name', 'address'],
    defaultSortKey: 'productCount',
    defaultSortDir: 'desc',
    pageSize: 10,
    renderCard: (depo) => {
        const silİkonu = (typeof hasPermission === "function" && hasPermission("Warehouse.Delete")) 
            ? `<button class="btn btn-sm btn-light text-danger shadow-sm rounded-circle me-1 border btn-depo-sil" title="Depoyu Sil" data-id="${depo.id}" data-name="${escapeHtml(depo.name)}">🗑️</button>`
            : "";
            
        const duzenleİkonu = (typeof hasPermission === "function" && hasPermission("Warehouse.Edit")) 
            ? `<button class="btn btn-sm btn-light text-primary shadow-sm rounded-circle border btn-depo-duzenle" title="Düzenle" data-id="${depo.id}">✏️</button>`
            : "";

        let icon = "🏭"; 
        const depoAdiKucuk = (depo.name || '').toLowerCase();
        if (depoAdiKucuk.includes("merkez") || depoAdiKucuk.includes("lojistik")) icon = "🏢";
        else if (depoAdiKucuk.includes("yedek parça") || depoAdiKucuk.includes("cnc") || depoAdiKucuk.includes("makine")) icon = "⚙️";
        else if (depoAdiKucuk.includes("elektronik") || depoAdiKucuk.includes("donanım") || depoAdiKucuk.includes("bilişim")) icon = "💻";
        else if (depoAdiKucuk.includes("transfer") || depoAdiKucuk.includes("sevk")) icon = "🚚";

        return `
            <div class="col-md-4">
                <div class="card h-100 border border-light-subtle shadow-sm rounded-4 text-center p-4 position-relative depo-karti cursor-pointer" data-id="${depo.id}" data-name="${escapeHtml(depo.name)}">
                    <div class="position-absolute top-0 end-0 m-3 d-flex">
                        ${silİkonu} ${duzenleİkonu}
                    </div>
                    <div class="emoji-icon mb-2 emoji-icon-lg">${icon}</div>
                    <h5 class="fw-bold text-dark mt-2">${escapeHtml(depo.name)}</h5>
                    <p class="text-muted small mb-1">${escapeHtml(depo.address || '')}</p>
                </div>
            </div>`;
    }
});

const rafView = createDataView({
    containerId: "rafTablosuGovdesi",
    paginationContainerId: "rafSayfalamaContainer",
    mode: 'table',
    emptyColspan: 2,
    emptyMessage: "Bu depoda henüz raf bulunmuyor.",
    searchFields: ['code'],
    defaultSortKey: 'code',
    defaultSortDir: 'asc',
    pageSize: 10,
    renderRow: (raf) => {
        return `
            <tr data-rafid="${raf.id}">
                <td>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill btn-print-barcode d-inline-flex align-items-center shadow-sm" 
                            data-barcode="${escapeHtml(raf.code)}" 
                            data-name="Raf: ${escapeHtml(raf.code)}" 
                            data-id="${raf.id}"
                            title="Barkod Çıktısı Al">
                        <i class="bi bi-upc-scan me-2"></i>
                        <span class="fw-bold text-primary">${escapeHtml(raf.code)}</span>
                    </button>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-danger rounded-circle me-2 btn-raf-sil" title="Rafı Sil" data-id="${raf.id}" data-code="${escapeHtml(raf.code)}" >🗑️</button>
                    <button data-id="${raf.id}" data-code="${escapeHtml(raf.code)}" class="btn btn-sm btn-dark rounded-pill px-3 shadow-sm fw-bold btn-raftaki-urunler">Raftaki Ürünleri Görüntüle ➔</button>
                </td>
            </tr>`;
    }
});

const urunView = createDataView({
    containerId: "urunTablosuGovdesi",
    paginationContainerId: null,
    mode: 'table',
    emptyColspan: 6,
    emptyMessage: "Bu rafta henüz ürün bulunamadı.",
    searchFields: ['name', 'productName', 'barcode', 'productCode'],
    defaultSortKey: 'id',
    defaultSortDir: 'desc',
    pageSize: 1000,
    renderRow: (urun) => {
        let id = urun.id || urun.productId;
        let name = urun.name || urun.productName;
        let barcode = urun.barcode || urun.productCode;
        let categoryName = urun.categoryName;
        let stockQuantity = urun.stockQuantity !== undefined ? urun.stockQuantity : urun.quantity;
        let globalStock = urun.globalStockQuantity !== undefined ? urun.globalStockQuantity : stockQuantity;
        let minStockLevel = urun.minStockLevel || 5;

        const isKritik = globalStock <= minStockLevel;
        const miktarRenk = isKritik ? "text-danger" : "text-success";
        
        return `
            <tr>
                <td class="fw-bold">${escapeHtml(name)}</td>
                <td><code class="text-secondary">${escapeHtml(barcode)}</code></td>
                <td><span class="badge bg-light text-secondary border">${escapeHtml(categoryName || "-")}</span></td>
                <td class="text-center fw-bold ${miktarRenk}">${stockQuantity}</td>
                <td class="text-end pe-4">
                    <button data-id="${id}" data-name="${escapeHtml(name)}" class="btn btn-sm btn-outline-dark rounded-pill px-3 fw-bold btn-stok-gecmisi">Stok Hareketlerini Görüntüle</button>
                </td>
            </tr>`;
    }
});


// XSS koruması için HTML karakterlerini encode eder


function kullaniciBilgisiniDoldur() {
    try {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        const email = decodedPayload.email || decodedPayload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || "Kullanıcı";
        const userProfileElem = document.getElementById("userProfile");
        if(userProfileElem) userProfileElem.innerText = email;
    } catch (e) {
        const userProfileElem = document.getElementById("userProfile");
        if(userProfileElem) userProfileElem.innerText = "Yetkili";
    }
}

document.getElementById("btnNavbarLogout")?.addEventListener("click", () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});

// ============================================================================
// 1. KATMAN: DEPO İŞLEMLERİ 
// ============================================================================

async function depolariYukle() {
    try {
        const sonuc = await apiRequest(`/warehouses?pageSize=1000`, 'GET');
        tumDepolar = sonuc.items || sonuc;      
        depoView.setItems(tumDepolar);
        if (typeof hasPermission === "function" && (hasPermission("Warehouse.Add") || hasPermission("Warehouse.Edit"))) {
            yoneticileriYukle();
        }
    } catch (hata) {
        const container = document.getElementById("depoKartlariContainer");
        if(container) container.innerHTML = `<div class="col-12 text-center text-danger py-4">Depolar yüklenemedi. (${hata.message})</div>`;
    }
}



// depolariFiltreleVeCiz kaldırıldı

async function yoneticileriYukle() {
    const select = document.getElementById("depoYoneticiId");
    if(!select) return;
    try {
        const yoneticiler = await apiRequest('/users', 'GET');
        select.innerHTML = '<option value="">Yönetici Seçiniz...</option>';
        yoneticiler.forEach(y => {
                select.innerHTML += `<option value="${y.id}">${escapeHtml(y.email)}</option>`;
        });
    } catch(e) {
        select.innerHTML = '<option value="">Yöneticiler Yüklenemedi (Opsiyonel)</option>';
    }
}

document.getElementById("btnDepoKaydet")?.addEventListener("click", async () => {
    const id = document.getElementById("depoId").value;
    const name = document.getElementById("depoAdi").value;
    const address = document.getElementById("depoAdres").value;
    const managerId = document.getElementById("depoYoneticiId")?.value;
    const btnKaydet = document.getElementById("btnDepoKaydet");

    if (!name) return uyariGoster("Lütfen depo adı girin!");

    const depoVerisi = { name, address, managerId: managerId || null };
    const metod = id ? "PUT" : "POST";
    const adres = id ? `/warehouses/${id}` : '/warehouses';

    try {
        btnKaydet.disabled = true;
        btnKaydet.innerText = "Kaydediliyor...";

        await apiRequest(adres, metod, depoVerisi);

        bootstrap.Modal.getInstance(document.getElementById("depoModal"))?.hide();
        document.getElementById("depoFormu").reset();
        document.getElementById("depoId").value = "";
        
        depolariYukle();
        basariToast(id ? "Depo güncellendi" : "Depo eklendi");
        btnKaydet.disabled = false;
        btnKaydet.innerText = id ? "Güncelle" : "Ekle ve Kaydet";
    } catch (hata) {
        hataGoster("İşlem başarısız: " + hata.message);
        btnKaydet.disabled = false;
    }
});

function depoDuzenle(id) {
    const depo = tumDepolar.find(d => d.id == id);
    if (!depo) return;
    document.getElementById("depoId").value = depo.id;
    document.getElementById("depoAdi").value = depo.name;
    document.getElementById("depoAdres").value = depo.address;
    
    const yoneticiSelect = document.getElementById("depoYoneticiId");
    if(yoneticiSelect && depo.managerId) { yoneticiSelect.value = depo.managerId; }

    document.getElementById("modalBaslik").innerText = "Depo Düzenle";
    document.getElementById("btnDepoKaydet").innerText = "Güncelle";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("depoModal")).show();
}

async function depoSil(id, depoAdi) {
    const onayMsg = `DİKKAT!\n\n"${depoAdi}" isimli depoyu sildiğinizde, bu depoya bağlı:\n- TÜM RAFLAR\n- RAFLARIN İÇİNDEKİ TÜM ÜRÜNLER\nve stok hareketleri kalıcı olarak silinecektir.\n\nBu işlem KESİNLİKLE geri alınamaz. Onaylıyor musunuz?`;
    if (!(await onayla(onayMsg, "Evet, sil"))) return;


    try {
        await apiRequest(`/warehouses/${id}`, 'DELETE');
        
        basariToast("Depo ve içindeki tüm bileşenler veritabanından başarıyla temizlendi.");
        depolariYukle();
    } catch (hata) {
        hataGoster("Depo silinemedi: " + hata.message);
    }
}

document.querySelector('[data-bs-target="#depoModal"]')?.addEventListener("click", () => {
    const formu = document.getElementById("depoFormu");
    if (formu) formu.reset();
    document.getElementById("depoId").value = "";
    document.getElementById("modalBaslik").innerText = "Yeni Depo Ekle";
    document.getElementById("btnDepoKaydet").innerText = "Ekle ve Kaydet";
});

// ============================================================================
// 2. KATMAN: RAFLAR LİSTESİ VE DROPWDOWN (DEPO SEÇİLDİĞİNDE)
// ============================================================================

async function raflariGoruntule(depoId, depoIsmi, skipHistory = false) {
    if (!skipHistory) { history.pushState({ view: 'raf', depoId: depoId, depoName: depoIsmi }, null, ''); }
    aktifDepoId = depoId;
    document.getElementById("depoListesiGorunumu").classList.add("d-none");
    document.getElementById("urunListesiGorunumu").classList.add("d-none");
    document.getElementById("rafListesiGorunumu").classList.remove("d-none");
    
    document.getElementById("seciliDepoAdiRaflaricin").innerText = depoIsmi;
    
    try {
        const sonuc = await apiRequest(`/locations/by-warehouse/${aktifDepoId}?pageSize=10000`, 'GET');
        let raflar = sonuc.items || sonuc || [];
        
        const toplamRaf = document.getElementById("kutuToplamRaf");
        if (toplamRaf) toplamRaf.innerText = (sonuc.totalCount || raflar.length) || 0;

        const rafSelect = document.getElementById("rafAramaSelect");
        if(rafSelect) {
            rafSelect.innerHTML = '<option value="">Tüm Rafları Göster</option>';
            raflar.forEach(r => {
                rafSelect.innerHTML += `<option value="${r.code}">${escapeHtml(r.code)}</option>`;
            });
        }
        
        rafView.setItems(raflar);
    } catch (e) {
        rafView.setItems([]);
    }
    
    // 📊 Kutu İstatistiklerini Güncelle (Toplam Çeşit ve Kritik Stok)
    try {
        const stocks = await apiRequest(`/warehouses/${depoId}/stocks`, 'GET');
            
            // 1. Bu depodaki benzersiz (unique) ürün çeşidi sayısı
            const uniqueProductIds = new Set(stocks.map(s => s.id || s.productId));
            const kutuToplamUrun = document.getElementById("kutuToplamUrunDepo");
            if (kutuToplamUrun) kutuToplamUrun.innerText = uniqueProductIds.size;
            
            // 2. Bu depoda bulunan ürünlerden hangileri global olarak kritik seviyenin altında?
            let criticalCount = 0;
            const productMap = new Map();
            
            stocks.forEach(s => {
                let pid = s.id || s.productId;
                if (!productMap.has(pid)) {
                    let globalQty = s.globalStockQuantity !== undefined ? s.globalStockQuantity : (s.stockQuantity || s.quantity);
                    let minLvl = s.minStockLevel || 5;
                    productMap.set(pid, { globalStock: globalQty, minStock: minLvl });
                }
            });
            
            productMap.forEach(val => {
                if (val.globalStock <= val.minStock) {
                    criticalCount++;
                }
            });
            
            const kutuKritik = document.getElementById("kutuKritikStokDepo");
            if (kutuKritik) kutuKritik.innerText = criticalCount;
    } catch(e) {
        console.error("Depo kutu istatistikleri yüklenirken hata:", e);
    }
}

// raflariSayfaliYukle ve sayfalamayiCizRaflar kaldırıldı

async function rafSil(rafId, rafKodu) {
    const onayMsg = `DİKKAT!\n\n"${rafKodu}" kodlu rafı sildiğinizde, bu rafın içinde bulunan TÜM ÜRÜNLER ve stok kayıtları kalıcı olarak silinecektir.\n\nBu işlem KESİNLİKLE geri alınamaz. Onaylıyor musunuz?`;
    if (!(await onayla(onayMsg, "Evet, sil"))) return;


    try {
        await apiRequest(`/locations/${rafId}`, 'DELETE');
        
        basariToast("Raf ve içindeki ürünler başarıyla temizlendi.");
        rafView.load(1);
    } catch (hata) {
        hataGoster(hata.message);
    }
}

const btnRafKaydetModal = document.getElementById("btnRafKaydetModal");
if (btnRafKaydetModal) {
    btnRafKaydetModal.addEventListener("click", async (e) => {
        const code = document.getElementById("modalRafKodu")?.value || document.getElementById("modalRafKodu")?.value;
        if (!code) return uyariGoster("Raf kodu giriniz!");

        try {
            await apiRequest('/locations', 'POST', { WarehouseId: aktifDepoId, Code: code });

            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("rafEkleModal")) || bootstrap.Modal.getInstance(document.getElementById("rafEkleModal"));
            if (modalInstance) modalInstance.hide();
            
            if (document.getElementById("modalRafKodu")) document.getElementById("modalRafKodu").value = "";
            if (document.getElementById("rafKodu")) document.getElementById("rafKodu").value = "";
            
            rafView.load(1);
        } catch (h) {
            hataGoster("Hata: " + h.message);
        }
    });
}

// ============================================================================
// 3. KATMAN: ÜRÜNLER (RAF SEÇİLDİĞİNDE)
// ============================================================================

async function raftakiUrunleriGoruntule(rafId, rafKodu, skipHistory = false) {
    if (!skipHistory) { history.pushState({ view: 'urun', rafId: rafId, rafName: rafKodu, depoId: aktifDepoId, depoName: document.getElementById('seciliDepoAdiRaflaricin').innerText }, null, ''); }
    aktifRafId = rafId;
    document.getElementById("rafListesiGorunumu").classList.add("d-none");
    document.getElementById("urunListesiGorunumu").classList.remove("d-none");
    document.getElementById("seciliRafKoduUrunlerIcin").innerText = rafKodu;

    try {
        const tumUrunler = await apiRequest(`/warehouses/${aktifDepoId}/stocks`, 'GET');
        
        seciliRafUrunleri = tumUrunler.filter(u => 
            Number(u.locationId) === Number(rafId) || 
            Number(u.LocationId) === Number(rafId)
        );
        
        urunView.setItems(seciliRafUrunleri); 
    } catch (hata) {
        document.getElementById("urunTablosuGovdesi").innerHTML = `<tr><td colspan="5" class="text-center text-danger">Ürünler yüklenemedi! (${hata.message})</td></tr>`;
    }
}

// urunleriFiltreleVeSila kaldırıldı

// ============================================================================
// 4. STOK HAREKET GEÇMİŞİ MODALI
// ============================================================================
let seciliUrunGecmisi = [];

async function stokGecmisiniAc(productId, productName) {
    document.getElementById("gecmisModalBaslik").innerText = `${productName} - Stok Geçmişi`;
    try {
        seciliUrunGecmisi = await apiRequest(`/stock/movements/product/${productId}`, 'GET');
        
        if(document.getElementById("filtreZaman")) document.getElementById("filtreZaman").value = "TUMU";
        if(document.getElementById("siralaGecmis")) document.getElementById("siralaGecmis").value = "YENIDEN_ESKIYE";
        
        gecmisTablosunuGuncelle();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("stokGecmisiModal")).show();
    } catch (hata) {
        hataGoster ("Ürün geçmişi yüklenirken hata oluştu.");
    }
}

function gecmisTablosunuGuncelle() {
    const zamanFiltresi = document.getElementById("filtreZaman")?.value || "TUMU";
    const siralama = document.getElementById("siralaGecmis")?.value || "YENIDEN_ESKIYE";
    const simdi = new Date();

    let filtrelenmis = seciliUrunGecmisi.filter(h => {
        const islemTarihi = new Date(h.date);
        if (zamanFiltresi === "SON_1_HAFTA") return (simdi - islemTarihi) / (1000 * 60 * 60 * 24) <= 7;
        else if (zamanFiltresi === "SON_1_AY") return (simdi - islemTarihi) / (1000 * 60 * 60 * 24) <= 30;
        return true;
    });

    filtrelenmis.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (siralama === "ESKIDEN_YENIYE") return dateA - dateB;
        return dateB - dateA;
    });

    const tbody = document.getElementById("stokGecmisiTabloGovdesi");
    tbody.innerHTML = "";
    if (filtrelenmis.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Bu kriterlere uygun hareket bulunamadı.</td></tr>`;
        return;
    }

    filtrelenmis.forEach(h => {
        const isGiris = h.movementType === "IN";
        const islemTipiTasarim = isGiris 
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1">GİRİŞ</span>`
            : `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1">ÇIKIŞ</span>`;
        const formatliTarih = tarihSaatFormatla(h.date);

        tbody.innerHTML += `
            <tr>
                <td class="ps-4 text-muted small">${formatliTarih}</td>
                <td class="align-middle">${islemTipiTasarim}</td>
                <td class="fw-bold align-middle ${isGiris ? 'text-success' : 'text-danger'}">${isGiris ? '+' : '-'}${h.quantity}</td>
                <td class="align-middle">${escapeHtml(h.personel || "Sistem")}</td>
                <td class="pe-4 text-muted small align-middle">${escapeHtml(h.description || "-")}</td>
            </tr>`;
    });
}

// ============================================================================
// 5. YENİ: DEPO İÇİNDEN DİNAMİK ÜRÜN EKLEME MOTORU 
// ============================================================================

// Formu Sıfırlamak için Ortak Fonksiyon
function modalIcinSifirla() {
    const form = document.getElementById("depoIciUrunFormu");
    if (form) form.reset();
    
    const katAlan = document.getElementById("yeniKategoriAlani");
    if(katAlan) { katAlan.classList.add("d-none"); document.getElementById("yeniKategoriAdi").value = ""; }
    
    const rafAlan = document.getElementById("yeniRafAlani");
    if(rafAlan) { rafAlan.classList.add("d-none"); document.getElementById("yeniRafKodu").value = ""; }
    
    if (document.getElementById("depoIciUrunIlkStok")) document.getElementById("depoIciUrunIlkStok").value = "0";
    if (document.getElementById("depoIciUrunMinStok")) document.getElementById("depoIciUrunMinStok").value = "5";
    
    const depoIsmi = document.getElementById("seciliDepoAdiRaflaricin")?.innerText || document.getElementById("seciliDepoAdiRaflaricin")?.innerText || "Seçili Depo";
    const sabitDepoGirdisi = document.getElementById("urunSabitDepoAdi");
    if (sabitDepoGirdisi) sabitDepoGirdisi.value = depoIsmi;
}

// 1. Durum: Depo Ekranından (+ Yeni Ürün Girişi) Butonuna Basıldığında
document.getElementById("btnDepoyaUrunEkleModalAc")?.addEventListener("click", async () => {
    if (!aktifDepoId) return uyariGoster("Lütfen önce bir depo seçin.");
    
    modalIcinSifirla();
    await depoIciKategorileriYukle();
    await depoIciRaflariYukle(aktifDepoId);

    // Raf Seçim Kutusunu Özgür Bırak
    const rafSelect = document.getElementById("depoIciUrunRafId");
    if (rafSelect) {
        rafSelect.disabled = false;
        rafSelect.value = "";
    }

    const modalElement = document.getElementById("depoIciUrunModal");
    if (modalElement) bootstrap.Modal.getOrCreateInstance(modalElement).show();
});

// 2. Durum: Raf Ekranından (+ Bu Rafa Ürün Ekle) Butonuna Basıldığında
document.getElementById("btnRafaUrunEkleModalAc")?.addEventListener("click", async () => {
    if (!aktifDepoId || !aktifRafId) return uyariGoster("Hata: Raf seçimi bulunamadı!");
    
    modalIcinSifirla();
    await depoIciKategorileriYukle();
    await depoIciRaflariYukle(aktifDepoId);

    // Raf Seçim Kutusunu Otomatik Seç ve KİLİTLE!
    const rafSelect = document.getElementById("depoIciUrunRafId");
    if (rafSelect) {
        rafSelect.value = aktifRafId;
        rafSelect.disabled = true; // Kullanıcı bu ekranda rafı değiştiremesin
    }

    const modalElement = document.getElementById("depoIciUrunModal");
    if (modalElement) bootstrap.Modal.getOrCreateInstance(modalElement).show();
});

async function depoIciKategorileriYukle() {
    const select = document.getElementById("depoIciUrunKategoriId");
    if (!select) return;
    try {
        const sonuc = await apiRequest('/categories?pageSize=1000', 'GET');
        const kategoriler = sonuc.items || sonuc;
        
        select.innerHTML = '<option value="" selected disabled>Kategori seçin...</option>';
        kategoriler.forEach(k => { select.innerHTML += `<option value="${k.id}">${escapeHtml(k.name)}</option>`; });
        select.innerHTML += `<option value="YENI_KATEGORI" class="text-success fw-bold">➕ Yeni Kategori Ekle</option>`;

        if (!document.getElementById("yeniKategoriAlani")) {
            const container = document.createElement("div");
            container.id = "yeniKategoriAlani";
            container.className = "input-group mt-2 d-none";
            container.innerHTML = `
                <input type="text" id="yeniKategoriAdi" class="form-control form-control-sm border-success" placeholder="Yeni kategori adını yazın...">
                <button class="btn btn-sm btn-success fw-bold" type="button" id="btnHizliKategoriKaydet">Kaydet</button>
                <button class="btn btn-sm btn-outline-secondary" type="button" id="btnHizliKategoriIptal">İptal</button>
            `;
            select.parentNode.insertBefore(container, select.nextSibling);

            select.addEventListener("change", function() {
                if (this.value === "YENI_KATEGORI") {
                    document.getElementById("yeniKategoriAlani")?.classList.remove("d-none");
                    document.getElementById("yeniKategoriAdi").focus();
                } else {
                    document.getElementById("yeniKategoriAlani")?.classList.add("d-none");
                }
            });
        }
    } catch (h) { select.innerHTML = '<option value="">Kategoriler yüklenemedi!</option>'; }
}

async function hizliKategoriKaydet() {
    const ad = document.getElementById("yeniKategoriAdi").value.trim();
    if(!ad) return uyariGoster("Kategori adı boş olamaz!");
    try {
        const data = await apiRequest('/categories', 'POST', { Name: ad, ParentId: 0 });
        await depoIciKategorileriYukle();
        if(data.id) document.getElementById("depoIciUrunKategoriId").value = data.id; 
        document.getElementById("yeniKategoriAlani")?.classList.add("d-none");
    } catch(e) { hataGoster("Hata: " + e.message); }
}

function hizliKategoriIptal() {
    document.getElementById("yeniKategoriAlani")?.classList.add("d-none");
    document.getElementById("depoIciUrunKategoriId").value = ""; 
}

async function depoIciRaflariYukle(depoId) {
    const select = document.getElementById("depoIciUrunRafId");
    if (!select) return;
    try {
        const sonuc = await apiRequest(`/locations/by-warehouse/${depoId}?pageSize=1000`, 'GET');
        const raflar = sonuc.items || sonuc;
        
        select.innerHTML = '<option value="" selected disabled>Ürünün konulacağı rafı seçin...</option>';
        raflar.forEach(r => { select.innerHTML += `<option value="${r.id}">${escapeHtml(r.code)}</option>`; });
        select.innerHTML += `<option value="YENI_RAF" class="text-success fw-bold">➕ Yeni Raf Ekle</option>`;

        if (!document.getElementById("yeniRafAlani")) {
            const container = document.createElement("div");
            container.id = "yeniRafAlani";
            container.className = "input-group mt-2 d-none";
            container.innerHTML = `
                <input type="text" id="yeniRafKodu" class="form-control form-control-sm border-success" placeholder="Örn: RAF-X1">
                <button class="btn btn-sm btn-success fw-bold" type="button" id="btnHizliRafKaydet">Kaydet</button>
                <button class="btn btn-sm btn-outline-secondary" type="button" id="btnHizliRafIptal">İptal</button>
            `;
            select.parentNode.insertBefore(container, select.nextSibling);

            select.addEventListener("change", function() {
                if (this.value === "YENI_RAF") {
                    document.getElementById("yeniRafAlani")?.classList.remove("d-none");
                    document.getElementById("yeniRafKodu").focus();
                } else {
                    document.getElementById("yeniRafAlani")?.classList.add("d-none");
                }
            });
        }
    } catch (h) { select.innerHTML = '<option value="">Raf bulunamadı!</option>'; }
}

async function hizliRafKaydet() {
    const kod = document.getElementById("yeniRafKodu").value.trim();
    if(!kod) return uyariGoster("Raf kodu boş olamaz!");
    try {
        const data = await apiRequest('/locations', 'POST', { WarehouseId: aktifDepoId, Code: kod });
        await depoIciRaflariYukle(aktifDepoId); 
        
        const rafSelect = document.getElementById("depoIciUrunRafId");
        if(data.id) rafSelect.value = data.id; 
        
        document.getElementById("yeniRafAlani")?.classList.add("d-none");
        rafView.load(1);
    } catch(e) { hataGoster("Hata: " + e.message); }
}

function hizliRafIptal() {
    document.getElementById("yeniRafAlani")?.classList.add("d-none");
    document.getElementById("depoIciUrunRafId").value = ""; 
}

document.getElementById("btnDepoIciUrunKaydet")?.addEventListener("click", async () => {
    const name = document.getElementById("depoIciUrunAdi").value;
    const barcode = document.getElementById("depoIciUrunBarkod").value;
    const categoryId = document.getElementById("depoIciUrunKategoriId").value;
    
    // Eğer select disabled ise value alamayabilir, bu yüzden aktifRafId'ye fallback atıyoruz!
    const rafSelectValue = document.getElementById("depoIciUrunRafId").value;
    const targetLocationId = rafSelectValue || aktifRafId; 
    
    const initialQuantity = document.getElementById("depoIciUrunIlkStok").value;
    const minStockLevel = document.getElementById("depoIciUrunMinStok").value;

    if (!name || !barcode || !categoryId || !targetLocationId || categoryId === "YENI_KATEGORI" || targetLocationId === "YENI_RAF") {
        return uyariGoster("Lütfen tüm zorunlu alanları eksiksiz doldurun!");
    }

    const urunPayload = {
        Name: name, 
        Barcode: barcode, 
        MinStockLevel: parseInt(minStockLevel) || 0,
        CategoryId: parseInt(categoryId), 
        TargetLocationId: parseInt(targetLocationId),
        InitialQuantity: parseInt(initialQuantity) || 0
    };

    try {
        await apiRequest('/products', 'POST', urunPayload);

        bootstrap.Modal.getInstance(document.getElementById("depoIciUrunModal"))?.hide();
        basariToast("Ürün başarıyla tanımlandı ve stok işlendi!");
        
        // Eğer Raf ekranındaysak, ürünleri otomatik yenileyelim
        if (aktifRafId) {
            raftakiUrunleriGoruntule(aktifRafId, document.getElementById("seciliRafKoduUrunlerIcin").innerText);
        }

    } catch (hata) { hataGoster("Ürün Eklenemedi:\n" + hata.message); }

});

// ============================================================================
// GERİ DÖNÜŞ VE EVENT LİSTENER'LAR
// ============================================================================

document.getElementById("aramaKutusuDepo")?.addEventListener("input", (e) => depoView.setSearch(e.target.value));
document.getElementById("siralamaDepo")?.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "TARIH_YENI") depoView.setSortState("id", "desc");
    else if (val === "TARIH_ESKI") depoView.setSortState("id", "asc");
    else if (val === "Z_A") depoView.setSortState("name", "desc");
    else depoView.setSortState("name", "asc");
});
document.getElementById("btnFiltreleriTemizleDepo")?.addEventListener("click", () => {
    const aramaKutu = document.getElementById("aramaKutusuDepo");
    if (aramaKutu) aramaKutu.value = "";
    const siralamaMenu = document.getElementById("siralamaDepo");
    if (siralamaMenu) siralamaMenu.value = "TARIH_YENI";
    
    depoView.setSearch("");
    depoView.setSortState("id", "desc");
});
document.getElementById("aramaKutusuUrun")?.addEventListener("input", (e) => urunView.setSearch(e.target.value));
document.getElementById("siralamaUrun")?.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "MIKTAR_AZALAN") urunView.setSortState("stockQuantity", "desc");
    else if (val === "MIKTAR_ARTAN") urunView.setSortState("stockQuantity", "asc");
    else if (val === "A_Z") urunView.setSortState("name", "asc");
    else urunView.setSortState("id", "desc");
});

document.getElementById("btnGeriDonDepolara")?.addEventListener("click", () => {
    document.getElementById("rafListesiGorunumu").classList.add("d-none");
    document.getElementById("urunListesiGorunumu").classList.add("d-none");
    document.getElementById("depoListesiGorunumu").classList.remove("d-none");
    aktifDepoId = null;
    depolariYukle(); 
});

document.getElementById("btnGeriDonRaflara")?.addEventListener("click", () => {
    document.getElementById("urunListesiGorunumu").classList.add("d-none");
    document.getElementById("rafListesiGorunumu").classList.remove("d-none");
    aktifRafId = null;
    
    // Raf listesine döndüğünde raf tablosunu da bir yenileyelim
    if(aktifDepoId) rafView.load(1);
});

document.addEventListener("DOMContentLoaded", () => {
    kullaniciBilgisiniDoldur();
    depolariYukle();

    // URL'de raf kodu varsa otomatik okutulmuş gibi davran
    const urlParams = new URLSearchParams(window.location.search);
    const viewShelfCode = urlParams.get('viewShelfCode');
    if (viewShelfCode) {
        setTimeout(() => {
            islemYapScanner(viewShelfCode);
        }, 800); // Tabloların yüklenmesi için kısa bir süre bekliyoruz
    }

    // Yetki kontrolü ile butonları gizle
    if (typeof hasPermission === "function") {
        if (!hasPermission("Warehouse.Add")) {
            const btnYeniDepo = document.getElementById("btnYeniDepo");
            if (btnYeniDepo) btnYeniDepo.classList.add("d-none");
        }
        if (!hasPermission("Location.Add")) {
            const btnYeniRaf = document.getElementById("btnYeniRaf");
            if (btnYeniRaf) btnYeniRaf.classList.add("d-none");
        }
        if (!hasPermission("Warehouse.Edit")) {
            const btnYeniUrunGiris = document.getElementById("btnDepoyaUrunEkleModalAc");
            if (btnYeniUrunGiris) btnYeniUrunGiris.classList.add("d-none");
        }
    }
});

// --- EVENT DELEGATION ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Depo Kartları ve Butonları
    const depoKartlariContainer = document.getElementById("depoKartlariContainer");
    if (depoKartlariContainer) {
        depoKartlariContainer.addEventListener("click", (e) => {
            const btnSil = e.target.closest(".btn-depo-sil");
            if (btnSil) {
                e.stopPropagation();
                depoSil(btnSil.getAttribute("data-id"), btnSil.getAttribute("data-name"));
                return;
            }
            const btnDuzenle = e.target.closest(".btn-depo-duzenle");
            if (btnDuzenle) {
                e.stopPropagation();
                depoDuzenle(btnDuzenle.getAttribute("data-id"));
                return;
            }
            const card = e.target.closest(".depo-karti");
            if (card) {
                raflariGoruntule(card.getAttribute("data-id"), card.getAttribute("data-name"));
            }
        });
    }


    // 3. Raf Tablosu (Sil & Görüntüle)
    const rafTablosuGovdesi = document.getElementById("rafTablosuGovdesi");
    if (rafTablosuGovdesi) {
        rafTablosuGovdesi.addEventListener("click", (e) => {
            const btnPrint = e.target.closest(".btn-print-barcode");
            if (btnPrint) {
                openBarcodePrintModal(btnPrint.getAttribute("data-barcode"), btnPrint.getAttribute("data-name"), btnPrint.getAttribute("data-id"));
                return;
            }

            const btnSil = e.target.closest(".btn-raf-sil");
            if (btnSil) {
                rafSil(btnSil.getAttribute("data-id"), btnSil.getAttribute("data-code"));
                return;
            }
            const btnGoruntule = e.target.closest(".btn-raftaki-urunler");
            if (btnGoruntule) {
                raftakiUrunleriGoruntule(btnGoruntule.getAttribute("data-id"), btnGoruntule.getAttribute("data-code"));
            }
        });
    }


    // 5. Ürün Stok Geçmişi
    const seciliRafUrunleriTabloGovdesi = document.getElementById("urunTablosuGovdesi");
    if (seciliRafUrunleriTabloGovdesi) {
        document.getElementById("urunTablosuGovdesi").addEventListener("click", (e) => {
            const btnGecmis = e.target.closest(".btn-stok-gecmisi");
            if (btnGecmis) {
                stokGecmisiniAc(btnGecmis.getAttribute("data-id"), btnGecmis.getAttribute("data-name"));
            }
        });
    }

    // 6. Modal İçi Hızlı Kayıt Butonları
    document.body.addEventListener("click", (e) => {
        if (e.target.id === "btnHizliKategoriKaydet") hizliKategoriKaydet();
        if (e.target.id === "btnHizliKategoriIptal") hizliKategoriIptal();
        if (e.target.id === "btnHizliRafKaydet") hizliRafKaydet();
        if (e.target.id === "btnHizliRafIptal") hizliRafIptal();
    });
});

// =========================================================================
// BARKOD ÇİZİM VE YAZDIRMA (PRINT) İŞLEMLERİ (RAF İÇİN)
// =========================================================================
function openBarcodePrintModal(barcode, productName, productId) {
    document.getElementById("barcodeProductName").textContent = productName;

    JsBarcode("#barcodeCanvas", barcode, {
        format: "CODE128",
        lineColor: "#000",
        width: 1.5,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 10
    });

    const qrcodeCanvas = document.getElementById("qrcodeCanvas");
    if (qrcodeCanvas) {
        new QRious({
            element: qrcodeCanvas,
            value: barcode,
            size: 120,
            background: 'white',
            backgroundAlpha: 1,
            foreground: 'black',
            foregroundAlpha: 1,
            level: 'H'
        });
    }

    const btnToggle = document.getElementById("btnToggleCodeType");
    const barcodeCanvas = document.getElementById('barcodeCanvas');
    if (barcodeCanvas && qrcodeCanvas && btnToggle) {
        qrcodeCanvas.classList.add('d-none');
        qrcodeCanvas.classList.remove('d-flex');
        barcodeCanvas.classList.remove('d-none');
        btnToggle.innerHTML = '<i class="bi bi-qr-code me-1"></i> QR Koda Geç';
        document.querySelector('#barcodePrintModal .modal-title').innerHTML = '<i class="bi bi-printer me-2 text-primary"></i>Barkod Yazdır';
    }

    const modalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('barcodePrintModal'));
    modalInstance.show();
}

document.getElementById('btnToggleCodeType')?.addEventListener('click', function() {
    const barcodeCanvas = document.getElementById('barcodeCanvas');
    const qrcodeCanvas = document.getElementById('qrcodeCanvas');
    const isQrVisible = !qrcodeCanvas.classList.contains('d-none');

    if (isQrVisible) {
        qrcodeCanvas.classList.add('d-none');
        qrcodeCanvas.classList.remove('d-flex');
        barcodeCanvas.classList.remove('d-none');
        this.innerHTML = '<i class="bi bi-qr-code me-1"></i> QR Koda Geç';
        document.querySelector('#barcodePrintModal .modal-title').innerHTML = '<i class="bi bi-printer me-2 text-primary"></i>Barkod Yazdır';
    } else {
        barcodeCanvas.classList.add('d-none');
        qrcodeCanvas.classList.remove('d-none');
        qrcodeCanvas.classList.add('d-flex');
        this.innerHTML = '<i class="bi bi-upc-scan me-1"></i> Barkoda Geç';
        document.querySelector('#barcodePrintModal .modal-title').innerHTML = '<i class="bi bi-printer me-2 text-primary"></i>QR Kod Yazdır';
    }
});

function printBarcode() {
    const printContent = document.getElementById('printArea').innerHTML;
    const productName = document.getElementById("barcodeProductName").textContent;

    const bugun = new Date().toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    let oldFrame = document.getElementById('print-iframe');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';

    // CSP Uyumlu: Inline style yerine HTML attribute ve Bootstrap class'ları kullanıyoruz
    iframe.className = 'position-fixed bottom-0 end-0 border-0 opacity-0';
    iframe.setAttribute('width', '0');
    iframe.setAttribute('height', '0');
    // opacity-0 kullandık çünkü bazı tarayıcılar display:none olan iframe'leri yazdırmaz

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();

    // Canvas elementini img etiketine çevirerek inline style hatalarının önüne geçiyoruz (CSP'ye takılmaz)
    let safePrintContent = printContent.replace(/<canvas[^>]*id=["']qrcodeCanvas["'][^>]*><\/canvas>/gi, () => {
        const qrCanvas = document.getElementById('qrcodeCanvas');
        if (qrCanvas) {
            const dataUrl = qrCanvas.toDataURL("image/png");
            // Sadece qrcode açıldıysa img olarak renderla, gizliyse d-none koy
            const isHidden = qrCanvas.classList.contains('d-none');
            const classStr = isHidden ? "mx-auto d-none justify-content-center" : "mx-auto mt-2 d-flex justify-content-center";
            return `<img id="qrcodeCanvasImg" src="${dataUrl}" class="${classStr}" alt="QR Kod">`;
        }
        return '';
    });

    // JsBarcode'un ürettiği olası style etiketlerini temizle
    safePrintContent = safePrintContent.replace(/style\s*=\s*['"]display:\s*none;?['"]/gi, 'class="d-none"');
    safePrintContent = safePrintContent.replace(/ style\s*=\s*['"][^'"]*['"]/gi, '');

    iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <title>Etiket</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="css/style.css" rel="stylesheet">
        </head>
        <body class="d-flex flex-column justify-content-center align-items-center bg-white vh-100 m-0 p-0 overflow-hidden text-center">
            
            <!-- Üst Kısım: Tarih -->
            <div class="text-muted fw-bold mb-2 fs-07rem ls-1px">
                ${bugun}
            </div>
            
            <!-- Orta Kısım: Barkod Görseli -->
            ${safePrintContent}
            
            <!-- Alt Kısım: Ürün Adı -->
            <div class="mt-2 fw-bold text-dark fs-6">
                ${escapeHtml(productName)}
            </div>

        </body>
        </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }, 500);
}

document.getElementById("btnPrintBarcodeAction")?.addEventListener("click", printBarcode);

// =========================================================================
// BARKOD OKUYUCU DİNLEYİCİ (SCANNER LISTENER)
// =========================================================================
let scannerBuffer = "";
let scannerTimer = null;

document.addEventListener("keydown", (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
    }

    if (e.key === "Enter") {
        if (scannerBuffer.length > 2) {
            e.preventDefault(); // Varsayılan Enter davranışını (linke tıklama, form submit) engelle
            islemYapScanner(scannerBuffer);
        }
        scannerBuffer = "";
        clearTimeout(scannerTimer);
        return;
    }

    if (e.key.length === 1) { 
        scannerBuffer += e.key;
        clearTimeout(scannerTimer);
        scannerTimer = setTimeout(() => {
            scannerBuffer = ""; 
        }, 100);
    }
});

async function islemYapScanner(barcode) {
    const btn = document.querySelector(`.btn-raftaki-urunler[data-code="${barcode}"]`);
    if (btn) {
        btn.click();
        basariToast(`"${barcode}" rafı okundu.`);
        return;
    }

    try {
        const sonuc = await apiRequest(`/locations?pageSize=10000`, 'GET');
        const raflar = sonuc.items || sonuc;
        const hedefRaf = raflar.find(r => r.code === barcode);

        if (hedefRaf) {
            document.getElementById("depoListesiGorunumu").classList.add("d-none");
            document.getElementById("rafListesiGorunumu").classList.add("d-none");
            aktifDepoId = hedefRaf.warehouseId;
            raftakiUrunleriGoruntule(hedefRaf.id, hedefRaf.code);
            basariToast(`"${barcode}" rafı okundu.`);
        } else {
            hataGoster(`"${barcode}" kodlu raf sistemde bulunamadı.`);
        }
    } catch (e) {
        console.error("Barkod sorgulanırken hata:", e);
    }
}



// Raf Listesi Filtreleme Event Listenerlar�
document.getElementById('aramaKutusuRaf')?.addEventListener('input', (e) => {
    rafView.setSearch(e.target.value);
});

document.getElementById('rafAramaSelect')?.addEventListener('change', (e) => {
    document.getElementById('aramaKutusuRaf').value = '';
    rafView.setSearch(e.target.value);
});

document.getElementById('btnFiltreleriTemizleRaf')?.addEventListener('click', () => {
    document.getElementById('aramaKutusuRaf').value = '';
    document.getElementById('rafAramaSelect').value = '';
    rafView.setSearch('');
});




window.addEventListener('popstate', (e) => {
    if (e.state && e.state.view) {
        if (e.state.view === 'depo') {
            document.getElementById('rafListesiGorunumu').classList.add('d-none');
            document.getElementById('urunListesiGorunumu').classList.add('d-none');
            document.getElementById('depoListesiGorunumu').classList.remove('d-none');
            aktifDepoId = null;
            aktifRafId = null;
            depolariYukle();
        } else if (e.state.view === 'raf') {
            raflariGoruntule(e.state.depoId, e.state.depoName, true);
        } else if (e.state.view === 'urun') {
            raftakiUrunleriGoruntule(e.state.rafId, e.state.rafName, true);
        }
    } else {
        document.getElementById('rafListesiGorunumu').classList.add('d-none');
        document.getElementById('urunListesiGorunumu').classList.add('d-none');
        document.getElementById('depoListesiGorunumu').classList.remove('d-none');
    }
});

document.addEventListener('DOMContentLoaded', () => { history.replaceState({ view: 'depo' }, null, ''); });
