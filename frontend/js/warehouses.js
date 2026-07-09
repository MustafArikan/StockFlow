const API_URL = `${CONFIG.API_BASE_URL}/warehouses`;
const token = localStorage.getItem('token');
const userRole = getUserRole();

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

let tumDepolar = [];
let filtreliDepolar = [];
const tabloGovdesi = document.getElementById("depoTablosuGovdesi");
let depoPage = 1;
const depoPageSize = 10;

let aktifArama = '';
let siralamaSutunu = 'id';
let siralamaYonu = 'asc';

let aktifDepoId = null;
let rafPage = 1;
const rafPageSize = 10;

function veriyiGuncelle() {
    filtreliDepolar = tumDepolar.filter(depo =>
        (depo.name && depo.name.toLowerCase().includes(aktifArama)) ||
        (depo.address && depo.address.toLowerCase().includes(aktifArama)) ||
        (depo.id && depo.id.toString().includes(aktifArama))
    );

    filtreliDepolar.sort((a, b) => {
        let degerA = a[siralamaSutunu] != null ? a[siralamaSutunu] : '';
        let degerB = b[siralamaSutunu] != null ? b[siralamaSutunu] : '';

        if (typeof degerA === 'string') {
            return siralamaYonu === 'asc' ? degerA.localeCompare(degerB) : degerB.localeCompare(degerA);
        } else {
            return siralamaYonu === 'asc' ? degerA - degerB : degerB - degerA;
        }
    });

    const yeniToplamSayfa = Math.ceil(filtreliDepolar.length / depoPageSize) || 1;
    if (depoPage > yeniToplamSayfa) depoPage = yeniToplamSayfa;

    const baslangic = (depoPage - 1) * depoPageSize;
    const bitis = baslangic + depoPageSize;
    const sayfadakiVeriler = filtreliDepolar.slice(baslangic, bitis);

    tabloyuCiz(sayfadakiVeriler);
    sayfalamayiCizDepolar(yeniToplamSayfa, depoPage);
}

function sirala(sutun) {
    if (siralamaSutunu === sutun) {
        siralamaYonu = siralamaYonu === 'asc' ? 'desc' : 'asc';
    } else {
        siralamaSutunu = sutun;
        siralamaYonu = 'asc';
    }

    const sutunlar = { id: 'thId', name: 'thAd', address: 'thAdres' };
    const metinler = { id: 'ID', name: 'Depo Adı', address: 'Adres' };

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
if (document.getElementById("thAdres")) document.getElementById("thAdres").addEventListener("click", () => sirala("address"));

document.getElementById("aramaKutusu").addEventListener("keyup", (event) => {
    aktifArama = event.target.value.toLowerCase();
    depoPage = 1;
    veriyiGuncelle();
});

async function depolariYukle(page = 1) {
    try {
        const cevap = await fetch(`${API_URL}?pageNumber=1&pageSize=1000`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (cevap.status === 401) { localStorage.removeItem('token'); window.location.href = 'login.html'; return; }
        if (!cevap.ok) throw new Error("Sunucu hatası: " + cevap.status);

        const sonuc = await cevap.json();
        tumDepolar = sonuc.items || sonuc;
        depoPage = page;

        veriyiGuncelle();
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Depolar yüklenemedi. (${hata.message})</td></tr>`;
    }
}

function tabloyuCiz(depolar) {
    tabloGovdesi.innerHTML = "";

    if (depolar.length === 0) {
        tabloGovdesi.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    let satirlar = [];
    depolar.forEach(depo => {
        let aksiyonButonlari = "";
        let btnRaflar = hasPermission("Warehouse.Edit") || hasPermission("Warehouse.Add") || hasPermission("Location.Add") || hasPermission("Location.Delete") ? `<button class="btn btn-sm btn-outline-success rounded-pill btn-raflar" data-id="${depo.id}" data-name="${escapeHtml(depo.name)}">Raflar</button>` : "";
        let btnDuzenle = hasPermission("Warehouse.Edit") ? `<button class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle" data-id="${depo.id}">Düzenle</button>` : "";
        let btnSil = hasPermission("Warehouse.Delete") ? `<button class="btn btn-sm btn-outline-danger rounded-pill btn-sil" data-id="${depo.id}">Sil</button>` : "";

        if (btnRaflar || btnDuzenle || btnSil) {
            aksiyonButonlari = `<td class="text-end">${btnRaflar} ${btnDuzenle} ${btnSil}</td>`;
        }

        const satir = `
            <tr>
                <td class="fw-bold">${depo.id}</td>
                <td>${escapeHtml(depo.name)}</td>
                <td>${escapeHtml(depo.address)}</td>
                ${aksiyonButonlari}
            </tr>`;
        satirlar.push(satir);
    });
    tabloGovdesi.innerHTML = satirlar.join("");
}

function sayfalamayiCizDepolar(totalPages, currentPage) {
    const container = document.getElementById("depoPaginationContainer");
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<nav><ul class="pagination pagination-sm m-0 shadow-sm justify-content-center mt-3">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link depo-page-action" href="#" data-page="${currentPage - 1}">« Önceki</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link depo-page-action" href="#" data-page="${i}">${i}</a></li>`;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link text-muted">...</span></li>`;
            }
        } else {
            html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link depo-page-action" href="#" data-page="${i}">${i}</a></li>`;
        }
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link depo-page-action" href="#" data-page="${currentPage + 1}">Sonraki »</a></li>`;
    html += `</ul></nav>`;
    container.innerHTML = html;
}

document.getElementById("depoPaginationContainer").addEventListener("click", (e) => {
    e.preventDefault();
    const btn = e.target.closest(".depo-page-action");
    if (btn) {
        const parentLi = btn.closest(".page-item");
        if (parentLi && (parentLi.classList.contains("disabled") || parentLi.classList.contains("active"))) return;

        const page = parseInt(btn.getAttribute("data-page"));
        if (!isNaN(page)) {
            depoPage = page;
            veriyiGuncelle();
        }
    }
});

document.getElementById("depoFormu").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("depoId").value;
    const name = document.getElementById("depoAdi").value;
    const address = document.getElementById("depoAdres").value;
    const btnKaydet = document.getElementById("btnDepoKaydet");

    if (!name) { alert("Lütfen depo adı girin!"); return; }

    const depoVerisi = { name: name, address: address };
    const metod = id ? "PUT" : "POST";
    const adres = id ? (`${API_URL}/${id}`) : API_URL;

    try {
        const orjinalMetin = btnKaydet.innerText;
        btnKaydet.disabled = true;
        btnKaydet.innerText = "Kaydediliyor...";

        const cevap = await fetch(adres, {
            method: metod,
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(depoVerisi)
        });

        if (!cevap.ok) throw new Error("İşlem başarısız: " + cevap.status);

        const modalElement = document.getElementById("depoModal");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("depoFormu").reset();
        document.getElementById("depoId").value = "";

        aktifArama = "";
        const aramaKutu = document.getElementById("aramaKutusu");
        if (aramaKutu) aramaKutu.value = "";

        depolariYukle(depoPage);
        btnKaydet.disabled = false;
        btnKaydet.innerText = "Ekle ve Kaydet";
    } catch (hata) {
        alert("İşlem başarısız: " + hata.message);
        btnKaydet.disabled = false;
        btnKaydet.innerText = id ? "Güncelle" : "Ekle ve Kaydet";
    }
});

async function depoSil(id) {
    const onay = confirm("Bu depoyu silmek istediğinize emin misiniz?");
    if (!onay) return;

    try {
        const cevap = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Silme başarısız: " + cevap.status);
        depolariYukle(depoPage);
    } catch (hata) {
        alert("Depo silinemedi: " + hata.message);
    }
}

function depoDuzenle(id) {
    const depo = tumDepolar.find(d => d.id === id);
    if (!depo) return;

    document.getElementById("depoId").value = depo.id;
    document.getElementById("depoAdi").value = depo.name;
    document.getElementById("depoAdres").value = depo.address;
    document.getElementById("modalBaslik").innerText = "Depo Düzenle";
    document.getElementById("btnDepoKaydet").innerText = "Güncelle";

    const modalElement = document.getElementById("depoModal");
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

tabloGovdesi.addEventListener("click", (e) => {
    const btnRaflar = e.target.closest(".btn-raflar");
    const btnDuzenle = e.target.closest(".btn-duzenle");
    const btnSil = e.target.closest(".btn-sil");

    if (btnRaflar) raflariAc(parseInt(btnRaflar.getAttribute("data-id")), btnRaflar.getAttribute("data-name"));
    else if (btnDuzenle) depoDuzenle(parseInt(btnDuzenle.getAttribute("data-id")));
    else if (btnSil) depoSil(parseInt(btnSil.getAttribute("data-id")));
});

document.querySelector('[data-bs-target="#depoModal"]').addEventListener("click", () => {
    document.getElementById("depoFormu").reset();
    document.getElementById("depoId").value = "";
    document.getElementById("modalBaslik").innerText = "Yeni Depo Ekle";
    document.getElementById("btnDepoKaydet").innerText = "Ekle ve Kaydet";
});

async function raflariAc(depoId, depoAdi) {
    aktifDepoId = depoId;
    document.getElementById("raflarModalBaslik").innerText = depoAdi + " — Raflar";
    document.getElementById("rafKodu").value = "";
    await raflariYukle(depoId, 1);

    const modalElement = document.getElementById("raflarModal");
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

async function raflariYukle(depoId, page = 1) {
    const rafTabloGovdesi = document.getElementById("rafTablosuGovdesi");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations/by-warehouse/${depoId}?pageNumber=${page}&pageSize=${rafPageSize}`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!cevap.ok) throw new Error("Raflar alınamadı: " + cevap.status);

        const sonuc = await cevap.json();
        const raflar = sonuc.items || sonuc;
        rafPage = page;

        rafTabloGovdesi.innerHTML = "";

        if (raflar.length === 0) {
            rafTabloGovdesi.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">Bu depoda henüz raf yok.</td></tr>`;
            const container = document.getElementById("rafPaginationContainer");
            if (container) container.innerHTML = "";
            return;
        }

        let satirlar = [];
        raflar.forEach(raf => {
            let rafSilButonu = hasPermission("Location.Delete") ? `<button class="btn btn-sm btn-outline-danger rounded-pill btn-raf-sil" data-id="${raf.id}">Sil</button>` : "";
            const satir = `
                <tr>
                    <td class="fw-bold">${raf.id}</td>
                    <td>${escapeHtml(raf.code)}</td>
                    <td class="text-end">${rafSilButonu}</td>
                </tr>`;
            satirlar.push(satir);
        });
        rafTabloGovdesi.innerHTML = satirlar.join("");
        sayfalamayiCizRaflar(sonuc.totalPages || 1, rafPage, depoId);
    } catch (hata) {
        rafTabloGovdesi.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-3">Raflar yüklenemedi. (${hata.message})</td></tr>`;
    }
}

function sayfalamayiCizRaflar(totalPages, currentPage, depoId) {
    const container = document.getElementById("rafPaginationContainer");
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<nav><ul class="pagination pagination-sm m-0 shadow-sm justify-content-center mt-3">`;
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link raf-page-action" href="#" data-page="${currentPage - 1}">« Önceki</a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link raf-page-action" href="#" data-page="${i}">${i}</a></li>`;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link text-muted">...</span></li>`;
            }
        } else {
            html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link raf-page-action" href="#" data-page="${i}">${i}</a></li>`;
        }
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link raf-page-action" href="#" data-page="${currentPage + 1}">Sonraki »</a></li>`;
    html += `</ul></nav>`;
    container.innerHTML = html;
}

document.getElementById("rafPaginationContainer").addEventListener("click", (e) => {
    e.preventDefault();
    const btn = e.target.closest(".raf-page-action");
    if (btn) {
        const parentLi = btn.closest(".page-item");
        if (parentLi && (parentLi.classList.contains("disabled") || parentLi.classList.contains("active"))) return;

        const page = parseInt(btn.getAttribute("data-page"));
        if (!isNaN(page) && aktifDepoId) raflariYukle(aktifDepoId, page);
    }
});

document.getElementById("rafFormu").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("rafKodu").value;
    const btnKaydet = document.getElementById("btnRafEkle");

    if (!code) { alert("Lütfen raf kodu girin!"); return; }

    const yeniRaf = { code: code, warehouseId: aktifDepoId };

    try {
        const orjinalMetin = btnKaydet.innerText;
        btnKaydet.disabled = true;
        btnKaydet.innerText = "Ekleniyor...";

        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(yeniRaf)
        });

        if (!cevap.ok) throw new Error("Raf eklenemedi: " + cevap.status);

        document.getElementById("rafKodu").value = "";
        await raflariYukle(aktifDepoId, 1);

        btnKaydet.disabled = false;
        btnKaydet.innerText = orjinalMetin;
    } catch (hata) {
        alert("Raf eklenemedi: " + hata.message);
        btnKaydet.disabled = false;
        btnKaydet.innerText = "Raf Ekle";
    }
});

async function rafSil(id) {
    const onay = confirm("Bu rafı silmek istediğinize emin misiniz?");
    if (!onay) return;

    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!cevap.ok) throw new Error("Silme başarısız: " + cevap.status);
        raflariYukle(aktifDepoId, rafPage);
    } catch (hata) {
        alert("Raf silinemedi: " + hata.message);
    }
}

document.getElementById("rafTablosuGovdesi").addEventListener("click", (e) => {
    const btnRafSil = e.target.closest(".btn-raf-sil");
    if (btnRafSil) rafSil(parseInt(btnRafSil.getAttribute("data-id")));
});

if (!hasPermission("Warehouse.Add")) {
    const btnEkle = document.querySelector('[data-bs-target="#depoModal"]');
    if (btnEkle) btnEkle.classList.add('d-none');
}
if (!hasPermission("Warehouse.Edit") && !hasPermission("Warehouse.Delete")) {
    const islemSutunuBasligi = document.getElementById("islemSutunuBasligi");
    if (islemSutunuBasligi) islemSutunuBasligi.classList.add('d-none');
}

depolariYukle();