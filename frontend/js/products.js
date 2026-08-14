const API_URL = `${CONFIG.API_BASE_URL}/products`;
const token = localStorage.getItem('token');
const userRole = getUserRole();

let tumUrunler = [];
let filtreliUrunler = [];
const tabloGovdesi = document.getElementById("urunTablosuGovdesi");
let currentPage = 1;
let pageSize = 10;

let aktifArama = '';
let siralamaSutunu = 'id';
let siralamaYonu = 'asc';

let yeniUrunCevrimleri = [];

if (!token) window.location.href = 'login.html';

// Alt kategorileri recursive olarak bulan fonksiyon
function getAltKategoriIdleri(parentId) {
    let ids = [parseInt(parentId)];
    if (!window.tumKategoriler) return ids;
    let children = window.tumKategoriler.filter(c => c.parentId === parseInt(parentId));
    children.forEach(c => {
        ids = ids.concat(getAltKategoriIdleri(c.id));
    });
    return ids;
}

function hesaplaGecerliFiyat(urun) {
    let fiyat = parseFloat(urun.price) || 0;
    if (fiyat === 0 && urun.productSuppliers && urun.productSuppliers.length > 0) {
        const pref = urun.productSuppliers.find(ps => ps.isPreferred);
        if (pref && pref.purchasePrice) fiyat = parseFloat(pref.purchasePrice);
        else fiyat = Math.max(...urun.productSuppliers.map(ps => parseFloat(ps.purchasePrice) || 0));
    }
    if (fiyat === 0 && urun.attributes) {
        const fAttr = urun.attributes.find(a => a.key && a.key.toLowerCase().includes('fiyat'));
        if (fAttr) {
            let parsed = parseFloat(fAttr.value);
            if (!isNaN(parsed)) fiyat = parsed;
        }
    }
    return isFinite(fiyat) ? Math.max(0, fiyat) : 0;
}

// =========================================================================
// VERİ GÜNCELLEME, FİLTRELEME VE ÖZET MOTORU
// =========================================================================
const productView = createDataView({
    containerId: "urunTablosuGovdesi",
    paginationContainerId: "paginationContainer",
    mode: 'table',
    emptyColspan: 7,
    emptyMessage: "Kayıt bulunamadı.",
    pageSize: 10,
    fetchPage: async (page, size) => {
        if (!tumUrunler || tumUrunler.length === 0) {
            const data = await apiRequest('/products?pageNumber=1&pageSize=1000', 'GET');
            tumUrunler = data.items || data || [];
        }

        const seciliKategoriId = document.getElementById("filtreKategoriId")?.value;
        const dynamicFilters = [];
        document.querySelectorAll('.kural-filtresi').forEach(input => {
            const filterType = input.getAttribute('data-filter-type') || 'text';

            if (filterType === 'multi_select') {
                let secilenler = [];
                try { secilenler = JSON.parse(input.value || '[]'); } catch (e) { secilenler = []; }
                if (secilenler.length > 0) {
                    dynamicFilters.push({
                        ruleId: parseInt(input.getAttribute('data-rule-id') || '0'),
                        key: input.getAttribute('data-rule-key'),
                        type: 'multi_select',
                        value: secilenler.map(v => String(v).toLocaleLowerCase("tr-TR").trim())
                    });
                }
                return;
            }

            if (input.value && input.value.trim() !== '') {
                dynamicFilters.push({
                    ruleId: parseInt(input.getAttribute('data-rule-id') || '0'),
                    key: input.getAttribute('data-rule-key'),
                    type: filterType,
                    value: input.value.toLocaleLowerCase("tr-TR").trim()
                });
            }
        });

        filtreliUrunler = tumUrunler.filter(urun => {
            const textMatch =
                (urun.name && urun.name.toLowerCase().includes(aktifArama)) ||
                (urun.barcode && urun.barcode.toLowerCase().includes(aktifArama)) ||
                (urun.categoryName && urun.categoryName.toLowerCase().includes(aktifArama)) ||
                (urun.id && urun.id.toString().includes(aktifArama));
            if (!textMatch) return false;

            // --- TEMEL FİLTRELER (Tüm Kategoriler İçin Ortak) ---
            const seciliStokDurumu = document.getElementById('filtreStokDurumu')?.value;
            if (seciliStokDurumu) {
                if (seciliStokDurumu === 'tukendi' && urun.stockQuantity > 0) return false;
                if (seciliStokDurumu === 'stokta_var' && urun.stockQuantity <= 0) return false;
                if (seciliStokDurumu === 'kritik' && (urun.stockQuantity > urun.minStockLevel || urun.stockQuantity <= 0)) return false;
            }

            const minFiyat = parseFloat(document.getElementById('filtreMinFiyat')?.value);
            const maxFiyat = parseFloat(document.getElementById('filtreMaxFiyat')?.value);
            
            const fiyat = hesaplaGecerliFiyat(urun);
            if (!isNaN(minFiyat) && fiyat < minFiyat) return false;
            if (!isNaN(maxFiyat) && maxFiyat > 0 && fiyat > maxFiyat) return false;

            const seciliTedarikciId = document.getElementById('filtreTedarikci')?.value;
            if (seciliTedarikciId) {
                if (!urun.productSuppliers || !urun.productSuppliers.some(ps => ps.supplierId.toString() === seciliTedarikciId)) {
                    return false;
                }
            }

            const baslangicTarihi = document.getElementById('filtreBaslangicTarihi')?.value;
            const bitisTarihi = document.getElementById('filtreBitisTarihi')?.value;
            if (baslangicTarihi || bitisTarihi) {
                const urunTarih = new Date(urun.createdAt);
                if (baslangicTarihi) {
                    const bas = new Date(baslangicTarihi);
                    bas.setHours(0, 0, 0, 0);
                    if (urunTarih < bas) return false;
                }
                if (bitisTarihi) {
                    const bit = new Date(bitisTarihi);
                    bit.setHours(23, 59, 59, 999);
                    if (urunTarih > bit) return false;
                }
            }
            // ----------------------------------------------------

            if (seciliKategoriId) {
                const gecerliIdler = getAltKategoriIdleri(seciliKategoriId);
                if (!gecerliIdler.includes(urun.categoryId)) {
                    return false;
                }
            }

            if (dynamicFilters.length > 0) {
                if (!urun.attributes || !Array.isArray(urun.attributes)) return false;

                for (let filter of dynamicFilters) {
                    const attr = urun.attributes.find(a => (a.ruleId && a.ruleId === filter.ruleId) || (a.key && a.key === filter.key));
                    if (!attr) return false;

                    if (filter.type === 'range') {
                        const parts = filter.value.split('-');
                        if (parts.length === 2) {
                            const min = parseFloat(parts[0]);
                            const max = parseFloat(parts[1]);
                            const attrVal = parseFloat(attr.value);
                            if (isNaN(attrVal) || attrVal < min || attrVal > max) {
                                return false;
                            }
                        }
                    } else if (filter.type === 'discrete_range') {
                        try {
                            const validValues = JSON.parse(filter.value);
                            if (!validValues.includes((attr.value ?? '').toString().toLowerCase())) {
                                return false;
                            }
                        } catch (e) {
                            return false;
                        }
                    } else if (filter.type === 'multi_select') {
                        const selectedValues = filter.value;
                        if (selectedValues.length > 0) {
                            const attrVal = (attr.value ?? "").toString().toLocaleLowerCase("tr-TR");
                            const match = selectedValues.some(v => attrVal.includes(v));
                            if (!match) return false;
                        }
                    } else {
                        if (!(attr.value ?? "").toString().toLocaleLowerCase("tr-TR").includes(filter.value)) {
                            return false;
                        }
                    }
                }
            }
            return true;
        });

        filtreliUrunler.sort((a, b) => {
            let degerA = a[siralamaSutunu] != null ? a[siralamaSutunu] : '';
            let degerB = b[siralamaSutunu] != null ? b[siralamaSutunu] : '';

            if (typeof degerA === 'string') {
                return siralamaYonu === 'asc' ? degerA.localeCompare(degerB) : degerB.localeCompare(degerA);
            } else {
                return siralamaYonu === 'asc' ? degerA - degerB : degerB - degerA;
            }
        });

        kategoriOzetiniGuncelle(filtreliUrunler);

        const start = (page - 1) * size;
        return {
            items: filtreliUrunler.slice(start, start + size),
            totalItems: filtreliUrunler.length
        };
    },
    renderRow: (urun) => {
        let btnIncele = `<button class="btn btn-sm btn-outline-info rounded-pill btn-incele me-1" title="Detayları Gör" data-id="${urun.id}"><i class="bi bi-eye"></i> Görüntüle</button>`;
        let btnDuzenle = hasPermission("Product.Edit") ? `<button class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle me-1" data-id="${urun.id}">Düzenle</button>` : "";
        let btnSil = hasPermission("Product.Delete") ? `<button class="btn btn-sm btn-outline-danger rounded-pill btn-sil" data-id="${urun.id}">Sil</button>` : "";
        
        return `
            <tr>
                <td class="text-muted small py-2">${tarihFormatla(urun.createdAt)}</td>
                <td class="fw-bold py-2">${escapeHtml(urun.name)}</td>
                <td class="py-2">
                    <button class="btn btn-sm btn-outline-secondary rounded-pill btn-print-barcode d-inline-flex align-items-center shadow-sm" 
                            data-barcode="${escapeHtml(urun.barcode)}" 
                            data-name="${escapeHtml(urun.name)}" 
                            data-id="${urun.id}"
                            title="Barkod Çıktısı Al">
                        <i class="bi bi-upc-scan me-2"></i>
                        <span class="fw-bold">${escapeHtml(urun.barcode)}</span>
                    </button>
                </td>
                <td class="text-center py-2">${urun.minStockLevel}</td>
                <td class="py-2">${escapeHtml(urun.categoryName)}</td>
                <td class="text-center py-2">
                    <span class="badge ${urun.stockQuantity <= urun.minStockLevel ? 'bg-danger text-danger' : 'bg-success text-success'} bg-opacity-10 border ${urun.stockQuantity <= urun.minStockLevel ? 'border-danger' : 'border-success'} px-2 py-1 rounded-pill">
                        ${formatQuantity(urun.stockQuantity)} ${escapeHtml(urun.unitShortCode || 'ADET')}
                    </span>
                </td>
                <td class="text-end py-2"><div class="d-flex gap-1 justify-content-end">${btnIncele} ${btnDuzenle} ${btnSil}</div></td>
            </tr>`;
    }
});

function veriyiGuncelle() {
    productView.load(1);
}

// Tablonun altına filtrelenen ürün çeşidini ve TOPLAM STOK ADEDİNİ yazar
function kategoriOzetiniGuncelle(filtreliListe) {
    let ozetContainer = document.getElementById("kategoriOzetBilgisi");
    if (!ozetContainer) {
        ozetContainer = document.createElement("div");
        ozetContainer.id = "kategoriOzetBilgisi";
        ozetContainer.className = "mt-3 text-muted small fw-bold text-end px-3";
        const paginationContainer = document.getElementById("paginationContainer");
        if (paginationContainer && paginationContainer.parentNode) {
            paginationContainer.parentNode.insertBefore(ozetContainer, paginationContainer);
        }
    }

    // Kategori adını id üzerinden bul
    let kategoriAdi = "Tümü";
    const seciliKategoriId = document.getElementById("filtreKategoriId")?.value;

    if (seciliKategoriId && window.tumKategoriler) {
        const seciliKategori = window.tumKategoriler.find(c => c.id == seciliKategoriId);
        if (seciliKategori && seciliKategori.name) {
            kategoriAdi = seciliKategori.name;
        }
    }

    const urunCesidi = filtreliListe.length;
    const toplamFizikselStok = filtreliListe.reduce((toplam, urun) => toplam + (urun.stockQuantity || 0), 0);

    ozetContainer.innerHTML = `<i class="bi bi-info-circle me-1"></i> Kategori ("${escapeHtml(kategoriAdi)}") için toplam <span class="text-primary">${urunCesidi}</span> ürün çeşidi, Toplam Stok: <span class="text-success">${toplamFizikselStok} Adet</span> listeleniyor.`;
}

// =========================================================================
// DIŞA AKTARMA (EXPORT) FONKSİYONLARI
// =========================================================================
function exportProductsToExcel() {
    const productData = filtreliUrunler;
    if (!productData || productData.length === 0) return uyariGoster("Dışa aktarılacak ürün bulunamadı.");

    const flattenedData = productData.map(p => ({
        "Sistem ID": p.id,
        "Ürün Adı": p.name,
        "Barkod": p.barcode,
        "Kategori": p.categoryName || "-",
        "Kritik Stok": p.minStockLevel,
        "Mevcut Stok": p.stockQuantity
    }));

    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ürünler");
    XLSX.writeFile(workbook, `StockFlow_Urunler_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportProductsToPDF() {
    const productData = filtreliUrunler;
    if (!productData || productData.length === 0) return uyariGoster("Dışa aktarılacak ürün bulunamadı.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const tableColumn = ["ID", "Ürün Adı", "Barkod", "Kategori", "Kritik Stok", "Mevcut Stok"];
    const tableRows = [];

    productData.forEach(p => {
        tableRows.push([p.id, p.name, p.barcode, p.categoryName || "-", p.minStockLevel, p.stockQuantity]);
    });

    doc.text("Stok Takip - Ürün Envanter Raporu", 14, 15);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`StockFlow_Urunler_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function exportProductsToCSV() {
    const productData = filtreliUrunler;
    if (!productData || productData.length === 0) return uyariGoster("Dışa aktarılacak ürün bulunamadı.");

    let csvContent = "\uFEFF";
    csvContent += "ID;Ürün Adı;Barkod;Kritik Stok;Kategori;Mevcut Stok\n";

    productData.forEach(p => {
        const safeName = (p.name || "").replace(/"/g, '""');
        const safeCategory = (p.categoryName || "-").replace(/"/g, '""');

        csvContent += `${p.id};"${safeName}";"${p.barcode}";${p.minStockLevel};"${safeCategory}";${p.stockQuantity}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `StockFlow_Urunler_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// =========================================================================
// SIRALAMA, ARAMA VE CRUD FONKSİYONLARI
// =========================================================================
function sirala(sutun) {
    if (siralamaSutunu === sutun) {
        siralamaYonu = siralamaYonu === 'asc' ? 'desc' : 'asc';
    } else {
        siralamaSutunu = sutun;
        siralamaYonu = 'asc';
    }

    const sutunlar = { id: 'thId', name: 'thAd', barcode: 'thBarkod', minStockLevel: 'thMinStok', categoryName: 'thKategori', stockQuantity: 'thMevcutStok' };
    const metinler = { id: 'Tarihi', name: 'Ürün Adı', barcode: 'Barkod', minStockLevel: 'Min. Stok', categoryName: 'Kategori', stockQuantity: 'Mevcut Stok' };

    Object.keys(sutunlar).forEach(key => {
        const el = document.getElementById(sutunlar[key]);
        if (el) {
            el.innerText = siralamaSutunu === key ? (siralamaYonu === 'asc' ? `${metinler[key]} ↑` : `${metinler[key]} ↓`) : `${metinler[key]} ↕`;
        }
    });

    veriyiGuncelle();
}

if (document.getElementById("thId")) document.getElementById("thId").addEventListener("click", () => sirala("id"));
if (document.getElementById("thAd")) document.getElementById("thAd").addEventListener("click", () => sirala("name"));
if (document.getElementById("thBarkod")) document.getElementById("thBarkod").addEventListener("click", () => sirala("barcode"));
if (document.getElementById("thMinStok")) document.getElementById("thMinStok").addEventListener("click", () => sirala("minStockLevel"));
if (document.getElementById("thKategori")) document.getElementById("thKategori").addEventListener("click", () => sirala("categoryName"));
if (document.getElementById("thMevcutStok")) document.getElementById("thMevcutStok").addEventListener("click", () => sirala("stockQuantity"));

const aramaKutusuEl = document.getElementById("aramaKutusu");
if (aramaKutusuEl) {
    aramaKutusuEl.addEventListener("keyup", (event) => {
        aktifArama = event.target.value.toLowerCase();
        currentPage = 1;

        if (aktifArama === '') {
            window.history.pushState({}, document.title, window.location.pathname);
        } else {
            window.history.pushState({}, document.title, `${window.location.pathname}?search=${encodeURIComponent(event.target.value)}`);
        }
        veriyiGuncelle();
    });
}

// API ÇAĞRILARI
async function urunleriYukle(page = 1) {
    try {
        const sonuc = await apiRequest('/products?pageNumber=1&pageSize=1000', 'GET');
        tumUrunler = sonuc.items || sonuc || [];
        if (typeof updatePriceSliderMax === 'function') updatePriceSliderMax();
        productView.load(page);
    } catch (hata) {
        if (tabloGovdesi) {
            tabloGovdesi.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Ürünler yüklenemedi. (${hata.message})</td></tr>`;
        }
    }
}

// =========================================================================
// DİNAMİK CASCADER DROPDOWN YÖNETİMİ
// =========================================================================
function buildCategoryCascader(containerId, hiddenInputId, selectedCategoryId = null, isFilter = false) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!container || !hiddenInput) return;

    let finalizedCategoryId = selectedCategoryId;
    let expandedCategories = new Set();

    function updateExpandedCategories(id) {
        expandedCategories.clear();
        if (!id) return;

        expandedCategories.add(id);
        let current = window.tumKategoriler.find(k => k.id == id);
        while (current && current.parentId) {
            expandedCategories.add(current.parentId);
            current = window.tumKategoriler.find(k => k.id == current.parentId);
        }
    }

    if (finalizedCategoryId) {
        updateExpandedCategories(finalizedCategoryId);
    }

    container.innerHTML = '';

    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'dropdown w-100';

    const button = document.createElement('button');
    let btnClasses = isFilter ? 'btn form-control form-select-sm rounded-pill text-start bg-light border-0 px-3 d-flex justify-content-between align-items-center' : 'btn form-control text-start bg-white border d-flex justify-content-between align-items-center';
    button.className = btnClasses;
    button.type = 'button';
    button.dataset.bsToggle = 'dropdown';
    button.dataset.bsAutoClose = 'outside';

    const spanText = document.createElement('span');
    spanText.className = 'text-truncate pe-2';

    const caretIcon = document.createElement('i');
    caretIcon.className = 'bi bi-chevron-down text-muted';
    caretIcon.style.fontSize = '0.8rem';

    button.appendChild(spanText);
    button.appendChild(caretIcon);

    const menu = document.createElement('ul');
    menu.className = 'dropdown-menu w-100 shadow-sm';
    menu.style.maxHeight = '300px';
    menu.style.overflowY = 'auto';

    dropdownDiv.appendChild(button);
    dropdownDiv.appendChild(menu);
    container.appendChild(dropdownDiv);

    hiddenInput.value = finalizedCategoryId || '';

    function renderOptions() {
        menu.innerHTML = '';

        if (finalizedCategoryId) {
            const cat = window.tumKategoriler.find(k => k.id == finalizedCategoryId);
            spanText.textContent = cat ? cat.name : (isFilter ? 'Tüm Kategoriler' : 'Kategori Seçin...');
        } else {
            spanText.textContent = isFilter ? 'Tüm Kategoriler' : 'Kategori Seçin...';
        }

        const clearLi = document.createElement('li');
        const clearA = document.createElement('a');
        clearA.className = 'dropdown-item text-muted fst-italic border-bottom mb-1 pb-2';
        clearA.href = '#';
        if (finalizedCategoryId) {
            clearA.innerHTML = '<i class="bi bi-x-circle me-1"></i> Temizle / Başa Dön';
            clearA.addEventListener('click', (e) => {
                e.preventDefault();
                finalizedCategoryId = null;
                expandedCategories.clear();
                hiddenInput.value = '';
                hiddenInput.dispatchEvent(new Event('change'));
                renderOptions();
            });
        } else {
            clearA.textContent = isFilter ? 'Tüm Kategoriler (Seçili)' : 'Kategori Seçin...';
            clearA.classList.add('disabled');
        }
        clearLi.appendChild(clearA);
        menu.appendChild(clearLi);

        function buildTree(parentId, level) {
            const children = window.tumKategoriler.filter(k => k.parentId == parentId);

            children.forEach(c => {
                const isInPath = expandedCategories.has(c.id);
                const isChildOfFinal = (c.parentId === finalizedCategoryId);
                const isRootWhenEmpty = (finalizedCategoryId === null && c.parentId === null);

                if (!isInPath && !isChildOfFinal && !isRootWhenEmpty) {
                    return;
                }

                const hasChildren = window.tumKategoriler.some(k => k.parentId == c.id);

                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                if (finalizedCategoryId === c.id) {
                    a.classList.add('active');
                }
                a.href = '#';

                const prefix = '\u00A0\u00A0\u00A0'.repeat(level);

                if (hasChildren) {
                    a.innerHTML = prefix + (isInPath ? '▾ ' : '▸ ') + escapeHtml(c.name);
                    a.classList.add('fw-bold');
                } else {
                    a.innerHTML = prefix + '• ' + escapeHtml(c.name);
                }

                a.addEventListener('click', (e) => {
                    e.preventDefault();

                    finalizedCategoryId = c.id;
                    updateExpandedCategories(c.id);
                    hiddenInput.value = c.id;
                    hiddenInput.dispatchEvent(new Event('change'));

                    renderOptions();

                    if (!hasChildren) {
                        const dropdownInstance = bootstrap.Dropdown.getInstance(button) || new bootstrap.Dropdown(button);
                        dropdownInstance.hide();
                    }
                });

                li.appendChild(a);
                menu.appendChild(li);

                if (isInPath) {
                    buildTree(c.id, level + 1);
                }
            });
        }

        buildTree(null, 0);
    }
    renderOptions();
}

async function dropdownKategorileriniYukle() {
    try {
        const data = await apiRequest('/categories?pageSize=1000', 'GET');
        window.tumKategoriler = data.items || data;

        buildCategoryCascader('urunKategoriContainer', 'urunKategoriId', null, false);
        buildCategoryCascader('filtreKategoriContainer', 'filtreKategoriId', null, true);
    } catch (hata) {
        console.error("Kategori dropdown yükleme hatası:", hata);
        const c = document.getElementById('urunKategoriContainer');
        if (c) c.innerHTML = '<div class="text-danger small">Kategoriler yüklenemedi!</div>';
    }
}


const urunDepoSelect = document.getElementById("urunDepoId");
if (urunDepoSelect) {
    urunDepoSelect.addEventListener("change", async function () {
        const warehouseId = this.value;
        const rafSelect = document.getElementById("urunRafId");

        if (!warehouseId) {
            rafSelect.innerHTML = '<option value="">Depo bekleniyor...</option>';
            rafSelect.disabled = true;
            return;
        }

        try {
            rafSelect.disabled = false;
            rafSelect.innerHTML = '<option value="">Yükleniyor...</option>';

            const data = await apiRequest(`/locations/by-warehouse/${warehouseId}?pageSize=1000`, 'GET');
            const raflar = data.items || data;

            rafSelect.innerHTML = '<option value="">Raf seçin...</option>';
            if (raflar.length === 0) {
                rafSelect.innerHTML = '<option value="">Bu depoda raf yok</option>';
                rafSelect.disabled = true;
                return;
            }

            raflar.forEach(raf => {
                const option = document.createElement("option");
                option.value = raf.id;
                
                const baseText = raf.code || raf.name;
                const isBos = raf.isEmpty || raf.IsEmpty;
                option.textContent = isBos ? `${baseText} (Boş)` : baseText;
                
                rafSelect.appendChild(option);
            });
        } catch (hata) {
            console.error("Raf dropdown yükleme hatası:", hata);
            rafSelect.innerHTML = '<option value="">Hata oluştu</option>';
        }
    });
}

const urunRafSelect = document.getElementById("urunRafId");
const btnHedefRafEkle = document.getElementById("btnHedefRafEkle");

if (urunRafSelect && btnHedefRafEkle) {
    urunRafSelect.addEventListener("change", (e) => {
        btnHedefRafEkle.disabled = !e.target.value;
    });

    function getBaseQuantity(inputEl) {
        if (!inputEl || !inputEl.value) return 0;
        const rawVal = parseFloat(inputEl.value) || 0;
        const selectEl = inputEl.parentElement.querySelector('select');
        if (selectEl) {
            const opt = selectEl.options[selectEl.selectedIndex];
            const mult = parseFloat(opt.getAttribute('data-multiplier')) || 1;
            return rawVal * mult;
        }
        return rawVal;
    }

    function updateBaslangicStok() {
        const rackItems = document.querySelectorAll('.target-location-item');
        let total = 0;
        rackItems.forEach(item => {
            const qtyInput = item.querySelector('.target-loc-qty');
            total += getBaseQuantity(qtyInput);
        });
        const urunBaslangicStok = document.getElementById("urunBaslangicStok");
        if (urunBaslangicStok) urunBaslangicStok.value = total;
    }

    btnHedefRafEkle.addEventListener("click", () => {
        const whDropdown = document.getElementById("urunDepoId");
        if (!whDropdown.value || !urunRafSelect.value) return;

        const whName = whDropdown.options[whDropdown.selectedIndex].text;
        const locCode = urunRafSelect.options[urunRafSelect.selectedIndex].text;
        const whId = whDropdown.value;
        const locId = urunRafSelect.value;

        const hedefListesi = document.getElementById("hedefLokasyonlarListesi");
        
        if (hedefListesi.querySelector(`[data-loc-id="${locId}"]`)) {
            if (typeof hataGoster === 'function') hataGoster("Bu raf zaten listede ekli!");
            else alert("Bu raf zaten listede ekli!");
            return;
        }
        
        const uyari = document.getElementById("bosListeUyari");
        if (uyari) uyari.remove();

        let isBos = locCode.includes("(Boş)");
        let cleanLocCode = isBos ? locCode.replace(" (Boş)", "") : locCode;
        let emptyBadge = isBos ? `<span class="badge bg-warning text-dark ms-2 border border-warning"><i class="bi bi-info-circle me-1"></i>Tamamen Boş</span>` : '';

        const div = document.createElement("div");
        div.className = "list-group-item d-flex flex-column flex-md-row justify-content-between align-items-md-center p-3 border-start border-4 border-success target-location-item border-top-0 border-end-0 border-bottom-1 mb-2 shadow-sm rounded bg-success bg-opacity-10";
        div.setAttribute("data-loc-id", locId);

        div.innerHTML = `
            <div class="d-flex align-items-center mb-3 mb-md-0 w-100">
                <div class="flex-grow-1">
                    <div class="fw-bold text-dark fs-6"><i class="bi bi-building me-1 text-primary"></i>${escapeHtml(whName)}</div>
                    <div class="text-secondary small"><i class="bi bi-box me-1"></i>Raf: <span class="fw-bold text-dark">${escapeHtml(cleanLocCode)}</span>${emptyBadge}</div>
                </div>
            </div>
            <div class="d-flex align-items-center justify-content-between w-100 mt-2 mt-md-0 w-md-25">
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control target-loc-qty border-success text-center fw-bold shadow-sm" placeholder="Miktar" min="0" step="any">
                    <select class="form-select border-success bg-light text-success fw-bold w-auto raf-birim-secici" tabindex="-1">
                        <option value="base" data-multiplier="1">Birim</option>
                    </select>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger ms-2"><i class="bi bi-trash"></i></button>
            </div>
        `;

        const qtyInp = div.querySelector('.target-loc-qty');
        qtyInp.addEventListener('input', updateBaslangicStok);
        
        const selInp = div.querySelector('.raf-birim-secici');
        if (selInp) {
            selInp.addEventListener('change', updateBaslangicStok);
            syncUnitDropdowns(); // Apply current base/alt unit names to the new select
        }

        const removeBtn = div.querySelector('button');
        removeBtn.addEventListener('click', () => {
            div.remove();
            updateBaslangicStok();
            if (hedefListesi.children.length === 0) {
                hedefListesi.innerHTML = `<div class="p-3 text-center text-muted small fst-italic" id="bosListeUyari">Henüz raf eklemediniz. (Başlangıç stoğu 0 olacak)</div>`;
            }
        });

        hedefListesi.appendChild(div);
    });
}

// =========================================================================
// ÜRÜN EKLE/DÜZENLE MODALI İÇİN DİNAMİK KURALLAR (PIM) RENDER MOTORU
// =========================================================================
// (Eski loadCategoryRulesForProduct çağrısı silindi, yenisi aşağıda urunKategoriSelectForm ile dinleniyor)

function yeniUrunCevrimTablosunuGuncelle() {
    const kapsayici = document.getElementById("yeniUrunCevrimTablosuKapsayici");
    const liste = document.getElementById("yeniUrunCevrimListesi");
    
    if (!kapsayici || !liste) return;
    
    if (yeniUrunCevrimleri.length === 0) {
        kapsayici.classList.add("d-none");
        liste.innerHTML = "";
        return;
    }
    
    kapsayici.classList.remove("d-none");
    liste.innerHTML = "";
    
    yeniUrunCevrimleri.forEach(cevrim => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="fw-medium">${escapeHtml(cevrim.alternativeUnitName.split(' (')[0])}</td>
            <td>1 ${escapeHtml(cevrim.alternativeUnitName.split(' (')[0])} = <span class="fw-bold">${cevrim.conversionFactor}</span> Taban</td>
            <td class="text-center">
                ${cevrim.isDefault 
                    ? '<i class="bi bi-check-circle-fill text-success fs-5"></i>' 
                    : '<i class="bi bi-dash-circle text-muted fs-5"></i>'}
            </td>
            <td class="text-end">
                <button type="button" class="btn btn-sm btn-outline-danger btn-yeni-urun-cevrim-sil px-2 rounded-pill" data-id="${cevrim.alternativeUnitId}">
                    <i class="bi bi-trash3"></i> Sil
                </button>
            </td>
        `;
        liste.appendChild(tr);
    });

    const refSelect = document.getElementById("yeniUrunReferansBirimId");
    if (refSelect) {
        refSelect.innerHTML = '<option value="base">Taban Birim</option>';
        yeniUrunCevrimleri.forEach(c => {
            refSelect.innerHTML += `<option value="${c.alternativeUnitId}">${escapeHtml(c.alternativeUnitName.split(' (')[0])}</option>`;
        });
    }
}
const urunKategoriSelectForm = document.getElementById('urunKategoriId');
if (urunKategoriSelectForm) {
    urunKategoriSelectForm.addEventListener('change', async function (e) {
        const categoryId = e.target.value || this.value;
        const container = document.getElementById('dynamicAttributesContainer');
        const attributeArea = document.getElementById('dynamicAttributesArea');

        if (!categoryId) {
            if (attributeArea) attributeArea.classList.add('d-none');
            document.getElementById('skuGenerationArea')?.classList.add('d-none');
            if (container) container.innerHTML = '';
            return;
        }

        try {
            if (attributeArea) attributeArea.classList.remove('d-none');
            document.getElementById('skuGenerationArea')?.classList.remove('d-none');
            if (container) container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border spinner-border-sm text-primary"></div> Kurallar yükleniyor...</div>';

            const rules = await apiRequest(`/attribute-rules/category/${categoryId}`, 'GET');
            // Backend'den gelen kurallar artık DisplayOrder değerine göre sıralanmış durumdadır.
            if (container) container.innerHTML = ''; // İçini temizle
            if (rules.length === 0) {
                if (attributeArea) attributeArea.classList.add('d-none');
                return;
            }

            let validRuleIndex = 0;
            rules.forEach(rule => {
                const tl = rule.targetLevel ? rule.targetLevel.toLowerCase().trim() : "";
                if (tl === "asset" || tl === "ekipman" || tl === "ekipman") return;

                let inputHtml = '';
                let requiredAttr = rule.isRequired ? 'required' : '';
                let starHtml = rule.isRequired ? '<span class="text-danger">*</span>' : '';
                let skipHtml = !rule.isRequired ? `<a href="#" class="text-primary text-decoration-none ms-3 small fw-normal btn-skip border rounded px-2 py-1 bg-white shadow-sm" title="Zorunlu değil, atla">Atla <i class="bi bi-arrow-right"></i></a>` : '';

                let options = [];
                if (rule.allowedValues && rule.allowedValues !== "[]") {
                    try { options = JSON.parse(rule.allowedValues); }
                    catch (e) { options = rule.allowedValues.split(',').map(s => s.trim()); }
                }

                // Renk tipinde: hex kodlarını (Label) rule.allowedValueList'ten eşleştir
                if (rule.uiComponent === "color_picker" && rule.allowedValueList) {
                    options = options.map(val => {
                        const eslesen = rule.allowedValueList.find(a => a.value === val);
                        return { value: val, hex: eslesen ? eslesen.label : val };
                    });
                }

                inputHtml = DynamicUI.renderFormInput(rule, options, escapeHtml);
                let uiType = rule.uiComponent || rule.dataType;

                if (uiType === 'searchable_dropdown' || uiType === 'autocomplete') {
                    let optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}">`).join('');
                    inputHtml = `<input list="datalist_${rule.id}" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="text" placeholder="Seçiniz veya yazınız..." ${requiredAttr}>
                                 <datalist id="datalist_${rule.id}">${optionsHtml}</datalist>`;
                }
                else if (uiType === 'dropdown' || uiType === 'icon_dropdown') {
                    let optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
                    inputHtml = `<select class="form-select dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="dropdown" ${requiredAttr}>
                                    <option value="">Seçiniz...</option>${optionsHtml}
                                 </select>`;
                }
                else if (uiType === 'radio' || uiType === 'segmented_button') {
                    inputHtml = `<div class="mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="radio">`;
                    options.forEach((opt, idx) => {
                        let isSeg = uiType === 'segmented_button';
                        let btnCls = isSeg ? 'btn-check' : 'form-check-input';
                        let lblCls = isSeg ? 'btn btn-outline-primary btn-sm' : 'form-check-label';
                        if (isSeg) {
                            inputHtml += `<input class="${btnCls}" type="radio" name="rule_${rule.id}" id="rule_${rule.id}_${idx}" value="${escapeHtml(opt)}" ${requiredAttr}>
                                          <label class="${lblCls} me-1 mb-1" for="rule_${rule.id}_${idx}">${escapeHtml(opt)}</label>`;
                        } else {
                            inputHtml += `<div class="form-check form-check-inline">
                                            <input class="${btnCls}" type="radio" name="rule_${rule.id}" id="rule_${rule.id}_${idx}" value="${escapeHtml(opt)}" ${requiredAttr}>
                                            <label class="${lblCls}" for="rule_${rule.id}_${idx}">${escapeHtml(opt)}</label>
                                          </div>`;
                        }
                    });
                    inputHtml += `</div>`;
                }
                else if (uiType === 'checkbox_group') {
                    inputHtml = `<div class="mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="checkbox_group">`;
                    options.forEach((opt, idx) => {
                        inputHtml += `<div class="form-check form-check-inline">
                                        <input class="form-check-input" type="checkbox" id="rule_${rule.id}_${idx}" value="${escapeHtml(opt)}">
                                        <label class="form-check-label" for="rule_${rule.id}_${idx}">${escapeHtml(opt)}</label>
                                      </div>`;
                    });
                    inputHtml += `</div>`;
                }
                else if (uiType === 'slider' || uiType === 'range_slider_integer' || uiType === 'range_slider_decimal') {
                    let rMin = rule.minValue !== null ? rule.minValue : 0;
                    let rMax = rule.maxValue !== null ? rule.maxValue : 100;
                    let rStep = (rule.dataType === 'decimal' || uiType === 'range_slider_decimal') ? 0.1 : 1;
                    inputHtml = `<div class="d-flex align-items-center dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="range_slider" data-min="${rMin}" data-max="${rMax}">
                                    <input type="range" class="form-range flex-grow-1" min="${rMin}" max="${rMax}" step="${rStep}" value="${rMin}" id="rule_${rule.id}">
                                    <input type="number" class="form-control form-control-sm ms-2 text-center w-75px" id="val_${rule.id}" value="${rMin}" min="${rMin}" max="${rMax}" step="${rStep}">
                                 </div>`;
                }
                else if (uiType === 'color_picker') {
                    let defaultColors = ["Siyah", "Beyaz", "Gri", "Gümüş", "Altın", "Kırmızı", "Mavi", "Yeşil", "Sarı", "Turuncu", "Mor", "Pembe", "Lacivert", "Kahverengi", "Bej"];
                    let colors = (options && options.length > 0) ? options : defaultColors;

                    const getColorHex = (cName) => {
                        const normalized = cName.toLocaleLowerCase('tr-TR').trim();
                        const map = {
                            "siyah": "#000000", "beyaz": "#ffffff", "gri": "#9e9e9e", "gümüş": "#c0c0c0", "gumus": "#c0c0c0",
                            "altın": "#ffd700", "altin": "#ffd700", "kırmızı": "#f44336", "kirmizi": "#f44336",
                            "mavi": "#2196f3", "yeşil": "#4caf50", "yesil": "#4caf50", "sarı": "#ffeb3b", "sari": "#ffeb3b",
                            "turuncu": "#ff9800", "mor": "#9c27b0", "pembe": "#e91e63", "lacivert": "#1a237e",
                            "kahverengi": "#795548", "bej": "#f5f5dc", "bordo": "#800000", "krem": "#ffdab9"
                        };
                        if (cName.startsWith('#')) return cName;
                        return map[normalized] || map[cName.toLowerCase().trim()] || "#cccccc";
                    };

                    let liHtml = colors.map((opt, idx) => {
                        let deger = (typeof opt === 'object') ? opt.value : opt;
                        let hex = (typeof opt === 'object' && opt.hex) ? opt.hex : getColorHex(deger);
                        return `<div class="form-check mb-1">
                                    <input class="form-check-input color-radio-item" type="radio" name="color_${rule.id}" id="color_${rule.id}_${idx}" value="${escapeHtml(deger)}" data-rule-id="${rule.id}" ${requiredAttr}>
                                    <label class="form-check-label d-flex align-items-center cursor-pointer" for="color_${rule.id}_${idx}">
                                        <svg width="18" height="18" class="svg-color-circle" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="9" cy="9" r="8" fill="${hex}" stroke="#aaa" stroke-width="1"/>
                                        </svg>
                                        ${escapeHtml(deger)}
                                    </label>
                                </div>`;
                    }).join('');

                    inputHtml = `
                        <div class="dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="color_picker">
                            <div class="collapse show" id="collapseColor_${rule.id}">
                                <div class="card card-body p-2 border-0 shadow-sm scrollable-card">${liHtml}</div>
                            </div>
                        </div>
                    `;
                }
                else if (uiType === 'toggle_switch' || uiType === 'checkbox' || uiType === 'boolean') {
                    inputHtml = `<div class="form-check form-switch mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="boolean">
                                    <input class="form-check-input" type="checkbox" id="rule_${rule.id}">
                                    <label class="form-check-label text-muted" for="rule_${rule.id}">Evet / Açık</label>
                                 </div>`;
                }
                else if (uiType === 'masked_textbox') {
                    inputHtml = `<input type="text" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="text" ${requiredAttr} placeholder="Örn: XXXX-XXXX">`;
                }
                else if (rule.dataType === 'number') {
                    inputHtml = `<input type="number" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="number" ${requiredAttr}>`;
                }
                else if (rule.dataType === 'decimal') {
                    inputHtml = `<input type="number" step="0.1" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="decimal" ${requiredAttr}>`;
                }
                else if (uiType === 'datepicker' || rule.dataType === 'date') {
                    inputHtml = `<input type="date" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="date" ${requiredAttr}>`;
                }
                else if (uiType === 'datetimepicker' || rule.dataType === 'datetime') {
                    inputHtml = `<input type="datetime-local" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="datetime" ${requiredAttr}>`;
                }
                else {
                    inputHtml = `<input type="text" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="text" ${requiredAttr}>`;
                }

                const div = document.createElement('div');
                div.className = `col-md-6 mb-4 dynamic-rule-wrapper ${validRuleIndex > 0 ? 'd-none' : ''}`;
                div.dataset.index = validRuleIndex;
                if (uiType === 'toggle_switch' || uiType === 'checkbox' || uiType === 'boolean') {
                    div.dataset.isBoolean = 'true';
                }

                if (rule.dataType === 'color_picker') {
                    div.innerHTML = `<a class="text-decoration-none text-dark d-flex align-items-center mb-2" data-bs-toggle="collapse" href="#collapseColor_${rule.id}" role="button" aria-expanded="true">
                                        <label class="form-label small fw-bold mb-0 cursor-pointer">${escapeHtml(rule.attributeKey)} ${starHtml}</label>
                                        <i class="bi bi-caret-down-fill text-warning ms-1"></i>
                                     </a>
                                     ${skipHtml}
                                     ${inputHtml}`;
                } else {
                    div.innerHTML = `<label class="form-label small fw-bold d-flex align-items-center mb-2">${escapeHtml(rule.attributeKey)} ${starHtml} ${skipHtml}</label>
                                     ${inputHtml}`;
                }
                container.appendChild(div);
                validRuleIndex++;
            });

            if (typeof $ !== 'undefined' && $.fn.selectpicker) {
                $('.selectpicker.dynamic-rule-input').selectpicker();
            }

            // PIM - Sırayla Gösterme Mantığı (Event Listener'ları 1 kez ekle)
            if (!container.dataset.pimListenersAttached) {
                container.dataset.pimListenersAttached = 'true';

                const revealNext = (wrapper) => {
                    if (!wrapper) return;
                    const nextIndex = parseInt(wrapper.dataset.index) + 1;
                    const nextDiv = container.querySelector(`.dynamic-rule-wrapper[data-index="${nextIndex}"]`);
                    if (nextDiv && nextDiv.classList.contains('d-none')) {
                        nextDiv.classList.remove('d-none');
                        nextDiv.classList.add('animate__animated', 'animate__fadeIn');

                        if (nextDiv.dataset.isBoolean === 'true') {
                            revealNext(nextDiv);
                        }
                    }
                };

                // Sayfa yüklendiğinde ilk eleman boolean ise hemen sonrakini de aç
                setTimeout(() => {
                    const firstEl = container.querySelector('.dynamic-rule-wrapper[data-index="0"]');
                    if (firstEl && firstEl.dataset.isBoolean === 'true') {
                        revealNext(firstEl);
                    }
                }, 50);

                container.addEventListener('input', (e) => revealNext(e.target.closest('.dynamic-rule-wrapper')));
                container.addEventListener('change', (e) => revealNext(e.target.closest('.dynamic-rule-wrapper')));
                container.addEventListener('click', (e) => {
                    const btnSkip = e.target.closest('.btn-skip');
                    if (btnSkip) {
                        e.preventDefault();
                        revealNext(btnSkip.closest('.dynamic-rule-wrapper'));
                    }
                });
            }

            const rangeContainers = container.querySelectorAll('.dynamic-rule-input[data-rule-type="range_slider"]');
            rangeContainers.forEach(div => {
                const range = div.querySelector('input[type="range"]');
                const numberInput = div.querySelector('input[type="number"]');
                const min = parseFloat(div.getAttribute('data-min')) || 0;
                const max = parseFloat(div.getAttribute('data-max')) || 100;

                if (range && numberInput) {
                    range.addEventListener('input', function () { numberInput.value = this.value; });
                    numberInput.addEventListener('input', function () {
                        let val = parseFloat(this.value);
                        if (isNaN(val)) val = min;
                        if (val < min) val = min;
                        if (val > max) val = max;
                        range.value = val;
                    });
                }
            });

        } catch (error) {
            if (container) container.innerHTML = `<div class="col-12 text-center text-danger-small"><i class="bi bi-exclamation-triangle"></i> Hata: ${error.message}</div>`;
        }
    });
}

// =========================================================================
// TABLO ÇİZİMİ, MODALLAR VE SİLME/DÜZENLEME
// =========================================================================


const btnUrunKaydetEl = document.getElementById("btnUrunKaydet");
if (btnUrunKaydetEl) {
    btnUrunKaydetEl.addEventListener("click", async () => {
        const form = document.getElementById("urunFormu");
        if (form && !form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById("urunId").value;
        const name = document.getElementById("urunAdi").value;
        const barcode = document.getElementById("urunBarkod").value;
        const minStockLevelEl = document.getElementById("urunMinStok");
        const categoryId = document.getElementById("urunKategoriId").value;
        const unitId = document.getElementById("urunBirimId").value;
        
        let selectedRacks = [];
        if (!id) {
            const rackItems = document.querySelectorAll('.target-location-item');
            rackItems.forEach(item => {
                const locId = item.getAttribute('data-loc-id');
                const qtyInput = item.querySelector('.target-loc-qty');
                if (locId) {
                    selectedRacks.push({ locationId: parseInt(locId), quantity: getBaseQuantity(qtyInput) });
                }
            });
            
            if (selectedRacks.length === 0) {
                hataGoster("Lütfen başlangıç için en az bir raf ekleyin.");
                return;
            }
        }

        const btnKaydet = document.getElementById("btnUrunKaydet");

        const urunVerisi = {
            name: name,
            barcode: barcode,
            minStockLevel: getBaseQuantity(minStockLevelEl),
            categoryId: parseInt(categoryId) || null,
            unitId: parseInt(unitId) || null,
            targetLocationId: !id ? selectedRacks[0].locationId : 0,
            initialQuantity: !id ? selectedRacks[0].quantity : 0,
            cost: 0,
            price: 0,
            unitConversions: []
        };

        if (!id) {
            yeniUrunCevrimleri.forEach(cevrim => {
                urunVerisi.unitConversions.push({
                    alternativeUnitId: parseInt(cevrim.alternativeUnitId),
                    conversionFactor: parseFloat(cevrim.conversionFactor),
                    isDefault: cevrim.isDefault
                });
            });
        }

        const dinamikInputlar = document.querySelectorAll('.dynamic-rule-input');
        if (dinamikInputlar.length > 0) {
            urunVerisi.attributes = [];
            dinamikInputlar.forEach(input => {
                const ruleId = parseInt(input.getAttribute('data-rule-id'));
                const key = input.getAttribute('data-rule-key');
                const type = input.getAttribute('data-rule-type');
                let val = "";

                if (type === "radio") {
                    const checked = input.querySelector('input[type="radio"]:checked');
                    if (checked) val = checked.value;
                } else if (type === "checkbox_group") {
                    const checkedBoxes = Array.from(input.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                    if (checkedBoxes.length > 0) val = checkedBoxes.join(", ");
                } else if (type === "boolean") {
                    const checkbox = input.querySelector('input[type="checkbox"]');
                    val = checkbox.checked ? "true" : "false";
                } else if (type === "range_slider") {
                    val = input.querySelector('input[type="range"]').value;
                } else if (type === "discrete_slider") {
                    val = input.querySelector('input[type="hidden"]').value;
                } else if (type === "color_picker") {
                    const checkedRb = input.querySelector('.color-radio-item:checked');
                    if (checkedRb) val = checkedRb.value;
                    else val = input.querySelector('input[type="color"]')?.value || "";
                } else {
                    val = input.value;
                }

                if (ruleId && key && val !== "") {
                    urunVerisi.attributes.push({
                        ruleId: ruleId,
                        key: key,
                        value: val
                    });
                }
            });
        }

        const metod = id ? "PUT" : "POST";
        const adres = id ? `/products/${id}` : '/products';

        try {
            const orjinalMetin = btnKaydet.innerText;
            btnKaydet.disabled = true;
            btnKaydet.innerText = "Kaydediliyor...";

            const createdProduct = await apiRequest(adres, metod, urunVerisi);
            const newProductId = id ? id : createdProduct.id;
            
            if (!id && selectedRacks.length > 1) {
                for (let i = 1; i < selectedRacks.length; i++) {
                    const rack = selectedRacks[i];
                    if (rack.quantity > 0) {
                        const movePayload = {
                            type: 'GIRIS',
                            productId: newProductId,
                            quantity: rack.quantity,
                            targetLocationId: rack.locationId,
                            description: 'Başlangıç stok girişi (Çoklu Raf)'
                        };
                        await apiRequest('/stock/movements', 'POST', movePayload);
                    }
                }
            }

            basariToast(id ? "Ürün güncellendi" : "Ürün eklendi");

            // FORM PENCERESİ: kaydetme bitti → açık liste pencerelerine haber
            // ver ve bu pencereyi kapat. Listeyi burada tazelemeye çalışmak
            // anlamsız; bu pencerede liste yok.
            if (window.ModalWindow && ModalWindow.isFormWindow) {
                ModalWindow.done('products');
                return;
            }

            const modalElement = document.getElementById("urunModal");
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
            if (modalInstance) modalInstance.hide();

            document.getElementById("urunFormu").reset();
            document.getElementById("urunId").value = "";

            aktifArama = "";
            window.history.pushState({}, document.title, window.location.pathname);
            const aramaKutusu = document.getElementById("aramaKutusu");
            if (aramaKutusu) aramaKutusu.value = "";

            urunleriYukle(currentPage);
            btnKaydet.disabled = false;
            btnKaydet.innerText = "Ekle ve Kaydet";
        } catch (hata) {
            hataGoster("İşlem başarısız: " + hata.message);
            btnKaydet.disabled = false;
            btnKaydet.innerText = id ? "Güncelle" : "Ekle ve Kaydet";
        }
    });
}

async function urunSil(id) {
    if (!(await onayla("Bu ürünü silmek istediğinize emin misiniz?", "Evet, sil"))) return;


    try {
        await apiRequest(`/products/${id}`, 'DELETE');
        urunleriYukle(currentPage);
        basariToast("Ürün silindi");
    } catch (hata) {
        hataGoster("Ürün silinemedi: " + hata.message);
    }
}



function urunDuzenle(id) {
    const urun = tumUrunler.find(u => u.id === id);
    if (!urun) return;

    document.getElementById("urunId").value = urun.id;
    document.getElementById("urunAdi").value = urun.name;
    document.getElementById("urunBarkod").value = urun.barcode;
    document.getElementById("urunMinStok").value = urun.minStockLevel;
    if(document.getElementById("urunBirimId")) document.getElementById("urunBirimId").value = urun.unitId;

    buildCategoryCascader('urunKategoriContainer', 'urunKategoriId', urun.categoryId || null, false);

    document.getElementById("modalBaslik").innerText = "Ürün Düzenle";
    const depoSecimi = document.getElementById("depoSecimiAlani");
    if (depoSecimi) depoSecimi.classList.add("d-none");
    const rafSecimi = document.getElementById("rafSecimiAlani");
    if (rafSecimi) rafSecimi.classList.add("d-none");
    const baslangicStok = document.getElementById("baslangicStokAlani");
    if (baslangicStok) baslangicStok.classList.add("d-none");
    document.getElementById("btnUrunKaydet").innerText = "Güncelle";

    const tedAlani = document.getElementById("duzenleTedarikciAlani");
    if (hasPermission("Supplier.Edit") && tedAlani) {
        tedAlani.classList.remove("d-none");
        duzenleTedarikciYukle(urun.id);
        duzenleTedarikciSecenekleriniYukle();
    } else if (tedAlani) {
        tedAlani.classList.add("d-none");
    }

    const cevrimAlani = document.getElementById("duzenleBirimCevrimAlani");
    if (cevrimAlani) {
        cevrimAlani.classList.remove("d-none");
        duzenleBirimCevrimleriYukle(urun.id);
        duzenleAlternatifBirimSecenekleriniYukle(urun.unitId);
    }
    const hizliCevrim = document.getElementById("yeniUrunHizliCevrimAlani");
    if (hizliCevrim) hizliCevrim.classList.add("d-none");

    const event = new Event('change');
    document.getElementById("urunKategoriId").dispatchEvent(event);

    setTimeout(() => {
        if (urun.attributes && Array.isArray(urun.attributes)) {
            urun.attributes.forEach(attr => {
                const input = document.querySelector(`.dynamic-rule-input[data-rule-id="${attr.ruleId}"]`);
                if (input) {
                    const type = input.getAttribute('data-rule-type');
                    if (type === 'radio') {
                        const radio = input.querySelector(`input[type="radio"][value="${attr.value}"]`);
                        if (radio) radio.checked = true;
                    } else if (type === 'checkbox_group') {
                        const values = attr.value.split(',').map(s => s.trim());
                        values.forEach(v => {
                            const cb = input.querySelector(`input[type="checkbox"][value="${v}"]`);
                            if (cb) cb.checked = true;
                        });
                    } else if (type === 'boolean') {
                        const cb = input.querySelector(`input[type="checkbox"]`);
                        if (cb) cb.checked = (attr.value === "true");
                    } else if (type === 'range_slider') {
                        const range = input.querySelector(`input[type="range"]`);
                        if (range) {
                            let decimals = parseInt(range.getAttribute('data-decimals')) || 0;
                            let formattedValue = Number(attr.value).toFixed(decimals);
                            range.value = formattedValue;
                            const numberInput = document.getElementById(`val_${attr.ruleId}`);
                            if (numberInput) numberInput.value = formattedValue;
                        }
                    } else if (type === 'discrete_slider') {
                        const range = input.querySelector(`input[type="range"]`);
                        const hidden = input.querySelector(`input[type="hidden"]`);
                        const textInput = input.querySelector(`input[type="text"]`);
                        if (range && hidden && input.dataset.options) {
                            let optionsArr = JSON.parse(input.dataset.options);
                            let idx = optionsArr.findIndex(o => String(o).toLowerCase() === String(attr.value).toLowerCase());
                            if (idx !== -1) {
                                range.value = idx;
                                hidden.value = optionsArr[idx];
                                if (textInput) textInput.value = optionsArr[idx];
                            }
                        }
                    } else if (type === 'color_picker') {
                        const rb = input.querySelector(`input[type="radio"][value="${attr.value}"]`);
                        if (rb) rb.checked = true;
                        else {
                            const colorInput = input.querySelector(`input[type="color"]`);
                            if (colorInput) colorInput.value = attr.value;
                        }
                    } else if (type === 'decimal') {
                        input.value = Number(attr.value).toFixed(1);
                    } else if (type === 'number') {
                        input.value = Number(attr.value).toFixed(0);
                    } else {
                        input.value = attr.value;
                    }
                }
            });
        }

        document.querySelectorAll('.dynamic-rule-wrapper').forEach(wrapper => {
            wrapper.classList.remove('d-none');
        });
        document.getElementById('skuGenerationArea')?.classList.remove('d-none');
    }, 500);

    // Form penceresindeysek modal zaten sayfaya monte edilmiş durumda;
    // ayrıca "göster" demeye gerek yok. Liste penceresindeysek bu fonksiyona
    // hiç girilmez (düzenle düğmesi doğrudan pencere açar).
    if (!(window.ModalWindow && ModalWindow.isFormWindow)) {
        const modalElement = document.getElementById("urunModal");
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();
    }
}

if (tabloGovdesi) {
    tabloGovdesi.addEventListener("click", (e) => {
        const btnPrint = e.target.closest(".btn-print-barcode");
        const btnDuzenle = e.target.closest(".btn-duzenle");
        const btnSil = e.target.closest(".btn-sil");
        const btnIncele = e.target.closest(".btn-incele");

        if (btnPrint) {
            openBarcodePrintModal(btnPrint.getAttribute("data-barcode"), btnPrint.getAttribute("data-name"), btnPrint.getAttribute("data-id"));
        } else if (btnIncele) {
            urunDetayGoster(parseInt(btnIncele.getAttribute("data-id")), { tedarikciYonetimi: hasPermission("Supplier.Edit") });
        } else if (btnDuzenle) {
            const duzenleId = parseInt(btnDuzenle.getAttribute("data-id"));
            // Liste penceresinde düzenleme ayrı bir PENCEREDE açılır; böylece
            // liste açık kalır ve iki kayıt yan yana karşılaştırılabilir.
            if (window.ModalWindow &&
                ModalWindow.open("urunModal", { id: duzenleId }, "Ürün Düzenle")) {
                return;
            }
            urunDuzenle(duzenleId);
        } else if (btnSil) {
            urunSil(parseInt(btnSil.getAttribute("data-id")));
        }
    });
}

// Boş ürün formunu hazırlar.
// Eskiden yalnızca "Yeni Ürün Ekle" düğmesinin tıklama dinleyicisi içindeydi;
// form penceresi de aynı hazırlığı yapması gerektiği için ayrı fonksiyona
// alındı. Düğme artık bu fonksiyonu çağırıyor, davranış birebir aynı.
function yeniUrunFormuHazirla() {
    {
        document.getElementById("urunFormu").reset();
        document.getElementById("urunId").value = "";
        document.getElementById("modalBaslik").innerText = "Yeni Ürün Ekle";

        buildCategoryCascader('urunKategoriContainer', 'urunKategoriId', null, false);

        const baslangicStok = document.getElementById("baslangicStokAlani");
        if (baslangicStok) baslangicStok.classList.remove("d-none");


        
        // Reset racks list
        const hedefListesi = document.getElementById("hedefLokasyonlarListesi");
        if (hedefListesi) {
            hedefListesi.innerHTML = `<div class="p-3 text-center text-muted small fst-italic" id="bosListeUyari">Henüz raf eklemediniz. (Başlangıç stoğu 0 olacak)</div>`;
        }
        
        const urunDepo = document.getElementById("urunDepoId");
        if (urunDepo) urunDepo.value = "";
        const urunRaf = document.getElementById("urunRafId");
        if (urunRaf) {
            urunRaf.innerHTML = '<option value="">Önce depo seçin...</option>';
            urunRaf.disabled = true;
        }

        const btnHedefRaf = document.getElementById("btnHedefRafEkle");
        if (btnHedefRaf) btnHedefRaf.disabled = true;

        const dynamicAttr = document.getElementById("dynamicAttributesArea");
        if (dynamicAttr) dynamicAttr.classList.add("d-none");
        document.getElementById("skuGenerationArea")?.classList.add('d-none');
        const dynamicContainer = document.getElementById("dynamicAttributesContainer");
        if (dynamicContainer) dynamicContainer.innerHTML = "";

        const tedAlani = document.getElementById("duzenleTedarikciAlani");
        if (tedAlani) tedAlani.classList.add("d-none");

        const cevrimAlani = document.getElementById("duzenleBirimCevrimAlani");
        if (cevrimAlani) cevrimAlani.classList.add("d-none");

        const hizliCevrim = document.getElementById("yeniUrunHizliCevrimAlani");
        if (hizliCevrim) {
            hizliCevrim.classList.remove("d-none");
            document.getElementById("yeniUrunAlternatifBirimId").value = "";
            document.getElementById("yeniUrunCevrimCarpani").value = "";
            yeniUrunCevrimleri = [];
            if (typeof yeniUrunCevrimTablosunuGuncelle === 'function') yeniUrunCevrimTablosunuGuncelle();
        }

        document.getElementById("btnUrunKaydet").innerText = "Ekle ve Kaydet";
    }
}

const btnYeniUrunModal = document.querySelector('[data-bs-target="#urunModal"]');
if (btnYeniUrunModal) {
    btnYeniUrunModal.addEventListener("click", yeniUrunFormuHazirla);
}

async function dropdownDepolariYukle() {
    try {
        const data = await apiRequest('/warehouses?pageSize=1000', 'GET');
        const depolar = data.items || data;
        const select = document.getElementById("urunDepoId");
        if (select) {
            select.innerHTML = '<option value="">Depo Seçiniz...</option>';
            depolar.forEach(depo => {
                const option = document.createElement("option");
                option.value = depo.id;
                option.textContent = escapeHtml(depo.name);
                select.appendChild(option);
            });
        }
    } catch (hata) {
        console.error("Depo dropdown yükleme hatası:", hata);
    }
}

dropdownDepolariYukle();

function syncUnitDropdowns() {
    const baseUnitSelect = document.getElementById("urunBirimId");
    if (!baseUnitSelect) return;
    const baseOpt = baseUnitSelect.options[baseUnitSelect.selectedIndex];
    let baseUnitName = baseOpt && baseOpt.value ? baseOpt.textContent.split(' (')[0] : "Birim";
    
    const altUnitSelect = document.getElementById("yeniUrunAlternatifBirimId");
    const altOpt = altUnitSelect && altUnitSelect.options[altUnitSelect.selectedIndex];
    let altUnitName = altOpt && altOpt.value ? altOpt.textContent.split(' (')[0] : "";
    const altUnitMultiplier = document.getElementById("yeniUrunCevrimCarpani")?.value;
    
    const updateDropdown = (selectEl, isBaseOnly) => {
        if (!selectEl) return;
        const currentVal = selectEl.value;
        selectEl.innerHTML = `<option value="base" data-multiplier="1">${escapeHtml(baseUnitName)}</option>`;
        
        if (altUnitSelect && altUnitSelect.value && altUnitMultiplier && !isBaseOnly) {
            selectEl.innerHTML += `<option value="alt" data-multiplier="${altUnitMultiplier}">${escapeHtml(altUnitName)}</option>`;
        }
        
        if (currentVal === 'alt' && altUnitSelect && altUnitSelect.value && altUnitMultiplier) {
            selectEl.value = 'alt';
        } else {
            selectEl.value = 'base';
        }
    };

    updateDropdown(document.getElementById("minStokBirimSecici"), false);
    document.querySelectorAll(".raf-birim-secici").forEach(sel => {
        updateDropdown(sel, false);
    });
    
    // updateBaslangicStok can be called if available to recalculate base total
    if (typeof updateBaslangicStok === 'function') {
        updateBaslangicStok();
    } else {
        // Fallback scope resolution
        const urunBaslangicStok = document.getElementById("urunBaslangicStok");
        if (urunBaslangicStok) {
            const rackItems = document.querySelectorAll('.target-location-item');
            let total = 0;
            rackItems.forEach(item => {
                const qtyInput = item.querySelector('.target-loc-qty');
                if (qtyInput) {
                    const rawVal = parseFloat(qtyInput.value) || 0;
                    const selectEl = qtyInput.parentElement.querySelector('select');
                    let mult = 1;
                    if (selectEl) {
                        const opt = selectEl.options[selectEl.selectedIndex];
                        mult = parseFloat(opt.getAttribute('data-multiplier')) || 1;
                    }
                    total += (rawVal * mult);
                }
            });
            urunBaslangicStok.value = total;
        }
    }
}

async function dropdownBirimleriYukle() {
    try {
        const data = await apiRequest('/units', 'GET');
        window.tumBirimler = data;
        const select = document.getElementById("urunBirimId");
        const hizliSelect = document.getElementById("yeniUrunAlternatifBirimId");
        if (select) {
            select.innerHTML = '<option value="">Seçiniz...</option>';
            if (hizliSelect) hizliSelect.innerHTML = '<option value="">Seçiniz...</option>';
            data.forEach(birim => {
                const option = document.createElement("option");
                option.value = birim.id;
                option.textContent = escapeHtml(`${birim.name} (${birim.shortCode})`);
                option.dataset.allowsDecimal = birim.allowsDecimal;
                select.appendChild(option);
                
                if (hizliSelect) {
                    const optHizli = document.createElement("option");
                    optHizli.value = birim.id;
                    optHizli.textContent = escapeHtml(`${birim.name} (${birim.shortCode})`);
                    hizliSelect.appendChild(optHizli);
                }
            });
            
            select.addEventListener('change', function() {
                const selectedOpt = this.options[this.selectedIndex];
                const allowsDec = selectedOpt?.dataset.allowsDecimal === 'true';
                document.getElementById('urunMinStok').step = allowsDec ? '0.001' : '1';
                if(document.getElementById('urunBaslangicStok')) {
                    document.getElementById('urunBaslangicStok').step = allowsDec ? '0.001' : '1';
                }
                syncUnitDropdowns();
            });
            if (hizliSelect) hizliSelect.addEventListener('change', syncUnitDropdowns);
            const hizliCarpan = document.getElementById('yeniUrunCevrimCarpani');
            if (hizliCarpan) hizliCarpan.addEventListener('input', syncUnitDropdowns);
        }
    } catch (hata) {
        console.error("Birim dropdown yükleme hatası:", hata);
    }
}
dropdownBirimleriYukle();

async function dropdownTedarikcileriYukle() {
    try {
        const data = await apiRequest('/suppliers?pageSize=1000', 'GET');
        const tedarikciler = data.items || data;
        const sel = document.getElementById('filtreTedarikci');
        if (!sel) return;
        tedarikciler.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            sel.appendChild(opt);
        });
    } catch (err) {
        console.error("Tedarikçiler yüklenemedi", err);
    }
}
dropdownTedarikcileriYukle();


// --- FİLTRELEME İŞLEMLERİ ---
document.getElementById('filtreKategoriId')?.addEventListener('change', async function () {
    const categoryId = this.value;
    const filterArea = document.getElementById('dynamicFilterArea');
    const filterContainer = document.getElementById('dynamicFilterContainer');

    if (!categoryId) {
        filterArea.classList.add('d-none');
        filterContainer.innerHTML = '';
        currentPage = 1;
        veriyiGuncelle();
        return;
    }

    try {
        filterArea.classList.remove('d-none');
        // Önce filtreleri temizle ki eski filtreler yeni kategoriye etki etmesin
        filterContainer.innerHTML = '<div class="col-12 text-center text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Özellikler yükleniyor...</div>';

        // Şimdi listeyi güncelle
        currentPage = 1;
        veriyiGuncelle();

        const rules = await apiRequest(`/attribute-rules/category/${categoryId}`, 'GET');

        filterContainer.innerHTML = '';

        const validRules = rules.filter(r => r.targetLevel !== "Asset");

        if (validRules.length === 0) {
            filterContainer.innerHTML = '<div class="col-12 text-muted fst-italic">Bu kategoriye ait filtrelenebilir özellik bulunamadı.</div>';
            return;
        }

        validRules.forEach(rule => {
            let options = [];
            if (rule.allowedValues && rule.allowedValues !== "[]") {
                try { options = JSON.parse(rule.allowedValues); }
                catch (e) { options = rule.allowedValues.split(',').map(s => s.trim()); }
            }

            if (rule.uiComponent === "color_picker" && rule.allowedValueList) {
                options = options.map(val => {
                    const eslesen = rule.allowedValueList.find(a => a.value === val);
                    return { value: val, hex: eslesen ? eslesen.label : val };
                });
            }

            let inputHtml = DynamicUI.renderFilterInput(rule, options, escapeHtml);

            const div = document.createElement('div');
            div.className = 'col-12 mb-3'; // Dikey liste için tam genişlik
            div.innerHTML = `<label class="form-label small fw-bold mb-1">${escapeHtml(rule.attributeKey)}</label>
                             ${inputHtml}`;
            filterContainer.appendChild(div);
        });

        document.querySelectorAll('.double-slider').forEach(el => {
            try {
                let id = el.id.replace('slider_', '');
                let hidden = document.getElementById(`filter_hidden_${id}`);

                if (el.hasAttribute('data-options')) {
                    // Özel dizi değerli slider
                    let optionsArr = JSON.parse(el.dataset.options || '[]');
                    let lblMin = document.getElementById(`filter_min_lbl_${id}`);
                    let lblMax = document.getElementById(`filter_max_lbl_${id}`);

                    let format = {
                        to: function (value) { return String(optionsArr[Math.round(value)] || ''); },
                        from: function (value) { return optionsArr.indexOf(String(value)); }
                    };

                    noUiSlider.create(el, {
                        start: [0, Math.max(0, optionsArr.length - 1)],
                        connect: true,
                        step: 1,
                        range: { 'min': 0, 'max': Math.max(1, optionsArr.length - 1) },
                        tooltips: true,
                        format: format,
                        pips: { mode: 'steps', format: format }
                    });

                    el.noUiSlider.on('update', function (values, handle) {
                        let minIdx = optionsArr.indexOf(values[0]);
                        let maxIdx = optionsArr.indexOf(values[1]);
                        if (minIdx === -1) minIdx = 0;
                        if (maxIdx === -1) maxIdx = optionsArr.length - 1;

                        if (handle === 0 && lblMin) lblMin.innerText = optionsArr[minIdx];
                        if (handle === 1 && lblMax) lblMax.innerText = optionsArr[maxIdx];

                        if (minIdx === 0 && maxIdx === optionsArr.length - 1) {
                            hidden.value = "";
                        } else {
                            let validValues = optionsArr.slice(minIdx, maxIdx + 1).map(v => String(v).toLowerCase());
                            hidden.value = JSON.stringify(validValues);
                        }
                    });

                    el.noUiSlider.on('change', function () {
                        hidden.dispatchEvent(new Event('input'));
                    });
                } else {
                    // Sayısal aralıklı slider
                    let min = parseFloat(el.dataset.min);
                    let max = parseFloat(el.dataset.max);
                    if (isNaN(min)) min = 0;
                    if (isNaN(max)) max = 1000;
                    if (min >= max) max = min + 100;
                    let step = parseFloat(el.dataset.step) || 1;

                    let isDec = step < 1;
                    noUiSlider.create(el, {
                        start: [min, max],
                        connect: true,
                        step: step,
                        range: { 'min': min, 'max': max },
                        tooltips: true,
                        format: {
                            to: function (value) { return Number(value).toFixed(isDec ? 1 : 0); },
                            from: function (value) { return Number(value); }
                        }
                    });

                    let minIn = document.getElementById(`filter_min_${id}`);
                    let maxIn = document.getElementById(`filter_max_${id}`);

                    el.noUiSlider.on('update', function (values, handle) {
                        if (handle === 0) { if (minIn) minIn.value = values[0]; }
                        else { if (maxIn) maxIn.value = values[1]; }

                        let currentMin = parseFloat(values[0]);
                        let currentMax = parseFloat(values[1]);
                        if (currentMin === min && currentMax === max) {
                            hidden.value = "";
                        } else {
                            hidden.value = `${minIn ? minIn.value : values[0]}-${maxIn ? maxIn.value : values[1]}`;
                        }
                    });

                    el.noUiSlider.on('change', function () {
                        hidden.dispatchEvent(new Event('input'));
                    });

                    if (minIn) minIn.addEventListener('change', function () {
                        el.noUiSlider.set([this.value, null]);
                        hidden.dispatchEvent(new Event('input'));
                    });
                    if (maxIn) maxIn.addEventListener('change', function () {
                        el.noUiSlider.set([null, this.value]);
                        hidden.dispatchEvent(new Event('input'));
                    });
                }
            } catch (err) {
                console.error("Slider initialization failed for", el, err);
            }
        });

        // Dinamik filtrelere event listener ekle
        document.querySelectorAll('.kural-filtresi').forEach(el => {
            el.addEventListener('input', () => {
                currentPage = 1;
                veriyiGuncelle();
            });
            el.addEventListener('change', () => {
                currentPage = 1;
                veriyiGuncelle();
            });
        });

    } catch (e) {
        console.error("Filtre kuralları yüklenirken hata:", e);
        filterContainer.innerHTML = '<div class="col-12 text-danger">Özellikler yüklenemedi.</div>';
    }
});

document.getElementById('filtreStokDurumu')?.addEventListener('change', () => { currentPage = 1; veriyiGuncelle(); });
document.getElementById('filtreTedarikci')?.addEventListener('change', () => { currentPage = 1; veriyiGuncelle(); });
document.getElementById('filtreBaslangicTarihi')?.addEventListener('change', () => { currentPage = 1; veriyiGuncelle(); });
document.getElementById('filtreBitisTarihi')?.addEventListener('change', () => { currentPage = 1; veriyiGuncelle(); });

// --- Temel Fiyat Aralığı Slider Başlangıç ---
const priceSlider = document.getElementById('slider_baseFiyat');
const minPriceIn = document.getElementById('filtreMinFiyat');
const maxPriceIn = document.getElementById('filtreMaxFiyat');

if (priceSlider) {
    noUiSlider.create(priceSlider, {
        start: [0, 100000],
        connect: true,
        step: 100,
        range: { 'min': 0, 'max': 100000 }
    });

    priceSlider.noUiSlider.on('update', function (values, handle) {
        let currentMin = Math.round(values[0]);
        let currentMax = Math.round(values[1]);
        let rangeMax = parseFloat(priceSlider.dataset.dynamicMax) || 999999;

        if (handle === 0 && minPriceIn) {
            minPriceIn.value = (currentMin <= 0) ? '' : currentMin;
        }
        if (handle === 1 && maxPriceIn) {
            maxPriceIn.value = (currentMax >= rangeMax) ? '' : currentMax;
        }
    });

    priceSlider.noUiSlider.on('change', function () {
        currentPage = 1; veriyiGuncelle();
    });

    if (minPriceIn) {
        minPriceIn.addEventListener('change', function () {
            let currentValues = priceSlider.noUiSlider.get();
            let newVal = parseFloat(this.value);
            if (isNaN(newVal)) newVal = 0;
            priceSlider.noUiSlider.set([newVal, currentValues[1]]);
            currentPage = 1; veriyiGuncelle();
        });
    }
    if (maxPriceIn) {
        maxPriceIn.addEventListener('change', function () {
            let currentValues = priceSlider.noUiSlider.get();
            let newVal = parseFloat(this.value);
            if (isNaN(newVal)) newVal = parseFloat(priceSlider.dataset.dynamicMax) || 999999;
            priceSlider.noUiSlider.set([currentValues[0], newVal]);
            currentPage = 1; veriyiGuncelle();
        });
    }
}

function updatePriceSliderMax() {
    const pSlider = document.getElementById('slider_baseFiyat');
    if (!pSlider || !pSlider.noUiSlider) return;

    let maxPrice = 0;
    if (typeof tumUrunler !== 'undefined' && tumUrunler && tumUrunler.length > 0) {
        maxPrice = Math.max(...tumUrunler.map(u => hesaplaGecerliFiyat(u)));
    }

    if (maxPrice <= 0 || !isFinite(maxPrice)) {
        maxPrice = 100000;
    } else {
        // En yakın onluğa/yüzlüğe yuvarla biraz pay bırak
        maxPrice = Math.ceil(maxPrice * 1.2 / 100) * 100;
    }

    pSlider.dataset.dynamicMax = maxPrice;

    // Slider sınırını ve kolları max değere göre genişlet (böylece inputlar otomatik boş/placeholder moduna geçer)
    pSlider.noUiSlider.updateOptions({
        start: [0, maxPrice],
        range: { 'min': 0, 'max': maxPrice }
    });
}
// --- Temel Fiyat Aralığı Slider Bitiş ---

document.getElementById('btnFiltreleriTemizle')?.addEventListener('click', () => {
    document.getElementById('aramaKutusu').value = '';
    aktifArama = '';

    if (document.getElementById('filtreTedarikci')) document.getElementById('filtreTedarikci').value = '';
    if (document.getElementById('filtreBaslangicTarihi')) document.getElementById('filtreBaslangicTarihi').value = '';
    if (document.getElementById('filtreBitisTarihi')) document.getElementById('filtreBitisTarihi').value = '';
    if (document.getElementById('filtreStokDurumu')) document.getElementById('filtreStokDurumu').value = '';
    if (document.getElementById('filtreMinFiyat')) document.getElementById('filtreMinFiyat').value = '';
    if (document.getElementById('filtreMaxFiyat')) document.getElementById('filtreMaxFiyat').value = '';

    if (priceSlider && priceSlider.noUiSlider) {
        let maxVal = priceSlider.dataset.dynamicMax ? parseFloat(priceSlider.dataset.dynamicMax) : 999999;
        priceSlider.noUiSlider.set([0, maxVal]);
    }

    const catSelect = document.getElementById('filtreKategoriId');
    if (catSelect) {
        catSelect.value = '';
        const event = new Event('change');
        catSelect.dispatchEvent(event);

        // Kategori arayüzünü (Cascader) görsel olarak baştan çizerek sıfırla
        if (typeof buildCategoryCascader === 'function') {
            buildCategoryCascader('filtreKategoriContainer', 'filtreKategoriId', null, true);
        }
    }
});

// =========================================================================
// SKU ÜRETME FONKSİYONU
// =========================================================================
async function generateSku() {
    const categoryId = document.getElementById("urunKategoriId")?.value;
    if (!categoryId) {
        uyariGoster("Lütfen SKU üretmeden önce bir kategori seçin.");
        return;
    }

    const attributes = [];
    const dinamikInputlar = document.querySelectorAll('.dynamic-rule-input');
    dinamikInputlar.forEach(input => {
        const ruleId = parseInt(input.getAttribute('data-rule-id'));
        const key = input.getAttribute('data-rule-key');
        const type = input.getAttribute('data-rule-type');
        let val = "";

        if (type === "radio") {
            const checked = input.querySelector('input[type="radio"]:checked');
            if (checked) val = checked.value;
        } else if (type === "checkbox_group") {
            const checkedBoxes = Array.from(input.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            if (checkedBoxes.length > 0) val = checkedBoxes.join(", ");
        } else if (type === "boolean") {
            const checkbox = input.querySelector('input[type="checkbox"]');
            if (checkbox) val = checkbox.checked ? "true" : "false";
        } else if (type === "range_slider") {
            const range = input.querySelector('input[type="range"]');
            if (range) val = range.value;
        } else if (type === "discrete_slider") {
            const hidden = input.querySelector('input[type="hidden"]');
            if (hidden) val = hidden.value;
        } else if (type === "color_picker") {
            const checkedRb = input.querySelector('.color-radio-item:checked');
            if (checkedRb) val = checkedRb.value;
            else {
                const cPick = input.querySelector('input[type="color"]');
                if (cPick) val = cPick.value;
            }
        } else {
            val = input.value;
        }

        if (ruleId && key && val !== "") {
            attributes.push({ ruleId: ruleId, key: key, value: val });
        }
    });

    const btn = document.getElementById("btnSkuUret");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Üretiliyor...';
    }

    try {
        const response = await apiRequest('/products/generate-sku', 'POST', {
            categoryId: parseInt(categoryId),
            attributes: attributes
        });

        if (response && response.sku) {
            Swal.fire({
                title: 'Barkod Üretildi!',
                html: `Oluşturulan Barkod: <strong class="fs-4 text-primary">${response.sku}</strong><br><br>Bu barkodu kullanmak istiyor musunuz? İstemezseniz formun üst kısmından kendiniz girebilirsiniz.`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: '<i class="bi bi-check-lg"></i> Evet, Kullan',
                cancelButtonText: '<i class="bi bi-x-lg"></i> Hayır, Kendim Gireceğim',
                confirmButtonColor: '#0d6efd',
                cancelButtonColor: '#6c757d',
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    document.getElementById("urunBarkod").value = response.sku;
                    basariToast("Üretilen barkod uygulandı.");
                }
            });
        }
    } catch (hata) {
        hataGoster("SKU üretilirken hata oluştu: " + hata.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-magic"></i> SKU Üret';
        }
    }
}

const btnSkuUretEl = document.getElementById('btnSkuUret');
if (btnSkuUretEl) {
    btnSkuUretEl.addEventListener('click', generateSku);
}

// =========================================================================
// BARKOD ÇİZİM VE YAZDIRMA (PRINT) İŞLEMLERİ
// =========================================================================
function openBarcodePrintModal(barcode, productName, productId) {
    document.getElementById("barcodeProductName").textContent = productName;

    // JsBarcode kütüphanesi ile SVG elementine Code128 formatında çizim yapıyoruz
    JsBarcode("#barcodeCanvas", barcode, {
        format: "CODE128",
        lineColor: "#000",
        width: 1.5, // Uzun barkodlar çok genişleyip bulanıklaşmasın diye çizgileri biraz incelttik
        height: 60,
        displayValue: true,
        fontSize: 14, // Yazı tipini biraz küçülttük
        margin: 10
    });

    // QR Kod oluşturma (CSP Uyumlu QRious kütüphanesi)
    const qrCanvas = document.getElementById("qrcodeCanvas");
    if (qrCanvas) {
        // QR Kodu, direkt uygulamanın ürün inceleme sayfasına yönlendirir 

        new QRious({
            element: qrCanvas,
            value: barcode, // Akıllı yönlendirme linki
            size: 120,
            background: 'white',
            backgroundAlpha: 1,
            foreground: 'black',
            foregroundAlpha: 1,
            level: 'H'
        });
    }

    // Modal açılırken her zaman varsayılan olarak Barkod görünümüne sıfırla
    const barcodeCanvas = document.getElementById('barcodeCanvas');
    const qrcodeCanvas = document.getElementById('qrcodeCanvas');
    const btnToggle = document.getElementById('btnToggleCodeType');

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

document.getElementById('btnToggleCodeType')?.addEventListener('click', function () {
    const barcodeCanvas = document.getElementById('barcodeCanvas');
    const qrcodeCanvas = document.getElementById('qrcodeCanvas');
    const isQrVisible = !qrcodeCanvas.classList.contains('d-none');

    if (isQrVisible) {
        // Barkoda Geç
        qrcodeCanvas.classList.add('d-none');
        qrcodeCanvas.classList.remove('d-flex');
        barcodeCanvas.classList.remove('d-none');
        this.innerHTML = '<i class="bi bi-qr-code me-1"></i> QR Koda Geç';
        document.querySelector('#barcodePrintModal .modal-title').innerHTML = '<i class="bi bi-printer me-2 text-primary"></i>Barkod Yazdır';
    } else {
        // QR Koda Geç
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

// Barkod Yazdırma (Print) Butonu Event Listener'ı (CSP Uyumlu)
document.getElementById('btnPrintBarcodeAction')?.addEventListener('click', printBarcode);

// =========================================================================
// KAMERA İLE ARAMA VE DETAY OTO-AÇILIŞ ENTEGRASYONU
// =========================================================================
// Ürünler sayfasındaki kamera olaylarını başlatan ve yöneten kapsayıcı fonksiyon
function initProductSearchCamera() {
    const btnKameraAc = document.getElementById("btnKameraAcUrunler");
    const scannerModalEl = document.getElementById("scannerModalUrunler");

    btnKameraAc?.addEventListener('click', async () => {
        const durumEl = document.getElementById('kameraDurumUrunler');

        // Butonu kilitler. Kullanıcının art arda tıklamasını engeller.
        if (btnKameraAc) btnKameraAc.disabled = true;

        const scannerModalInstance = bootstrap.Modal.getOrCreateInstance(scannerModalEl);

        try {
            if (typeof checkCameraPermission === 'function') {
                await checkCameraPermission();
            }

            // İzin alındı Artık modalı güvenle açabiliriz.
            scannerModalInstance.show();

            if (durumEl) {
                durumEl.textContent = "Kamera başlatılıyor...";
                durumEl.className = "text-center text-muted small mt-3 fw-bold";
            }

            if (typeof startScanner === 'function') {
                let isProcessingQR = false;

                // Motorun kamerayı açmasını bekler.
                await startScanner("readerUrunler", async (scannedText) => {
                    if (isProcessingQR) return;
                    isProcessingQR = true;

                    try {
                        let gtinToSearch = scannedText;
                        if (typeof window.parseGs1Barcode === 'function') {
                            const parsedGs1 = window.parseGs1Barcode(scannedText);
                            if (parsedGs1.isGs1 && parsedGs1.gtin) {
                                gtinToSearch = parsedGs1.gtin;
                            }
                        }

                        const bulunanUrun = tumUrunler.find(u => (u.barcode || "").toLowerCase() === gtinToSearch.toLowerCase() || (u.barcode || "").toLowerCase() === scannedText.toLowerCase());

                        if (bulunanUrun) {
                            if (durumEl) {
                                durumEl.textContent = `Barkod Okundu: ${scannedText}. Ürün aranıyor...`;
                                durumEl.className = "text-center text-success small mt-3 fw-bold";
                            }

                            const aramaKutusu = document.getElementById('aramaKutusu');
                            if (aramaKutusu) {
                                aramaKutusu.value = scannedText;
                                aktifArama = scannedText.toLowerCase();
                                veriyiGuncelle();
                            }

                            stopScanner();
                            setTimeout(() => scannerModalInstance.hide(), 400);

                            setTimeout(() => {
                                urunDetayGoster(bulunanUrun.id, { tedarikciYonetimi: hasPermission("Supplier.Edit") });
                            }, 800);
                        } else {
                            stopScanner();
                            scannerModalInstance.hide();

                            setTimeout(async () => {
                                await uyariGoster(`Okutulan barkod (${scannedText}) sistemde bulunamadı!`);
                            }, 100);
                        }
                    } finally {
                        isProcessingQR = false;
                    }
                }, () => {
                    if (durumEl && durumEl.className.includes("text-muted") && !isProcessingQR) {
                        durumEl.textContent = "Karekod veya Barkod aranıyor, kameraya gösterin...";
                    }
                });
            }
        } catch (error) {
            if (btnKameraAc) btnKameraAc.disabled = false;

            try {
                scannerModalInstance.hide();
            } catch (e) {
            }

            // scanner.js motorundan gelen Türkçe hatayı gösterir
            const hataMetni = error?.message ? error.message : "Kameraya erişilemedi veya izin reddedildi.";
            uyariGoster(hataMetni);
        }
    });

    // Modal kapandığında kamerayı güvenle durdurur ve butonu açar.
    scannerModalEl?.addEventListener('hidden.bs.modal', () => {
        if (typeof stopScanner === 'function') stopScanner();
        if (btnKameraAc) btnKameraAc.disabled = false;
    });
}

// =========================================================================
// BARKOD OKUYUCU DİNLEYİCİ (SCANNER LISTENER)
// =========================================================================
let scannerBuffer = "";
let scannerTimer = null;

document.addEventListener("keydown", (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;

    if (e.key === "Enter") {
        if (scannerBuffer.length > 2) {
            e.preventDefault();
            let gtinToSearch = scannerBuffer;
            if (typeof window.parseGs1Barcode === 'function') {
                const parsedGs1 = window.parseGs1Barcode(scannerBuffer);
                if (parsedGs1.isGs1 && parsedGs1.gtin) {
                    gtinToSearch = parsedGs1.gtin;
                }
            }
            const p = tumUrunler.find(u => (u.barcode || "").toLowerCase() === gtinToSearch.toLowerCase() || (u.barcode || "").toLowerCase() === scannerBuffer.toLowerCase());
            if (p && typeof urunDetayAc === 'function') {
                urunDetayGoster(p.id, { tedarikciYonetimi: hasPermission("Supplier.Edit") });
                if (typeof basariToast === 'function') basariToast(`"${scannerBuffer}" barkodlu ürün okundu.`);
            } else {
                if (typeof hataGoster === 'function') hataGoster(`"${scannerBuffer}" kodlu ürün bulunamadı.`);
            }
        }
        scannerBuffer = "";
        clearTimeout(scannerTimer);
        return;
    }

    if (e.key.length === 1) {
        scannerBuffer += e.key;
        clearTimeout(scannerTimer);
        scannerTimer = setTimeout(() => { scannerBuffer = ""; }, 100);
    }
});

// =========================================================================
// YENİ ÜRÜN BARKOD OKUYUCU ENTEGRASYONU
// =========================================================================
function initYeniUrunCamera() {
    const btnKameraAc   = document.getElementById("btnYeniUrunKameraAc");
    const btnKameraKapat = document.getElementById("btnKameraKapatYeniUrun");
    const kameraAlani   = document.getElementById("kameraAlaniYeniUrun");
    const urunBarkodInput = document.getElementById("urunBarkod");

    // Kamerayı kapatır ve alanı gizler. Hem "Kapat" düğmesi hem başarılı
    // okuma hem de hata durumu aynı yolu kullanır — kamera açık unutulmaz.
    const kamerayiKapat = () => {
        if (typeof stopScanner === 'function') stopScanner();
        if (kameraAlani) kameraAlani.classList.add("d-none");
        if (btnKameraAc) btnKameraAc.disabled = false;
    };

    btnKameraKapat?.addEventListener("click", kamerayiKapat);

    btnKameraAc?.addEventListener('click', async () => {
        if (btnKameraAc.disabled) return;
        btnKameraAc.disabled = true;

        try {
            if (typeof checkCameraPermission === 'function') {
                await checkCameraPermission();
            }

            // İzin alındı: kamera FORMUN İÇİNDE açılır (Stok Hareketleri ile
            // aynı kalıp). Ayrı modal açılmaz; kullanıcı formdan kopmaz.
            if (kameraAlani) kameraAlani.classList.remove("d-none");

            let isleniyor = false;

            await startScanner("readerYeniUrun", async (okunanMetin) => {
                if (isleniyor) return;
                isleniyor = true;

                try {
                    // GS1 barkodlarında asıl ürün kodu (GTIN) ayıklanır
                    let yazilacak = okunanMetin;
                    if (typeof window.parseGs1Barcode === 'function') {
                        const gs1 = window.parseGs1Barcode(okunanMetin);
                        if (gs1.isGs1 && gs1.gtin) yazilacak = gs1.gtin;
                    }

                    if (urunBarkodInput) {
                        urunBarkodInput.value = yazilacak;
                        // Barkod alanına bağlı doğrulama/dinleyiciler tetiklensin
                        urunBarkodInput.dispatchEvent(new Event('input', { bubbles: true }));
                        urunBarkodInput.dispatchEvent(new Event('change', { bubbles: true }));
                        if (typeof basariToast === 'function') {
                            basariToast(`Barkod okundu: ${yazilacak}`);
                        }
                    }

                    kamerayiKapat();
                } finally {
                    setTimeout(() => { isleniyor = false; }, 1000);
                }
            }, () => { /* anlık okuma hataları yok sayılır */ });

        } catch (error) {
            kamerayiKapat();
            const hataMetni = error?.message || "Kameraya erişilemedi veya izin reddedildi.";
            if (typeof uyariGoster === 'function') uyariGoster(hataMetni);
        }
    });
}

// =========================================================================
// UYGULAMA BAŞLATICI FONKSİYON
// =========================================================================
// PENCEREYE TAŞINACAK MODALLAR
// Kural (bkz. js/modal-window.js başındaki açıklama): içinde kaydırma,
// adımlar veya çok alanlı veri girişi olan modallar PENCERE olur; tek amaçlı,
// bak-kapat türü küçük kutular MODAL kalır.
//   urunModal          → uzun, bölümlü form, kaydırmalı  → pencere
//   importWizardModal  → çok adımlı sihirbaz             → pencere
//   barcodePrintModal  → tek barkod göster/yazdır        → modal kalır
//   scannerModalUrunler→ anlık kamera görüntüsü          → modal kalır
if (window.ModalWindow) {
    ModalWindow.register({
        urunModal: 'Ürün Formu',
        importWizardModal: 'Excel İçe Aktarma'
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadAuthContext();

    // FORM PENCERESİ: sayfa "?modal=urunModal" ile açıldı.
    // Liste, filtreler ve dışa aktarma yüklenmez — bu pencerede yalnızca form
    // var. Böylece parametreli kipin maliyeti (gereksiz liste isteği) kalkar.
    const formPenceresi = window.ModalWindow && ModalWindow.isFormWindow;

    if (formPenceresi) {
        initYeniUrunCamera();
        // Form açılır listeleri (depo / kategori) yine gerekli
        await dropdownDepolariYukle();
        await dropdownKategorileriniYukle();

        const duzenlenecekId = new URLSearchParams(window.location.search).get('id');
        if (duzenlenecekId) {
            // DİKKAT: urunDuzenle() ürünü BELLEKTEKİ listeden (tumUrunler)
            // arar ve bulamazsa hiçbir şey yapmadan çıkar. Form penceresinde
            // liste hiç yüklenmediği için o liste boştur — düzenleme formu
            // boş "Yeni Ürün Ekle" hâlinde kalırdı. Bu yüzden kaydı tek
            // başına sunucudan çekip listeye koyuyoruz.
            try {
                const urun = await apiRequest(`/products/${duzenlenecekId}`, 'GET');
                tumUrunler = [urun];
                urunDuzenle(parseInt(duzenlenecekId));
            } catch (hata) {
                hataGoster('Ürün bilgisi alınamadı: ' + hata.message);
            }
        } else {
            yeniUrunFormuHazirla();
        }
        return;
    }

    // 1. Kamera ve barkod dinleyicilerini aktif et
    initProductSearchCamera();
    initYeniUrunCamera();

    // 2. Yetki kontrolü (Ürün ekleme yetkisi yoksa butonu gizle)
    if (!hasPermission("Product.Add")) {
        const btnEkle = document.querySelector('[data-bs-target="#urunModal"]');
        if (btnEkle) btnEkle.classList.add('d-none');
    }

    // 3. Dışa Aktarma (Export) butonlarını bağla
    document.getElementById('btnExportExcel')?.addEventListener('click', exportProductsToExcel);
    document.getElementById('btnExportPdf')?.addEventListener('click', exportProductsToPDF);
    document.getElementById('btnExportCsv')?.addEventListener('click', exportProductsToCSV);

    // Başka bir pencerede ürün eklenip güncellendiğinde liste kendini tazeler
    if (window.ModalWindow) {
        ModalWindow.onChanged('products', () => urunleriYukle(currentPage));
    }

    // 4. TEMEL VERİLERİ SIRAYLA VE GÜVENLE YÜKLE
    await dropdownDepolariYukle();
    await dropdownKategorileriniYukle();
    await urunleriYukle(currentPage);

    // 5. Veriler başarıyla indikten sonra URL'den gelen özel parametreleri güvenle işle
    const urlParams = new URLSearchParams(window.location.search);
    const urlSearch = urlParams.get('search');

    if (urlSearch) {
        aktifArama = urlSearch.toLowerCase();
        const aramaInput = document.getElementById("aramaKutusu");
        if (aramaInput) aramaInput.value = urlSearch;
        veriyiGuncelle();
    }

    const viewProductId = urlParams.get('viewProductId');
    if (viewProductId && typeof urunDetayAc === 'function') {
        await urunDetayGoster(parseInt(viewProductId), { tedarikciYonetimi: hasPermission("Supplier.Edit") });
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const viewProductBarcode = urlParams.get('viewProductBarcode');
    if (viewProductBarcode && typeof urunDetayAc === 'function') {
        const p = tumUrunler.find(u => (u.barcode || "").toLowerCase() === viewProductBarcode.toLowerCase());
        if (p) {
            urunDetayGoster(p.id, { tedarikciYonetimi: hasPermission("Supplier.Edit") });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
});

// =========================================================================
// TEDARİKÇİ YÖNETİMİ (Düzenle Modalı İçin)
// =========================================================================
async function duzenleTedarikciYukle(productId) {
    const tablo = document.getElementById("duzenleTedarikciListesi");
    if(!tablo) return;
    try{
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${productId}/suppliers`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Tedarikçiler alınamadı.");
        
        const liste = await cevap.json();
        tablo.innerHTML = "";

        if (liste.length === 0) { 
            tablo.innerHTML = `<tr><td colspan="3" class="text-center text-muted fst-italic py-4">Bu ürüne bağlı tedarikçi bulunmamaktadır.</td></tr>`; return; 
        }

        liste.forEach(ps => {
            tablo.innerHTML += `<tr>
                <td class="fw-semibold">${escapeHtml(ps.supplierName)}</td>
                <td class="text-muted fw-bold">${ps.purchasePrice != null ? escapeHtml(ps.purchasePrice.toString()) + ' ₺' : '-'}</td>
                <td class="text-end">
                    <button type="button" class="btn btn-sm btn-outline-danger rounded-pill btn-duzenle-tedarikci-kaldir shadow-sm px-3" data-sid="${escapeHtml(ps.supplierId.toString())}">
                        <i class="bi bi-trash3 me-1"></i> Kaldır
                    </button>
                </td>
            </tr>`;
        });
    } catch(hata) {
        tablo.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">${escapeHtml(hata.message)}</td></tr>`;
    }
}

async function duzenleTedarikciSecenekleriniYukle() {
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/suppliers?pageSize=1000`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!cevap.ok) throw new Error("Tedarikçiler alınamadı.");

        const data = await cevap.json();
        const tedarikciler = data.items || data;
        const select = document.getElementById("duzenleTedarikciSelect");

        if (select) {
            select.innerHTML = '<option value="">Tedarikçi seçin...</option>';
            tedarikciler.forEach(tedarikci => {
                const option = document.createElement("option");
                option.value = tedarikci.id;
                option.textContent = tedarikci.name;
                select.appendChild(option);
            });
        }
    } catch (hata) {
        console.error("Tedarikçi dropdown yükleme hatası:", hata);
        const select = document.getElementById("duzenleTedarikciSelect");
        if(select) select.innerHTML = '<option value="" disabled>Yüklenemedi!</option>';
    }
}

document.addEventListener("click", async (e) => {
    if (e.target.closest("#btnDuzenleTedarikciEkle")) {
        const urunId = document.getElementById("urunId").value;
        if (!urunId) return;

        const supplierId = document.getElementById("duzenleTedarikciSelect").value;
        const fiyat = document.getElementById("duzenleTedarikciFiyat").value;
        
        if (!supplierId) {
            uyariGoster("Lütfen tedarikçi seçin."); 
            return;
        }
        const veri ={
            supplierId: parseInt(supplierId),
            purchasePrice: fiyat ? parseFloat(fiyat): null,
            supplierProductCode: null,
            leadTimeDays: null,
            isPreferred: false
        };
        try{
            const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${urunId}/suppliers`, {
                method:"POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(veri)
            });

            if(!cevap.ok) throw new Error(await cevap.text() || "Bağlama başarısız.");

            duzenleTedarikciYukle(urunId);
            document.getElementById("duzenleTedarikciSelect").value = "";
            document.getElementById("duzenleTedarikciFiyat").value  = "";

            // Ayrıca listeyi arka planda güncelle
            urunleriYukle(currentPage);
        }catch(hata){
            hataGoster("Hata: " + hata.message);
        }
    }

    const kaldirBtn = e.target.closest(".btn-duzenle-tedarikci-kaldir");
    if (kaldirBtn) {
        const urunId = document.getElementById("urunId").value;
        if (!urunId) return;

        if (!(await onayla("Bu tedarikçi bağını kaldırmak istiyor musunuz?", "Evet, kaldır"))) return;
        const sid = kaldirBtn.getAttribute("data-sid");
        try{
            const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${urunId}/suppliers/${sid}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!cevap.ok) throw new Error("Silme başarısız.");
            duzenleTedarikciYukle(urunId);

            // Listeyi arka planda güncelle
            urunleriYukle(currentPage);
        } catch (hata) {
            hataGoster("Tedarikçi silinemedi: " + hata.message);
        }
    }
    if (e.target.closest("#btnYeniUrunCevrimEkle")) {
        const altUnitSelect = document.getElementById("yeniUrunAlternatifBirimId");
        const altUnitId = altUnitSelect.value;
        const altUnitName = altUnitSelect.options[altUnitSelect.selectedIndex]?.text || "";
        const factor = document.getElementById("yeniUrunCevrimCarpani").value;
        const isDefault = document.getElementById("yeniUrunCevrimVarsayilan").checked;
        
        if (!altUnitId || !factor) {
            uyariGoster("Lütfen birim seçin ve çevrim çarpanı girin.");
            return;
        }
        
        // Aynı birimden daha önce eklenmiş mi kontrol et
        const mevcut = yeniUrunCevrimleri.find(c => c.alternativeUnitId == altUnitId);
        if (mevcut) {
            uyariGoster("Bu birim için zaten bir çevrim eklenmiş.");
            return;
        }
        
        const refUnitId = document.getElementById("yeniUrunReferansBirimId").value;
        let baseFactor = 1;
        
        if (refUnitId !== "base") {
            const refUnit = yeniUrunCevrimleri.find(c => c.alternativeUnitId == refUnitId);
            if (refUnit) {
                baseFactor = refUnit.conversionFactor;
            }
        }
        
        const calculatedFactor = parseFloat(factor) * parseFloat(baseFactor);

        yeniUrunCevrimleri.push({
            alternativeUnitId: altUnitId,
            alternativeUnitName: altUnitName,
            conversionFactor: calculatedFactor,
            isDefault: isDefault
        });
        
        yeniUrunCevrimTablosunuGuncelle();
        
        document.getElementById("yeniUrunAlternatifBirimId").value = "";
        document.getElementById("yeniUrunCevrimCarpani").value = "";
        document.getElementById("yeniUrunCevrimVarsayilan").checked = true;
    }

    if (e.target.closest(".btn-yeni-urun-cevrim-sil")) {
        const btn = e.target.closest(".btn-yeni-urun-cevrim-sil");
        const altUnitId = btn.getAttribute("data-id");
        yeniUrunCevrimleri = yeniUrunCevrimleri.filter(c => c.alternativeUnitId != altUnitId);
        yeniUrunCevrimTablosunuGuncelle();
    }

    if (e.target.closest("#btnDuzenleCevrimEkle")) {
        const urunId = document.getElementById("urunId").value;
        if (!urunId) return;

        const altUnitId = document.getElementById("duzenleAlternatifBirimSelect").value;
        const factor = document.getElementById("duzenleCevrimCarpani").value;
        const isDefault = document.getElementById("duzenleCevrimVarsayilan").checked;
        
        if (!altUnitId || !factor) {
            uyariGoster("Lütfen birim seçin ve çevrim çarpanı girin."); 
            return;
        }

        const refSelect = document.getElementById("duzenleReferansBirimSelect");
        let baseFactor = 1;
        if (refSelect && refSelect.options.length > 0) {
            const selectedOpt = refSelect.options[refSelect.selectedIndex];
            if (selectedOpt && selectedOpt.dataset.factor) {
                baseFactor = parseFloat(selectedOpt.dataset.factor);
            }
        }
        
        const calculatedFactor = parseFloat(factor) * baseFactor;

        const veri = {
            productId: parseInt(urunId),
            alternativeUnitId: parseInt(altUnitId),
            conversionFactor: calculatedFactor,
            isDefault: isDefault
        };
        try {
            const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${urunId}/unit-conversions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(veri)
            });

            if (!cevap.ok) throw new Error(await cevap.text() || "Bağlama başarısız.");

            const json = await cevap.json();

            duzenleBirimCevrimleriYukle(urunId);
            document.getElementById("duzenleAlternatifBirimSelect").value = "";
            const ekleBtnElement = document.getElementById("btnDuzenleCevrimEkle");
            ekleBtnElement.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Ekle';
            ekleBtnElement.classList.remove("btn-warning");
            ekleBtnElement.classList.add("btn-primary");
            ekleBtnElement.removeAttribute("data-update-id");
            document.getElementById("duzenleCevrimCarpani").value = "";
            document.getElementById("duzenleCevrimVarsayilan").checked = false;

            urunleriYukle(currentPage);
            
            if (json && json.warning) {
                if (typeof uyariGoster === 'function') uyariGoster(json.warning);
            } else {
                if (typeof basariToast === 'function') basariToast("Birim çevrimi başarıyla eklendi.");
            }
        } catch (hata) {
            hataGoster("Hata: " + hata.message);
        }
    }

    const editCevrimBtn = e.target.closest(".btn-duzenle-cevrim-duzenle");
    const kaldirCevrimBtn = e.target.closest(".btn-duzenle-cevrim-kaldir");
    if (editCevrimBtn) {
        const cid = editCevrimBtn.getAttribute("data-cid");
        document.getElementById("duzenleAlternatifBirimSelect").value = editCevrimBtn.getAttribute("data-unit");
        document.getElementById("duzenleCevrimCarpani").value = editCevrimBtn.getAttribute("data-factor");
        
        const ekleBtn = document.getElementById("btnDuzenleCevrimEkle");
        ekleBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> G&uuml;ncelle';
        ekleBtn.classList.remove("btn-primary");
        ekleBtn.classList.add("btn-warning");
        ekleBtn.setAttribute("data-update-id", cid);
    }
    
    if (kaldirCevrimBtn) {
        const urunId = document.getElementById("urunId").value;
        if (!urunId) return;

        if (!(await onayla("Bu çevrim tanımını kaldırmak istiyor musunuz?", "Evet, kaldır"))) return;
        const cid = kaldirCevrimBtn.getAttribute("data-cid");
        try {
            const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${urunId}/unit-conversions/${cid}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!cevap.ok) throw new Error("Silme başarısız.");
            duzenleBirimCevrimleriYukle(urunId);

            urunleriYukle(currentPage);
        } catch (hata) {
            hataGoster("Çevrim silinemedi: " + hata.message);
        }
    }

    const barkodCevrimBtn = e.target.closest(".btn-duzenle-cevrim-barkod");
    const printCevrimBtn = e.target.closest(".btn-print-barcode");
    
    if (printCevrimBtn) {
        if (typeof openBarcodePrintModal === 'function') {
            openBarcodePrintModal(printCevrimBtn.getAttribute("data-barcode"), printCevrimBtn.getAttribute("data-name"), printCevrimBtn.getAttribute("data-id"));
        }
        return;
    }

    if (barkodCevrimBtn) {
        const urunId = document.getElementById("urunId").value;
        if (!urunId) return;

        const cid = barkodCevrimBtn.getAttribute("data-cid");
        try {
            const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${urunId}/unit-conversions/${cid}/generate-barcode`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!cevap.ok) {
                const hataJson = await cevap.json().catch(() => ({}));
                throw new Error(hataJson.message || "Barkod üretilemedi.");
            }
            
            if (typeof basariToast === 'function') basariToast("Koli barkodu başarıyla üretildi!");
            duzenleBirimCevrimleriYukle(urunId);
            urunleriYukle(currentPage);
        } catch (hata) {
            if (typeof uyariGoster === 'function') uyariGoster(hata.message);
            else hataGoster(hata.message);
        }
    }
});

// =========================================================================
// BİRİM ÇEVRİM YÖNETİMİ (Düzenle Modalı İçin)
// =========================================================================
async function duzenleBirimCevrimleriYukle(productId) {
    const tablo = document.getElementById("duzenleBirimCevrimListesi");
    if(!tablo) return;
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/products/${productId}/unit-conversions`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Çevrimler alınamadı.");
        
        const liste = await cevap.json();
        tablo.innerHTML = "";

        if (liste.length === 0) { 
            tablo.innerHTML = `<tr><td colspan="4" class="text-center text-muted fst-italic py-4">Bu ürüne bağlı alternatif birim çevrimi bulunmamaktadır.</td></tr>`; return; 
        }

        liste.forEach(c => {
            const defaultBadge = c.isDefault ? '<span class="badge bg-success">Evet</span>' : '<span class="text-muted">-</span>';
            const urunAdi = document.getElementById('duzenleAd') ? document.getElementById('duzenleAd').value : 'Ürün';
            
            const barkodGosterimi = c.barcode ? `<div class="small fw-bold text-primary mt-1 d-flex align-items-center btn-print-barcode" style="cursor: pointer;" data-barcode="${escapeHtml(c.barcode)}" data-name="${escapeHtml(urunAdi)} (${escapeHtml(c.alternativeUnitName)})" data-id="${productId}" title="Barkodu Yazdır (Tıkla)">
                <i class="bi bi-printer me-1"></i> <u>${escapeHtml(c.barcode)}</u>
            </div>` : '';
            
            tablo.innerHTML += `<tr>
                <td class="fw-semibold">
                    ${escapeHtml(c.alternativeUnitName)}
                    ${barkodGosterimi}
                </td>
                <td class="text-muted fw-bold">1 ${escapeHtml(c.alternativeUnitShortCode)} = ${c.conversionFactor} Taban Birim</td>
                <td>${defaultBadge}</td>
                <td class="text-end">
                    ${!c.barcode ? `<button type="button" class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle-cevrim-barkod shadow-sm px-2 me-1" data-cid="${c.id}" title="Otomatik Koli/Palet Barkodu Üret">
                        <i class="bi bi-upc-scan"></i> Barkod Üret
                    </button>` : ``}
                    <button type="button" class="btn btn-sm btn-outline-warning rounded-pill btn-duzenle-cevrim-duzenle shadow-sm px-2 me-1" data-cid="${c.id}" data-unit="${c.alternativeUnitId}" data-factor="${c.conversionFactor}" data-isdefault="${c.isDefault}" title="Düzenle">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger rounded-pill btn-duzenle-cevrim-kaldir shadow-sm px-2" data-cid="${c.id}" title="Kaldır">
                        <i class="bi bi-trash3"></i>
                    </button>
                </td>
            </tr>`;
        });

        const refSelect = document.getElementById("duzenleReferansBirimSelect");
        if (refSelect) {
            refSelect.innerHTML = '<option value="base" data-factor="1">Taban Birim</option>';
            liste.forEach(c => {
                refSelect.innerHTML += `<option value="${c.alternativeUnitId}" data-factor="${c.conversionFactor}">${escapeHtml(c.alternativeUnitName.split(' (')[0])}</option>`;
            });
        }
    } catch(hata) {
        tablo.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">${escapeHtml(hata.message)}</td></tr>`;
    }
}

function duzenleAlternatifBirimSecenekleriniYukle(urunBirimId) {
    const select = document.getElementById("duzenleAlternatifBirimSelect");
    if (!select || !window.tumBirimler) return;

    select.innerHTML = '<option value="">Birim seçin...</option>';
    window.tumBirimler.forEach(birim => {
        if (birim.id !== urunBirimId) {
            const option = document.createElement("option");
            option.value = birim.id;
            option.textContent = escapeHtml(`${birim.name} (${birim.shortCode})`);
            select.appendChild(option);
        }
    });
}
