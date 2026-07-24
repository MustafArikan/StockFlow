const API_URL = `${CONFIG.API_BASE_URL}/categories`;
const token = localStorage.getItem('token');
const userRole = getUserRole();

let tumKategoriler = [];
let filtreliKategoriler = [];
const tabloGovdesi = document.getElementById("kategoriTablosuGovdesi");


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

    tabloyuCiz(filtreliKategoriler);
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
    veriyiGuncelle();
});

async function kategorileriYukle(page = 1) {
    try {
        const sonuc = await apiRequest('/categories?pageNumber=1&pageSize=1000', 'GET');
        tumKategoriler = sonuc.items || sonuc;

        veriyiGuncelle();
        ustKategoriDropdownDoldur();
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">Kategori Yüklenemedi. (${hata.message})</td></tr>`;
        const paginationContainer = document.getElementById("paginationContainer");
        if (paginationContainer) paginationContainer.innerHTML = "";
    }
}

function ustKategoriDropdownDoldur(haricTutulacakId = null) {
    const currentVal = document.getElementById('ustKategoriId').value;
    buildCategoryCascader('ustKategoriContainer', 'ustKategoriId', currentVal || null, false, haricTutulacakId);
}

function buildCategoryCascader(containerId, hiddenInputId, selectedCategoryId = null, isFilter = false, excludeId = null) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!container || !hiddenInput) return;

    let finalizedCategoryId = selectedCategoryId ? parseInt(selectedCategoryId) : null;
    let expandedCategories = new Set();

    function updateExpandedCategories(id) {
        expandedCategories.clear();
        if (!id) return;
        
        expandedCategories.add(id);
        let current = tumKategoriler.find(k => k.id == id);
        while (current && current.parentId) {
            expandedCategories.add(current.parentId);
            current = tumKategoriler.find(k => k.id == current.parentId);
        }
    }

    if (finalizedCategoryId) {
        updateExpandedCategories(finalizedCategoryId);
    }

    container.innerHTML = '';
    
    // Bootstrap Dropdown Container
    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'dropdown w-100';
    
    // Toggle Button
    const button = document.createElement('button');
    let btnClasses = isFilter ? 'btn form-control rounded-pill text-start bg-white border d-flex justify-content-between align-items-center' : 'btn form-control text-start bg-white border d-flex justify-content-between align-items-center';
    button.className = btnClasses;
    button.type = 'button';
    button.dataset.bsToggle = 'dropdown';
    button.dataset.bsAutoClose = 'outside'; // Menü dışına tıklanana kadar kapanmasın
    
    const spanText = document.createElement('span');
    spanText.className = 'text-truncate pe-2';
    
    const caretIcon = document.createElement('i');
    caretIcon.className = 'bi bi-chevron-down text-muted';
    caretIcon.style.fontSize = '0.8rem';
    
    button.appendChild(spanText);
    button.appendChild(caretIcon);
    
    // Dropdown Menu
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
        
        // Seçili Kategoriyi Buton Metnine Yaz
        if (finalizedCategoryId) {
            const cat = tumKategoriler.find(k => k.id == finalizedCategoryId);
            spanText.textContent = cat ? cat.name : (isFilter ? 'Tüm Kategoriler' : 'Yok (Ana Kategori Olarak Ekle)');
        } else {
            spanText.textContent = isFilter ? 'Tüm Kategoriler' : 'Yok (Ana Kategori Olarak Ekle)';
        }
        
        // Temizle Butonu
        const clearLi = document.createElement('li');
        const clearA = document.createElement('a');
        clearA.className = 'dropdown-item text-muted fst-italic border-bottom mb-1 pb-2';
        clearA.href = '#';
        if (finalizedCategoryId) {
            clearA.innerHTML = '<i class="bi bi-x-circle me-1"></i> Temizle / Ana Kategori Yap';
            clearA.addEventListener('click', (e) => {
                e.preventDefault();
                finalizedCategoryId = null;
                expandedCategories.clear();
                hiddenInput.value = '';
                hiddenInput.dispatchEvent(new Event('change'));
                renderOptions();
            });
        } else {
            clearA.textContent = isFilter ? 'Tüm Kategoriler (Seçili)' : 'Yok (Ana Kategori Olarak Ekle) (Seçili)';
            clearA.classList.add('disabled');
        }
        clearLi.appendChild(clearA);
        menu.appendChild(clearLi);

        // Bir kategorinin kendisi veya altından birini kontrol etmek için helper
        function isSelfOrDescendantOfExcluded(catId) {
            if (!excludeId) return false;
            let curr = tumKategoriler.find(k => k.id == catId);
            while (curr) {
                if (curr.id == excludeId) return true;
                curr = tumKategoriler.find(k => k.id == curr.parentId);
            }
            return false;
        }

        function buildTree(parentId, level) {
            const children = tumKategoriler.filter(k => k.parentId == parentId && !isSelfOrDescendantOfExcluded(k.id));
            
            children.forEach(c => {
                const isInPath = expandedCategories.has(c.id);
                const isChildOfFinal = (c.parentId === finalizedCategoryId);
                const isRootWhenEmpty = (finalizedCategoryId === null && c.parentId === null);

                if (!isInPath && !isChildOfFinal && !isRootWhenEmpty) {
                    return; 
                }

                const hasChildren = tumKategoriler.some(k => k.parentId == c.id && !isSelfOrDescendantOfExcluded(k.id));
                
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                if (finalizedCategoryId === c.id) {
                    a.classList.add('active'); // Bootstrap active blue styling
                }
                a.href = '#';
                
                const prefix = '\u00A0\u00A0\u00A0'.repeat(level); 
                
                if (hasChildren) {
                    a.innerHTML = prefix + (isInPath ? '▾ ' : '▸ ') + escapeHtml(c.name);
                    a.classList.add('fw-bold'); // Parent node highlight
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

        // Aç/Kapat İkonu ve Tıklanabilir Alan Ayarı
        if (hasChildren && aktifArama.trim() === '') {
            dFlex.classList.add("btn-expand");
            dFlex.dataset.id = kategori.id;
            dFlex.style.cursor = "pointer";
            dFlex.classList.add("user-select-none"); // Metin seçilmesini engelle
        }

        if (aktifArama.trim() === '') {
            if (hasChildren) {
                const icon = document.createElement("i");
                icon.className = `bi bi-chevron-${acikKategoriler.has(kategori.id) ? 'down' : 'right'} me-2 text-primary`;
                icon.style.width = "16px";
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
    const endpoint = id ? `/categories/${id}` : '/categories';

    try {
        const orjinalMetin = btnKaydet.innerText;
        btnKaydet.disabled = true;
        btnKaydet.innerText = "Kaydediliyor...";

        await apiRequest(endpoint, metod, kategoriVerisi);

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
        const depData = await apiRequest(`/categories/${id}/check-dependencies`, 'GET');

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

        await apiRequest(`/categories/${id}`, 'DELETE');
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
        tabloyuCiz(filtreliKategoriler);
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
    kuralTabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">Yükleniyor...</td></tr>`;
    
    try {
        const kurallar = await apiRequest(`/attribute-rules/category/${categoryId}`, 'GET');
        window.mevcutKurallar = kurallar; // Düzenleme için sakla
        kuralTabloGovdesi.innerHTML = ""; 
        
        if (kurallar.length === 0) {
            kuralTabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">Bu kategoriye ait özel bir kural henüz tanımlanmamış.</td></tr>`;
            return;
        }

        kurallar.forEach(kural => {
            let tipBadge = "";
            let uiValue = (kural.uiComponent && kural.uiComponent !== "textbox") ? kural.uiComponent : kural.dataType;
            switch (uiValue) {
                case "text": tipBadge = '<span class="badge bg-secondary">Düz Metin</span>'; break;
                case "autocomplete": tipBadge = '<span class="badge bg-secondary">Autocomplete</span>'; break;
                case "masked_textbox": tipBadge = '<span class="badge bg-secondary">Maskeli Metin</span>'; break;
                case "number": tipBadge = '<span class="badge bg-primary">Tam Sayı</span>'; break;
                case "decimal": tipBadge = '<span class="badge bg-info text-dark">Ondalık</span>'; break;
                case "slider": 
                    if(kural.dataType === "number") tipBadge = '<span class="badge bg-primary">Slider (Int)</span>';
                    else tipBadge = '<span class="badge bg-info text-dark">Slider (Ondalık)</span>';
                    break;
                case "dropdown": tipBadge = '<span class="badge bg-warning text-dark">Açılır Liste</span>'; break;
                case "icon_dropdown": tipBadge = '<span class="badge bg-warning text-dark">İkonlu Liste</span>'; break;
                case "searchable_dropdown": tipBadge = '<span class="badge bg-warning text-dark">Aramalı Liste</span>'; break;
                case "radio": tipBadge = '<span class="badge bg-warning text-dark">Tekli Seçim</span>'; break;
                case "segmented_button": tipBadge = '<span class="badge bg-warning text-dark">Segmentli Buton</span>'; break;
                case "checkbox_group": tipBadge = '<span class="badge bg-warning text-dark">Çoklu Seçim</span>'; break;
                case "color_picker": tipBadge = '<span class="badge bg-danger">Renk Seçici</span>'; break;
                case "toggle_switch": tipBadge = '<span class="badge bg-success">Aç-Kapat</span>'; break;
                case "checkbox":
                case "boolean": tipBadge = '<span class="badge bg-success">Onay Kutusu</span>'; break;
                default: tipBadge = `<span class="badge bg-light text-dark">${uiValue}</span>`; break;
            }

            let targetBadge = kural.targetLevel === "Asset" 
                ? '<span class="badge bg-dark"><i class="bi bi-phone"></i> Demirbaş</span>' 
                : '<span class="badge bg-light text-dark border"><i class="bi bi-box"></i> Katalog</span>';

            let zorunluBadge = kural.isRequired 
                ? '<span class="badge bg-danger">Zorunlu</span>' 
                : '<span class="badge bg-secondary">Opsiyonel</span>';

            let opts = "";
            if (kural.allowedValues && kural.allowedValues !== "[]") {
                try {
                    const parsed = JSON.parse(kural.allowedValues);
                    opts = `<br><small class="text-muted text-xs">Seçenekler: ${parsed.join(', ')}</small>`;
                } catch(e){}
            }

            if (kural.uiComponent === "slider" && (kural.minValue !== null || kural.maxValue !== null)) {
                opts += `<br><small class="text-muted text-xs">Aralık: ${kural.minValue ?? '*'} - ${kural.maxValue ?? '*'}</small>`;
            }

            const tr = document.createElement("tr");
            tr.setAttribute("data-id", kural.id);
            // Sürüklerken düzgün dursun diye arkaplan verebiliriz ama Sortable ghostClass hallediyor
            tr.innerHTML = `
                <td class="text-center" style="cursor: grab;"><i class="bi bi-grip-vertical text-muted fs-5 handle"></i></td>
                <td>${targetBadge}</td>
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

        // SortableJS Entegrasyonu
        if (window.Sortable) {
            new Sortable(kuralTabloGovdesi, {
                handle: '.handle',
                animation: 200,
                ghostClass: 'bg-light',
                dragClass: 'shadow-lg',
                onEnd: async function (evt) {
                    const rows = Array.from(kuralTabloGovdesi.querySelectorAll('tr[data-id]'));
                    const reorderData = rows.map((row, index) => ({
                        id: parseInt(row.getAttribute('data-id')),
                        displayOrder: index
                    }));

                    try {
                        await apiRequest('/attribute-rules/reorder', 'PUT', reorderData);
                    } catch (e) {
                        console.error(e);
                        alert("Sıralama kaydedilirken hata oluştu.");
                    }
                }
            });
        }
    } catch (hata) {
        kuralTabloGovdesi.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">Hata: ${hata.message}</td></tr>`;
    }
}

// ==========================================
// KURAL TİPİ VE ÖNİZLEME TETİKLEYİCİLERİ
// ==========================================
function gorselOnizlemeGuncelle() {
    const tip = document.getElementById("kuralTip").value;
    const seceneklerStr = document.getElementById("kuralSecenekler").value;
    let secenekler = [];
    if (seceneklerStr.trim() !== "") {
        secenekler = seceneklerStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    const minVal = document.getElementById("kuralMin").value || 0;
    const maxVal = document.getElementById("kuralMax").value || 100;
    
    const previewHtml = DynamicUI.renderPreviewInput(tip, secenekler, minVal, maxVal, escapeHtml);
    
    const previewBox = document.getElementById("inlinePreviewBox");
    const previewContent = document.getElementById("inlinePreviewContent");
    
    if (previewHtml) {
        previewContent.innerHTML = previewHtml;
        previewBox.classList.remove("d-none");
    } else {
        previewBox.classList.add("d-none");
    }
}

document.getElementById("kuralTip").addEventListener("change", function() {
    const tip = this.value;
    const seceneklerDiv = document.getElementById("kuralSeceneklerDiv");
    const minDiv = document.getElementById("kuralMinDiv");
    const maxDiv = document.getElementById("kuralMaxDiv");
    
    seceneklerDiv.classList.add("d-none");
    minDiv.classList.add("d-none");
    maxDiv.classList.add("d-none");
    
    const secenekliTipler = ["dropdown", "icon_dropdown", "searchable_dropdown", "radio", "segmented_button", "checkbox_group", "color_picker"];
    const rangeTipler = ["slider", "range_slider_integer", "range_slider_decimal"];
    
    if (secenekliTipler.includes(tip)) {
        seceneklerDiv.classList.remove("d-none");
    }
    
    if (rangeTipler.includes(tip)) {
        minDiv.classList.remove("d-none");
        maxDiv.classList.remove("d-none");
    }
    
    gorselOnizlemeGuncelle();
});

document.getElementById("kuralSecenekler").addEventListener("input", gorselOnizlemeGuncelle);
document.getElementById("kuralMin").addEventListener("input", gorselOnizlemeGuncelle);
document.getElementById("kuralMax").addEventListener("input", gorselOnizlemeGuncelle);

document.getElementById("btnKuralEkle").addEventListener("click", async () => {
    const categoryId = document.getElementById("aktifKuralKategoriId").value;
    const attributeKey = document.getElementById("kuralAd").value.trim();
    const uiSelection = document.getElementById("kuralTip").value;
    const targetLevel = document.getElementById("kuralTargetLevel").value;
    const isRequired = document.getElementById("kuralZorunlu").checked;
    const allowedValues = document.getElementById("kuralSecenekler").value;
    const minVal = document.getElementById("kuralMin").value;
    const maxVal = document.getElementById("kuralMax").value;
    
    let dataType = "text";
    let uiComponent = "textbox";
    
    switch (uiSelection) {
        case "text": dataType = "text"; uiComponent = "textbox"; break;
        case "autocomplete": dataType = "text"; uiComponent = "autocomplete"; break;
        case "masked_textbox": dataType = "text"; uiComponent = "masked_textbox"; break;
        case "number": dataType = "number"; uiComponent = "textbox"; break;
        case "decimal": dataType = "decimal"; uiComponent = "textbox"; break;
        case "range_slider_integer": dataType = "number"; uiComponent = "slider"; break;
        case "range_slider_decimal": dataType = "decimal"; uiComponent = "slider"; break;
        case "dropdown": dataType = "select"; uiComponent = "dropdown"; break;
        case "icon_dropdown": dataType = "select"; uiComponent = "icon_dropdown"; break;
        case "searchable_dropdown": dataType = "select"; uiComponent = "searchable_dropdown"; break;
        case "radio": dataType = "select"; uiComponent = "radio"; break;
        case "segmented_button": dataType = "select"; uiComponent = "segmented_button"; break;
        case "checkbox_group": dataType = "select"; uiComponent = "checkbox_group"; break;
        case "color_picker": dataType = "select"; uiComponent = "color_picker"; break;
        case "toggle_switch": dataType = "boolean"; uiComponent = "toggle_switch"; break;
        case "boolean": dataType = "boolean"; uiComponent = "checkbox"; break;
    }
    
    if (!attributeKey) {
        alert("Lütfen kural (özellik) adını giriniz.");
        return;
    }

    let parsedAllowedValues = "[]";
    if (["dropdown", "icon_dropdown", "searchable_dropdown", "radio", "segmented_button", "checkbox_group", "color_picker"].includes(uiComponent)) {
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
        allowedValues: parsedAllowedValues,
        uiComponent: uiComponent,
        minValue: minVal !== "" ? parseFloat(minVal) : null,
        maxValue: maxVal !== "" ? parseFloat(maxVal) : null,
        targetLevel: targetLevel
    };
    
    const btnEkle = document.getElementById("btnKuralEkle");
    const ruleId = btnEkle.getAttribute("data-rule-id");
    const method = ruleId ? "PUT" : "POST";
    const endpoint = ruleId ? `/attribute-rules/${ruleId}` : `/attribute-rules`;

    btnEkle.disabled = true;
    btnEkle.innerText = ruleId ? "Güncelleniyor..." : "Ekleniyor...";
    
    try {
        await apiRequest(endpoint, method, kuralVerisi);
        
        // Başarılı ise formu temizle
        document.getElementById("kuralAd").value = "";
        document.getElementById("kuralTip").value = "text";
        document.getElementById("kuralTargetLevel").value = "Product";
        document.getElementById("kuralZorunlu").checked = false;
        document.getElementById("kuralSecenekler").value = "";
        document.getElementById("kuralMin").value = "";
        document.getElementById("kuralMax").value = "";
        
        document.getElementById("kuralTip").dispatchEvent(new Event('change'));
        
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
            document.getElementById("kuralTargetLevel").value = kural.targetLevel || "Product";
            
            let reverseUi = kural.uiComponent;
            
            if (!reverseUi || reverseUi === "") {
                // Eski kayıt (Migration öncesi eklenmiş, uiComponent null/empty)
                // Eski kayıtların dataType'ı formdaki option value'suyla birebir aynıydı.
                reverseUi = kural.dataType; 
            } else {
                // Yeni kayıt (uiComponent dolu)
                if (kural.uiComponent === "slider") {
                    reverseUi = kural.dataType === "number" ? "range_slider_integer" : "range_slider_decimal";
                } else if (kural.uiComponent === "checkbox") {
                    reverseUi = "boolean";
                } else if (kural.uiComponent === "textbox") {
                    reverseUi = kural.dataType; // "text", "number", "decimal"
                } else {
                    reverseUi = kural.uiComponent; // "dropdown", "radio", "masked_textbox", vb.
                }
            }
            
            document.getElementById("kuralTip").value = reverseUi || "text";
            document.getElementById("kuralZorunlu").checked = kural.isRequired;
            document.getElementById("kuralMin").value = kural.minValue ?? "";
            document.getElementById("kuralMax").value = kural.maxValue ?? "";
            
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
            await apiRequest(`/attribute-rules/${kuralId}`, 'DELETE');
            
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
    const minDiv = document.getElementById('kuralMinDiv');
    const maxDiv = document.getElementById('kuralMaxDiv');
    
    if (['dropdown', 'icon_dropdown', 'searchable_dropdown', 'radio', 'segmented_button', 'checkbox_group', 'color_picker'].includes(tip)) {
        secDiv.classList.remove('d-none');
        secInput.placeholder = "Örn: Siyah, Beyaz, Kırmızı";
    } else {
        secDiv.classList.add('d-none');
        secInput.value = "";
    }

    if (['range_slider_integer', 'range_slider_decimal'].includes(tip)) {
        minDiv.classList.remove('d-none');
        maxDiv.classList.remove('d-none');
    } else {
        minDiv.classList.add('d-none');
        maxDiv.classList.add('d-none');
        document.getElementById('kuralMin').value = "";
        document.getElementById('kuralMax').value = "";
    }
    
    if (typeof updateKuralPreview === 'function') updateKuralPreview();
});

// ==========================================
// INLINE CANLI ÖNİZLEME (LIVE PREVIEW) MANTIĞI
// ==========================================
function updateKuralPreview() {
    const uiType = document.getElementById("kuralTip").value;
    const secenekler = document.getElementById("kuralSecenekler").value.split(',').map(s => s.trim()).filter(s => s);
    const minVal = document.getElementById("kuralMin").value || 0;
    const maxVal = document.getElementById("kuralMax").value || 100;

    const previewBox = document.getElementById("inlinePreviewBox");
    const icerik = document.getElementById("inlinePreviewContent");
    
    // Eğer hiçbir şey seçilmemişse gizle
    if (!uiType) {
        if(previewBox) previewBox.classList.add('d-none');
        return;
    }
    if(previewBox) previewBox.classList.remove('d-none');

    const escapeHTML = (str) => String(str).replace(/[&<>'"]/g, tag => ({'&': '&amp;','<': '&lt;','>': '&gt;',"'": '&#39;','"': '&quot;'}[tag]));
    let inputHtml = DynamicUI.renderPreviewInput(uiType, secenekler, minVal, maxVal, escapeHTML);

    if(icerik) {
        icerik.innerHTML = inputHtml;
    }
}

// Olay dinleyicilerini bağla (Her tuşa basıldığında veya seçim değiştiğinde)
['kuralTip', 'kuralSecenekler', 'kuralMin', 'kuralMax'].forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', updateKuralPreview);
        el.addEventListener('change', updateKuralPreview);
    }
});

// Sayfa yüklendiğinde ilk önizlemeyi tetikle
setTimeout(updateKuralPreview, 500);
