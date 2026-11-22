import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_GRADE_OPTIONS, academicDetailsError, gradesFor, normalizeGradeOptions } from "./academics.ts";

test("provides bilingual defaults for primary, preparatory, and secondary grades", () => {
  assert.equal(gradesFor("primary", "en")[0], "Grade 1");
  assert.equal(gradesFor("primary", "ar")[0], "الصف الأول");
  assert.equal(gradesFor("preparatory", "en").length, 3);
  assert.equal(gradesFor("secondary", "ar").length, 3);
});

test("requires school grade and a specified level for new student academic profiles", () => {
  assert.equal(academicDetailsError({ educationLevel: "" }), "level");
  assert.equal(academicDetailsError({ educationLevel: "primary" }), "grade");
  assert.equal(academicDetailsError({ educationLevel: "preparatory", academicGrade: "Grade 2" }), null);
  assert.equal(academicDetailsError({ educationLevel: "secondary", academicGrade: "   " }), "grade");
  assert.equal(academicDetailsError({ educationLevel: "university" }), null);
  assert.equal(academicDetailsError({ educationLevel: "other" }), "other");
  assert.equal(academicDetailsError({ educationLevel: "other", otherAcademicLevel: "Apprenticeship" }), null);
});

test("normalizes administrator-configured grade choices and retains defaults for missing values", () => {
  const configured = normalizeGradeOptions({ en: { primary: [" Year A ", "", "Year B", 4] } });
  assert.deepEqual(configured.en.primary, ["Year A", "Year B"]);
  assert.deepEqual(configured.en.secondary, DEFAULT_GRADE_OPTIONS.en.secondary);
  assert.deepEqual(configured.ar.primary, DEFAULT_GRADE_OPTIONS.ar.primary);
  assert.deepEqual(gradesFor("university", "en", configured), []);
  assert.deepEqual(gradesFor("other", "ar", configured), []);
});
