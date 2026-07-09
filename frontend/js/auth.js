// auth.js - Çıkış yapma ve kullanıcı profili işlemleri (Kurşun Geçirmez Hali)
document.addEventListener('DOMContentLoaded', () => {

    // 1. Çıkış Yap Butonunu Güvenli Dinle
    const btnNavbarLogout = document.getElementById('btnNavbarLogout');
    if (btnNavbarLogout) {
        btnNavbarLogout.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }

    // 2. Kullanıcı E-postasını Navbar'a Güvenli Yaz
    const userProfileEl = document.getElementById('userProfile');
    const token = localStorage.getItem('token');

    if (userProfileEl && token) {
        try {
            // Token parçalanırken hata oluşursa sayfa patlamasın diye try-catch içinde tutuyoruz
            const payload = JSON.parse(atob(token.split('.')[1]));
            userProfileEl.textContent = payload.email || "Kullanıcı";
        } catch (e) {
            console.error("Token çözümlenemedi:", e);
            userProfileEl.textContent = "Kullanıcı";
        }
    }
});