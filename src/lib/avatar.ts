/** صورة رمزية بالأحرف الأولى (SVG data URI) — بدل صور وهمية من الإنترنت */
export const initialsAvatar = (name: string): string => {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5268E8"/><stop offset="1" stop-color="#7957D5"/></linearGradient></defs>` +
    `<rect width="150" height="150" fill="url(#g)"/>` +
    `<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial,sans-serif" font-size="60" font-weight="700" fill="#fff">` +
    initials.replace(/[<>&"]/g, '') +
    `</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
