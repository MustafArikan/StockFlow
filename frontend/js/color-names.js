// Renk adı -> hex eşleştirme sözlüğü.
// Yeni renk eklemek için sadece bu diziye bir satır eklemek yeterli.
const RENK_SOZLUGU = [
    { name: "Siyah", hex: "#000000" },
    { name: "Beyaz", hex: "#ffffff" },
    { name: "Gri", hex: "#808080" },
    { name: "Açık Gri", hex: "#d3d3d3" },
    { name: "Koyu Gri", hex: "#a9a9a9" },
    { name: "Uzay Grisi", hex: "#535150" },
    { name: "Gümüş", hex: "#c0c0c0" },
    { name: "Altın", hex: "#ffd700" },
    { name: "Rose Gold", hex: "#b76e79" },
    { name: "Titanyum", hex: "#878681" },
    { name: "Doğal Titanyum", hex: "#8f8a81" },
    { name: "Mavi Titanyum", hex: "#414a58" },
    { name: "Siyah Titanyum", hex: "#3a3a3c" },
    { name: "Beyaz Titanyum", hex: "#e3e0d8" },
    { name: "Lacivert", hex: "#000080" },
    { name: "Gece Mavisi", hex: "#191970" },
    { name: "Mavi", hex: "#0000ff" },
    { name: "Açık Mavi", hex: "#add8e6" },
    { name: "Koyu Mavi", hex: "#00008b" },
    { name: "Turkuaz", hex: "#40e0d0" },
    { name: "Mint Yeşili", hex: "#98ff98" },
    { name: "Yeşil", hex: "#008000" },
    { name: "Koyu Yeşil", hex: "#006400" },
    { name: "Zeytin Yeşili", hex: "#808000" },
    { name: "Sarı", hex: "#ffff00" },
    { name: "Açık Sarı", hex: "#ffffe0" },
    { name: "Turuncu", hex: "#ffa500" },
    { name: "Kırmızı", hex: "#ff0000" },
    { name: "Bordo", hex: "#800000" },
    { name: "Şarap Rengi", hex: "#722f37" },
    { name: "Mercan", hex: "#ff7f50" },
    { name: "Pembe", hex: "#ffc0cb" },
    { name: "Açık Pembe", hex: "#ffb6c1" },
    { name: "Fuşya", hex: "#ff00ff" },
    { name: "Mor", hex: "#800080" },
    { name: "Lila", hex: "#c8a2c8" },
    { name: "Kahverengi", hex: "#a52a2a" },
    { name: "Koyu Kahverengi", hex: "#654321" },
    { name: "Açık Kahverengi", hex: "#d2b48c" },
    { name: "Bej", hex: "#f5f5dc" },
    { name: "Krem", hex: "#fffdd0" },
    { name: "Vizon", hex: "#7f6a5d" },
    { name: "Haki", hex: "#f0e68c" },
    { name: "Somon", hex: "#fa8072" },
    { name: "Zümrüt", hex: "#50c878" },
    { name: "Safir", hex: "#0f52ba" },
    { name: "Yakut", hex: "#e0115f" },
    { name: "Platin", hex: "#e5e4e2" },
    { name: "Bronz", hex: "#cd7f32" }
];

function renkAra(aramaMetni) {
    const q = aramaMetni.trim().toLocaleLowerCase("tr-TR");
    if (!q) return [];
    return RENK_SOZLUGU.filter(r => r.name.toLocaleLowerCase("tr-TR").includes(q));
}

// Serbest hex girişi kontrolü (sözlükte olmayan bir renk elle girilmek istenirse)
function gecerliHexMi(deger) {
    return /^#?[0-9a-fA-F]{3,6}$/.test(deger.trim());
}

function hexNormalize(deger) {
    const d = deger.trim();
    return d.startsWith("#") ? d : `#${d}`;
}

// Levenshtein Mesafesi hesaplama
function levenshtein(a, b) {
    const matrix = [];
    let i, j;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    for (i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(matrix[i][j - 1] + 1, // insertion
                             matrix[i - 1][j] + 1) // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Benzer Renk Bulma (Fuzzy Search)
function benzerRenkBul(aramaMetni) {
    const q = aramaMetni.trim().toLocaleLowerCase("tr-TR");
    if (!q) return null;
    let enIyiEslesme = null;
    let minMesafe = Infinity;
    
    for (const renk of RENK_SOZLUGU) {
        const ad = renk.name.toLocaleLowerCase("tr-TR");
        const mesafe = levenshtein(q, ad);
        // Kelimenin uzunluğuna göre maksimum tolere edilebilir mesafe
        const maksHata = Math.max(1, Math.floor(ad.length / 3));
        if (mesafe <= maksHata && mesafe < minMesafe) {
            minMesafe = mesafe;
            enIyiEslesme = renk;
        }
    }
    return enIyiEslesme;
}
