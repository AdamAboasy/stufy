/**
 * postbuild — بينسخ صفحات التشخيص لجوّه dist
 * ==========================================
 * كده الصفحة تكون متاحة على نفس الدومين في الإنتاج:
 *   /docs/diagnostics/health-check.html
 *   /docs/diagnostics/auth-check.html
 *
 * لازم تكون على نفس دومين التطبيق عشان فحص الـ Authorized Domains يكون
 * واقعي (الـ localhost مش بيمثل دومين الإنتاج).
 */
import fs from 'fs';
import path from 'path';

// نسخة .next (متوافقة مع بيئة النشر الحالية)
if (fs.existsSync('dist')) {
  try {
    if (!fs.existsSync('.next')) {
      fs.cpSync('dist', '.next', { recursive: true });
    }
  } catch (err) {
    // Ignore any non-critical copy error
  }
}

// نسخ صفحات التشخيص إلى الحزمة النهائية
const copies = [
  ['docs/diagnostics', 'dist/docs/diagnostics'],
  ['docs/diagnostics', '.next/docs/diagnostics']
];

for (const [from, to] of copies) {
  if (!fs.existsSync(from)) continue;
  try {
    if (!fs.existsSync(path.dirname(to))) fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true });
    console.log(`[postbuild] copied ${from} → ${to}`);
  } catch (err) {
    console.warn(`[postbuild] could not copy ${from} → ${to}: ${err.message}`);
  }
}
