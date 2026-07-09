// backend api adersi - tek yerde tanımlı değişirse buradan değiştirilir
const API_URL = `${CONFIG.API_BASE_URL}/products`;
const token = localStorage.getItem('token');

const userRole = getUserRole(); // config.js'den gelir

let currentPage = 1;
const pageSize = 10; // Her sayfada kaç ürün gösterilecek?

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

// Tüm ürünler burada saklanıyor arama için
let tumUrunler = [];

// Tablo gövdesi referansı
const tabloGovdesi = document.getElementById("urunTablosuGovdesi");

// API'den ürünleri çekip tabloya basan ana fonksiyon
async function urunleriYukle(page = 1) {
    try {
        const adres = `${API_URL}?pageNumber=${page}&pageSize=${pageSize}`;

        const cevap = await fetch(adres, {
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

        const sonuc = await cevap.json();
        
        tumUrunler = sonuc.items; 
        currentPage = sonuc.currentPage;

        tabloyuCiz(tumUrunler);
        sayfalamayiCiz(sonuc.totalPages, sonuc.currentPage);

    } catch (hata) {
        tabloGovdesi.innerHTML = `
            <tr>
                <td colSpan="7" class="text-center text-danger py-4">Ürünler yüklenemedi. Backend çalışıyor mu? (${hata.message})</td>
            </tr>`;
        console.error("Hata:", hata);
    }
}

function sayfalamayiCiz(totalPages, currentPage) {
    const container = document.getElementById("paginationContainer");
    
    if (totalPages <= 1) {
        container.innerHTML = "";
        return;
    }

    let html = `<nav><ul class="pagination pagination-sm m-0">`;

    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="sayfaDegistir(${currentPage - 1}); return false;">Önceki</a>
             </li>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="sayfaDegistir(${i}); return false;">${i}</a>
                 </li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="sayfaDegistir(${currentPage + 1}); return false;">Sonraki</a>
             </li>`;

    html += `</ul></nav>`;
    container.innerHTML = html;
}

window.sayfaDegistir = function(yeniSayfa) {
    urunleriYukle(yeniSayfa);
}

// Ürün dizisini alıp tabloya satır satır basan fonksiyon
function tabloyuCiz(urunler) {
    tabloGovdesi.innerHTML = "";

    if (urunler.length === 0) {
        tabloGovdesi.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4"> Henüz ürün yok. "Yeni ürün ekle" ile başlayın.</td>
            </tr>`;
        return;
    }

    let satirlar = [];

    // Her ürün için bir satır oluştur
    urunler.forEach(urun => {
        let aksiyonButonlari = "";
        
        let btnDuzenle = hasPermission("Product.Edit") ? `<button class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle" data-id="${urun.id}">Düzenle</button>` : "";
        let btnSil = hasPermission("Product.Delete") ? `<button class="btn btn-sm btn-outline-danger rounded-pill btn-sil" data-id="${urun.id}">Sil</button>` : "";
        
        if (btnDuzenle || btnSil) {
            aksiyonButonlari = `<td class="text-end">${btnDuzenle} ${btnSil}</td>`;
        }

        const satir = `
            <tr>
                <td class="fw-bold">${urun.id}</td>
                <td>${escapeHtml(urun.name)}</td>
                <td>${escapeHtml(urun.barcode)}</td>
                <td>${urun.minStockLevel}</td>
                <td>${escapeHtml(urun.categoryName)}</td>
                <td>
                    <span class="badge ${urun.stockQuantity <= urun.minStockLevel ? 'bg-danger' : 'bg-success'} bg-opacity-10 ${urun.stockQuantity <= urun.minStockLevel ? 'text-danger' : 'text-success'} border ${urun.stockQuantity <= urun.minStockLevel ? 'border-danger' : 'border-success'} px-2 py-1 rounded-pill">
                        ${urun.stockQuantity} Adet
                    </span>
                </td>
                ${aksiyonButonlari}
            </tr>`;
        satirlar.push(satir);
    });

    // Tüm satırları tek seferde DOM'a basarak performansı artırıyoruz
    tabloGovdesi.innerHTML = satirlar.join("");
}

// Olay Delege Etme (Event Delegation) - Satır içi onclick eventlerini kaldırdık
tabloGovdesi.addEventListener("click", (e) => {
    const btnDuzenle = e.target.closest(".btn-duzenle");
    const btnSil = e.target.closest(".btn-sil");

    if (btnDuzenle) {
        const id = parseInt(btnDuzenle.getAttribute("data-id"));
        urunDuzenle(id);
    } else if (btnSil) {
        const id = parseInt(btnSil.getAttribute("data-id"));
        urunSil(id);
    }
});

// sayfa açılınca ürünleri yükle
urunleriYukle(currentPage);

// Ekle ve Kaydet butonları için
document.getElementById("btnUrunKaydet").addEventListener("click", async () => {
    const id = document.getElementById("urunId").value; // boşsa ekle, doluysa güncelle
    const name = document.getElementById("urunAdi").value;
    const barcode = document.getElementById("urunBarkod").value;
    const minStockLevel = document.getElementById("urunMinStok").value;
    const categoryId = document.getElementById("urunKategoriId").value;

    if (!name) {
        alert("Lütfen ürün adı girin!");
        return;
    }

    // API'ye gönderilecek veri nesnesi
    const urunVerisi = {
        name: name,
        barcode: barcode,
        minStockLevel: parseInt(minStockLevel),
        categoryId: parseInt(categoryId)
    };

    // id varsa güncelleme yoksa ekleme
    const metod = id ? "PUT" : "POST";
    const adres = id ? (API_URL + "/" + id) : API_URL;

    try {
        // API'ye Yetkilendirilmiş istek gönder
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
        
        if (!cevap.ok) {
            throw new Error("İşlem başarısız: " + cevap.status);
        }

        // Başarılı olursa modalı kapatıp formu temizleyerek tabloyu yeniliyor
        const modalElement = document.getElementById("urunModal");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("urunFormu").reset();
        document.getElementById("urunId").value = ""; // gizli id'yi temizlemek için
        
        urunleriYukle(currentPage);
    } catch (hata) {
        alert("Ürün yüklenemedi: " + hata.message);
        console.error("Hata:", hata);
    }
});

// Silme için
async function urunSil(id) {
    const onay = confirm("Bu ürünü silmek istediğinize emin misiniz?");
    if (!onay) return;

    try {
        // API'ye Yetkilendirilmiş DELETE isteği
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
            throw new Error("Silme başarısız: " + cevap.status);
        }
        // Başarılıysa tabloyu yeniden yükler
        urunleriYukle(currentPage);
    } catch (hata) {
        alert("Ürün silinemedi: " + hata.message);
        console.error("Hata:", hata);
    }
}

// Kategorileri API'den çekip dropdown'a doldurur
async function kategorileriYukle() {
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/categories?pageSize=1000`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) throw new Error("Kategoriler alınamadı.");

        const data = await cevap.json();
        const kategoriler = data.items || data;
        
        const select = document.getElementById("urunKategoriId");

        // Önceki seçenekleri temizle (varsayılan hariç)
        select.innerHTML = '<option value="">Kategori seçin...</option>';

        // Her kategori için birer <option> ekle
        kategoriler.forEach(kategori => {
            const option = document.createElement("option");
            option.value = kategori.id;
            option.textContent = kategori.name;
            select.appendChild(option);
        });
    } catch (hata) {
        console.error("Kategori yükleme hatası:", hata);
    }
}

// Sayfa açılınca kategorileri yükle
kategorileriYukle();

// Arama kutusu için
document.getElementById("aramaKutusu").addEventListener("keyup", (event) => {
    const arananKelime = event.target.value.toLowerCase();

    const filtrelenmis = tumUrunler.filter(urun =>
        urun.name.toLowerCase().includes(arananKelime) || urun.barcode.toLowerCase().includes(arananKelime)
    );

    tabloyuCiz(filtrelenmis);
});

// Düzenle butonu
function urunDuzenle(id) {
    const urun = tumUrunler.find(u => u.id === id);
    if (!urun) return;

    document.getElementById("urunId").value = urun.id;
    document.getElementById("urunAdi").value = urun.name;
    document.getElementById("urunBarkod").value = urun.barcode;
    document.getElementById("urunMinStok").value = urun.minStockLevel;
    document.getElementById("urunKategoriId").value = urun.categoryId;

    document.getElementById("modalBaslik").innerText = "Ürün düzenle";
    document.getElementById("btnUrunKaydet").innerText = "Güncelle";

    const modalElement = document.getElementById("urunModal");
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

// yeni ürün ekle butonuna basınca formu sıfırlama
document.querySelector('[data-bs-target="#urunModal"]').addEventListener("click", () => {
    document.getElementById("urunFormu").reset();
    document.getElementById("urunId").value = "";
    document.getElementById("modalBaslik").innerText = "Yeni ürün ekle";
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