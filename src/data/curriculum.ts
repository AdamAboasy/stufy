/**
 * المنهج الدراسي الجاهز
 * ====================
 * الطالب بيختار سنته → المنهج بيتحمّل جاهز (مواد + أبواب/دروس).
 * التقسيم بيتم على **أبواب/دروس المنهج**، مش على صفحات كتاب.
 *
 * ⚠️ المحتوى التفصيلي لكل سنة لازم يتأكيد من صاحب المنهج الرسمي.
 * الهيكل هنا مبني على مناهج وزارة التربية والتعليم المصرية (عناوين عامة)،
 * وأي تعديل بيتعمل في المصفوفة `STAGE_CURRICULUM` بس — مفيش كود تاني بيتأثر.
 *
 * Ready curriculum per academic stage. The plan is sliced over chapters/
 * lessons, never over page numbers.
 */

export interface CurriculumChapter {
  id: string;
  titleAr: string;
  titleEn: string;
  /** تقدير عدد الدروس/الأفكار داخل الباب — بيُستخدم لتقسيم الجلسات */
  lessons: number;
}

export interface CurriculumSubject {
  id: string;
  name: string;
  nameAr: string;
  /** عدد الأبواب — بيتحسب تلقائياً من chapters */
  chapters: CurriculumChapter[];
}

export interface StageCurriculum {
  stageId: string;
  labelAr: string;
  labelEn: string;
  /** ساعات مقترحة أسبوعياً لكل مادة */
  weeklyHours: number;
  subjects: CurriculumSubject[];
}

interface RawChapter {
  titleAr: string;
  titleEn: string;
  lessons: number;
}

interface RawSubject {
  id: string;
  name: string;
  nameAr: string;
  chapters: RawChapter[];
}

interface RawStage {
  weeklyHours: number;
  subjects: RawSubject[];
}

const ch = (titleAr: string, titleEn: string, lessons = 3): RawChapter => ({
  titleAr,
  titleEn,
  lessons
});

/** المصري: إعدادي + ثانوي (عام) + جامعي (هيكل عام) */
const STAGE_CURRICULUM_RAW: Record<string, RawStage> = {
  'prep-1': {
    weeklyHours: 12,
    subjects: [
      { id: 'arabic', name: 'Arabic', nameAr: 'اللغة العربية', chapters: [ch('القراءة والنصوص', 'Reading & Texts'), ch('النحو', 'Grammar'), ch('التعبير', 'Composition')] },
      { id: 'english', name: 'English', nameAr: 'اللغة الإنجليزية', chapters: [ch('Unit 1–3', 'Unit 1–3'), ch('Unit 4–6', 'Unit 4–6'), ch('Grammar & Writing', 'Grammar & Writing')] },
      { id: 'math', name: 'Math', nameAr: 'الرياضيات', chapters: [ch('الأعداد النسبية', 'Rational Numbers'), ch('الجبر', 'Algebra'), ch('الهندسة', 'Geometry')] },
      { id: 'science', name: 'Science', nameAr: 'العلوم', chapters: [ch('المادة وخصائصها', 'Matter & Properties'), ch('الطاقة', 'Energy'), ch('الأحياء', 'Living Organisms')] },
      { id: 'social', name: 'Social Studies', nameAr: 'الدراسات الاجتماعية', chapters: [ch('الجغرافيا', 'Geography'), ch('التاريخ', 'History')] }
    ]
  },
  'prep-2': {
    weeklyHours: 12,
    subjects: [
      { id: 'arabic', name: 'Arabic', nameAr: 'اللغة العربية', chapters: [ch('القراءة والنصوص', 'Reading & Texts'), ch('النحو', 'Grammar'), ch('الأدب', 'Literature')] },
      { id: 'english', name: 'English', nameAr: 'اللغة الإنجليزية', chapters: [ch('Unit 1–4', 'Unit 1–4'), ch('Unit 5–8', 'Unit 5–8'), ch('Writing', 'Writing')] },
      { id: 'math', name: 'Math', nameAr: 'الرياضيات', chapters: [ch('الجبر', 'Algebra'), ch('الهندسة', 'Geometry'), ch('الإحصاء', 'Statistics')] },
      { id: 'science', name: 'Science', nameAr: 'العلوم', chapters: [ch('الحركة والقوى', 'Motion & Forces'), ch('التفاعلات', 'Chemical Reactions'), ch('الأجهزة الحيوية', 'Body Systems')] },
      { id: 'social', name: 'Social Studies', nameAr: 'الدراسات الاجتماعية', chapters: [ch('جغرافيا مصر', 'Geography of Egypt'), ch('التاريخ الإسلامي', 'Islamic History')] }
    ]
  },
  'prep-3': {
    weeklyHours: 14,
    subjects: [
      { id: 'arabic', name: 'Arabic', nameAr: 'اللغة العربية', chapters: [ch('القراءة', 'Reading'), ch('النحو', 'Grammar'), ch('النصوص', 'Texts'), ch('التعبير', 'Composition')] },
      { id: 'english', name: 'English', nameAr: 'اللغة الإنجليزية', chapters: [ch('Unit 1–5', 'Unit 1–5'), ch('Unit 6–10', 'Unit 6–10'), ch('Writing & Comprehension', 'Writing & Comprehension')] },
      { id: 'math', name: 'Math', nameAr: 'الرياضيات', chapters: [ch('الجبر', 'Algebra'), ch('الهندسة التحليلية', 'Coordinate Geometry'), ch('حساب المثلثات', 'Trigonometry')] },
      { id: 'science', name: 'Science', nameAr: 'العلوم', chapters: [ch('الكيمياء', 'Chemistry'), ch('الفيزياء', 'Physics'), ch('الأحياء', 'Biology')] },
      { id: 'social', name: 'Social Studies', nameAr: 'الدراسات الاجتماعية', chapters: [ch('الجغرافيا', 'Geography'), ch('التاريخ', 'History')] }
    ]
  },
  'sec-1': {
    weeklyHours: 16,
    subjects: [
      { id: 'arabic', name: 'Arabic', nameAr: 'اللغة العربية', chapters: [ch('القراءة والنصوص', 'Reading & Texts'), ch('النحو', 'Grammar'), ch('الأدب', 'Literature')] },
      { id: 'english', name: 'English', nameAr: 'اللغة الإنجليزية', chapters: [ch('Unit 1–3', 'Unit 1–3'), ch('Unit 4–6', 'Unit 4–6'), ch('Writing', 'Writing')] },
      { id: 'math', name: 'Math', nameAr: 'الرياضيات', chapters: [ch('الجبر', 'Algebra'), ch('الهندسة', 'Geometry'), ch('المثلثات', 'Trigonometry')] },
      { id: 'physics', name: 'Physics', nameAr: 'الفيزياء', chapters: [ch('القياس والحركة', 'Measurement & Motion'), ch('القوى', 'Forces'), ch('الشغل والطاقة', 'Work & Energy')] },
      { id: 'chemistry', name: 'Chemistry', nameAr: 'الكيمياء', chapters: [ch('تركيب الذرة', 'Atomic Structure'), ch('الجدول الدوري', 'Periodic Table'), ch('الروابط', 'Bonding')] },
      { id: 'biology', name: 'Biology', nameAr: 'الأحياء', chapters: [ch('الخلية', 'The Cell'), ch('التصنيف', 'Classification')] }
    ]
  },
  'sec-2': {
    weeklyHours: 18,
    subjects: [
      { id: 'arabic', name: 'Arabic', nameAr: 'اللغة العربية', chapters: [ch('القراءة', 'Reading'), ch('النحو', 'Grammar'), ch('الأدب', 'Literature')] },
      { id: 'english', name: 'English', nameAr: 'اللغة الإنجليزية', chapters: [ch('Unit 1–3', 'Unit 1–3'), ch('Unit 4–6', 'Unit 4–6')] },
      { id: 'math', name: 'Math', nameAr: 'الرياضيات', chapters: [ch('الجبر', 'Algebra'), ch('الهندسة', 'Geometry'), ch('حساب المثلثات', 'Trigonometry')] },
      { id: 'physics', name: 'Physics', nameAr: 'الفيزياء', chapters: [ch('الكهرباء', 'Electricity'), ch('المغناطيسية', 'Magnetism'), ch('الموجات', 'Waves')] },
      { id: 'chemistry', name: 'Chemistry', nameAr: 'الكيمياء', chapters: [ch('التفاعلات', 'Reactions'), ch('المحاليل', 'Solutions'), ch('الكيمياء العضوية', 'Organic Chemistry')] },
      { id: 'biology', name: 'Biology', nameAr: 'الأحياء', chapters: [ch('الوراثة', 'Genetics'), ch('الجهاز العصبي', 'Nervous System')] }
    ]
  },
  'sec-3': {
    weeklyHours: 24,
    subjects: [
      { id: 'arabic', name: 'Arabic', nameAr: 'اللغة العربية', chapters: [ch('القراءة والنصوص', 'Reading & Texts'), ch('النحو والبلاغة', 'Grammar & Rhetoric'), ch('الأدب والتعبير', 'Literature & Composition'), ch('المراجعة الشاملة', 'Final Review')] },
      { id: 'english', name: 'English', nameAr: 'اللغة الإنجليزية', chapters: [ch('Unit 1–4', 'Unit 1–4'), ch('Unit 5–8', 'Unit 5–8'), ch('Grammar', 'Grammar'), ch('Writing & Comprehension', 'Writing & Comprehension')] },
      { id: 'math', name: 'Math', nameAr: 'الرياضيات', chapters: [ch('التفاضل', 'Calculus'), ch('التكامل', 'Integration'), ch('الجبر', 'Algebra'), ch('الهندسة الفراغية', 'Solid Geometry'), ch('الإحصاء', 'Statistics')] },
      { id: 'physics', name: 'Physics', nameAr: 'الفيزياء', chapters: [ch('الكهرباء', 'Electricity'), ch('الفيزياء الحديثة', 'Modern Physics'), ch('الموجات والصوت', 'Waves & Sound'), ch('المراجعة', 'Review')] },
      { id: 'chemistry', name: 'Chemistry', nameAr: 'الكيمياء', chapters: [ch('الكيمياء العضوية', 'Organic Chemistry'), ch('الاتزان', 'Equilibrium'), ch('الكيمياء الكهربية', 'Electrochemistry'), ch('التحليلية', 'Analytical Chemistry')] },
      { id: 'biology', name: 'Biology', nameAr: 'الأحياء', chapters: [ch('الوراثة', 'Genetics'), ch('البيولوجيا الجزيئية', 'Molecular Biology'), ch('المناعة', 'Immunity')] },
      { id: 'geology', name: 'Geology', nameAr: 'الجيولوجيا', chapters: [ch('الصخور والمعادن', 'Rocks & Minerals'), ch('التاريخ الجيولوجي', 'Geological History')] }
    ]
  },
  university: {
    weeklyHours: 16,
    subjects: [
      { id: 'major-1', name: 'Major Course 1', nameAr: 'مقرر التخصص 1', chapters: [ch('المحاضرات 1–4', 'Lectures 1–4'), ch('المحاضرات 5–8', 'Lectures 5–8')] },
      { id: 'major-2', name: 'Major Course 2', nameAr: 'مقرر التخصص 2', chapters: [ch('المحاضرات 1–4', 'Lectures 1–4'), ch('المحاضرات 5–8', 'Lectures 5–8')] },
      { id: 'general', name: 'General Course', nameAr: 'مقرر عام', chapters: [ch('الوحدة 1', 'Unit 1'), ch('الوحدة 2', 'Unit 2')] }
    ]
  }
};

const STAGE_LABELS: Record<string, { ar: string; en: string }> = {
  'prep-1': { ar: 'الصف الأول الإعدادي', en: '1st Preparatory' },
  'prep-2': { ar: 'الصف الثاني الإعدادي', en: '2nd Preparatory' },
  'prep-3': { ar: 'الصف الثالث الإعدادي', en: '3rd Preparatory' },
  'sec-1': { ar: 'الصف الأول الثانوي', en: '1st Secondary' },
  'sec-2': { ar: 'الصف الثاني الثانوي', en: '2nd Secondary' },
  'sec-3': { ar: 'الصف الثالث الثانوي', en: '3rd Secondary' },
  university: { ar: 'طالب جامعي', en: 'University' }
};

/** المنهج الكامل لكل مرحلة (بيتحمّل جاهز للطالب) */
export const STAGE_CURRICULUM: Record<string, StageCurriculum> = Object.fromEntries(
  Object.entries(STAGE_CURRICULUM_RAW).map(([stageId, data]) => {
    const labels = STAGE_LABELS[stageId] || { ar: stageId, en: stageId };
    return [
      stageId,
      {
        stageId,
        labelAr: labels.ar,
        labelEn: labels.en,
        weeklyHours: data.weeklyHours,
        subjects: data.subjects.map(subject => ({
          id: subject.id,
          name: subject.name,
          nameAr: subject.nameAr,
          chapters: subject.chapters.map((chapter, index) => ({
            id: `${stageId}-${subject.id}-ch-${index + 1}`,
            titleAr: chapter.titleAr,
            titleEn: chapter.titleEn,
            lessons: chapter.lessons
          }))
        }))
      }
    ];
  })
);

export const getStageCurriculum = (stageId?: string): StageCurriculum | null =>
  stageId ? STAGE_CURRICULUM[stageId] || null : null;

export const totalChapters = (curriculum: StageCurriculum): number =>
  curriculum.subjects.reduce((sum, s) => sum + s.chapters.length, 0);

export const totalLessons = (curriculum: StageCurriculum): number =>
  curriculum.subjects.reduce(
    (sum, s) => sum + s.chapters.reduce((inner, c) => inner + c.lessons, 0),
    0
  );
