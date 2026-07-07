document.addEventListener("DOMContentLoaded", () => {
    
    let targetEmail = ""; // Kodu göndereceğimiz emaili tutacağız

    const requestForm = document.getElementById("requestForm");
    const resetForm = document.getElementById("resetForm");
    const btnRequest = document.getElementById("btnRequest");
    const btnReset = document.getElementById("btnReset");
    const pageSubtitle = document.getElementById("pageSubtitle");

    // KOD İSTEME İŞLEMİ
    requestForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const email = document.getElementById("resetEmail").value.trim();
        
        hideAlert();
        
        btnRequest.disabled = true;
        btnRequest.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Gönderiliyor...`;

        try {
            const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
                ? `${CONFIG.API_BASE_URL}/auth/forgot-password` 
                : 'http://localhost:5000/api/auth/forgot-password';

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "İşlem başarısız.");
            }

            // Başarılıysa emaili hafızaya al
            targetEmail = email;

            // Formları değiştir
            requestForm.classList.add("d-none");
            resetForm.classList.remove("d-none");
            pageSubtitle.textContent = "Yeni Şifrenizi Belirleyin";
            
            showAlert("success", "Sıfırlama kodu e-postanıza gönderildi.");

        } catch (error) {
            showAlert("danger", error.message);
        } finally {
            btnRequest.disabled = false;
            btnRequest.innerHTML = "Kod Gönder";
        }
    });

    // ŞİFREYİ SIFIRLAMA İŞLEMİ
    resetForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const resetCode = document.getElementById("resetCode").value.trim();
        const newPassword = document.getElementById("newPassword").value;
        
        hideAlert();
        
        btnReset.disabled = true;
        btnReset.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Yenileniyor...`;

        try {
            const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
                ? `${CONFIG.API_BASE_URL}/auth/reset-password` 
                : 'http://localhost:5000/api/auth/reset-password';

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: targetEmail, 
                    resetCode: resetCode,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Sıfırlama başarısız.");
            }

            // İşlem başarılı! Login sayfasına yönlendir.
            window.location.href = "login.html?reset=true";

        } catch (error) {
            showAlert("danger", error.message);
            btnReset.disabled = false;
            btnReset.innerHTML = `<i class="bi bi-check-circle me-1"></i> Şifreyi Yenile`;
        }
    });
});

function showAlert(type, msg) {
    const alertEl = document.getElementById("alertMessage");
    alertEl.className = `alert alert-${type} small py-2`;
    alertEl.textContent = msg;
}

function hideAlert() {
    const alertEl = document.getElementById("alertMessage");
    alertEl.className = "alert d-none small py-2";
}
