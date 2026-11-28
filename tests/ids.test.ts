import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateActivationCodeString, generateStudentCode, randomString, CODE_ALPHABET } from '../src/lib/ids.ts';

test('randomString uses only the alphabet and right length', () => {
  const s = randomString(200);
  assert.equal(s.length, 200);
  for (const c of s) assert.ok(CODE_ALPHABET.includes(c));
});

test('activation codes have 12 random chars and are unique', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    const code = generateActivationCodeString('SSP-PRO', 2026);
    assert.match(code, /^SSP-PRO-2026-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    seen.add(code);
  }
  assert.equal(seen.size, 2000);
});

test('student code format', () => {
  assert.match(generateStudentCode(2026), /^STU-2026-[0-9A-Z]{6}$/);
});
