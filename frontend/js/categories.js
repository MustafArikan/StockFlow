const API_URL = `${CONFIG.API_BASE_URL}/categories`;

let tumKategoriler = [];

const tabloGovdesi = document.getElementById("kategoriTablosuGovdesi");

async function kategorileriYukle() {
    try{
        const cevap = await fetch(API_URL);
        if (!cevap.ok){
            throw new Error("Sunucu hatası:" + cevap.status);
        }
        const kategoriler = await cevap.json();
        tumKategoriler = kategoriler;
        tabloyuCiz(tumKategoriler);
    } catch (hata){
        tabloGovdesi.innerHTML=`
        <tr>
            <td colspan="3" class="text-center text-danger py-4">Kategori Yüklenemedi. Backend çalışıyor mu? (${hata.message})</td>
        </tr>`;
        console.error("Hata:", hata);
    }
    
}

function tabloyuCiz(kategoriler){
    tabloGovdesi.innerHTML="";

    if (kategoriler.length === 0){
        tabloGovdesi.innerHTML =`
        <tr>
            <td colspan="3" class="text-center tect-muted py-4">Henüz kategori yok. "Yeni kategori ekle" ile başlayın. " </td>
        </tr>`;
        return;
    }

    kategoriler.forEach(kategori=>{
        const satir = `
            <tr>
                <td class="fw-bold">${kategori.id}</td>
                <td>${kategori.name}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="kategoriDuzenle(${kategori.id})">Düzenle</button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="kategoriSil(${kategori.id})">Sil</button>
                </td>
            </tr>`;
        tabloGovdesi.innerHTML += satir;
    }); 
}


kategorileriYukle();


// Ekle / Güncelle butonu — gizli id'ye göre karar verir
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(kategoriVerisi)
        });

        if (!cevap.ok) {
            const hataMesaji = await cevap.text();
            throw new Error(hataMesaji || ("İşlem başarısız: " + cevap.status));
        }

        const modalElement = document.getElementById("kategoriModal");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("kategoriFormu").reset();
        document.getElementById("kategoriId").value = "";

        kategorileriYukle();
    } catch (hata) {
        alert("İşlem başarısız: " + hata.message);
        console.error("Hata:", hata);
    }
});

async function kategoriSil(id) {
    const onay = confirm("Bu kategoriyi silmek istediğinize emin misiniz?");
    if(!onay) return;

    try{
        const cevap = await fetch(API_URL + "/" + id, {
            method: "DELETE"
        });
        if(!cevap.ok){
            throw new Error("Silme başarısız: " + cevap.status + "(Bu kategoriye bağlı ürünler olabilir.)");
        }
        kategorileriYukle();
    } catch(hata){
        alert("Kategori silinemedi: "+ hata.message);
        console.error("Hata:", hata);
    }
    
}

document.getElementById("aramaKutusu").addEventListener("keyup", (event) =>{
    const arananKelime = event.target.value.toLowerCase();
    const filtrelenmis = tumKategoriler.filter(kategori =>
        kategori.name.toLowerCase().includes(arananKelime)
    );
    tabloyuCiz(filtrelenmis);
});


// Düzenle — formu o kategorinin bilgileriyle doldurup modalı açar
function kategoriDuzenle(id) {
    const kategori = tumKategoriler.find(k => k.id === id);
    if (!kategori) return;

    document.getElementById("kategoriId").value = kategori.id;
    document.getElementById("kategoriAdi").value = kategori.name;

    document.getElementById("modalBaslik").innerText = "Kategori Düzenle";
    document.getElementById("btnKategoriKaydet").innerText = "Güncelle";

    const modalElement = document.getElementById("kategoriModal");
    const modalInstance = new bootstrap.Modal(modalElement);
    modalInstance.show();
}

// "Yeni Kategori Ekle" butonuna basınca formu sıfırla (ekleme modu)
document.querySelector('[data-bs-target="#kategoriModal"]').addEventListener("click", () => {
    document.getElementById("kategoriFormu").reset();
    document.getElementById("kategoriId").value = "";
    document.getElementById("modalBaslik").innerText = "Yeni Kategori Ekle";
    document.getElementById("btnKategoriKaydet").innerText = "Ekle ve Kaydet";
});