document.addEventListener("DOMContentLoaded", () => {
    // URL parametrelerinden mesaj varsa göster (Kayıt başarılı mesajı gibi)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
        showSuccess("Hesabınız doğrulandı. Şimdi giriş yapabilirsiniz.");
    }

    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const btnLogin = document.getElementById("btnLogin");
        
        hideError();
        hideSuccess();
        
        btnLogin.disabled = true;
        btnLogin.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Bekleniyor...`;

        try {
            // API adresini config.js üzerinden alıyoruz (Eğer yoksa manuel ayarlanan 5000)
            const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
                ? `${CONFIG.API_BASE_URL}/auth/login` 
                : 'http://localhost:5000/api/auth/login';

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Giriş işlemi başarısız oldu.");
            }

            if (data.token) {
                localStorage.setItem("token", data.token);
                window.location.href = "index.html"; // Başarılıysa anasayfaya at
            } else {
                throw new Error("Sunucudan giriş anahtarı (token) alınamadı.");
            }

        } catch (error) {
            showError(error.message);
        } finally {
            btnLogin.disabled = false;
            btnLogin.innerHTML = "Giriş Yap";
        }
    });
});

function showError(msg) {
    const errEl = document.getElementById("errorMessage");
    errEl.textContent = msg;
    errEl.classList.remove("d-none");
}

function hideError() {
    document.getElementById("errorMessage").classList.add("d-none");
}

function showSuccess(msg) {
    const sucEl = document.getElementById("successMessage");
    sucEl.textContent = msg;
    sucEl.classList.remove("d-none");
}

function hideSuccess() {
    document.getElementById("successMessage").classList.add("d-none");
}


