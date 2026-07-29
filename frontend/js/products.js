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

// 1. URL'den search parametresini güvenli ve tek bir noktadan yakala
const urlParams = new URLSearchParams(window.location.search);
const urlSearch = urlParams.get('search');
if (urlSearch) {
    aktifArama = urlSearch.toLowerCase();
    document.addEventListener("DOMContentLoaded", () => {
        const aramaInput = document.getElementById("aramaKutusu");
        if (aramaInput) {
            aramaInput.value = urlSearch;
        }
    });
}

if (!token) window.location.href = 'login.html';

// XSS Koruması
function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Alt kategorileri recursive (özyineli) olarak bulan fonksiyon (Senin özelliğin)
function getAltKategoriIdleri(parentId) {
    let ids = [parseInt(parentId)];
    if (!window.tumKategoriler) return ids;
    let children = window.tumKategoriler.filter(c => c.parentId === parseInt(parentId));
    children.forEach(c => {
        ids = ids.concat(getAltKategoriIdleri(c.id));
    });
    return ids;
}

// =========================================================================
// VERİ GÜNCELLEME, FİLTRELEME VE ÖZET MOTORU
// =========================================================================
function veriyiGuncelle() {
    const seciliKategoriId = document.getElementById("filtreKategoriId")?.value;

    // Aktif dinamik filtreleri topla
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
        // 1. Genel Metin Araması
        const textMatch =
            (urun.name && urun.name.toLowerCase().includes(aktifArama)) ||
            (urun.barcode && urun.barcode.toLowerCase().includes(aktifArama)) ||
            (urun.categoryName && urun.categoryName.toLowerCase().includes(aktifArama)) ||
            (urun.id && urun.id.toString().includes(aktifArama));
        if (!textMatch) return false;

        // 2. Kategori Filtresi (Alt kategorileri de kapsar)
        if (seciliKategoriId) {
            const gecerliIdler = getAltKategoriIdleri(seciliKategoriId);
            if (!gecerliIdler.includes(urun.categoryId)) {
                return false;
            }
        }

        // 3. Dinamik Özellik Filtreleri
        if (dynamicFilters.length > 0) {
            if (!urun.attributes || !Array.isArray(urun.attributes)) return false;

            for (let filter of dynamicFilters) {
                // API either sends ruleId or key. We'll check both for robustness.
                const attr = urun.attributes.find(a => (a.ruleId && a.ruleId === filter.ruleId) || (a.key && a.key === filter.key));
                if (!attr) return false;

                if (filter.type === 'range') {
                    // Range filter value is "min-max"
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
                    } catch(e) {
                        return false;
                    }
                } else if (filter.type === 'multi_select') {
                    const selectedValues = filter.value; if (selectedValues.length > 0) { const attrVal = (attr.value ?? "").toString().toLocaleLowerCase("tr-TR"); const match = selectedValues.some(v => attrVal.includes(v)); if (!match) return false; }
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

    const yeniToplamSayfa = Math.ceil(filtreliUrunler.length / pageSize) || 1;
    if (currentPage > yeniToplamSayfa) currentPage = yeniToplamSayfa;

    const baslangic = (currentPage - 1) * pageSize;
    const bitis = baslangic + pageSize;
    const sayfadakiVeriler = filtreliUrunler.slice(baslangic, bitis);

    tabloyuCiz(sayfadakiVeriler);
    sayfalamayiCiz();

    // Senin eklediğin Özet Bilgi Fonksiyonunu Çağırıyoruz
    kategoriOzetiniGuncelle(filtreliUrunler);
}

// Tablonun altına filtrelenen ürün çeşidini ve TOPLAM STOK ADEDİNİ yazar (Senin özelliğin)
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
// DIŞA AKTARMA (EXPORT) FONKSİYONLARI (Mustafa'nın Eklediği Kısım)
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
    const tableColumn = ["ID", "Ürün Adı", "Barkod", "Kategori", "Mevcut Stok"];
    const tableRows = [];

    productData.forEach(p => {
        tableRows.push([p.id, p.name, p.barcode, p.categoryName || "-", p.stockQuantity]);
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
        csvContent += `${p.id};"${p.name}";"${p.barcode}";${p.minStockLevel};"${p.categoryName || "-"}";${p.stockQuantity}\n`;
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
// TOPLU İÇE AKTARMA (EXCEL IMPORT) (Mustafa'nın Eklediği Kısım)
// =========================================================================
async function handleExcelImport() {
    const fileInput = document.getElementById('excelImportFile');
    const alertContainer = document.getElementById('importReportAlert');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        if (alertContainer) alertContainer.innerHTML = `<div class="alert alert-warning rounded-3">Lütfen yüklenecek bir Excel (.xlsx) dosyası seçin.</div>`;
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    if (alertContainer) alertContainer.innerHTML = `<div class="alert alert-info rounded-3">Dosya satır satır denetleniyor, lütfen bekleyin...</div>`;

    try {
        const report = await apiRequest('/products/import', 'POST', formData);

        if(alertContainer) {
            let reportHtml = `
                <div class="alert ${report.errorCount > 0 ? 'alert-warning' : 'alert-success'} rounded-3 p-4 border shadow-sm">
                    <h5 class="fw-bold mb-3"><i class="bi bi-clipboard-data-fill"></i> İçe Aktarma Sonuç Raporu</h5>
                    <p class="mb-1"><strong>Toplam İşlenen Satır:</strong> ${report.totalRows}</p>
                    <p class="mb-1 text-success"><strong>Sisteme Eklenen Ürün:</strong> ${report.successCount}</p>
                    <p class="mb-3 text-danger"><strong>Hatalı/Engellenen Satır:</strong> ${report.errorCount}</p>
            `;

            if (report.errors && report.errors.length > 0) {
                reportHtml += `<h6 class="fw-bold text-muted mt-3 mb-2">Hata Detayları:</h6><ul class="list-group small mb-0">`;
                report.errors.forEach(err => {
                    reportHtml += `
                        <li class="list-group-item list-group-item-danger d-flex justify-content-between align-items-start mb-1 rounded-2">
                            <div class="ms-2 me-auto">
                                <div class="fw-bold text-dark">Satır ${err.rowNumber}</div>
                                ${err.errors.join('<br>')}
                            </div>
                        </li>`;
                });
                reportHtml += `</ul>`;
            }
            reportHtml += `</div>`;
            alertContainer.innerHTML = reportHtml;
        }

        urunleriYukle(currentPage);
    } catch (error) {
        if (alertContainer) alertContainer.innerHTML = `<div class="alert alert-danger rounded-3"><strong>Sistem Hatası:</strong> ${error.message}</div>`;
    }
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
        tumUrunler = sonuc.items || sonuc;
        currentPage = page;

        veriyiGuncelle();
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
    let btnClasses = isFilter ? 'btn form-control rounded-pill text-start bg-white border d-flex justify-content-between align-items-center' : 'btn form-control text-start bg-white border d-flex justify-content-between align-items-center';
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
                option.textContent = escapeHtml(raf.code);
                rafSelect.appendChild(option);
            });
        } catch (hata) {
            console.error("Raf dropdown yükleme hatası:", hata);
            rafSelect.innerHTML = '<option value="">Hata oluştu</option>';
        }
    });
}

// =========================================================================
// ÜRÜN EKLE/DÜZENLE MODALI İÇİN DİNAMİK KURALLAR (PIM) RENDER MOTORU
// =========================================================================
const urunKategoriSelectForm = document.getElementById('urunKategoriId');
if (urunKategoriSelectForm) {
    urunKategoriSelectForm.addEventListener('change', async function (e) {
        const categoryId = e.target.value || this.value;
        const container = document.getElementById('dynamicAttributesContainer');
        const attributeArea = document.getElementById('dynamicAttributesArea');

        if (!categoryId) {
            if (attributeArea) attributeArea.classList.add('d-none');
            if (container) container.innerHTML = '';
            return;
        }

        try {
            if (attributeArea) attributeArea.classList.remove('d-none');
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
                if (tl === "asset" || tl === "demirbaş" || tl === "demirbas") return;

                let inputHtml = '';
                let requiredAttr = rule.isRequired ? 'required' : '';
                let starHtml = rule.isRequired ? '<span class="text-danger">*</span>' : '';
                let skipHtml = !rule.isRequired ? `<a href="#" class="text-primary text-decoration-none ms-3 small fw-normal btn-skip border rounded px-2 py-1 bg-white shadow-sm" title="Zorunlu değil, atla">Atla <i class="bi bi-arrow-right"></i></a>` : '';

            let options = [];
            if (rule.allowedValues && rule.allowedValues !== "[]") {
                try { options = JSON.parse(rule.allowedValues); } 
                catch(e) { options = rule.allowedValues.split(',').map(s => s.trim()); }
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
                        let hex = getColorHex(opt);
                        return `<div class="form-check mb-1">
                                    <input class="form-check-input color-radio-item" type="radio" name="color_${rule.id}" id="color_${rule.id}_${idx}" value="${escapeHtml(opt)}" data-rule-id="${rule.id}" ${requiredAttr}>
                                    <label class="form-check-label d-flex align-items-center cursor-pointer" for="color_${rule.id}_${idx}">
                                        <svg width="18" height="18" class="svg-color-circle" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="9" cy="9" r="8" fill="${hex}" stroke="#aaa" stroke-width="1"/>
                                        </svg>
                                        ${escapeHtml(opt)}
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
                else {
                    inputHtml = `<input type="text" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="text" ${requiredAttr}>`;
                }

                const div = document.createElement('div');
                div.className = `col-md-6 mb-4 dynamic-rule-wrapper ${validRuleIndex > 0 ? 'd-none' : ''}`;
                div.dataset.index = validRuleIndex;

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
function tabloyuCiz(urunler) {
    if (!tabloGovdesi) return;
    tabloGovdesi.innerHTML = "";

    if (urunler.length === 0) {
        tabloGovdesi.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    let satirlar = [];
    urunler.forEach(urun => {
        let btnIncele = `<button class="btn btn-sm btn-outline-info rounded-pill btn-incele me-1" title="Detayları Gör" data-id="${urun.id}"><i class="bi bi-eye"></i> Görüntüle</button>`;
        let btnDuzenle = hasPermission("Product.Edit") ? `<button class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle me-1" data-id="${urun.id}">Düzenle</button>` : "";
        let btnSil = hasPermission("Product.Delete") ? `<button class="btn btn-sm btn-outline-danger rounded-pill btn-sil" data-id="${urun.id}">Sil</button>` : "";
        let aksiyonButonlari = `<td class="text-end">${btnIncele} ${btnDuzenle} ${btnSil}</td>`;

        const satir = `
            <tr>
                <td class="text-muted small">${tarihFormatla(urun.createdAt)}</td>
                <td>${escapeHtml(urun.name)}</td>
                <td>${escapeHtml(urun.barcode)}</td>
                <td>${urun.minStockLevel}</td>
                <td>${escapeHtml(urun.categoryName)}</td>
                <td>
                    <span class="badge ${urun.stockQuantity <= urun.minStockLevel ? 'bg-danger text-danger' : 'bg-success text-success'} bg-opacity-10 border ${urun.stockQuantity <= urun.minStockLevel ? 'border-danger' : 'border-success'} px-2 py-1 rounded-pill">
                        ${urun.stockQuantity} Adet
                    </span>
                </td>
                ${aksiyonButonlari}
            </tr>`;
        satirlar.push(satir);
    });
    tabloGovdesi.innerHTML = satirlar.join("");
}


function sayfalamayiCiz() {
    buildPagination(
        "paginationContainer", 
        filtreliUrunler.length, 
        currentPage, 
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
        const minStockLevel = document.getElementById("urunMinStok").value;
        const categoryId = document.getElementById("urunKategoriId").value;
        const targetLocationId = document.getElementById("urunRafId")?.value;
        const initialQuantity = document.getElementById("urunBaslangicStok")?.value;
        const btnKaydet = document.getElementById("btnUrunKaydet");

    const urunVerisi = {
        name: name,
        barcode: barcode,
        minStockLevel: parseInt(minStockLevel) || 0,
        categoryId: parseInt(categoryId) || null,
        targetLocationId: parseInt(targetLocationId) || 0,
        initialQuantity: parseInt(initialQuantity) || 0,
        cost: 0,
        price: 0
    };

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

            await apiRequest(adres, metod, urunVerisi);

            const modalElement = document.getElementById("urunModal");
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
            if (modalInstance) modalInstance.hide();

            document.getElementById("urunFormu").reset();
            document.getElementById("urunId").value = "";
            basariToast(id ? "Ürün güncellendi" : "Ürün eklendi");

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

    buildCategoryCascader('urunKategoriContainer', 'urunKategoriId', urun.categoryId || null, false);

    document.getElementById("modalBaslik").innerText = "Ürün Düzenle";
    const depoSecimi = document.getElementById("depoSecimiAlani");
    if (depoSecimi) depoSecimi.classList.add("d-none");
    document.getElementById("rafSecimiAlani").classList.add("d-none");
    document.getElementById("baslangicStokAlani").classList.add("d-none");
    document.getElementById("btnUrunKaydet").innerText = "Güncelle";

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
                            if(numberInput) numberInput.value = formattedValue;
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
    }, 500);

    const modalElement = document.getElementById("urunModal");
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

if (tabloGovdesi) {
    tabloGovdesi.addEventListener("click", (e) => {
        const btnDuzenle = e.target.closest(".btn-duzenle");
        const btnSil = e.target.closest(".btn-sil");
        const btnIncele = e.target.closest(".btn-incele");

        if (btnIncele) urunDetayAc(parseInt(btnIncele.getAttribute("data-id")), { tedarikciYonetimi: hasPermission("Supplier.Edit") });
        else if (btnDuzenle) urunDuzenle(parseInt(btnDuzenle.getAttribute("data-id")));
        else if (btnSil) urunSil(parseInt(btnSil.getAttribute("data-id")));
    });
}

const btnYeniUrunModal = document.querySelector('[data-bs-target="#urunModal"]');
if (btnYeniUrunModal) {
    btnYeniUrunModal.addEventListener("click", () => {
        document.getElementById("urunFormu").reset();
        document.getElementById("urunId").value = "";
        document.getElementById("modalBaslik").innerText = "Yeni Ürün Ekle";

        buildCategoryCascader('urunKategoriContainer', 'urunKategoriId', null, false);

        const depoSecimi = document.getElementById("depoSecimiAlani");
        if (depoSecimi) depoSecimi.classList.remove("d-none");
        document.getElementById("rafSecimiAlani").classList.remove("d-none");
        document.getElementById("baslangicStokAlani").classList.remove("d-none");

        document.getElementById("urunRafId").disabled = true;
        document.getElementById("urunRafId").innerHTML = '<option value="">Depo bekleniyor...</option>';

        const dynamicAttr = document.getElementById("dynamicAttributesArea");
        if (dynamicAttr) dynamicAttr.classList.add("d-none");
        const dynamicContainer = document.getElementById("dynamicAttributesContainer");
        if (dynamicContainer) dynamicContainer.innerHTML = "";

        document.getElementById("btnUrunKaydet").innerText = "Ekle ve Kaydet";
    });
}

if (!hasPermission("Product.Add")) {
    const btnEkle = document.querySelector('[data-bs-target="#urunModal"]');
    if (btnEkle) btnEkle.classList.add('d-none');
}


urunleriYukle(currentPage);
dropdownKategorileriniYukle();

async function dropdownDepolariYukle() {
    try {
        const data = await apiRequest('/warehouses?pageSize=1000', 'GET');
        const depolar = data.items || data;
        const select = document.getElementById("urunDepoId");
        if (select) {
            select.innerHTML = '<option value="">Önce depo seçin...</option>';
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

        // Şimdi listeyi güncelle (dinamik filtreler temizlendiği için sadece kategoriye göre günceller)
        currentPage = 1;
        veriyiGuncelle();

        const rules = await apiRequest(`/attribute-rules/category/${categoryId}`, 'GET');
        // rules.reverse(); KALDIRILDI çünkü DisplayOrder kullanılıyor

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

            let inputHtml = DynamicUI.renderFilterInput(rule, options, escapeHtml);

            const div = document.createElement('div');
            div.className = 'col-md-3 mb-2';
            div.innerHTML = `<label class="form-label small fw-bold mb-1">${escapeHtml(rule.attributeKey)}</label>
                             ${inputHtml}`;
            filterContainer.appendChild(div);
        });

        // Initialize noUiSliders
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
                        to: function(value) { return String(optionsArr[Math.round(value)] || ''); },
                        from: function(value) { return optionsArr.indexOf(String(value)); }
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
                        if(minIdx === -1) minIdx = 0;
                        if(maxIdx === -1) maxIdx = optionsArr.length - 1;

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
                        if (handle === 0) { if(minIn) minIn.value = values[0]; }
                        else { if(maxIn) maxIn.value = values[1]; }
                        
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

                    if (minIn) minIn.addEventListener('change', function() { 
                        el.noUiSlider.set([this.value, null]); 
                        hidden.dispatchEvent(new Event('input'));
                    });
                    if (maxIn) maxIn.addEventListener('change', function() { 
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

document.getElementById('btnFiltreleriTemizle')?.addEventListener('click', () => {
    document.getElementById('aramaKutusu').value = '';
    aktifArama = '';

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
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Üretiliyor...';
    }

    try {
        const response = await apiRequest('/products/generate-sku', 'POST', {
            categoryId: parseInt(categoryId),
            attributes: attributes
        });

        if (response && response.sku) {
            document.getElementById("urunBarkod").value = response.sku;
        }
    } catch (hata) {
        hataGoster("SKU üretilirken hata oluştu: " + hata.message);
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-magic"></i> SKU Üret';
        }
    }
}

// Event Listener for SKU Generate Button
const btnSkuUretEl = document.getElementById('btnSkuUret');
if (btnSkuUretEl) {
    btnSkuUretEl.addEventListener('click', generateSku);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnExcelImport')?.addEventListener('click', handleExcelImport);
    document.getElementById('btnExportExcel')?.addEventListener('click', exportProductsToExcel);
    document.getElementById('btnExportPdf')?.addEventListener('click', exportProductsToPDF);
    document.getElementById('btnExportCsv')?.addEventListener('click', exportProductsToCSV);
});
