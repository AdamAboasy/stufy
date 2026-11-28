/**
 * مولّدات معرّفات آمنة (crypto) — بدل Math.random.
 * Secure identifier generators backed by crypto.getRandomValues.
 */

/** أبجدية بدون حروف ملتبسة (0/O, 1/I) */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
};

/** نص عشوائي بدون انحياز (rejection sampling) */
export const randomString = (length: number, alphabet: string = CODE_ALPHABET): string => {
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let out = '';
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < limit && out.length < length) out += alphabet[byte % alphabet.length];
    }
  }
  return out;
};

/** كود تفعيل: PREFIX-YYYY-XXXX-XXXX-XXXX (12 حرف عشوائي ≈ 58 bit) */
export const generateActivationCodeString = (prefix: string, year: number): string => {
  const body = [randomString(4), randomString(4), randomString(4)].join('-');
  return `${prefix}-${year}-${body}`;
};

/** رقم طالب للعرض: STU-YYYY-XXXXXX (المفتاح الحقيقي هو uid) */
export const generateStudentCode = (year: number): string =>
  `STU-${year}-${randomString(6, '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ')}`;
