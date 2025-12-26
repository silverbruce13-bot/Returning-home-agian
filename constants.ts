import { Reading, DailyReading } from './types';
import { Language } from './i18n';

// Pauline Epistles reordered for testing and flow:
// 1. Galatians (6 ch) -> Days 1, 2, 3
// 2. Romans (16 ch) -> Starts on Day 4
export const PAULINE_EPISTLES = [
  { book: { ko: '갈라디아서', en: 'Galatians' }, chapters: 6 },
  { book: { ko: '로마서', en: 'Romans' }, chapters: 16 },
  { book: { ko: '고린도전서', en: '1 Corinthians' }, chapters: 16 },
  { book: { ko: '고린도후서', en: '2 Corinthians' }, chapters: 13 },
  { book: { ko: '에베소서', en: 'Ephesians' }, chapters: 6 },
  { book: { ko: '빌립보서', en: 'Philippians' }, chapters: 4 },
  { book: { ko: '골로새서', en: 'Colossians' }, chapters: 4 },
  { book: { ko: '데살로니가전서', en: '1 Thessalonians' }, chapters: 5 },
  { book: { ko: '데살로니가후서', en: '2 Thessalonians' }, chapters: 3 },
  { book: { ko: '디모데전서', en: '1 Timothy' }, chapters: 6 },
  { book: { ko: '디모데후서', en: '2 Timothy' }, chapters: 4 },
  { book: { ko: '디도서', en: 'Titus' }, chapters: 3 },
  { book: { ko: '빌레몬서', en: 'Philemon' }, chapters: 1 },
];

type ReadingPlanItem = {
    book: { ko: string; en: string };
    chapter: number;
}

const generateReadingPlan = (): ReadingPlanItem[] => {
  const plan: ReadingPlanItem[] = [];
  PAULINE_EPISTLES.forEach(({ book, chapters }) => {
    for (let i = 1; i <= chapters; i++) {
      plan.push({ book, chapter: i });
    }
  });
  return plan;
};

export const readingPlan = generateReadingPlan();
const totalChapters = readingPlan.length;
export const TOTAL_DAYS = Math.ceil(totalChapters / 2);

export const getReadingForDay = (day: number, language: Language): DailyReading => {
    const safeDay = Math.max(1, day);
    const startIndex = ((safeDay - 1) * 2) % totalChapters;
  
    const firstChapterItem = readingPlan[startIndex];
    const secondChapterItem = readingPlan[(startIndex + 1) % totalChapters];
  
    return [
      { book: firstChapterItem.book[language], chapter: firstChapterItem.chapter },
      { book: secondChapterItem.book[language], chapter: secondChapterItem.chapter },
    ];
};

export const formatReadingRef = (reading: DailyReading, language: Language): string => {
    const book1 = reading[0].book;
    const chapter1 = reading[0].chapter;
    const book2 = reading[1].book;
    const chapter2 = reading[1].chapter;

    if (book1 === book2) {
        return language === 'ko'
            ? `${book1} ${chapter1}-${chapter2}장`
            : `${book1} ${chapter1}-${chapter2}`;
    } else {
        return language === 'ko'
            ? `${book1} ${chapter1}장, ${book2} ${chapter2}장`
            : `${book1} ${chapter1}, ${book2} ${chapter2}`;
    }
};

export interface ScheduleItem {
  day: number;
  reading: string;
}

export const getFullSchedule = (language: Language): ScheduleItem[] => {
    const schedule: ScheduleItem[] = [];
    for (let dayIndex = 0; dayIndex < TOTAL_DAYS; dayIndex++) {
        const reading = getReadingForDay(dayIndex + 1, language);
        schedule.push({
            day: dayIndex + 1,
            reading: formatReadingRef(reading, language),
        });
    }
    return schedule;
};
