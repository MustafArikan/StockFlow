const API_URL = `${CONFIG.API_BASE_URL}/categories`;
const token = localStorage.getItem('token');
const userRole = getUserRole();

let tumKategoriler = [];
let filtreliKategoriler = [];
const tabloGovdesi = document.getElementById("kategoriTablosuGovdesi");
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
    filtreliKategoriler = tumKategoriler.filter(kategori =>
        (kategori.name && kategori.name.toLowerCase().includes(aktifArama)) ||
        (kategori.id && kategori.id.toString().includes(aktifArama))
    );

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
    } catch (hata) {
        tabloGovdesi.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">Kategori Yüklenemedi. (${hata.message})</td></tr>`;
        const paginationContainer = document.getElementById("paginationContainer");
        if (paginationContainer) paginationContainer.innerHTML = "";
    }
}

function tabloyuCiz(kategoriler) {
    tabloGovdesi.innerHTML = "";

    if (kategoriler.length === 0) {
        tabloGovdesi.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    let satirlar = [];
    kategoriler.forEach(kategori => {
        let btnDuzenle = hasPermission("Category.Edit") ? `<button class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle" data-id="${kategori.id}">Düzenle</button>` : "";
        let btnSil = hasPermission("Category.Delete") ? `<button class="btn btn-sm btn-outline-danger rounded-pill btn-sil" data-id="${kategori.id}">Sil</button>` : "";
        let aksiyonButonlari = (btnDuzenle || btnSil) ? `<td class="text-end">${btnDuzenle} ${btnSil}</td>` : "";

        const satir = `
            <tr>
                <td class="fw-bold">${kategori.id}</td>
                <td>${escapeHtml(kategori.name)}</td>
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

document.getElementById("btnKategoriKaydet").addEventListener("click", async () => {
    const id = document.getElementById("kategoriId").value;
    const name = document.getElementById("kategoriAdi").value;
    const btnKaydet = document.getElementById("btnKategoriKaydet");

    if (!name) {
        alert("Lütfen kategori adı girin!");
        return;
    }

    const kategoriVerisi = { name: name, parentId: null };
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
    const onay = confirm("Bu kategoriyi silmek istediğinize emin misiniz?");
    if (!onay) return;

    try {
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
    document.getElementById("modalBaslik").innerText = "Kategori Düzenle";
    document.getElementById("btnKategoriKaydet").innerText = "Güncelle";

    const modalElement = document.getElementById("kategoriModal");
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

tabloGovdesi.addEventListener("click", (e) => {
    const btnDuzenle = e.target.closest(".btn-duzenle");
    const btnSil = e.target.closest(".btn-sil");

    if (btnDuzenle) kategoriDuzenle(parseInt(btnDuzenle.getAttribute("data-id")));
    else if (btnSil) kategoriSil(parseInt(btnSil.getAttribute("data-id")));
});

document.querySelector('[data-bs-target="#kategoriModal"]').addEventListener("click", () => {
    document.getElementById("kategoriFormu").reset();
    document.getElementById("kategoriId").value = "";
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