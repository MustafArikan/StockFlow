document.addEventListener("DOMContentLoaded", () => {
    
    let registeredEmail = ""; // Kayıt olunan e-postayı tutacağız ki verify ederken tekrar yazmasın

    const registerForm = document.getElementById("registerForm");
    const verifyForm = document.getElementById("verifyForm");
    const btnRegister = document.getElementById("btnRegister");
    const btnVerify = document.getElementById("btnVerify");
    const pageSubtitle = document.getElementById("pageSubtitle");

    // KAYIT OLMA (REGISTER) İŞLEMİ
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const firstName = document.getElementById("regFirstName").value.trim();
        const lastName = document.getElementById("regLastName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        const confirmPassword = document.getElementById("regPasswordConfirm").value;
        


        if (password !== confirmPassword) {
            hataGoster("Şifreler eşleşmiyor. Lütfen kontrol edin.");
            return;
        }
        
        btnRegister.disabled = true;
        btnRegister.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Kayıt Yapılıyor...`;

        try {
            const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
                ? `${CONFIG.API_BASE_URL}/auth/register` 
                : 'http://localhost:5000/api/auth/register';

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, lastName, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Kayıt işlemi başarısız.");
            }

            // Kayıt başarılı, emaili hafızaya al
            registeredEmail = email;

            // Formları değiştir
            registerForm.classList.add("d-none");
            verifyForm.classList.remove("d-none");
            pageSubtitle.textContent = "E-posta Adresinizi Doğrulayın";
            
            basariToast("Kayıt başarılı! Lütfen doğrulama kodunu girin.");

        } catch (error) {
            hataGoster(error.message);
        } finally {
            btnRegister.disabled = false;
            btnRegister.innerHTML = "Kayıt Ol";
        }
    });

    // DOĞRULAMA (VERIFY) İŞLEMİ
    verifyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const verificationCode = document.getElementById("verificationCode").value.trim();
        

        
        btnVerify.disabled = true;
        btnVerify.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Doğrulanıyor...`;

        try {
            const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
                ? `${CONFIG.API_BASE_URL}/auth/verify-email` 
                : 'http://localhost:5000/api/auth/verify-email';

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: registeredEmail, 
                    verificationCode: verificationCode 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Doğrulama başarısız.");
            }

            // Doğrulama başarılı! Login sayfasına yönlendir.
            window.location.href = "login.html?registered=true";

        } catch (error) {
            hataGoster(error.message);
            btnVerify.disabled = false;
            btnVerify.innerHTML = `<i class="bi bi-check-circle me-1"></i> Hesabı Onayla`;
        }
    });
});




