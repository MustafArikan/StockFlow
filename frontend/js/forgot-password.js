// Backend (ResetPasswordDto) ile AYNI kural: en az 8 karakter, en az 1 büyük harf, 1 küçük harf, 1 rakam, 1 özel karakter.
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
const PASSWORD_POLICY_MESSAGE = "Şifre en az 8 karakter olmalı; en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir.";

document.addEventListener("DOMContentLoaded", () => {
    let resetEmailAddress = "";
    let validResetCode = "";

    const requestForm = document.getElementById("requestForm");
    const verifyCodeForm = document.getElementById("verifyCodeForm");
    const resetPasswordForm = document.getElementById("resetPasswordForm");

    const btnRequest = document.getElementById("btnRequest");
    const btnVerifyCode = document.getElementById("btnVerifyCode");
    const btnResetPassword = document.getElementById("btnResetPassword");
    const pageSubtitle = document.getElementById("pageSubtitle");

    // 1. KOD GÖNDERME
    if(requestForm) {
        requestForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("resetEmail").value.trim();


            btnRequest.disabled = true;
            btnRequest.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Gönderiliyor...`;

            try {
                const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
                    ? `${CONFIG.API_BASE_URL}/auth/forgot-password` 
                    : 'http://localhost:5000/api/auth/forgot-password';

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "İşlem başarısız.");
                }

                resetEmailAddress = email;

                // Formları değiştir
                requestForm.classList.add("d-none");
                verifyCodeForm.classList.remove("d-none");
                pageSubtitle.textContent = "Kodu Doğrulayın";
                
                basariToast(data.message || "Eğer e-posta adresiniz kayıtlıysa, şifre sıfırlama talimatları gönderilecektir.");

            } catch (error) {
                hataGoster(error.message);
            } finally {
                btnRequest.disabled = false;
                btnRequest.innerHTML = "Kod Gönder";
            }
        });
    }

    // 2. KODU DOĞRULAMA
    if(verifyCodeForm) {
        verifyCodeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const code = document.getElementById("resetCode").value.trim();
            

            btnVerifyCode.disabled = true;
            btnVerifyCode.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Doğrulanıyor...`;

            try {
                const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
                    ? `${CONFIG.API_BASE_URL}/auth/verify-reset-code` 
                    : 'http://localhost:5000/api/auth/verify-reset-code';

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: resetEmailAddress, resetCode: code })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Doğrulama başarısız.");
                }

                validResetCode = code;

                // Formları değiştir
                verifyCodeForm.classList.add("d-none");
                resetPasswordForm.classList.remove("d-none");
                pageSubtitle.textContent = "Yeni Şifre Belirleyin";
                
                basariToast("Kod doğrulandı. Lütfen yeni şifrenizi girin.");

            } catch (error) {
                hataGoster(error.message);
            } finally {
                btnVerifyCode.disabled = false;
                btnVerifyCode.innerHTML = "Kodu Doğrula";
            }
        });
    }

    // 3. YENİ ŞİFRE BELİRLEME
    if(resetPasswordForm) {
        resetPasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById("newPassword").value;
            const newPasswordConfirm = document.getElementById("newPasswordConfirm").value;

            if (!PASSWORD_POLICY_REGEX.test(newPassword)) {
                hataGoster(PASSWORD_POLICY_MESSAGE);
                return;
            }

            if (newPassword !== newPasswordConfirm) {
                hataGoster("Şifreler eşleşmiyor. Lütfen kontrol edin.");
                return;
            }

            btnResetPassword.disabled = true;
            btnResetPassword.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Şifre Yenileniyor...`;

            try {
                const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
                    ? `${CONFIG.API_BASE_URL}/auth/reset-password` 
                    : 'http://localhost:5000/api/auth/reset-password';

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        email: resetEmailAddress, 
                        resetCode: validResetCode, 
                        newPassword: newPassword 
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Şifre yenileme başarısız.");
                }

                // Şifre sıfırlandı, login sayfasına yönlendir.
                basariToast(data.message || "Şifreniz başarıyla sıfırlandı. Yönlendiriliyorsunuz...");
                setTimeout(() => {
                    window.location.href = "login.html?passwordReset=true";
                }, 2000);

            } catch (error) {
                hataGoster(error.message);
                btnResetPassword.disabled = false;
                btnResetPassword.innerHTML = `<i class="bi bi-check-circle me-1"></i> Şifreyi Yenile`;
            }
        });
    }
});


