import { SavedDiaryEntry, SavedPlanEntry, ArchivedReading } from '../types';
import { getCurrentUser } from './userService';

const MOCK_LATENCY = 100;

const simulateNetworkRequest = <T>(data?: T): Promise<T | void> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(data);
    }, MOCK_LATENCY);
  });
};

const getUserKey = (key: string): string => {
  const user = getCurrentUser();
  if (!user) return key;
  return `${user}_${key}`;
};

// --- Diary Entries ---
export const getDiaryEntries = async (storageKey: string): Promise<SavedDiaryEntry[]> => {
  const key = getUserKey(storageKey);
  const data = window.localStorage.getItem(key);
  const entries = data ? JSON.parse(data) : [];
  return simulateNetworkRequest(entries) as Promise<SavedDiaryEntry[]>;
};

export const saveDiaryEntries = async (storageKey: string, entries: SavedDiaryEntry[]): Promise<void> => {
  const key = getUserKey(storageKey);
  window.localStorage.setItem(key, JSON.stringify(entries));
  return simulateNetworkRequest();
};

// --- Mission Plans ---
export const getMissionPlans = async (storageKey: string): Promise<SavedPlanEntry[]> => {
  const key = getUserKey(storageKey);
  const data = window.localStorage.getItem(key);
  const plans = data ? JSON.parse(data) : [];
  return simulateNetworkRequest(plans) as Promise<SavedPlanEntry[]>;
};

export const saveMissionPlans = async (storageKey: string, plans: SavedPlanEntry[]): Promise<void> => {
  const key = getUserKey(storageKey);
  window.localStorage.setItem(key, JSON.stringify(plans));
  return simulateNetworkRequest();
};

// --- Meditation Status ---
export type MeditationStatus = 'good' | 'ok' | 'bad';
export type MeditationRecord = Record<number, MeditationStatus>;

export const getMeditationStatus = async (): Promise<MeditationRecord> => {
  const key = getUserKey('meditation-status');
  const data = window.localStorage.getItem(key);
  const status = data ? JSON.parse(data) : {};
  return simulateNetworkRequest(status) as Promise<MeditationRecord>;
};

export const saveMeditationStatus = async (status: MeditationRecord): Promise<void> => {
  const key = getUserKey('meditation-status');
  window.localStorage.setItem(key, JSON.stringify(status));
  return simulateNetworkRequest();
};


// --- Archived Readings ---
// Optimized individual key storage to prevent quota errors
export const getArchivedReadings = async (): Promise<Record<string, ArchivedReading>> => {
  const user = getCurrentUser();
  const readings: Record<string, ArchivedReading> = {};
  
  const prefix = user ? `${user}_archived-reading-` : 'archived-reading-';
  
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const id = key.replace(prefix, '');
        const data = window.localStorage.getItem(key);
        if (data) {
          readings[id] = JSON.parse(data);
        }
      } catch (e) {
        console.error("Failed to parse individual archived reading", e);
      }
    }
  }
  
  return simulateNetworkRequest(readings) as Promise<Record<string, ArchivedReading>>;
};

export const saveArchivedReading = async (id: number | string, readingData: ArchivedReading): Promise<void> => {
  // CRITICAL: Base64 images consume massive space. We exclude them from permanent storage.
  const optimizedReading = {
    ...readingData,
    contextImageUrl: null 
  };
  
  const key = getUserKey(`archived-reading-${id}`);
  
  try {
    window.localStorage.setItem(key, JSON.stringify(optimizedReading));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      console.warn("Storage quota exceeded. Cleaning cache...");
      for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.includes('reading-content-v')) { // Clear temporary reading cache
              window.localStorage.removeItem(k);
          }
      }
      window.localStorage.setItem(key, JSON.stringify(optimizedReading));
    } else {
      throw e;
    }
  }
  return simulateNetworkRequest();
};
