// backend api adersi - tek yerde tanımlı değişirse buradan değiştirilir
const API_URL = "http://localhost:5000/api/products";

// Tablo gövdesi referansı
const tabloGovdesi = document.getElementById("urunTablosuGovdesi");

//API'den ürünleri çekip tabloya basan ana fonksiyon
async function urunleriYukle() {
    try{
        // 1. API'ye istek at
        const cevap = await fetch(API_URL);

        if (!cevap.ok){
            throw new Error("Sunucu hatası:"+ cevap.status);
        }

        const urunler = await cevap.json();


        tabloyuCiz(urunler);

    }catch (hata){
        tabloGovdesi.innerHTML = `
            <tr>
                <td colSpan="5" class="text-center text-danger py-4">Ürünler yüklenemedi. Backend çalışyor mu? (${hata.message})</td>
            </tr>`;
        console.error("Hata:", hata);

    }
    
}

// Ürün dizisini alıp tabloya satır satır basan fonksiyon
function tabloyuCiz(urunler){
    tabloGovdesi.innerHTML = "";

    if (urunler.length ===0){
        tabloGovdesi.innerHTML= `
            <tr>
                <td colspan= "5" class="text-center text-muted py-4"> Henüz ürün yok. "Yeni ürün ekle" ile başlayın.</td>
            </tr>`;
    return;
    }

    // Her ürün için bir satır oluştur
    urunler.forEach(urun => {
        const satir = `
            <tr>
                <td class=""fw-bold>${urun.id}</td>
                <td>${urun.name} </td>
                <td>${urun.barcode} </td>
                <td>${urun.minStockLevel} </td>
                <td>${urun.categoryId} </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="urunSil(${urun.id})">Sil</button>
                </td>
            </tr>`;
        tabloGovdesi.innerHTML += satir;
        
    });
}

// sayfa açılınca ürünleri yükle
urunleriYukle();

// Ekle ve Kaydet butonları için
document.getElementById("btnUrunKaydet").addEventListener("click",async () => {
    
    const name = document.getElementById("urunAdi").value;
    const barcode = document.getElementById("urunBarkod").value;
    const minStockLevel = document.getElementById("urunMinStok").value;
    const categoryId = document.getElementById("urunKategoriId").value;

    if (!name){
        alert("Lütfen ürün adı girin!");
        return;
    }

    //API'ye gönderilecek veri nesnesi
    const yeniUrun = {
        name: name,
        barcode: barcode,
        minStockLevel: parseInt(minStockLevel),
        categoryId: parseInt(categoryId)
    };

    try{
        // API'ye Post at
        const cevap = await fetch(API_URL,{
            method: "POST",
            headers:{"Content-Type": "application/json"},
            body: JSON.stringify(yeniUrun)
        });
        
        if (!cevap.ok){
            throw new Error("Ekleme başarısız:"+ cevap.status);
        }
        //Başarılı olursa modalı kapatıp formu temizleyerek tabloyu yeniliyor
        const modalElement=document.getElementById("urunModal");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("urunFormu").reset();
        urunleriYukle();
    } catch (hata){
        alert("Ürün Yüklenemedi:" + hata.message);
        console.error("Hata:", hata);
    }

});

// Silme için
async function urunSil(id) {
    // Kullanıcı onayı 
    const onay = confirm("Bu ürünü silmek istediğinize emin misiniz?");
    if(!onay) return;

    try{
        //API'ye DELETE isteği
        const cevap = await fetch(API_URL + "/" + id,{
            method: "DELETE"
        });

        if (!cevap.ok){
            throw new Error("Silme başarısız: " + cevap.status);
        }
        // Baarılıysa tabloyu yeniden yükler silinenler görünmez
        urunleriYukle();
    }catch(hata){
        alert("Ürün silinemedi:" + hata.message);
        console.error("Hata", hata);
    }
}