document.addEventListener("DOMContentLoaded", () => {
    // URL parametrelerinden mesaj varsa göster (Kayıt başarılı mesajı gibi)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
        basariToast("Hesabınız doğrulandı. Şimdi giriş yapabilirsiniz.");
    } else if (urlParams.get('passwordReset') === 'true') {
        basariToast("Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.");
    }

    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const btnLogin = document.getElementById("btnLogin");
        
        
        
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
                window.location.href = "index.html";
            } else {
                throw new Error("Sunucudan giriş anahtarı (token) alınamadı.");
            }

        } catch (error) {
            hataGoster(error.message);
        } finally {
            btnLogin.disabled = false;
            btnLogin.innerHTML = "Giriş Yap";
        }
    });
});




