/** Accepts local or international numbers: 8–15 digits, optional leading +, spaces/dashes allowed. */
export const normalizePhone = (raw: string): string => raw.replace(/[\s\-()]/g, '');

export const isValidPhone = (raw: string): boolean => /^\+?\d{8,15}$/.test(normalizePhone(raw));
