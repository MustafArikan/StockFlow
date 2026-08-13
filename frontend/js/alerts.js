// Hata: kırmızı çarpı ikonlu, kullanıcı "Tamam"a basana kadar ekranda kalır
function hataGoster(mesaj) {
    Swal.fire({
        icon: "error",              // ikon: error | warning | success | info | question
        title: "Hata",              // kalın büyük başlık
        html: mesaj,                // başlığın altındaki açıklama metni
        confirmButtonText: "Tamam"  // varsayılan "OK" yerine Türkçe
    });
}

// Uyarı: sarı ünlemli — form doğrulama mesajları için ("Lütfen ... girin")
function uyariGoster(mesaj) {
    Swal.fire({
        icon: "warning",
        title: "Eksik bilgi",
        html: mesaj,
        confirmButtonText: "Tamam"
    });
}

// Başarı: sağ üst köşede belirip kendiliğinden kaybolan küçük "toast".
// Sayfayı BLOKLAMAZ — kullanıcı tıklamak zorunda kalmaz, işine devam eder.
function basariToast(mesaj) {
    Swal.fire({
        toast: true,                // popup yerine küçük bildirim modu
        position: "top-end",        // sağ üst köşe
        icon: "success",
        title: mesaj,
        showConfirmButton: false,   // buton yok
        timer: 2500,                // 2.5 saniye sonra kaybolur
        timerProgressBar: true      // altta geri sayım çizgisi
    });
}

// Onay: confirm() yerine. İKİ butonlu, cevap Promise ile döner → await şart!
async function onayla(mesaj, onayButonu = "Evet, devam et") {
    const sonuc = await Swal.fire({
        icon: "question",
        title: "Emin misiniz?",
        text: mesaj,
        showCancelButton: true,         // ikinci butonu (Vazgeç) açar
        confirmButtonText: onayButonu,
        cancelButtonText: "Vazgeç",
        confirmButtonColor: "#d33",     // silme onayları kırmızı olsun
        reverseButtons: true            // Vazgeç solda, tehlikeli buton sağda
    });
    return sonuc.isConfirmed;           // Evet'e bastıysa true
}

// Tehlikeli silmeler için: kullanıcı ONAY yazmadan buton çalışmaz
async function onaylaYazarak(mesaj, kelime="ONAY") {
    const sonuc = await Swal.fire({
        icon: "warning",
        title: "Dikkat - kalıcı işlem!",
        text: mesaj,
        input: "text",
        inputPlaceholder: `${kelime} yazın`,
        showCancelButton: true,
        confirmButtonText: "Sil",
        cancelButtonText: "Vazgeç",
        confirmButtonColor: "#d33",
        inputValidator: (deger) => deger !== kelime ?
        `Onaylamak için "${kelime}" yazmalısınız.`: undefined
    });
    return sonuc.isConfirmed;
}