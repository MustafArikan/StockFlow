const FieldValidators = {
  text(value, cfg) {
    const v = (value ?? "").trim();
    if (cfg.required && !v) return { ok: false, error: "Zorunlu alan" };
    if (cfg.minLength && v.length < cfg.minLength) return { ok: false, error: `En az ${cfg.minLength} karakter` };
    if (cfg.maxLength && v.length > cfg.maxLength) return { ok: false, error: `En fazla ${cfg.maxLength} karakter` };
    if (cfg.pattern && !(new RegExp(cfg.pattern)).test(v)) return { ok: false, error: "Format hatalı" };
    return { ok: true, value: v };
  },

  integer(value, cfg) {
    const n = Number(value);
    if (!Number.isInteger(n)) return { ok: false, error: "Tam sayı olmalı" };
    if (cfg.min != null && n < cfg.min) return { ok: false, error: `Min ${cfg.min}` };
    if (cfg.max != null && n > cfg.max) return { ok: false, error: `Max ${cfg.max}` };
    return { ok: true, value: n };
  },

  decimal(value, cfg) {
    const n = Number(value);
    if (Number.isNaN(n)) return { ok: false, error: "Sayı olmalı" };
    const decimals = cfg.decimals ?? 2;
    const rounded = Math.round(n * 10 ** decimals) / 10 ** decimals;
    if (cfg.min != null && rounded < cfg.min) return { ok: false, error: `Min ${cfg.min}` };
    if (cfg.max != null && rounded > cfg.max) return { ok: false, error: `Max ${cfg.max}` };
    return { ok: true, value: rounded };
  },

  singleChoice(value, cfg) {
    const allowed = cfg.options.map(o => String(o.value || o));
    if (cfg.required && !value) return { ok: false, error: "Seçim zorunlu" };
    if (value && !allowed.includes(String(value))) return { ok: false, error: "Geçersiz seçim (whitelist dışı)" };
    return { ok: true, value };
  },

  checkboxGroup(values, cfg) {
    const allowed = cfg.options.map(o => String(o.value || o));
    const arr = Array.isArray(values) ? values : [values].filter(Boolean);
    const invalid = arr.filter(v => !allowed.includes(String(v)));
    if (invalid.length) return { ok: false, error: "Geçersiz seçenek(ler) var" };
    if (cfg.minSelect && arr.length < cfg.minSelect) return { ok: false, error: `En az ${cfg.minSelect} seçim` };
    if (cfg.maxSelect && arr.length > cfg.maxSelect) return { ok: false, error: `En fazla ${cfg.maxSelect} seçim` };
    return { ok: true, value: arr };
  },

  color(value, cfg) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(value || "")) return { ok: false, error: "Geçersiz renk kodu" };
    return { ok: true, value };
  },

  boolean(value) {
    return { ok: true, value: value === true || value === "true" || value === "on" };
  },

  imei(value) {
    const v = (value || "").replace(/\D/g, "");
    if (v.length !== 15) return { ok: false, error: "IMEI 15 haneli olmalı" };
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let d = Number(v[i]);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    if (sum % 10 !== 0) return { ok: false, error: "IMEI checksum hatalı" };
    return { ok: true, value: v };
  }
};

if (typeof module !== "undefined") module.exports = FieldValidators;
