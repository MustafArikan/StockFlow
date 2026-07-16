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
    
    if (!categoryId) {
        container.innerHTML = '<div class="col-12 text-muted small"><i class="bi bi-info-circle me-1"></i> Lütfen önce bir kategori seçin...</div>';
        return;
    }

    try {
        container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border spinner-border-sm text-primary"></div> Kurallar yükleniyor...</div>';
        
        // Backend'den kalıtımla gelen kuralları çekiyoruz
        const response = await fetch(`${CONFIG.API_BASE_URL}/attribute-rules/category/${categoryId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Kurallar çekilemedi!");
        
        const rules = await response.json();
        
        // Global'den En Alta doğru göstermek için ters çevir
        rules.reverse();

        container.innerHTML = ''; // İçini temizle

        if (rules.length === 0) {
            container.innerHTML = '<div class="col-12 text-muted small">Bu kategoriye atanmış özel bir kural bulunmuyor.</div>';
            return;
        }

        // Gelen her bir kural için DataType'a göre dinamik input çiz
        rules.forEach(rule => {
            let inputHtml = '';
            let requiredAttr = rule.isRequired ? 'required' : '';
            let starHtml = rule.isRequired ? '<span class="text-danger">*</span>' : '';

            if (rule.dataType === 'dropdown' && rule.allowedValues) {
                let options = [];
                try { options = JSON.parse(rule.allowedValues); } catch(e) {}
                
                let optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
                inputHtml = `<select class="form-select dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" ${requiredAttr}>
                                <option value="">Seçiniz...</option>
                                ${optionsHtml}
                             </select>`;
            } 
            else if (rule.dataType === 'number') {
                inputHtml = `<input type="number" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" ${requiredAttr}>`;
            } 
            else { 
                inputHtml = `<input type="text" class="form-control dynamic-rule-input" data-rule-id="${rule.id}" data-rule-key="${escapeHtml(rule.attributeKey)}" ${requiredAttr}>`;
            }

            const div = document.createElement('div');
            div.className = 'col-md-6 mb-3';
            div.innerHTML = `<label class="form-label small fw-bold">${escapeHtml(rule.attributeKey)} ${starHtml}</label>
                             ${inputHtml}`;
            container.appendChild(div);
        });

    } catch (error) {
        container.innerHTML = `<div class="col-12 text-danger small"><i class="bi bi-exclamation-triangle"></i> Hata: ${error.message}</div>`;
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
        let btnDuzenle = hasPermission("Product.Edit") ? `<button class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle" data-id="${urun.id}">Düzenle</button>` : "";
        let btnSil = hasPermission("Product.Delete") ? `<button class="btn btn-sm btn-outline-danger rounded-pill btn-sil" data-id="${urun.id}">Sil</button>` : "";
        let aksiyonButonlari = (btnDuzenle || btnSil) ? `<td class="text-end">${btnDuzenle} ${btnSil}</td>` : "";

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
    const id = document.getElementById("urunId").value;
    const name = document.getElementById("urunAdi").value;
    const barcode = document.getElementById("urunBarkod").value;
    const minStockLevel = document.getElementById("urunMinStok").value;
    const categoryId = document.getElementById("urunKategoriId").value;
    const targetLocationId = document.getElementById("urunRafId")?.value;
    const initialQuantity = document.getElementById("urunBaslangicStok")?.value;
    const btnKaydet = document.getElementById("btnUrunKaydet");

    if (!name) {
        alert("Lütfen ürün adı girin!");
        return;
    }

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
            const val = input.value;
            
            if (ruleId && key && val) {
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

function urunDuzenle(id) {
    const urun = tumUrunler.find(u => u.id === id);
    if (!urun) return;

    document.getElementById("urunId").value = urun.id;
    document.getElementById("urunAdi").value = urun.name;
    document.getElementById("urunBarkod").value = urun.barcode;
    document.getElementById("urunMinStok").value = urun.minStockLevel;
    document.getElementById("urunKategoriId").value = urun.categoryId || "";

    document.getElementById("modalBaslik").innerText = "Ürün Düzenle";
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
                    input.value = attr.value;
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

    if (btnDuzenle) urunDuzenle(parseInt(btnDuzenle.getAttribute("data-id")));
    else if (btnSil) urunSil(parseInt(btnSil.getAttribute("data-id")));
});

document.querySelector('[data-bs-target="#urunModal"]').addEventListener("click", () => {
    document.getElementById("urunFormu").reset();
    document.getElementById("urunId").value = "";
    document.getElementById("modalBaslik").innerText = "Yeni Ürün Ekle";
    document.getElementById("rafSecimiAlani").classList.remove("d-none");
    document.getElementById("baslangicStokAlani").classList.remove("d-none");
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

async function dropdownRaflariYukle() {
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations?pageSize=1000`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Raflar alınamadı.");
        const data = await cevap.json();
        const raflar = data.items || data;
        const select = document.getElementById("urunRafId");
        if (select) {
            select.innerHTML = '<option value="">Raf seçin...</option>';
            raflar.forEach(raf => {
                const option = document.createElement("option");
                option.value = raf.id;
                option.textContent = raf.code;
                select.appendChild(option);
            });
        }
    } catch (hata) {
        console.error("Raf dropdown yükleme hatası:", hata);
    }
}

dropdownRaflariYukle();
let seciliKategoriKurallari = [];
document.getElementById("urunKategoriId").addEventListener("change", async (e) => {
    const catId = e.target.value;
    const container = document.getElementById("dinamikKurallarContainer");
    const anaAlan = document.getElementById("dinamikOzelliklerAlani");
    
    if(!catId) {
        if(anaAlan) anaAlan.classList.add("d-none");
        return;
    }
    
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/attribute-rules/category/${catId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if(cevap.ok) {
            seciliKategoriKurallari = await cevap.json();
            if(container) container.innerHTML = "";
            if(seciliKategoriKurallari.length > 0) {
                if(anaAlan) anaAlan.classList.remove("d-none");
                seciliKategoriKurallari.forEach(kural => {
                    let requiredAttr = kural.isRequired ? 'required' : '';
                    let asterisk = kural.isRequired ? '<span class="text-danger">*</span>' : '';
                    let html = `<div class="mb-2">
                        <label class="form-label small fw-bold text-secondary">${kural.attributeKey} ${asterisk}</label>`;
                        
                    if(kural.allowedValues && kural.allowedValues.trim() !== "") {
                        const secenekler = kural.allowedValues.split(',').map(s=>s.trim());
                        html += `<select class="form-select form-select-sm dinamik-kural-input" data-key="${kural.attributeKey}" ${requiredAttr}>
                                    <option value="" selected disabled>Seçiniz...</option>`;
                        secenekler.forEach(s => {
                            html += `<option value="${s}">${s}</option>`;
                        });
                        html += `</select>`;
                    } else if (kural.dataType === "NUMBER") {
                        html += `<input type="number" class="form-control form-control-sm dinamik-kural-input" data-key="${kural.attributeKey}" ${requiredAttr}>`;
                    } else {
                        html += `<input type="text" class="form-control form-control-sm dinamik-kural-input" data-key="${kural.attributeKey}" ${requiredAttr}>`;
                    }
                    html += `</div>`;
                    if(container) container.innerHTML += html;
                });
            } else {
                if(anaAlan) anaAlan.classList.add("d-none");
            }
        }
    } catch (e) {
        console.error("Kurallar alınamadı", e);
    }
});


