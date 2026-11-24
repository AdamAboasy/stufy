import React from 'react';
import { Gender } from '../../types';

interface AvatarProps {
  src?: string;
  name: string;
  gender?: Gender;
  className?: string; // size / radius classes, e.g. "w-10 h-10 rounded-xl"
}

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return Array.from(parts[0])[0].toUpperCase();
  return (Array.from(parts[0])[0] + Array.from(parts[1])[0]).toUpperCase();
};

/** Profile photo, or colored initials when the student has not uploaded one. */
export const Avatar: React.FC<AvatarProps> = ({ src, name, gender, className = 'w-10 h-10 rounded-xl' }) => {
  if (src) {
    return <img src={src} alt={name} className={`${className} object-cover shrink-0`} />;
  }
  const gradient =
    gender === 'female'
      ? 'from-pink-500 to-purple-700'
      : gender === 'male'
      ? 'from-brand-blue to-indigo-700'
      : 'from-slate-600 to-slate-800';
  return (
    <div
      aria-label={name}
      className={`${className} shrink-0 bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white text-sm select-none`}
    >
      {initialsOf(name)}
    </div>
  );
};
