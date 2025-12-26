
export interface Reading {
  book: string;
  chapter: number;
}

export type DailyReading = [Reading, Reading];

export interface DiaryEntry {
  repentance: string;
  resolve: string;
  dream: string;
}

export interface EvangelismPlan {
  plan: string;
}

export type ActiveTab = 'reading' | 'diary' | 'mission' | 'dashboard';

export interface Song {
  title: string;
  artist: string;
}

export interface SavedDiaryEntry {
  id: number;
  timestamp: string;
  content: DiaryEntry;
}

export interface SavedPlanEntry {
  id: number;
  timestamp: string;
  content: string;
}

export interface ArchivedReading {
  day: number;
  dateSaved: string;
  readingReference: string;
  passage: string;
  meditationGuide: string;
  context: string;
  intention: string;
  contextImageUrl: string | null;
}
