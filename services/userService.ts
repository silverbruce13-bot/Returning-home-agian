export const getCurrentUser = (): string | null => {
  const user = window.localStorage.getItem('currentUser');
  return user ? user.trim() : null;
};

export const loginUser = (username: string): void => {
  window.localStorage.setItem('currentUser', username.trim());
};

export const logoutUser = (): void => {
  window.localStorage.removeItem('currentUser');
};

export const getUserProgress = (username: string): number => {
  const key = `${username.trim()}_lastCompletedDay`;
  const saved = window.localStorage.getItem(key);
  return saved ? parseInt(saved, 10) : 0;
};

export const saveUserProgress = (username: string, day: number): void => {
  const trimmedName = username.trim();
  const currentMax = getUserProgress(trimmedName);
  if (day > currentMax) {
    const key = `${trimmedName}_lastCompletedDay`;
    window.localStorage.setItem(key, day.toString());
  }
};

export const backupUserData = (username: string): string => {
  const data: Record<string, string | null> = {};
  const trimmedName = username.trim();
  const prefix = `${trimmedName}_`;
  
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      data[key] = window.localStorage.getItem(key);
    }
  }
  
  data['currentUser'] = trimmedName;
  return JSON.stringify(data, null, 2);
};

export const restoreUserData = (username: string, jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData);
    const trimmedName = username.trim();

    const keys = Object.keys(data);
    keys.forEach(key => {
       if (typeof data[key] === 'string') {
           window.localStorage.setItem(key, data[key]);
       }
    });
    
    window.localStorage.setItem('currentUser', trimmedName);
    return true;
  } catch (e) {
    console.error("Failed to parse or restore backup data", e);
    return false;
  }
};
