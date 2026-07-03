// Backend API adresi — depo işlemleri
const API_URL = `${CONFIG.API_BASE_URL}/warehouses`;
const token = localStorage.getItem('token');

// Güvenlik kontrolü: Token yoksa login'e yönlendir
if (!token) {
    window.location.href = 'login.html';
}

// Tüm depoları arama için burada saklarız
let tumDepolar = [];

// Tablo gövdesi referansı
const tabloGovdesi = document.getElementById("depoTablosuGovdesi");

// API'den depoları çekip tabloya basan ana fonksiyon
async function depolariYukle() {
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
        const depolar = await cevap.json();
        tumDepolar = depolar;      
        tabloyuCiz(tumDepolar);
    } catch (hata) {
        tabloGovdesi.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-danger py-4">Depolar yüklenemedi. Backend çalışıyor mu? (${hata.message})</td>
            </tr>`;
        console.error("Hata:", hata);
    }
}

function tabloyuCiz(depolar) {
    tabloGovdesi.innerHTML = "";

    if (depolar.length === 0) {
        tabloGovdesi.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">Henüz depo yok. "Yeni Depo Ekle" ile başlayın.</td>
            </tr>`;
        return;
    }

    depolar.forEach(depo => {
        const satir = `
            <tr>
                <td class="fw-bold">${depo.id}</td>
                <td>${depo.name}</td>
                <td>${depo.address}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-success rounded-pill btn-raflar" data-id="${depo.id}" data-name="${escapeHtml(depo.name)}">Raflar</button>
                    <button class="btn btn-sm btn-outline-primary rounded-pill btn-duzenle" data-id="${depo.id}">Düzenle</button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill btn-sil" data-id="${depo.id}">Sil</button>
                </td>
            </tr>`;
        tabloGovdesi.innerHTML += satir;
    });
}

// XSS koruması için html kaçırma fonksiyonu
function escapeHtml(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Olay Delege Etme (Event Delegation) - Depo İşlemleri Satır içi onclick kaldırıldı
tabloGovdesi.addEventListener("click", (e) => {
    const btnRaflar = e.target.closest(".btn-raflar");
    const btnDuzenle = e.target.closest(".btn-duzenle");
    const btnSil = e.target.closest(".btn-sil");

    if (btnRaflar) {
        const id = parseInt(btnRaflar.getAttribute("data-id"));
        const name = btnRaflar.getAttribute("data-name");
        raflariAc(id, name);
    } else if (btnDuzenle) {
        const id = parseInt(btnDuzenle.getAttribute("data-id"));
        depoDuzenle(id);
    } else if (btnSil) {
        const id = parseInt(btnSil.getAttribute("data-id"));
        depoSil(id);
    }
});

depolariYukle();

// Ekle / Güncelle butonu — gizli id'ye göre karar verir
document.getElementById("btnDepoKaydet").addEventListener("click", async () => {
    const id = document.getElementById("depoId").value;
    const name = document.getElementById("depoAdi").value;
    const address = document.getElementById("depoAdres").value;

    if (!name) {
        alert("Lütfen depo adı girin!");
        return;
    }

    const depoVerisi = {
        name: name,
        address: address
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
            body: JSON.stringify(depoVerisi)
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) {
            throw new Error("İşlem başarısız: " + cevap.status);
        }

        const modalElement = document.getElementById("depoModal");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("depoFormu").reset();
        document.getElementById("depoId").value = "";

        depolariYukle();
    } catch (hata) {
        alert("İşlem başarısız: " + hata.message);
        console.error("Hata:", hata);
    }
});

// Düzenle — formu o deponun bilgileriyle doldurup modalı açar
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

// Sil
async function depoSil(id) {
    const onay = confirm("Bu depoyu silmek istediğinize emin misiniz?");
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
            throw new Error("Silme başarısız: " + cevap.status);
        }
        depolariYukle();
    } catch (hata) {
        alert("Depo silinemedi: " + hata.message);
        console.error("Hata:", hata);
    }
}

// "Yeni Depo Ekle" butonuna basınca formu sıfırla (ekleme modu)
document.querySelector('[data-bs-target="#depoModal"]').addEventListener("click", () => {
    document.getElementById("depoFormu").reset();
    document.getElementById("depoId").value = "";
    document.getElementById("modalBaslik").innerText = "Yeni Depo Ekle";
    document.getElementById("btnDepoKaydet").innerText = "Ekle ve Kaydet";
});

// Arama
document.getElementById("aramaKutusu").addEventListener("keyup", (event) => {
    const arananKelime = event.target.value.toLowerCase();
    const filtrelenmis = tumDepolar.filter(depo =>
        depo.name.toLowerCase().includes(arananKelime) ||
        depo.address.toLowerCase().includes(arananKelime)
    );
    tabloyuCiz(filtrelenmis);
});

// Şu an raflarını gördüğümüz deponun id'si (raf eklerken lazım)
let aktifDepoId = null;

// "Raflar" butonuna basınca: o deponun raflarını çekip modalı açar
async function raflariAc(depoId, depoAdi) {
    aktifDepoId = depoId; // hangi depodayız, sakla

    // Modal başlığını ayarla ("Merkez Depo — Raflar")
    document.getElementById("raflarModalBaslik").innerText = depoAdi + " — Raflar";

    // Raf ekleme kutusunu temizle
    document.getElementById("rafKodu").value = "";

    // O deponun raflarını çek ve listele
    await raflariYukle(depoId);

    // Modalı aç
    const modalElement = document.getElementById("raflarModal");
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

// Belirli bir deponun raflarını API'den çekip modal tablosuna basar
async function raflariYukle(depoId) {
    const tabloGovdesi = document.getElementById("rafTablosuGovdesi");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations/by-warehouse/${depoId}`, {
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

        if (!cevap.ok) throw new Error("Raflar alınamadı: " + cevap.status);

        const raflar = await cevap.json();

        tabloGovdesi.innerHTML = "";

        if (raflar.length === 0) {
            tabloGovdesi.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted py-3">Bu depoda henüz raf yok.</td>
                </tr>`;
            return;
        }

        raflar.forEach(raf => {
            const satir = `
                <tr>
                    <td class="fw-bold">${raf.id}</td>
                    <td>${raf.code}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-danger rounded-pill btn-raf-sil" data-id="${raf.id}">Sil</button>
                    </td>
                </tr>`;
            tabloGovdesi.innerHTML += satir;
        });
    } catch (hata) {
        tabloGovdesi.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-danger py-3">Raflar yüklenemedi. (${hata.message})</td>
            </tr>`;
        console.error("Hata:", hata);
    }
}

// Raf Ekle 
document.getElementById("btnRafEkle").addEventListener("click", async () => {
    const code = document.getElementById("rafKodu").value;

    if (!code) {
        alert("Lütfen raf kodu girin!");
        return;
    }

    const yeniRaf = {
        code: code,
        warehouseId: aktifDepoId
    };

    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(yeniRaf)
        });

        if (cevap.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!cevap.ok) {
            throw new Error("Raf eklenemedi: " + cevap.status);
        }

        document.getElementById("rafKodu").value = "";
        raflariYukle(aktifDepoId);
    } catch (hata) {
        alert("Raf eklenemedi: " + hata.message + "\n(Bu raf kodu zaten kullanılıyor olabilir.)");
        console.error("Hata:", hata);
    }
});

// Raf silme
async function rafSil(id) {
    const onay = confirm("Bu rafı silmek istediğinize emin misiniz?");
    if (!onay) return;

    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations/${id}`, {
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

        raflariYukle(aktifDepoId);
    } catch (hata) {
        alert("Raf silinemedi: " + hata.message);
        console.error("Hata", hata);
    }
}

// Olay Delege Etme (Event Delegation) - Raf Silme İşlemi satır içi onclick kaldırıldı
document.getElementById("rafTablosuGovdesi").addEventListener("click", (e) => {
    const btnRafSil = e.target.closest(".btn-raf-sil");
    if (btnRafSil) {
        const id = parseInt(btnRafSil.getAttribute("data-id"));
        rafSil(id);
    }
});