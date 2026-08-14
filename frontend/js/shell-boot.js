// =============================================================================
// KABUK YÖNLENDİRİCİ (SHELL BOOT)
// =============================================================================
// Uygulama TEK bir kabuk üzerinden çalışır: desktop.html
// Bir uygulama sayfası doğrudan açıldığında (adres çubuğuna yazarak, yer
// iminden, giriş sonrası yönlendirmeyle) kabuğa gönderilir ve kendisi orada
// bir PENCERE olarak açılır. Böylece her yerde aynı çoklu pencere deneyimi
// olur; sayfaların bir kısmı eski tek pencere düzeninde kalmaz.
//
// <head> içinde, auth-check.js'ten HEMEN SONRA çalışır: yönlendirme sayfa
// çizilmeden yapılır, kullanıcı eski düzenin bir anlığına parlamasını görmez.
// =============================================================================

(function () {
    'use strict';

    // 1) Sayfa zaten bir pencerenin içeriğiyse (iframe) yönlendirme YAPILMAZ.
    //    Aksi hâlde her pencere kendi içinde yeni bir kabuk açmaya çalışır ve
    //    sonsuz döngü oluşur.
    try {
        if (window.self !== window.top) return;
    } catch (e) {
        return; // erişilemiyorsa gömülüyüz demektir
    }

    var file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

    // 2) Kabuğun kendisi ve oturum dışı sayfalar yönlendirilmez.
    var skip = ['desktop.html', 'login.html', 'register.html', 'forgot-password.html'];
    if (skip.indexOf(file) !== -1) return;

    // 3) KAÇIŞ KAPISI: ?standalone=1 ile sayfa eski tek pencere düzeninde
    //    açılır. Hata ayıklarken ve bir sayfayı tek başına test ederken gerekir.
    if (/[?&]standalone=1(&|$)/.test(window.location.search)) return;

    // 4) Kabuğa git ve hangi uygulamanın açılacağını bildir.
    //    Sorgu ve çapa (hash) korunur — ör. products.html?search=kalem
    var app = file + window.location.search + window.location.hash;
    window.location.replace('desktop.html?open=' + encodeURIComponent(app));
})();
