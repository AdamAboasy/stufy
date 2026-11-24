/**
 * المراحل الدراسية المتاحة للطالب عند التسجيل
 * Academic stages available to the student at registration time.
 */
export interface AcademicStage {
  id: string;
  labelAr: string;
  labelEn: string;
  codeAr: string;
  codeEn: string;
}

export const ACADEMIC_STAGES: AcademicStage[] = [
  { id: 'prep-1', labelAr: 'الصف الأول الإعدادي', labelEn: '1st Preparatory', codeAr: 'الأول الإعدادي', codeEn: 'Prep 1' },
  { id: 'prep-2', labelAr: 'الصف الثاني الإعدادي', labelEn: '2nd Preparatory', codeAr: 'الثاني الإعدادي', codeEn: 'Prep 2' },
  { id: 'prep-3', labelAr: 'الصف الثالث الإعدادي', labelEn: '3rd Preparatory', codeAr: 'الثالث الإعدادي', codeEn: 'Prep 3' },
  { id: 'sec-1', labelAr: 'الصف الأول الثانوي', labelEn: '1st Secondary', codeAr: 'الأول الثانوي', codeEn: 'Sec 1' },
  { id: 'sec-2', labelAr: 'الصف الثاني الثانوي', labelEn: '2nd Secondary', codeAr: 'الثاني الثانوي', codeEn: 'Sec 2' },
  { id: 'sec-3', labelAr: 'الصف الثالث الثانوي', labelEn: '3rd Secondary (Thanawya)', codeAr: 'الثالث الثانوي', codeEn: 'Sec 3' },
  { id: 'university', labelAr: 'طالب جامعي', labelEn: 'University Student', codeAr: 'جامعي', codeEn: 'University' },
];

export const findAcademicStage = (value?: string): AcademicStage | undefined => {
  if (!value) return undefined;
  return ACADEMIC_STAGES.find(
    s => s.id === value || s.labelAr === value || s.labelEn === value
  );
};
