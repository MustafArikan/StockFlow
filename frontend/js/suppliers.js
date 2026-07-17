const API_URL = `${CONFIG.API_BASE_URL}/suppliers`;
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

async function tedarikcileriYukle() {
    try {
        const cevap = await fetch(API_URL, { headers: { "Authorization": `Bearer ${token}` } });
        if (!cevap.ok) throw new Error("Tedarikçiler alınamadı");
        const data = await cevap.json();
        
        const govde = document.getElementById("tedarikciTablosuGövdesi");
        govde.innerHTML = "";
        
        if (data.length === 0) {
            govde.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Kayıt bulunamadı.</td></tr>`;
            return;
        }
        
        const rows = data.map(t => {
            return `<tr>
                <td class="fw-bold align-middle">${escapeHtml(t.name)}</td>
                <td class="align-middle">${escapeHtml(t.contactInfo) || '-'}</td>
                <td class="text-center align-middle">${escapeHtml(t.taxNumber) || '-'}</td>
                <td class="text-end align-middle"><span class="badge bg-secondary">Aktif</span></td>
            </tr>`;
        });
        govde.innerHTML = rows.join("");
    } catch (e) {
        console.error(e);
    }
}

document.getElementById("tedarikciFormu").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById("tedarikciAdi").value,
        contactInfo: document.getElementById("tedarikciIletisim").value,
        taxNumber: document.getElementById("tedarikciVergiNo").value
    };
    
    try {
        const cevap = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (!cevap.ok) throw new Error("Eklenemedi");
        bootstrap.Modal.getInstance(document.getElementById("tedarikciModal")).hide();
        document.getElementById("tedarikciFormu").reset();
        tedarikcileriYukle();
    } catch (err) {
        alert("Hata: " + err.message);
    }
});

tedarikcileriYukle();


