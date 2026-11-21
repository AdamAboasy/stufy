// i18n — loads dictionaries from /locales and provides t() with {name} interpolation.
const I18N = {
  lang: "ar",
  dict: null,
  en: null,
  ar: null,
};

function detectLang() {
  const cookie = document.cookie.match(/(?:^|;\s*)stufy_lang=([^;]+)/);
  if (cookie) return cookie[1];
  const stored = localStorage.getItem("stufy_lang");
  if (stored) return stored;
  return navigator.language.startsWith("ar") ? "ar" : "en";
}

function setLang(lang) {
  I18N.lang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.cookie = `stufy_lang=${lang};path=/;max-age=31536000`;
  localStorage.setItem("stufy_lang", lang);
}

function t(key, params) {
  const parts = key.split(".");
  let val = I18N.dict;
  for (const p of parts) {
    if (val && typeof val === "object" && p in val) val = val[p];
    else { val = undefined; break; }
  }
  if (val === undefined) return key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = String(val).replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
  }
  return val;
}

async function loadI18n() {
  if (!I18N.en) {
    const [en, ar] = await Promise.all([
      fetch("/locales/en.json").then((r) => r.json()),
      fetch("/locales/ar.json").then((r) => r.json()),
    ]);
    I18N.en = en;
    I18N.ar = ar;
  }
  setLang(detectLang());
  I18N.dict = I18N.lang === "ar" ? I18N.ar : I18N.en;
  return I18N.dict;
}

function switchLang(lang) {
  setLang(lang);
  I18N.dict = lang === "ar" ? I18N.ar : I18N.en;
}

window.I18N = I18N;
window.t = t;
window.loadI18n = loadI18n;
window.switchLang = switchLang;
