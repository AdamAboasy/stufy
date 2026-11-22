export type Subject = {
  id: string;
  name: string;
  totalPages: number;
  color: string;
  /** ISO date (YYYY-MM-DD) or null */
  examDate: string | null;
  createdAt: number;
};

export type Task = {
  id: string;
  subjectId: string;
  subjectName: string;
  color: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  fromPage: number;
  toPage: number;
  minutes: number;
  done: boolean;
  doneAt: number | null;
};
