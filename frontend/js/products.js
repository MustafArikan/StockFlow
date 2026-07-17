const API_URL = `${CONFIG.API_BASE_URL}/products`;
const token = localStorage.getItem('token');
const userRole = getUserRole();

let tumUrunler = [];
let filtreliUrunler = [];
const tabloGovdesi = document.getElementById("urunTablosuGovdesi");
let currentPage = 1;
const pageSize = 10;

let aktifArama = '';
let siralamaSutunu = 'id';
let siralamaYonu = 'asc';

if (!token) window.location.href = 'login.html';

function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function veriyiGuncelle() {
    filtreliUrunler = tumUrunler.filter(urun =>
        (urun.name && urun.name.toLowerCase().includes(aktifArama)) ||
        (urun.barcode && urun.barcode.toLowerCase().includes(aktifArama)) ||
        (urun.categoryName && urun.categoryName.toLowerCase().includes(aktifArama)) ||
        (urun.id && urun.id.toString().includes(aktifArama))
    );

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
    sayfalamayiCiz(yeniToplamSayfa, currentPage);
}

function sirala(sutun) {
    if (siralamaSutunu === sutun) {
        siralamaYonu = siralamaYonu === 'asc' ? 'desc' : 'asc';
    } else {
        siralamaSutunu = sutun;
        siralamaYonu = 'asc';
    }

    const sutunlar = { id: 'thId', name: 'thAd', barcode: 'thBarkod', minStockLevel: 'thMinStok', categoryName: 'thKategori', stockQuantity: 'thMevcutStok' };
    const metinler = { id: 'ID', name: 'Ürün Adı', barcode: 'Barkod', minStockLevel: 'Min. Stok', categoryName: 'Kategori', stockQuantity: 'Mevcut Stok' };

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

document.getElementById("aramaKutusu").addEventListener("keyup", (event) => {
    aktifArama = event.target.value.toLowerCase();
    currentPage = 1;
    veriyiGuncelle();
});

async function urunleriYukle(page = 1) {
    try {
        const cevap = await fetch(`${API_URL}?pageNumber=1&pageSize=1000`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) throw new Error("Sunucu hatası: " + cevap.status);

        const sonuc = await cevap.json();
        tumUrunler = sonuc.items || sonuc;
        currentPage = page;

        veriyiGuncelle();
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Ürünler yüklenemedi. (${hata.message})</td></tr>`;
    }
}

async function dropdownKategorileriniYukle() {
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/categories?pageSize=1000`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!cevap.ok) throw new Error("Kategoriler alınamadı.");

        const data = await cevap.json();
        const kategoriler = data.items || data;
        const select = document.getElementById("urunKategoriId");

        if (select) {
            select.innerHTML = '<option value="">Kategori seçin...</option>';
            kategoriler.forEach(kategori => {
                const option = document.createElement("option");
                option.value = kategori.id;
                option.textContent = kategori.name;
                select.appendChild(option);
            });
        }
    } catch (hata) {
        console.error("Kategori dropdown yükleme hatası:", hata);
    }
}

// Kategori dropdown'ı değiştiğinde tetiklenecek olay
document.getElementById('urunKategoriId').addEventListener('change', async function() {
    const categoryId = this.value;
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
        
        // Backend'den kalıtımla gelen kuralları çekiyoruz
        const response = await fetch(`${CONFIG.API_BASE_URL}/attribute-rules/category/${categoryId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Kurallar çekilemedi!");
        
        const rules = await response.json();
        
        // Global'den En Alta doğru göstermek için ters çevir
        rules.reverse();

        if (container) container.innerHTML = ''; // İçini temizle

        if (rules.length === 0) {
            if (attributeArea) attributeArea.classList.add('d-none');
            return;
        }

        // Gelen her bir kural için DataType'a göre dinamik input çiz
        rules.forEach(rule => {
            let inputHtml = '';
            let requiredAttr = rule.isRequired ? 'required' : '';
            let starHtml = rule.isRequired ? '<span class="text-danger">*</span>' : '';

            let options = [];
            if (rule.allowedValues && rule.allowedValues !== "[]") {
                try { options = JSON.parse(rule.allowedValues); } 
                catch(e) { options = rule.allowedValues.split(',').map(s => s.trim()); }
            }

            if (rule.dataType === 'dropdown') {
                let optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
                inputHtml = `<select class="form-select dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="dropdown" ${requiredAttr}>
                                <option value="">Seçiniz...</option>
                                ${optionsHtml}
                             </select>`;
            } 
            else if (rule.dataType === 'radio') {
                inputHtml = `<div class="mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="radio">`;
                options.forEach((opt, idx) => {
                    inputHtml += `<div class="form-check form-check-inline">
                                    <input class="form-check-input" type="radio" name="rule_${rule.id}" id="rule_${rule.id}_${idx}" value="${escapeHtml(opt)}" ${requiredAttr}>
                                    <label class="form-check-label" for="rule_${rule.id}_${idx}">${escapeHtml(opt)}</label>
                                  </div>`;
                });
                inputHtml += `</div>`;
            }
            else if (rule.dataType === 'checkbox_group') {
                inputHtml = `<div class="mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="checkbox_group">`;
                options.forEach((opt, idx) => {
                    inputHtml += `<div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" id="rule_${rule.id}_${idx}" value="${escapeHtml(opt)}">
                                    <label class="form-check-label" for="rule_${rule.id}_${idx}">${escapeHtml(opt)}</label>
                                  </div>`;
                });
                inputHtml += `</div>`;
            }
            else if (rule.dataType === 'range_slider_integer' || rule.dataType === 'range_slider_decimal') {
                let rMin = 0, rMax = 100, rStep = 1;
                if (rule.dataType === 'range_slider_decimal') {
                    rStep = 0.01;
                }
                inputHtml = `<div class="d-flex align-items-center dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="range_slider" data-min="${rMin}" data-max="${rMax}">
                                <input type="range" class="form-range flex-grow-1" min="${rMin}" max="${rMax}" step="${rStep}" id="rule_${rule.id}">
                                <input type="number" class="form-control form-control-sm ms-2 text-center" style="width: 75px;" id="val_${rule.id}" value="${rMin}" min="${rMin}" max="${rMax}" step="${rStep}">
                             </div>`;
            }
            else if (rule.dataType === 'color_picker') {
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
                    if(cName.startsWith('#')) return cName;
                    return map[normalized] || map[cName.toLowerCase().trim()] || "#cccccc";
                };

                let liHtml = colors.map((opt, idx) => {
                    let hex = getColorHex(opt);
                    return `<div class="form-check mb-1">
                                <input class="form-check-input color-radio-item" type="radio" name="color_${rule.id}" id="color_${rule.id}_${idx}" value="${escapeHtml(opt)}" data-rule-id="${rule.id}" ${requiredAttr}>
                                <label class="form-check-label d-flex align-items-center" for="color_${rule.id}_${idx}" style="cursor:pointer;">
                                    <svg width="18" height="18" style="margin-right:8px;" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="9" cy="9" r="8" fill="${hex}" stroke="#aaa" stroke-width="1"/>
                                    </svg>
                                    ${escapeHtml(opt)}
                                </label>
                            </div>`;
                }).join('');

                inputHtml = `
                    <div class="dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="color_picker">
                        <div class="collapse show" id="collapseColor_${rule.id}">
                            <div class="card card-body p-2 border-0 shadow-sm" style="max-height:200px; overflow-y:auto; background-color:#f8f9fa;">
                                ${liHtml}
                            </div>
                        </div>
                    </div>
                `;
            }
            else if (rule.dataType === 'toggle_switch' || rule.dataType === 'boolean') {
                inputHtml = `<div class="form-check form-switch mt-2 dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="boolean">
                                <input class="form-check-input" type="checkbox" id="rule_${rule.id}">
                                <label class="form-check-label text-muted" for="rule_${rule.id}">Evet / Açık</label>
                             </div>`;
            }
            else if (rule.dataType === 'number') {
                inputHtml = `<input type="number" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="number" ${requiredAttr}>`;
            } 
            else if (rule.dataType === 'decimal') {
                inputHtml = `<input type="number" step="0.01" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="decimal" ${requiredAttr}>`;
            }
            else { 
                inputHtml = `<input type="text" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" data-rule-type="text" ${requiredAttr}>`;
            }

            const div = document.createElement('div');
            div.className = 'col-md-6 mb-3';
            if (rule.dataType === 'color_picker') {
                div.innerHTML = `<a class="text-decoration-none text-dark d-flex align-items-center mb-2" data-bs-toggle="collapse" href="#collapseColor_${rule.id}" role="button" aria-expanded="true">
                                    <label class="form-label small fw-bold mb-0" style="cursor:pointer;">${escapeHtml(rule.attributeKey)} ${starHtml}</label>
                                    <i class="bi bi-caret-down-fill text-warning ms-1"></i>
                                 </a>
                                 ${inputHtml}`;
            } else {
                div.innerHTML = `<label class="form-label small fw-bold">${escapeHtml(rule.attributeKey)} ${starHtml}</label>
                                 ${inputHtml}`;
            }
            container.appendChild(div);
        });

        // Event listeners for range sliders
        const rangeContainers = container.querySelectorAll('.dynamic-rule-input[data-rule-type="range_slider"]');
        rangeContainers.forEach(div => {
            const range = div.querySelector('input[type="range"]');
            const numberInput = div.querySelector('input[type="number"]');
            const min = parseFloat(div.getAttribute('data-min')) || 0;
            const max = parseFloat(div.getAttribute('data-max')) || 100;
            
            if (range && numberInput) {
                // Kaydırıcı değiştiğinde input'u güncelle
                range.addEventListener('input', function() {
                    numberInput.value = this.value;
                });
                
                // Input değiştiğinde kaydırıcıyı güncelle
                numberInput.addEventListener('input', function() {
                    let val = parseFloat(this.value);
                    if (isNaN(val)) val = min;
                    if (val < min) val = min;
                    if (val > max) val = max;
                    range.value = val;
                });
            }
        });

        // Radyo butonları native olarak tekil seçim sağlar, JS dinleyicisine gerek yok

    } catch (error) {
        if (container) container.innerHTML = `<div class="col-12 text-center text-danger-small"><i class="bi bi-exclamation-triangle"></i> Hata: ${error.message}</div>`;
    }
});

function tabloyuCiz(urunler) {
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
                <td class="fw-bold">${urun.id}</td>
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

function sayfalamayiCiz(totalPages, currentPage) {
    const container = document.getElementById("paginationContainer");
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = "";
        return;
    }

    let html = `<nav><ul class="pagination pagination-sm mb-0 shadow-sm justify-content-center mt-3">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage - 1}">« Önceki</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link text-muted">...</span></li>`;
            }
        } else {
            html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link page-action" href="#" data-page="${i}">${i}</a></li>`;
        }
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link page-action" href="#" data-page="${currentPage + 1}">Sonraki »</a></li>`;
    html += `</ul></nav>`;
    container.innerHTML = html;
}

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

document.getElementById("btnUrunKaydet").addEventListener("click", async () => {
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
        initialQuantity: parseInt(initialQuantity) || 0
    };

    // Dinamik özellikleri topla (Strongly Typed EAV formatı)
    const dinamikInputlar = document.querySelectorAll('.dynamic-rule-input');
    if (dinamikInputlar.length > 0) {
        urunVerisi.attributes = []; // Dizi (Array) olarak başlıyoruz
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
            } else if (type === "color_picker") {
                const checkedRb = input.querySelector('.color-radio-item:checked');
                if (checkedRb) val = checkedRb.value;
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
    const adres = id ? (`${API_URL}/${id}`) : API_URL;

    try {
        const orjinalMetin = btnKaydet.innerText;
        btnKaydet.disabled = true;
        btnKaydet.innerText = "Kaydediliyor...";

        const cevap = await fetch(adres, {
            method: metod,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(urunVerisi)
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) throw new Error("İşlem başarısız: " + cevap.status);

        const modalElement = document.getElementById("urunModal");
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("urunFormu").reset();
        document.getElementById("urunId").value = "";

        aktifArama = "";
        const aramaKutusu = document.getElementById("aramaKutusu");
        if (aramaKutusu) aramaKutusu.value = "";

        urunleriYukle(currentPage);
        btnKaydet.disabled = false;
        btnKaydet.innerText = "Ekle ve Kaydet";
    } catch (hata) {
        alert("İşlem başarısız: " + hata.message);
        btnKaydet.disabled = false;
        btnKaydet.innerText = id ? "Güncelle" : "Ekle ve Kaydet";
    }
});

async function urunSil(id) {
    const onay = confirm("Bu ürünü silmek istediğinize emin misiniz?");
    if (!onay) return;

    try {
        const cevap = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!cevap.ok) throw new Error("Silme başarısız: " + cevap.status);
        urunleriYukle(currentPage);
    } catch (hata) {
        alert("Ürün silinemedi: " + hata.message);
    }
}

function urunDetayGoster(id) {
    const urun = tumUrunler.find(u => u.id === id);
    if (!urun) return;

    document.getElementById("detayUrunAdi").textContent = urun.name || "-";
    document.getElementById("detayUrunKategori").textContent = urun.categoryName || "Kategori Yok";
    document.getElementById("detayUrunBarkod").textContent = urun.barcode || "-";
    document.getElementById("detayUrunId").textContent = urun.id;
    document.getElementById("detayUrunMinStok").textContent = urun.minStockLevel || "0";
    
    const stokEl = document.getElementById("detayUrunStok");
    stokEl.textContent = `${urun.stockQuantity} Adet`;
    if (urun.stockQuantity <= urun.minStockLevel) {
        stokEl.className = "fw-bold fs-5 mt-1 text-danger";
    } else {
        stokEl.className = "fw-bold fs-5 mt-1 text-success";
    }

    const ozelliklerTablosu = document.getElementById("detayUrunOzellikler");
    ozelliklerTablosu.innerHTML = "";
    
    if (urun.attributes && Array.isArray(urun.attributes) && urun.attributes.length > 0) {
        urun.attributes.forEach(attr => {
            let val = attr.value;
            if (val === "true") val = "Evet";
            if (val === "false") val = "Hayır";
            
            let valHtml = escapeHtml(val);
            // Hex renk kodu kontrolü (Örn: #ff0000 veya #fff)
            if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
                valHtml = `<div class="d-flex align-items-center">
                                <span class="d-inline-block rounded-circle me-2 shadow-sm" style="width:18px; height:18px; background-color:${escapeHtml(val)}; border:1px solid #ddd;"></span>
                                <span class="text-muted small">${escapeHtml(val)}</span>
                           </div>`;
            }

            ozelliklerTablosu.innerHTML += `
                <tr>
                    <td class="text-muted fw-bold" style="width:40%; border-bottom: 1px solid #eee;">${escapeHtml(attr.key)}</td>
                    <td class="text-dark fw-semibold" style="border-bottom: 1px solid #eee;">${valHtml}</td>
                </tr>
            `;
        });
    } else {
        ozelliklerTablosu.innerHTML = `<tr><td class="text-muted fst-italic">Özel nitelik (kural) bulunamadı.</td></tr>`;
    }

    const modalElement = document.getElementById("urunDetayModal");
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

function urunDuzenle(id) {
    const urun = tumUrunler.find(u => u.id === id);
    if (!urun) return;

    document.getElementById("urunId").value = urun.id;
    document.getElementById("urunAdi").value = urun.name;
    document.getElementById("urunBarkod").value = urun.barcode;
    document.getElementById("urunMinStok").value = urun.minStockLevel;
    document.getElementById("urunKategoriId").value = urun.categoryId || "";

    document.getElementById("modalBaslik").innerText = "Ürün Düzenle";
    const depoSecimi = document.getElementById("depoSecimiAlani");
    if(depoSecimi) depoSecimi.classList.add("d-none");
    document.getElementById("rafSecimiAlani").classList.add("d-none");
    document.getElementById("baslangicStokAlani").classList.add("d-none");
    document.getElementById("btnUrunKaydet").innerText = "Güncelle";

    // Kategori değişti tetiklemesini manuel yap ki formlar gelsin
    const event = new Event('change');
    document.getElementById("urunKategoriId").dispatchEvent(event);

    // Kural formlarının gelmesini bekle ve değerleri doldur
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
                            range.value = attr.value;
                            const numberInput = document.getElementById(`val_${attr.ruleId}`);
                            if(numberInput) numberInput.value = attr.value;
                        }
                    } else if (type === 'color_picker') {
                        const rb = input.querySelector(`input[type="radio"][value="${attr.value}"]`);
                        if (rb) rb.checked = true;
                    } else {
                        input.value = attr.value;
                    }
                }
            });
        }
    }, 500);

    const modalElement = document.getElementById("urunModal");
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

tabloGovdesi.addEventListener("click", (e) => {
    const btnDuzenle = e.target.closest(".btn-duzenle");
    const btnSil = e.target.closest(".btn-sil");
    const btnIncele = e.target.closest(".btn-incele");

    if (btnIncele) urunDetayGoster(parseInt(btnIncele.getAttribute("data-id")));
    else if (btnDuzenle) urunDuzenle(parseInt(btnDuzenle.getAttribute("data-id")));
    else if (btnSil) urunSil(parseInt(btnSil.getAttribute("data-id")));
});

document.querySelector('[data-bs-target="#urunModal"]').addEventListener("click", () => {
    document.getElementById("urunFormu").reset();
    document.getElementById("urunId").value = "";
    document.getElementById("modalBaslik").innerText = "Yeni Ürün Ekle";
    
    const depoSecimi = document.getElementById("depoSecimiAlani");
    if(depoSecimi) depoSecimi.classList.remove("d-none");
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

if (!hasPermission("Product.Add")) {
    const btnEkle = document.querySelector('[data-bs-target="#urunModal"]');
    if (btnEkle) btnEkle.classList.add('d-none');
}
if (!hasPermission("Product.Edit") && !hasPermission("Product.Delete")) {
    const islemSutunuBasligi = document.getElementById("islemSutunuBasligi");
    if (islemSutunuBasligi) islemSutunuBasligi.classList.add('d-none');
}

urunleriYukle(currentPage);
dropdownKategorileriniYukle();

async function dropdownDepolariYukle() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/warehouses?pageSize=1000`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Depolar alınamadı.");
        const data = await response.json();
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

document.getElementById("urunDepoId").addEventListener("change", async function() {
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
        const response = await fetch(`${CONFIG.API_BASE_URL}/locations/by-warehouse/${warehouseId}?pageSize=1000`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Raflar alınamadı.");
        const data = await response.json();
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

dropdownDepolariYukle();
