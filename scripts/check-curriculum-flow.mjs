/**
 * فحص سريع لعقود المنهج + الحذف الشامل (بدون شبكة)
 * Quick offline contract checks: `node scripts/check-curriculum-flow.mjs`
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const checks = [];
const ok = (name, cond) => checks.push([name, !!cond]);

const app = read('src/App.tsx');
const dash = read('src/components/student/StudentDashboardView.tsx');
const wizard = read('src/components/student/StudySetupWizard.tsx');
const planner = read('src/lib/curriculumPlanner.ts');
const curriculum = read('src/data/curriculum.ts');
const wipe = read('src/lib/wipeService.ts');
const panel = read('src/components/admin/StudentDeletionPanel.tsx');
const rules = read('firestore.rules');
const firebase = read('src/lib/firebase.ts');
const login = read('src/components/auth/LoginPage.tsx');
const auth = read('src/lib/authService.ts');

ok('SetupAssistant removed', !app.includes('SetupAssistant') && !app.includes('4 خطوات للتشغيل'));
ok('dashboard uses StudySetupWizard', dash.includes('StudySetupWizard') && !dash.includes('BookPlanBuilder'));
ok('wizard: year step', wizard.includes('ACADEMIC_STAGES.map') && wizard.includes('dailyHours'));
ok('wizard: routine notes', wizard.includes('routineNotes'));
ok('planner distributes chapters not pages', planner.includes('chapterTitleAr') && !planner.includes('pagesPerDay'));
ok('planner feasibility', planner.includes('checkCurriculumFeasibility'));
ok('curriculum preseeded per stage', curriculum.includes('STAGE_CURRICULUM') && curriculum.includes("'sec-3'"));
ok('wipe deletes auditLogs', wipe.includes('auditLogs'));
ok('wipe keeps the owner account', wipe.includes('accountDeleted: false') && !wipe.includes('user.delete()'));
ok('wipe skips own staff role', wipe.includes('d.id !== meUid'));
ok('no admin-registration UI', !login.includes('setupMode') && !auth.includes('createFirstSuperAdmin'));
ok('wipe clears localStorage keys', wipe.includes("startsWith('ssp_')"));
ok('delete-all button label', panel.includes('حذف كل البيانات'));
ok('rules allow auditLogs delete by super admin', /match \/auditLogs[\s\S]{0,400}allow delete: if isSuperAdmin\(\)/.test(rules));
ok('refresh restores tab + scroll', app.includes("UI_STATE_KEY = 'ssp_ui_state'") && app.includes('beforeunload') && app.includes('restoreY'));
ok('no storage import anywhere', !read('src/lib/firebase.ts').includes("from 'firebase/storage'"));
ok('no BOOKS_STORAGE_PATH', !firebase.includes('BOOKS_STORAGE_PATH'));
ok('no mock data file', !(() => { try { read('src/data/mockData.ts'); return true; } catch { return false; } })());
ok('plan save verifies server', app.includes('verified?.generatedPlan && verified?.studyProfile') || app.includes('!verified?.generatedPlan || !verified?.studyProfile'));
ok('no page-based copy in dashboard', !dash.includes("isArabic ? 'صفحة'"));

let pass = 0;
for (const [name, good] of checks) { console.log(good ? '✅' : '❌', name); if (good) pass++; }
console.log(`\n${pass}/${checks.length}`);
if (pass !== checks.length) process.exit(1);
