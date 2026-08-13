// ÜRÜN DETAY MODALI (Ortak Bileşen)
// Bu markup daha önce yalnızca products.html içinde gömülü duruyordu.
// suppliers.html de product-detail.js'i yüklüyor ve urunDetayAc() çağırıyordu,
// ama modal o sayfada bulunmadığı için getElementById(...) null dönüp
// "Cannot set properties of null" hatasıyla işlem tamamen kırılıyordu.
// Artık markup tek bir yerde durur ve ihtiyaç duyan sayfaya JS ile eklenir.
function buildProductDetailModalHtml() {
    return `
    <div class="modal fade" id="urunDetayModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg mt-5">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                <div class="modal-header bg-white border-bottom-0 pb-3 pt-4 position-relative">
                    <div class="position-absolute top-0 end-0 p-3">
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Kapat"></button>
                    </div>
                    <div class="d-flex align-items-center w-100 mt-2">
                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center shadow-sm p-3 product-detail-icon">
                            <i class="bi bi-box-seam fs-4"></i>
                        </div>
                        <div class="ms-3">
                            <h4 class="modal-title fw-bold mb-0 text-dark" id="detayUrunAdi">Yükleniyor...</h4>
                        </div>
                    </div>
                </div>
                <div class="modal-body p-0 bg-light">

                    <div id="urunDetayCarousel" class="carousel slide" data-bs-ride="false" data-bs-wrap="false" data-bs-touch="true">

                        <div class="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center shadow-sm z-3 position-relative">
                            <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-bold" type="button" data-bs-target="#urunDetayCarousel" data-bs-slide="prev">
                                <i class="bi bi-chevron-left me-1"></i> Geri
                            </button>

                            <div class="carousel-indicators position-static m-0 d-flex gap-2">
                                <button type="button" data-bs-target="#urunDetayCarousel" data-bs-slide-to="0" class="active bg-primary" aria-current="true" aria-label="Temel Bilgiler"></button>
                                <button type="button" data-bs-target="#urunDetayCarousel" data-bs-slide-to="1" class="bg-primary" aria-label="Özellikler"></button>
                                <button type="button" data-bs-target="#urunDetayCarousel" data-bs-slide-to="2" class="bg-primary" aria-label="Tedarikçiler"></button>
                                <button type="button" data-bs-target="#urunDetayCarousel" data-bs-slide-to="3" class="bg-primary" aria-label="Stok Dağılımı"></button>
                                <button type="button" data-bs-target="#urunDetayCarousel" data-bs-slide-to="4" class="bg-primary" aria-label="Stok Hareketleri"></button>
                                <button type="button" data-bs-target="#urunDetayCarousel" data-bs-slide-to="5" class="bg-primary" aria-label="Paketleme Birimleri"></button>
                            </div>

                            <button class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" type="button" data-bs-target="#urunDetayCarousel" data-bs-slide="next">
                                İleri <i class="bi bi-chevron-right ms-1"></i>
                            </button>
                        </div>

                        <div class="carousel-inner p-4">

                            <div class="carousel-item active">

                                <div class="row mb-4 g-3" id="detayOneCikanNitelikler">
                                    <!-- Dinamik: kategoriye göre "öne çıkan" nitelik kartları buraya basılır -->
                                </div>

                                <h6 class="fw-bold text-primary text-uppercase small mb-4 border-bottom pb-2">
                                    <span class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center me-2 p-1"><i class="bi bi-info-circle"></i></span> Diğer Temel Bilgiler
                                </h6>
                                <div class="row g-4">
                                    <div class="col-sm-6">
                                        <div class="bg-white p-4 rounded-4 shadow-sm border border-light h-100 d-flex flex-column justify-content-center align-items-center text-center">
                                            <i class="bi bi-upc-scan fs-3 text-secondary mb-2"></i>
                                            <small class="text-muted text-uppercase fw-bold">Barkod (SKU)</small>
                                            <div class="fw-bold fs-5 mt-1 text-dark" id="detayBarkod">-</div>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="bg-white p-4 rounded-4 shadow-sm border border-light h-100 d-flex flex-column justify-content-center align-items-center text-center">
                                            <i class="bi bi-calendar3 fs-3 text-secondary mb-2"></i>
                                            <small class="text-muted text-uppercase fw-bold">Sisteme Eklenme</small>
                                            <div class="fw-bold fs-6 mt-1 text-dark" id="detayTarih">-</div>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="bg-white p-4 rounded-4 shadow-sm border border-light h-100 d-flex flex-column justify-content-center align-items-center text-center">
                                            <i id="detayMevcutStokIcon" class="bi bi-boxes fs-3 mb-2"></i>
                                            <small class="text-muted text-uppercase fw-bold">Mevcut Toplam Stok</small>
                                            <div class="fw-bold fs-3 mt-1" id="detayMevcutStok">0</div>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="bg-white p-4 rounded-4 shadow-sm border border-light h-100 d-flex flex-column justify-content-center align-items-center text-center">
                                            <i class="bi bi-exclamation-triangle fs-3 text-warning mb-2"></i>
                                            <small class="text-muted text-uppercase fw-bold">Minimum Stok Sınırı</small>
                                            <div class="fw-bold fs-5 mt-1 text-dark" id="detayMinStok">0</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="carousel-item">
                                <h6 class="fw-bold text-primary text-uppercase small mb-4 border-bottom pb-2">
                                    <span class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center me-2 p-1"><i class="bi bi-list-check"></i></span> Ürün Özellikleri ve Kurallar
                                </h6>
                                <div class="bg-white p-4 rounded-4 shadow-sm border border-light">
                                    <div class="table-responsive">
                                        <table class="table table-hover mb-0 align-middle">
                                            <tbody id="detayOzelliklerListesi">
                                                <!-- Dinamik -->
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="carousel-item">
                                <h6 class="fw-bold text-primary text-uppercase small mb-4 border-bottom pb-2">
                                    <span class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center me-2 p-1"><i class="bi bi-truck"></i></span> Tedarikçi Bilgileri
                                </h6>
                                <div class="bg-white p-4 rounded-4 shadow-sm border border-light">
                                    <div class="table-responsive mb-3">
                                        <table class="table table-hover align-middle mb-0">
                                            <thead class="table-light">
                                                <tr>
                                                    <th>Tedarikçi Adı</th>
                                                    <th>Alış Fiyatı</th>
                                                    <th class="text-end" id="detayTedarikciIslemSutunuBasligi">İşlem</th>
                                                </tr>
                                            </thead>
                                            <tbody id="detayTedarikciListesi">
                                                <tr><td colspan="3" class="text-center text-muted fst-italic py-4">Tedarikçi bilgileri yükleniyor...</td></tr>
                                            </tbody>
                                        </table>
                                    </div>

                                </div>
                            </div>

                            <div class="carousel-item">
                                <h6 class="fw-bold text-primary text-uppercase small mb-4 border-bottom pb-2">
                                    <span class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center me-2 p-1"><i class="bi bi-building"></i></span> Depo ve Raf Stok Dağılımı
                                </h6>
                                <div class="bg-white p-4 rounded-4 shadow-sm border border-light">
                                    <div class="table-responsive">
                                        <table class="table table-hover align-middle mb-0">
                                            <thead class="table-light">
                                                <tr>
                                                    <th><i class="bi bi-building me-1"></i> Depo Adı</th>
                                                    <th><i class="bi bi-layers me-1"></i> Raf (Konum)</th>
                                                    <th class="text-end"><i class="bi bi-box me-1"></i> Adet</th>
                                                </tr>
                                            </thead>
                                            <tbody id="detayStokDagitimListesi">
                                                <!-- Dinamik -->
                                            </tbody>
                                            <tfoot class="table-light" id="detayStokDagitimFooter">
                                                <tr>
                                                    <td colspan="2" class="text-end fw-bold text-dark">Genel Toplam Stok:</td>
                                                    <td class="text-end fw-bold fs-5 text-success" id="detayGenelToplamStok">-</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="carousel-item">
                                <h6 class="fw-bold text-primary text-uppercase small mb-4 border-bottom pb-2">
                                    <span class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center me-2 p-1"><i class="bi bi-clock-history"></i></span> Stok Hareket Geçmişi
                                </h6>
                                <div class="bg-white p-4 rounded-4 shadow-sm border border-light">
                                    <div class="table-responsive">
                                        <table class="table table-hover align-middle mb-0">
                                            <thead class="table-light">
                                                <tr>
                                                    <th>Tarih</th>
                                                    <th>İşlem Tipi</th>
                                                    <th>Miktar</th>
                                                    <th>Personel</th>
                                                    <th>Açıklama</th>
                                                </tr>
                                            </thead>
                                            <tbody id="detayStokHareketleriListesi">
                                                <!-- Dinamik -->
                                                <tr><td colspan="5" class="text-center text-muted fst-italic py-4">Hareketler yükleniyor...</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="carousel-item">
                                <h6 class="fw-bold text-primary text-uppercase small mb-4 border-bottom pb-2">
                                    <span class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center me-2 p-1"><i class="bi bi-box2-heart"></i></span>
                                    Paketleme Birimleri (Kutu / Koli / Palet)
                                </h6>
                                <div class="bg-white p-4 rounded-4 shadow-sm border border-light">
                                    <div class="row g-3" id="detayPaketlemeListesi">
                                        <!-- Dinamik: her birim için tıklanabilir bir kart -->
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

// Modal sayfada yoksa body'nin sonuna ekler. Zaten varsa hiçbir şey yapmaz,
// böylece aynı id'den iki tane oluşması engellenir.
function ensureProductDetailModal() {
    if (document.getElementById('urunDetayModal')) return true;
    if (typeof buildProductDetailModalHtml !== 'function') return false;

    const kapsayici = document.createElement('div');
    kapsayici.innerHTML = buildProductDetailModalHtml();
    const modal = kapsayici.firstElementChild;
    if (!modal) return false;

    document.body.appendChild(modal);
    return true;
}

if (typeof window !== 'undefined') {
    window.buildProductDetailModalHtml = buildProductDetailModalHtml;
    window.ensureProductDetailModal = ensureProductDetailModal;
}
