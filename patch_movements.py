import codecs

with codecs.open('frontend/js/movements.js', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('await dropdownLokasyonlariYukle();', 'await dropdownIslemDepolariYukle();')

scanner_logic = """
// ==========================================
// KAMERA BARKOD OKUYUCU MANTIGI
// ==========================================
const cameraArea = document.getElementById("kameraAlani");
const btnOpenCamera = document.getElementById("btnKameraAc");
const btnCloseCamera = document.getElementById("btnKameraKapat");

if (btnOpenCamera) {
    btnOpenCamera.addEventListener("click", () => {
        cameraArea.classList.remove("d-none");
        if (typeof startScanner !== "undefined") {
            startScanner("reader", (scannedText) => {
                let isProductFound = false;
                const productSelect = document.getElementById("urunSecimi");
                if (productSelect) {
                    for (let i = 0; i < productSelect.options.length; i++) {
                        if (productSelect.options[i].value === scannedText) {
                            productSelect.selectedIndex = i;
                            isProductFound = true;
                            break;
                        }
                    }
                }
                
                if (isProductFound) {
                    let audio = new Audio('https://www.soundjay.com/button/beep-07.wav');
                    audio.play().catch(() => { });
                    if (typeof formuDenetle === "function") formuDenetle();
                    closeCamera();
                } else {
                    alert(`Taranan barkod (${scannedText}) bulunamadı!`);
                }
            }, () => { });
        } else {
            alert("Scanner yüklü değil!");
        }
    });
}

if (btnCloseCamera) btnCloseCamera.addEventListener("click", closeCamera);

function closeCamera() {
    if (cameraArea) cameraArea.classList.add("d-none");
    if (typeof stopScanner !== "undefined") stopScanner();
}
"""

warehouse_logic = """
async function dropdownIslemDepolariYukle() {
    const sourceSelect = document.getElementById("sourceWarehouseId");
    const targetSelect = document.getElementById("targetWarehouseId");
    try {
        const data = await apiRequest('/warehouses?pageSize=1000', 'GET');
        const depolar = data.items || data;

        if (sourceSelect) sourceSelect.innerHTML = '<option value="" selected disabled>Önce depo seçiniz...</option>';
        if (targetSelect) targetSelect.innerHTML = '<option value="" selected disabled>Önce depo seçiniz...</option>';

        depolar.forEach(d => {
            if (sourceSelect) sourceSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
            if (targetSelect) targetSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
        });
    } catch (hata) {
        console.error("Depo yükleme hatası:", hata);
    }
}

async function loadLocationsForWarehouse(warehouseId, targetDropdownId) {
    const select = document.getElementById(targetDropdownId);
    if (!select) return;

    if (!warehouseId) {
        select.innerHTML = '<option value="">Önce depo seçin...</option>';
        select.disabled = true;
        return;
    }

    select.innerHTML = '<option value="">Yükleniyor...</option>';
    select.disabled = false;

    try {
        const data = await apiRequest(`/locations/by-warehouse/${warehouseId}?pageSize=1000`, 'GET');
        const raflar = data.items || data;

        select.innerHTML = '<option value="" selected disabled>Raf seçiniz...</option>';
        raflar.forEach(r => {
            select.innerHTML += `<option value="${r.id}">${r.code}</option>`;
        });
    } catch (hata) {
        select.innerHTML = '<option value="">Hata oluştu!</option>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sWarehouseDropdown = document.getElementById("sourceWarehouseId");
    const tWarehouseDropdown = document.getElementById("targetWarehouseId");
    if (sWarehouseDropdown) sWarehouseDropdown.addEventListener("change", function () { loadLocationsForWarehouse(this.value, "sourceLocationId"); });
    if (tWarehouseDropdown) tWarehouseDropdown.addEventListener("change", function () { loadLocationsForWarehouse(this.value, "targetLocationId"); });
});
"""

content = content + '\n' + warehouse_logic + '\n' + scanner_logic

with codecs.open('frontend/js/movements.js', 'w', 'utf-8') as f:
    f.write(content)

print("Patch applied to movements.js")
