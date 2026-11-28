import { randomString } from './ids';
import type { RegisteredDevice } from '../types';

const detectOs = (ua: string): string => {
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown';
};

const detectBrowser = (ua: string): string => {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Unknown';
};

/** بيانات الجهاز الحقيقية من المتصفح (بدون قيم وهمية) */
export const currentDeviceInfo = (nowIso: string): RegisteredDevice => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let fingerprint = '';
  try {
    fingerprint = localStorage.getItem('ssp_device_fp') || '';
    if (!fingerprint) {
      fingerprint = `FP-${randomString(10)}`;
      localStorage.setItem('ssp_device_fp', fingerprint);
    }
  } catch {
    fingerprint = `FP-${randomString(10)}`;
  }
  const os = detectOs(ua);
  const browser = detectBrowser(ua);
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return {
    id: `dev-${fingerprint}`,
    deviceName: `${browser} · ${os}`,
    deviceType: mobile ? 'mobile' : 'desktop',
    os,
    browser,
    ipAddress: '',
    deviceFingerprint: fingerprint,
    lastActive: nowIso,
    isCurrent: true
  };
};
