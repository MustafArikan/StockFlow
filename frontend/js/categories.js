const API_URL = `${CONFIG.API_BASE_URL}/categories`;
const token = localStorage.getItem('token');

const userRole = getUserRole(); // config.js'den gelir

// Güvenlik kontrolü: Token yoksa login'e yönlendir
if (!token) {
    window.location.href = 'login.html';
}

// XSS koruması için html karakterlerini encode eder
function escapeHtml(text) {
    if (!text) return "";
    return text
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let tumKategoriler = [];
const tabloGovdesi = document.getElementById("kategoriTablosuGovdesi");

// API'den kategorileri çeken fonksiyon
async function kategorileriYukle() {
    try {
        const cevap = await fetch(API_URL, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) {
            throw new Error("Sunucu hatası: " + cevap.status);
        }

        const kategoriler = await cevap.json();
        tumKategoriler = kategoriler;
        tabloyuCiz(tumKategoriler);
    } catch (hata) {
        tabloGovdesi.innerHTML = `
        <tr>
            <td colspan="3" class="text-center text-danger py-4">Kategori Yüklenemedi. Backend çalışıyor mu? (${hata.message})</td>
        </tr>`;
        console.error("Hata:", hata);
    }
}

// Tabloyu çizen fonksiyon (CSP uyumlu - satır içi onClick kaldırıldı)
function tabloyuCiz(kategoriler) {
    tabloGovdesi.innerHTML = "";

    if (kategoriler.length === 0) {
        tabloGovdesi.innerHTML = `
        <tr>
            <td colspan="3" class="text-center text-muted py-4">Henüz kategori yok. "Yeni kategori ekle" ile başlayın.</td>
        </tr>`;
        return;
    }

    let satirlar = [];
    kategoriler.forEach(kategori => {
        let aksiyonButonlari = "";
        let btnDuzenle = hasPermission("Category.Edit") ? `<button class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle" data-id="${kategori.id}">Düzenle</button>` : "";
        let btnSil = hasPermission("Category.Delete") ? `<button class="btn btn-sm btn-outline-danger rounded-pill btn-sil" data-id="${kategori.id}">Sil</button>` : "";

        if (btnDuzenle || btnSil) {
            aksiyonButonlari = `<td class="text-end">${btnDuzenle} ${btnSil}</td>`;
        }

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

// Olay Delege Etme (Event Delegation)
tabloGovdesi.addEventListener("click", (e) => {
    const btnDuzenle = e.target.closest(".btn-duzenle");
    const btnSil = e.target.closest(".btn-sil");

    if (btnDuzenle) {
        const id = parseInt(btnDuzenle.getAttribute("data-id"));
        kategoriDuzenle(id);
    } else if (btnSil) {
        const id = parseInt(btnSil.getAttribute("data-id"));
        kategoriSil(id);
    }
});

// Sayfa yüklenince kategorileri çek
kategorileriYukle();

// Ekle / Güncelle işlemi
document.getElementById("btnKategoriKaydet").addEventListener("click", async () => {
    const id = document.getElementById("kategoriId").value;
    const name = document.getElementById("kategoriAdi").value;

    if (!name) {
        alert("Lütfen kategori adı girin!");
        return;
    }

    const kategoriVerisi = {
        name: name,
        parentId: null
    };

    const metod = id ? "PUT" : "POST";
    const adres = id ? (API_URL + "/" + id) : API_URL;

    try {
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

        if (!cevap.ok) {
            const hataMesaji = await cevap.text();
            throw new Error(hataMesaji || ("İşlem başarısız: " + cevap.status));
        }

        const modalElement = document.getElementById("kategoriModal");
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("kategoriFormu").reset();
        document.getElementById("kategoriId").value = "";

        kategorileriYukle();
    } catch (hata) {
        alert("İşlem başarısız: " + hata.message);
        console.error("Hata:", hata);
    }
});

// Silme işlemi
async function kategoriSil(id) {
    const onay = confirm("Bu kategoriyi silmek istediğinize emin misiniz?");
    if (!onay) return;

    try {
        const cevap = await fetch(API_URL + "/" + id, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) {
            throw new Error("Silme başarısız: " + cevap.status + " (Bu kategoriye bağlı ürünler olabilir.)");
        }
        kategorileriYukle();
    } catch (hata) {
        alert("Kategori silinemedi: " + hata.message);
        console.error("Hata:", hata);
    }
}

// Arama kutusu
document.getElementById("aramaKutusu").addEventListener("keyup", (event) => {
    const arananKelime = event.target.value.toLowerCase();
    const filtrelenmis = tumKategoriler.filter(kategori =>
        kategori.name.toLowerCase().includes(arananKelime)
    );
    tabloyuCiz(filtrelenmis);
});

// Düzenleme modalını açma
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

// Yeni kategori ekleme butonu
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