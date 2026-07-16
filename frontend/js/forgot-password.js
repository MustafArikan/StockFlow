document.addEventListener("DOMContentLoaded", () => {
    
    let targetEmail = ""; 
    let validResetCode = "";

    const requestForm = document.getElementById("requestForm");
    const verifyCodeForm = document.getElementById("verifyCodeForm");
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    
    const btnRequest = document.getElementById("btnRequest");
    const btnVerifyCode = document.getElementById("btnVerifyCode");
    const btnResetPassword = document.getElementById("btnResetPassword");
    
    const pageSubtitle = document.getElementById("pageSubtitle");

    function getApiUrl(endpoint) {
        return (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
            ? `${CONFIG.API_BASE_URL}/auth/${endpoint}` 
            : `http://localhost:5000/api/auth/${endpoint}`;
    }

    async function parseErrors(response) {
        const data = await response.json().catch(() => ({}));
        if (data.errors) {
            const errorMessages = Object.values(data.errors).flat().join('<br>');
            return errorMessages;
        }
        return data.message || "İşlem başarısız.";
    }

    // 1. ADIM: KOD İSTEME İŞLEMİ
    requestForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("resetEmail").value.trim();
        hideAlert();
        
        btnRequest.disabled = true;
        btnRequest.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Gönderiliyor...`;

        try {
            const response = await fetch(getApiUrl('forgot-password'), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const errorMsg = await parseErrors(response);
                throw new Error(errorMsg);
            }

            targetEmail = email;
            requestForm.classList.add("d-none");
            verifyCodeForm.classList.remove("d-none");
            pageSubtitle.textContent = "Kodu Doğrulayın";
            
            showAlert("success", "Sıfırlama kodu e-postanıza gönderildi.");
        } catch (error) {
            showAlert("danger", error.message);
        } finally {
            btnRequest.disabled = false;
            btnRequest.innerHTML = "Kod Gönder";
        }
    });

    // 2. ADIM: KODU DOĞRULAMA İŞLEMİ
    verifyCodeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const resetCode = document.getElementById("resetCode").value.trim();
        hideAlert();

        btnVerifyCode.disabled = true;
        btnVerifyCode.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Doğrulanıyor...`;

        try {
            const response = await fetch(getApiUrl('verify-reset-code'), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: targetEmail, resetCode })
            });

            if (!response.ok) {
                const errorMsg = await parseErrors(response);
                throw new Error(errorMsg);
            }

            validResetCode = resetCode;
            verifyCodeForm.classList.add("d-none");
            resetPasswordForm.classList.remove("d-none");
            pageSubtitle.textContent = "Yeni Şifrenizi Belirleyin";
            
            showAlert("success", "Sıfırlama kodu doğrulandı. Lütfen yeni şifrenizi girin.");
        } catch (error) {
            showAlert("danger", error.message);
        } finally {
            btnVerifyCode.disabled = false;
            btnVerifyCode.innerHTML = "Kodu Doğrula";
        }
    });

    // 3. ADIM: ŞİFREYİ SIFIRLAMA İŞLEMİ
    resetPasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById("newPassword").value;
        const newPasswordConfirm = document.getElementById("newPasswordConfirm").value;
        hideAlert();
        
        if (newPassword !== newPasswordConfirm) {
            showAlert("danger", "Şifreler eşleşmiyor. Lütfen kontrol edin.");
            return;
        }
        
        btnResetPassword.disabled = true;
        btnResetPassword.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Yenileniyor...`;

        try {
            const response = await fetch(getApiUrl('reset-password'), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: targetEmail, 
                    resetCode: validResetCode,
                    newPassword: newPassword
                })
            });

            if (!response.ok) {
                const errorMsg = await parseErrors(response);
                throw new Error(errorMsg);
            }

            window.location.href = "login.html?reset=true";

        } catch (error) {
            showAlert("danger", error.message);
            btnResetPassword.disabled = false;
            btnResetPassword.innerHTML = `<i class="bi bi-check-circle me-1"></i> Şifreyi Yenile`;
        }
    });
});

function showAlert(type, msg) {
    const alertEl = document.getElementById("alertMessage");
    alertEl.className = `alert alert-${type} small py-2`;
    alertEl.innerHTML = msg;
}

function hideAlert() {
    const alertEl = document.getElementById("alertMessage");
    alertEl.className = "alert d-none small py-2";
}


