// XSS koruması eklenmiş hali


// Profil sayfası yüklendiğinde mevcut bilgileri getir
document.addEventListener("DOMContentLoaded", async () => {
    // Profil form elementleri
    const formProfile = document.getElementById("profileForm");
    const inputFirstName = document.getElementById("profileFirstName");
    const inputLastName = document.getElementById("profileLastName");
    const inputEmail = document.getElementById("profileEmail");
    const inputPhone = document.getElementById("profilePhone");
    const btnSaveProfile = document.getElementById("btnSaveProfile");

    // Şifre form elementleri
    const formPassword = document.getElementById("passwordForm");
    const inputOldPassword = document.getElementById("oldPassword");
    const inputNewPassword = document.getElementById("newPassword");
    const inputConfirmPassword = document.getElementById("confirmNewPassword");
    const errorPasswordMatch = document.getElementById("passwordMatchError");
    const btnChangePassword = document.getElementById("btnChangePassword");

    // 1. MEVCUT BİLGİLERİ GETİR (Sayfa Açılışı)
    try {
        const userData = await apiRequest('/auth/me', 'GET');
        inputFirstName.value = userData.firstName || "";
        inputLastName.value = userData.lastName || "";
        inputEmail.value = userData.email || "";
        inputPhone.value = userData.phoneNumber || "";
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Bağlantı Hatası',
            text: 'Profil bilgilerinizi yüklerken bir sorun oluştu: ' + error.message,
            confirmButtonColor: '#0d6efd'
        });
    }

    // 2. KİŞİSEL BİLGİLERİ GÜNCELLE
    formProfile.addEventListener("submit", async (e) => {
        e.preventDefault();

        const updateData = {
            firstName: inputFirstName.value.trim(),
            lastName: inputLastName.value.trim(),
            email: inputEmail.value.trim(),
            phoneNumber: inputPhone.value.trim()
        };

        const orjinalMetin = btnSaveProfile.innerHTML;
        btnSaveProfile.disabled = true;
        btnSaveProfile.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Kaydediliyor...`;

        try {
            const response = await apiRequest('/auth/profile', 'PUT', updateData);

            // Başarılı kaydetme mesajı (Premium UX)
            Swal.fire({
                icon: 'success',
                title: 'Harika!',
                text: response.message || 'Profil bilgileriniz başarıyla güncellendi.',
                confirmButtonColor: '#198754',
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: error.message,
                confirmButtonColor: '#dc3545'
            });
        } finally {
            btnSaveProfile.disabled = false;
            btnSaveProfile.innerHTML = orjinalMetin;
        }
    });

    // 3. ŞİFRE DEĞİŞTİRME MANTIĞI VE KONTROLLERİ
    // Yeni şifre ile Tekrarı anlık olarak kontrol et    
    function validatePasswordMatch() {
        if (inputNewPassword.value !== inputConfirmPassword.value && inputConfirmPassword.value !== "") {
            errorPasswordMatch.classList.remove("d-none");
            inputConfirmPassword.classList.add("is-invalid");
        } else {
            errorPasswordMatch.classList.add("d-none");
            inputConfirmPassword.classList.remove("is-invalid");
        }
    }

    inputConfirmPassword.addEventListener("input", validatePasswordMatch);
    inputNewPassword.addEventListener("input", validatePasswordMatch);

    formPassword.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Frontend Güvenlik Kontrolleri
        if (inputNewPassword.value !== inputConfirmPassword.value) {
            Swal.fire({
                icon: 'warning',
                title: 'Eşleşmeyen Şifreler',
                text: 'Yeni şifreniz ile tekrarı birbiriyle eşleşmiyor!',
                confirmButtonColor: '#ffc107'
            });
            return;
        }

        if (inputNewPassword.value === inputOldPassword.value) {
            Swal.fire({
                icon: 'warning',
                title: 'Geçersiz Şifre',
                text: 'Yeni şifreniz, eski şifrenizle aynı olamaz.',
                confirmButtonColor: '#ffc107'
            });
            return;
        }

        const passwordData = {
            oldPassword: inputOldPassword.value,
            newPassword: inputNewPassword.value
        };

        const orjinalMetin = btnChangePassword.innerHTML;
        btnChangePassword.disabled = true;
        btnChangePassword.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Değiştiriliyor...`;

        try {
            const response = await apiRequest('/auth/change-password', 'POST', passwordData);

            Swal.fire({
                icon: 'success',
                title: 'Şifre Değiştirildi',
                text: response.message || 'Şifreniz güvenli bir şekilde güncellendi.',
                confirmButtonColor: '#198754'
            }).then(() => {
                // Güvenlik gereği formu temizle
                formPassword.reset();
                errorPasswordMatch.classList.add("d-none");
                inputConfirmPassword.classList.remove("is-invalid");
            });

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: error.message,
                confirmButtonColor: '#dc3545'
            });
        } finally {
            btnChangePassword.disabled = false;
            btnChangePassword.innerHTML = orjinalMetin;
        }
    });
});
