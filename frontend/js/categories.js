const API_URL = `${CONFIG.API_BASE_URL}/categories`;
const token = localStorage.getItem('token');
const userRole = getUserRole();

let tumKategoriler = [];
let filtreliKategoriler = [];
const tabloGovdesi = document.getElementById("kategoriTablosuGovdesi");
let currentPage = 1;
const pageSize = 50;

let aktifArama = '';
let acikKategoriler = new Set();
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
    if (aktifArama.trim() === '') {
        filtreliKategoriler = tumKategoriler.filter(k => k.parentId === null);
    } else {
        filtreliKategoriler = tumKategoriler.filter(kategori =>
            (kategori.name && kategori.name.toLowerCase().includes(aktifArama)) ||
            (kategori.id && kategori.id.toString().includes(aktifArama))
        );
    }

    filtreliKategoriler.sort((a, b) => {
        let degerA = a[siralamaSutunu] != null ? a[siralamaSutunu] : '';
        let degerB = b[siralamaSutunu] != null ? b[siralamaSutunu] : '';

        if (typeof degerA === 'string') {
            return siralamaYonu === 'asc'
                ? degerA.localeCompare(degerB)
                : degerB.localeCompare(degerA);
        } else {
            return siralamaYonu === 'asc' ? degerA - degerB : degerB - degerA;
        }
    });

    const yeniToplamSayfa = Math.ceil(filtreliKategoriler.length / pageSize) || 1;
    if (currentPage > yeniToplamSayfa) currentPage = yeniToplamSayfa;

    const baslangic = (currentPage - 1) * pageSize;
    const bitis = baslangic + pageSize;
    const sayfadakiVeriler = filtreliKategoriler.slice(baslangic, bitis);

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

    const thId = document.getElementById("thId");
    const thAd = document.getElementById("thAd");

    if (thId) thId.innerText = siralamaSutunu === "id" ? (siralamaYonu === "asc" ? "ID ↑" : "ID ↓") : "ID ↕";
    if (thAd) thAd.innerText = siralamaSutunu === "name" ? (siralamaYonu === "asc" ? "Kategori Adı ↑" : "Kategori Adı ↓") : "Kategori Adı ↕";

    veriyiGuncelle();
}

const thIdEl = document.getElementById("thId");
const thAdEl = document.getElementById("thAd");
if (thIdEl) thIdEl.addEventListener("click", () => sirala("id"));
if (thAdEl) thAdEl.addEventListener("click", () => sirala("name"));

document.getElementById("aramaKutusu").addEventListener("keyup", (event) => {
    aktifArama = event.target.value.toLowerCase();
    currentPage = 1;
    veriyiGuncelle();
});

async function kategorileriYukle(page = 1) {
    try {
        const adres = `${API_URL}?pageNumber=1&pageSize=1000`;
        const cevap = await fetch(adres, {
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
        tumKategoriler = sonuc.items || sonuc;
        currentPage = page;

        veriyiGuncelle();
        ustKategoriDropdownDoldur();
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">Kategori Yüklenemedi. (${hata.message})</td></tr>`;
        const paginationContainer = document.getElementById("paginationContainer");
        if (paginationContainer) paginationContainer.innerHTML = "";
    }
}

function ustKategoriDropdownDoldur(haricTutulacakId = null) {
    const select = document.getElementById("ustKategoriId");
    if (!select) return;
    
    select.innerHTML = '<option value="">Yok (Ana Kategori Olarak Ekle)</option>';
    tumKategoriler.forEach(kategori => {
        if (kategori.id !== haricTutulacakId) { // Kendisini üst kategori seçemesin
            const option = document.createElement("option");
            option.value = kategori.id;
            option.textContent = escapeHtml(kategori.name);
            select.appendChild(option);
        }
    });
}

function tabloyuCiz(kategoriler) {
    tabloGovdesi.innerHTML = ""; // Temizlik

    if (kategoriler.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 3;
        td.className = "text-center text-muted py-4";
        td.textContent = "Kayıt bulunamadı."; // XSS korumalı
        tr.appendChild(td);
        tabloGovdesi.appendChild(tr);
        return;
    }

    const fragment = document.createDocumentFragment();

    function satirOlustur(kategori, level, isVisible) {
        let cocuklar = tumKategoriler.filter(k => k.parentId === kategori.id);
        
        cocuklar.sort((a, b) => {
            let degerA = a[siralamaSutunu] != null ? a[siralamaSutunu] : '';
            let degerB = b[siralamaSutunu] != null ? b[siralamaSutunu] : '';
            if (typeof degerA === 'string') {
                return siralamaYonu === 'asc' ? degerA.localeCompare(degerB) : degerB.localeCompare(degerA);
            } else {
                return siralamaYonu === 'asc' ? degerA - degerB : degerB - degerA;
            }
        });

        const hasChildren = cocuklar.length > 0;
        
        const tr = document.createElement("tr");
        if (!isVisible) tr.classList.add("d-none");
        if (kategori.parentId) tr.classList.add(`child-of-${kategori.parentId}`);
        tr.dataset.id = kategori.id;

        // ID Sütunu (Gizli)
        const tdId = document.createElement("td");
        tdId.className = "d-none";
        tdId.textContent = kategori.id;
        tr.appendChild(tdId);

        // Kategori Adı Sütunu
        const tdAd = document.createElement("td");
        const dFlex = document.createElement("div");
        dFlex.className = "d-flex align-items-center";

        // CSS ile Dinamik Spacer
        if (level > 0) {
            const spacer = document.createElement("div");
            spacer.style.width = `${level * 35}px`;
            spacer.style.flexShrink = "0"; // Esneme koruması
            dFlex.appendChild(spacer);
        }

        // Aç/Kapat İkonu
        if (aktifArama.trim() === '') {
            if (hasChildren) {
                const icon = document.createElement("i");
                icon.className = `bi bi-chevron-${acikKategoriler.has(kategori.id) ? 'down' : 'right'} me-2 btn-expand text-primary`;
                icon.style.cursor = "pointer";
                icon.style.width = "16px";
                icon.dataset.id = kategori.id;
                dFlex.appendChild(icon);
            } else {
                const iconSpacer = document.createElement("span");
                iconSpacer.className = "me-2";
                iconSpacer.style.display = "inline-block";
                iconSpacer.style.width = "16px";
                dFlex.appendChild(iconSpacer);
            }
        }

        // Kategori Adı (Metin)
        const textSpan = document.createElement("span");
        if (hasChildren && aktifArama.trim() === '') textSpan.classList.add("fw-bold");
        textSpan.textContent = kategori.name; 
        dFlex.appendChild(textSpan);
        
        tdAd.appendChild(dFlex);
        tr.appendChild(tdAd);

        // İşlem Butonları
        const tdAksiyon = document.createElement("td");
        tdAksiyon.className = "text-end";
        
        if (hasPermission("Category.Edit")) {
            const btnKurallar = document.createElement("button");
            btnKurallar.className = "btn btn-sm btn-outline-info rounded-pill btn-kurallar me-1";
            btnKurallar.dataset.id = kategori.id;
            btnKurallar.dataset.name = kategori.name;
            btnKurallar.innerHTML = `<i class="bi bi-gear-fill"></i> Kurallar`;
            tdAksiyon.appendChild(btnKurallar);

            const btnDuzenle = document.createElement("button");
            btnDuzenle.className = "btn btn-sm btn-outline-primary rounded-pill btn-duzenle me-1";
            btnDuzenle.dataset.id = kategori.id;
            btnDuzenle.textContent = "Düzenle";
            tdAksiyon.appendChild(btnDuzenle);
        }
        if (hasPermission("Category.Delete")) {
            const btnSil = document.createElement("button");
            btnSil.className = "btn btn-sm btn-outline-danger rounded-pill btn-sil";
            btnSil.dataset.id = kategori.id;
            btnSil.textContent = "Sil";
            tdAksiyon.appendChild(btnSil);
        }
        
        tr.appendChild(tdAksiyon);

        // Fragment'e ekle
        fragment.appendChild(tr);

        // Recursive çağrı
        if (aktifArama.trim() === '') {
            let cocuklarGorunurMu = isVisible && acikKategoriler.has(kategori.id);
            cocuklar.forEach(cocuk => satirOlustur(cocuk, level + 1, cocuklarGorunurMu));
        }
    }

    kategoriler.forEach(kategori => {
        satirOlustur(kategori, 0, true);
    });

    // Tek seferde DOM'a bas (Performans maksimizasyonu)
    tabloGovdesi.appendChild(fragment);
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

document.getElementById("btnKategoriKaydet").addEventListener("click", async () => {
    const id = document.getElementById("kategoriId").value;
    const name = document.getElementById("kategoriAdi").value;
    const btnKaydet = document.getElementById("btnKategoriKaydet");

    if (!name) {
        alert("Lütfen kategori adı girin!");
        return;
    }

    const parentId = document.getElementById("ustKategoriId").value;
    const kategoriVerisi = { name: name, parentId: parentId ? parseInt(parentId) : null };
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
            body: JSON.stringify(kategoriVerisi)
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) throw new Error(await cevap.text() || "İşlem başarısız.");

        const modalElement = document.getElementById("kategoriModal");
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("kategoriFormu").reset();
        document.getElementById("kategoriId").value = "";

        aktifArama = "";
        const aramaKutusu = document.getElementById("aramaKutusu");
        if (aramaKutusu) aramaKutusu.value = "";

        kategorileriYukle();

        btnKaydet.disabled = false;
        btnKaydet.innerText = "Ekle ve Kaydet";
    } catch (hata) {
        alert("İşlem başarısız: " + hata.message);
        btnKaydet.disabled = false;
        btnKaydet.innerText = id ? "Güncelle" : "Ekle ve Kaydet";
    }
});

async function kategoriSil(id) {
    try {
        const checkRes = await fetch(`${API_URL}/${id}/check-dependencies`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!checkRes.ok) throw new Error("Bağımlılıklar kontrol edilemedi.");
        const depData = await checkRes.json();

        if (depData.hasDependencies) {
            let msg = `DİKKAT! Bu kategoriyi silmek üzeresiniz.\n\n`;
            
            if (depData.subCategoryCount > 0) {
                msg += `- Bu kategorinin altında ${depData.subCategoryCount} adet ALT KATEGORİ var.\n`;
            }
            if (depData.productCount > 0) {
                msg += `- İçinde (veya alt kategorilerinde) toplam ${depData.productCount} adet ÜRÜN var:\n`;
                depData.products.slice(0, 5).forEach(p => {
                    msg += `  • ${p.name} (Stok: ${p.stock})\n`;
                });
                if (depData.productCount > 5) msg += `  ...ve ${depData.productCount - 5} ürün daha.\n`;
            }
            
            msg += `\nÜst kategoriyi silerseniz alt kategoriler ve bağlı ürünler de silinmiş gibi gizlenebilir!\nSilme işlemini ONAYLAMAK için alttaki kutucuğa ONAY yazın:`;
            
            const promptGiris = prompt(msg);
            if (promptGiris !== "ONAY") {
                alert("İşlem iptal edildi.");
                return;
            }
        } else {
            const onay = confirm("Bu kategoriyi silmek istediğinize emin misiniz?");
            if (!onay) return;
        }

        const cevap = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) throw new Error("Silme başarısız (Bağlı ürünler olabilir).");
        kategorileriYukle();
    } catch (hata) {
        alert("Kategori silinemedi: " + hata.message);
    }
}

function kategoriDuzenle(id) {
    const kategori = tumKategoriler.find(k => k.id === id);
    if (!kategori) return;

    document.getElementById("kategoriId").value = kategori.id;
    document.getElementById("kategoriAdi").value = kategori.name;
    ustKategoriDropdownDoldur(kategori.id);
    document.getElementById("ustKategoriId").value = kategori.parentId || "";
    document.getElementById("modalBaslik").innerText = "Kategori Düzenle";
    document.getElementById("btnKategoriKaydet").innerText = "Güncelle";

    const modalElement = document.getElementById("kategoriModal");
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

tabloGovdesi.addEventListener("click", (e) => {
    const btnExpand = e.target.closest(".btn-expand");
    if (btnExpand) {
        const id = parseInt(btnExpand.getAttribute("data-id"));
        if (acikKategoriler.has(id)) {
            acikKategoriler.delete(id);
        } else {
            acikKategoriler.add(id);
        }
        const baslangic = (currentPage - 1) * pageSize;
        const bitis = baslangic + pageSize;
        tabloyuCiz(filtreliKategoriler.slice(baslangic, bitis));
        return;
    }

    const btnDuzenle = e.target.closest(".btn-duzenle");
    const btnSil = e.target.closest(".btn-sil");
    const btnKurallar = e.target.closest(".btn-kurallar");

    if (btnDuzenle) kategoriDuzenle(parseInt(btnDuzenle.getAttribute("data-id")));
    else if (btnSil) kategoriSil(parseInt(btnSil.getAttribute("data-id")));
    else if (btnKurallar) {
        const id = btnKurallar.getAttribute("data-id");
        const name = btnKurallar.getAttribute("data-name");
        
        document.getElementById("aktifKuralKategoriId").value = id;
        document.getElementById("kuralModalKategoriAdi").textContent = `${name} Kuralları`;
        
        kurallariYukle(id);
        
        const modalElement = document.getElementById("kurallarModal");
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();
    }
});

document.querySelector('[data-bs-target="#kategoriModal"]').addEventListener("click", () => {
    document.getElementById("kategoriFormu").reset();
    document.getElementById("kategoriId").value = "";
    ustKategoriDropdownDoldur();
    document.getElementById("modalBaslik").innerText = "Yeni Kategori Ekle";
    document.getElementById("btnKategoriKaydet").innerText = "Ekle ve Kaydet";
});

if (!hasPermission("Category.Add")) {
    const btnEkle = document.querySelector('[data-bs-target="#kategoriModal"]');
    if (btnEkle) btnEkle.classList.add('d-none');
}

if (!hasPermission("Category.Edit") && !hasPermission("Category.Delete")) {
    const islemSutunuBasligi = document.getElementById("islemSutunuBasligi");
    if (islemSutunuBasligi) islemSutunuBasligi.classList.add('d-none');
}

kategorileriYukle();
// ==========================================
// DİNAMİK KATEGORİ KURALLARI (EAV) YÖNETİMİ
// ==========================================

async function kurallariYukle(categoryId) {
    const kuralTabloGovdesi = document.getElementById("kurallarTabloGovdesi");
    kuralTabloGovdesi.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">Yükleniyor...</td></tr>`;
    
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/attribute-rules/category/${categoryId}`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!cevap.ok) throw new Error("Kurallar alınamadı.");
        
        const kurallar = await cevap.json();
        window.mevcutKurallar = kurallar; // Düzenleme için sakla
        kuralTabloGovdesi.innerHTML = ""; 
        
        if (kurallar.length === 0) {
            kuralTabloGovdesi.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">Bu kategoriye ait özel bir kural henüz tanımlanmamış.</td></tr>`;
            return;
        }

        kurallar.forEach(kural => {
            let tipBadge = "";
            switch (kural.dataType) {
                case "text": tipBadge = '<span class="badge bg-secondary">Metin</span>'; break;
                case "number": tipBadge = '<span class="badge bg-primary">Sayı (Int)</span>'; break;
                case "decimal": tipBadge = '<span class="badge bg-info text-dark">Sayı (Ondalık)</span>'; break;
                case "boolean": tipBadge = '<span class="badge bg-success">Evet/Hayır</span>'; break;
                case "range_slider_integer": tipBadge = '<span class="badge bg-primary">Kaydırıcı (Tam Sayı)</span>'; break;
                case "range_slider_decimal": tipBadge = '<span class="badge bg-primary">Kaydırıcı (Ondalık)</span>'; break;
                case "dropdown": tipBadge = '<span class="badge bg-warning text-dark">Açılır Liste</span>'; break;
                case "radio": tipBadge = '<span class="badge bg-warning text-dark">Tekli Seçim</span>'; break;
                case "checkbox_group": tipBadge = '<span class="badge bg-warning text-dark">Çoklu Seçim</span>'; break;
                case "color_picker": tipBadge = '<span class="badge bg-danger">Renk Seçici</span>'; break;
                case "toggle_switch": tipBadge = '<span class="badge bg-success">Aç-Kapat</span>'; break;
                default: tipBadge = `<span class="badge bg-light text-dark">${kural.dataType}</span>`; break;
            }

            let zorunluBadge = kural.isRequired 
                ? '<span class="badge bg-danger">Zorunlu</span>' 
                : '<span class="badge bg-secondary">Opsiyonel</span>';

            let opts = "";
            if (kural.allowedValues && kural.allowedValues !== "[]") {
                try {
                    const parsed = JSON.parse(kural.allowedValues);
                    opts = `<br><small class="text-muted" style="font-size:0.75rem;">Seçenekler: ${parsed.join(', ')}</small>`;
                } catch(e){}
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold text-dark">${escapeHtml(kural.attributeKey)} ${opts}</td>
                <td>${tipBadge}</td>
                <td>${zorunluBadge}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary rounded-pill btn-kural-duzenle me-1" data-id="${kural.id}">Düzenle</button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill btn-kural-sil" data-id="${kural.id}">Sil</button>
                </td>
            `;
            kuralTabloGovdesi.appendChild(tr);
        });

    } catch (hata) {
        kuralTabloGovdesi.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">Hata: ${hata.message}</td></tr>`;
    }
}

document.getElementById("btnKuralEkle").addEventListener("click", async () => {
    const categoryId = document.getElementById("aktifKuralKategoriId").value;
    const attributeKey = document.getElementById("kuralAd").value.trim();
    const dataType = document.getElementById("kuralTip").value;
    const isRequired = document.getElementById("kuralZorunlu").checked;
    const allowedValues = document.getElementById("kuralSecenekler").value;
    
    if (!attributeKey) {
        alert("Lütfen kural (özellik) adını giriniz.");
        return;
    }

    let parsedAllowedValues = "[]";
    if (["dropdown", "radio", "checkbox_group"].includes(dataType)) {
        if (!allowedValues || allowedValues.trim() === "") {
            alert("Bu tip için seçenekler zorunludur (virgülle ayırarak girin).");
            return;
        }
        if (allowedValues && allowedValues.trim() !== "") {
            const arr = allowedValues.split(',').map(s => s.trim()).filter(s => s.length > 0);
            parsedAllowedValues = JSON.stringify(arr);
        }
    }
    
    const kuralVerisi = {
        categoryId: parseInt(categoryId),
        attributeKey: attributeKey,
        dataType: dataType,
        isRequired: isRequired,
        allowedValues: parsedAllowedValues
    };
    
    const btnEkle = document.getElementById("btnKuralEkle");
    const ruleId = btnEkle.getAttribute("data-rule-id");
    const method = ruleId ? "PUT" : "POST";
    const url = ruleId ? `${CONFIG.API_BASE_URL}/attribute-rules/${ruleId}` : `${CONFIG.API_BASE_URL}/attribute-rules`;

    btnEkle.disabled = true;
    btnEkle.innerText = ruleId ? "Güncelleniyor..." : "Ekleniyor...";
    
    try {
        const cevap = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(kuralVerisi)
        });
        
        if (!cevap.ok) throw new Error(await cevap.text());
        
        // Başarılı ise formu temizle
        document.getElementById("kuralAd").value = "";
        document.getElementById("kuralTip").value = "text";
        document.getElementById("kuralZorunlu").checked = false;
        document.getElementById("kuralSecenekler").value = "";
        
        btnEkle.removeAttribute("data-rule-id");
        btnEkle.innerText = "+ Kuralı Ekle";

        kurallariYukle(categoryId);
    } catch (hata) {
        alert("Hata: " + hata.message);
        btnEkle.innerText = ruleId ? "Güncelle" : "+ Kuralı Ekle";
    } finally {
        btnEkle.disabled = false;
    }
});

document.getElementById("kurallarTabloGovdesi").addEventListener("click", async (e) => {
    const btnSil = e.target.closest(".btn-kural-sil");
    const btnDuzenle = e.target.closest(".btn-kural-duzenle");

    if (btnDuzenle) {
        const id = parseInt(btnDuzenle.getAttribute("data-id"));
        const kural = window.mevcutKurallar.find(k => k.id === id);
        if (kural) {
            document.getElementById("kuralAd").value = kural.attributeKey;
            document.getElementById("kuralTip").value = kural.dataType;
            document.getElementById("kuralZorunlu").checked = kural.isRequired;
            
            // Seçenekler kutusunun görünürlüğünü tetikle
            document.getElementById("kuralTip").dispatchEvent(new Event('change'));

            if (kural.allowedValues && kural.allowedValues !== "[]") {
                try {
                    const parsed = JSON.parse(kural.allowedValues);
                    document.getElementById("kuralSecenekler").value = parsed.join(", ");
                } catch(err){}
            } else {
                document.getElementById("kuralSecenekler").value = "";
            }

            const btnEkle = document.getElementById("btnKuralEkle");
            btnEkle.setAttribute("data-rule-id", kural.id);
            btnEkle.innerText = "Güncelle";
        }
    } else if (btnSil) {
        if (!confirm("Bu kuralı silmek istediğinize emin misiniz? (Ürünlerdeki veriler silinmez, sadece formdan kalkar)")) return;
        
        const kuralId = btnSil.getAttribute("data-id");
        btnSil.disabled = true;
        
        try {
            const cevap = await fetch(`${CONFIG.API_BASE_URL}/attribute-rules/${kuralId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (!cevap.ok) throw new Error("Silme işlemi başarısız.");
            
            const categoryId = document.getElementById("aktifKuralKategoriId").value;
            kurallariYukle(categoryId);
            
        } catch (hata) {
            alert(hata.message);
            btnSil.disabled = false;
        }
    }
});

// Kural tipi değiştiğinde Seçenekler kutusunu göster/gizle ve ipucunu güncelle
document.getElementById('kuralTip').addEventListener('change', (e) => {
    const tip = e.target.value;
    const secDiv = document.getElementById('kuralSeceneklerDiv');
    const secInput = document.getElementById('kuralSecenekler');
    
    if (['dropdown', 'radio', 'checkbox_group'].includes(tip)) {
        secDiv.classList.remove('d-none');
        secInput.placeholder = "Örn: Siyah, Beyaz, Kırmızı";
    } else {
        secDiv.classList.add('d-none');
        secInput.value = "";
    }
});
