// Backend (RegisterDto) ile AYNI kural: en az 8 karakter, en az 1 büyük harf, 1 küçük harf, 1 rakam, 1 özel karakter.
// Kural değişirse bu regex de backend'deki RegularExpression ile birlikte güncellenmelidir.
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
const PASSWORD_POLICY_MESSAGE = "Şifre en az 8 karakter olmalı; en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir.";

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
        


        if (!PASSWORD_POLICY_REGEX.test(password)) {
            hataGoster(PASSWORD_POLICY_MESSAGE);
            return;
        }

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
            
            startTimer();
            
            basariToast("Kayıt başarılı! Lütfen doğrulama kodunu girin.");

        } catch (error) {
            hataGoster(error.message);
        } finally {
            btnRegister.disabled = false;
            btnRegister.innerHTML = "Kayıt Ol";
        }
    });

    let timerInterval = null;

    function startTimer() {
        const timerDisplay = document.getElementById("registerTimer");
        const btnResendCode = document.getElementById("btnResendCode");
        const verificationCodeInput = document.getElementById("verificationCode");
        const btnVerify = document.getElementById("btnVerify");

        let timeRemaining = 60; // 60 seconds

        timerDisplay.textContent = "01:00";
        btnResendCode.disabled = true;
        verificationCodeInput.disabled = false;
        btnVerify.disabled = false;

        clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            timeRemaining--;
            
            let minutes = Math.floor(timeRemaining / 60);
            let seconds = timeRemaining % 60;
            
            timerDisplay.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = "Süre doldu";
                btnResendCode.disabled = false;
                verificationCodeInput.disabled = true;
                btnVerify.disabled = true;
            }
        }, 1000);
    }

    document.getElementById("btnResendCode").addEventListener("click", async () => {
        const btnResendCode = document.getElementById("btnResendCode");
        btnResendCode.disabled = true;
        btnResendCode.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;

        try {
            const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
                ? `${CONFIG.API_BASE_URL}/auth/resend-verification-code` 
                : 'http://localhost:5000/api/auth/resend-verification-code';

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: registeredEmail })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Kod gönderimi başarısız.");
            }

            basariToast("Yeni doğrulama kodu gönderildi.");
            document.getElementById("verificationCode").value = "";
            startTimer();
        } catch (error) {
            hataGoster(error.message);
            btnResendCode.disabled = false;
        } finally {
            btnResendCode.innerHTML = "Tekrar Gönder";
        }
    });

    document.getElementById("btnEditEmail").addEventListener("click", () => {
        clearInterval(timerInterval);
        verifyForm.classList.add("d-none");
        registerForm.classList.remove("d-none");
        pageSubtitle.textContent = "Yeni bir hesap oluşturun";
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




