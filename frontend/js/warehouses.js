// Backend API adresi — depo işlemleri
const API_URL = `${CONFIG.API_BASE_URL}/warehouses`;
const token = localStorage.getItem('token');

const userRole = getUserRole(); // config.js'den gelir

// Güvenlik kontrolü: Token yoksa login'e yönlendir
if (!token) {
    window.location.href = 'login.html';
}

let tumDepolar = [];

// Tablo gövdesi referansı
const tabloGovdesi = document.getElementById("depoTablosuGovdesi");

let depoPage = 1;
const depoPageSize = 10;
let rafPage = 1;
const rafPageSize = 10;

// API'den depoları çekip tabloya basan ana fonksiyon
async function depolariYukle(page = 1) {
    try {
        const cevap = await fetch(`${API_URL}?pageNumber=${page}&pageSize=${depoPageSize}`, {
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
        tumDepolar = sonuc.items || sonuc;      
        depoPage = sonuc.currentPage || 1;

        tabloyuCiz(tumDepolar);
        sayfalamayiCizDepolar(sonuc.totalPages || 1, depoPage);
    } catch (hata) {
        tabloGovdesi.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-danger py-4">Depolar yüklenemedi. Backend çalışıyor mu? (${hata.message})</td>
            </tr>`;
        const paginationContainer = document.getElementById("depoPaginationContainer");
        if(paginationContainer) paginationContainer.innerHTML = "";
        console.error("Hata:", hata);
    }
}

function sayfalamayiCizDepolar(totalPages, currentPage) {
    const container = document.getElementById("depoPaginationContainer");
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = "";
        return;
    }

    let html = `<nav><ul class="pagination pagination-sm m-0 justify-content-center mt-3">`;

    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link text-dark" onclick="depolariYukle(${currentPage - 1})">Önceki</button>
             </li>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                    <button class="page-link ${currentPage === i ? 'bg-dark border-dark text-white' : 'text-dark'}" onclick="depolariYukle(${i})">${i}</button>
                 </li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link text-dark" onclick="depolariYukle(${currentPage + 1})">Sonraki</button>
             </li>`;

    html += `</ul></nav>`;
    container.innerHTML = html;
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
                <td>${depo.name}</td>
                <td>${depo.address}</td>
                ${aksiyonButonlari}
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
async function raflariYukle(depoId, page = 1) {
    const tabloGovdesi = document.getElementById("rafTablosuGovdesi");
    try {
        const cevap = await fetch(`${CONFIG.API_BASE_URL}/locations/by-warehouse/${depoId}?pageNumber=${page}&pageSize=${rafPageSize}`, {
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

        const sonuc = await cevap.json();
        const raflar = sonuc.items || sonuc;
        rafPage = sonuc.currentPage || 1;

        tabloGovdesi.innerHTML = "";

        if (raflar.length === 0) {
            tabloGovdesi.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted py-3">Bu depoda henüz raf yok.</td>
                </tr>`;
            const container = document.getElementById("rafPaginationContainer");
            if (container) container.innerHTML = "";
            return;
        }

        raflar.forEach(raf => {
            let rafSilButonu = "";
            if (hasPermission("Location.Delete")) {
                rafSilButonu = `<td class="text-end">
                                    <button class="btn btn-sm btn-outline-danger rounded-pill btn-raf-sil" data-id="${raf.id}">Sil</button>
                                </td>`;
            }

            const satir = `
                <tr>
                    <td class="fw-bold">${raf.id}</td>
                    <td>${raf.code}</td>
                    ${rafSilButonu}
                </tr>`;
            tabloGovdesi.innerHTML += satir;
        });

        sayfalamayiCizRaflar(sonuc.totalPages || 1, rafPage, depoId);
    } catch (hata) {
        tabloGovdesi.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-danger py-3">Raflar yüklenemedi. (${hata.message})</td>
            </tr>`;
        const container = document.getElementById("rafPaginationContainer");
        if (container) container.innerHTML = "";
        console.error("Hata:", hata);
    }
}

function sayfalamayiCizRaflar(totalPages, currentPage, depoId) {
    const container = document.getElementById("rafPaginationContainer");
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = "";
        return;
    }

    let html = `<nav><ul class="pagination pagination-sm m-0 justify-content-center mt-3">`;

    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link text-dark" onclick="raflariYukle(${depoId}, ${currentPage - 1})">Önceki</button>
             </li>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                    <button class="page-link ${currentPage === i ? 'bg-dark border-dark text-white' : 'text-dark'}" onclick="raflariYukle(${depoId}, ${i})">${i}</button>
                 </li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link text-dark" onclick="raflariYukle(${depoId}, ${currentPage + 1})">Sonraki</button>
             </li>`;

    html += `</ul></nav>`;
    container.innerHTML = html;
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

// Yeni Depo Ekle ve Yeni Raf Ekle butonlarını viewer'lardan gizle
if (!hasPermission("Warehouse.Add")) {
    const btnDepoEkle = document.querySelector('[data-bs-target="#depoModal"]');
    if (btnDepoEkle) btnDepoEkle.classList.add('d-none');
}

if (!hasPermission("Location.Add")) {
    const btnRafEkleModal = document.getElementById("btnRafEkle");
    if (btnRafEkleModal) btnRafEkleModal.classList.add('d-none');
    
    const divRafEkle = document.querySelector("#raflarModal .input-group");
    if (divRafEkle) divRafEkle.classList.add('d-none');
}

if (!hasPermission("Warehouse.Edit") && !hasPermission("Warehouse.Delete") && !hasPermission("Location.Add") && !hasPermission("Location.Delete")) {
    const islemSutunuBasligi = document.getElementById("islemSutunuBasligi");
    if (islemSutunuBasligi) islemSutunuBasligi.classList.add('d-none');
}

if (!hasPermission("Location.Delete")) {
    const islemSutunuBasligiRaf = document.getElementById("islemSutunuBasligiRaf");
    if (islemSutunuBasligiRaf) islemSutunuBasligiRaf.classList.add('d-none');
}