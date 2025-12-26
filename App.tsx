
import React, { useState, useMemo, useEffect } from 'react';
import { getReadingForDay, formatReadingRef, TOTAL_DAYS } from './constants';
import { ActiveTab, DailyReading } from './types';
import BibleReading from './components/BibleReading';
import FaithDiary from './components/FaithDiary';
import EvangelismMission from './components/EvangelismMission';
import Dashboard from './components/Dashboard';
import { useLanguage } from './i18n';
import Spinner from './components/common/Spinner';
import Login from './components/Login';
import ProfileModal from './components/ProfileModal';
import { getCurrentUser, loginUser, logoutUser, getUserProgress, saveUserProgress, backupUserData } from './services/userService';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    handleQuickBackupGlobal?: () => void;
  }
}

const App: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('reading');
  const [passage, setPassage] = useState<string>('');
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentProgressDay, setCurrentProgressDay] = useState<number>(1);
  const [showBackupSuccess, setShowBackupSuccess] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
        setIsCheckingApiKey(true);
        const user = getCurrentUser();
        if (user) {
          const progress = getUserProgress(user);
          setCurrentUser(user);
          setCurrentProgressDay(progress + 1);
        }

        if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
            setApiKeySelected(true);
        }
        setIsCheckingApiKey(false);
    };
    checkApiKey();
  }, []);

  const handleQuickBackup = () => {
    if (!currentUser) return;
    const data = backupUserData(currentUser);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `${currentUser}_backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowBackupSuccess(true);
    setTimeout(() => setShowBackupSuccess(false), 3000);
  };

  useEffect(() => {
    window.handleQuickBackupGlobal = handleQuickBackup;
    return () => { window.handleQuickBackupGlobal = undefined; };
  }, [currentUser]);

  const handleSelectApiKey = async () => {
      if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setApiKeySelected(true);
      }
  };
  
  const handleLogin = (username: string) => {
    const trimmedName = username.trim();
    loginUser(trimmedName);
    const progress = getUserProgress(trimmedName);
    setCurrentProgressDay(progress + 1);
    setCurrentUser(trimmedName);
    setActiveTab('reading');
    setPassage('');
  };

  const handleLogout = () => {
    logoutUser(); 
    setCurrentUser(null);
    setIsProfileOpen(false);
    setCurrentProgressDay(1);
    setActiveTab('reading');
    setPassage('');
  };

  const handleDayComplete = () => {
     if (currentUser) {
         const completedDay = currentProgressDay;
         saveUserProgress(currentUser, completedDay);
         setCurrentProgressDay(completedDay + 1);
         setPassage(''); 
         window.scrollTo({ top: 0, behavior: 'smooth' });
     }
  };

  const dailyReading: DailyReading = useMemo(() => {
      return getReadingForDay(currentProgressDay, language);
  }, [currentProgressDay, language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('appName');
  }, [language, t]);

  const todayDateString = new Date().toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  
  const readingRef = formatReadingRef(dailyReading, language);
  const storageKey = `Day-${currentProgressDay}`; 

  const NavButton = ({ tab, label }: { tab: ActiveTab; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-3 px-2 text-[10px] sm:text-xs md:text-sm font-semibold transition-colors duration-300 rounded-t-lg ${
        activeTab === tab 
          ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400' 
          : 'bg-sky-800 text-sky-200 hover:bg-sky-700'
      }`}
    >
      {label}
    </button>
  );

  const LanguageButton = ({ lang, label }: { lang: 'ko' | 'en', label: string }) => (
    <button
      onClick={() => setLanguage(lang)}
      className={`px-3 py-1 text-xs rounded-md transition-colors ${
        language === lang ? 'bg-sky-200 text-sky-800 font-bold' : 'bg-transparent text-sky-200 hover:bg-sky-700'
      }`}
    >
      {label}
    </button>
  );

  if (isCheckingApiKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner message={t('loading')} />
      </div>
    );
  }

  if (!apiKeySelected) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center text-slate-300 p-4">
        <div className="max-w-md">
            <h1 className="text-3xl font-bold text-white mb-4">{t('apiKeyRequiredTitle')}</h1>
            <p className="mb-6">{t('apiKeyRequiredMessage')}</p>
            <button
                onClick={handleSelectApiKey}
                className="w-full px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
            >
                {t('selectApiKeyButton')}
            </button>
            <p className="text-xs text-slate-500 mt-4" dangerouslySetInnerHTML={{ __html: t('billingInfoLink') }} />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-300">
      <header className="bg-sky-800 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 pt-4 pb-2 text-center relative">
          <div className="absolute top-3 left-4 flex items-center space-x-2">
            <span className="font-bold text-white tracking-[0.2em] text-[10px] md:text-xs uppercase hidden md:inline">Live in Wonder</span>
          </div>
          <div className="absolute top-3 right-4 flex items-center space-x-1 md:space-x-3">
             <div className="hidden sm:flex space-x-1 border border-sky-600 rounded-lg p-0.5 mr-1">
                <LanguageButton lang="ko" label={t('korean')} />
                <LanguageButton lang="en" label={t('english')} />
             </div>
             
             <button 
                onClick={handleQuickBackup}
                className="p-2 text-sky-200 hover:text-white hover:bg-sky-700 rounded-full transition-all relative group"
                title={t('quickBackup')}
             >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                 </svg>
             </button>

             <button 
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center space-x-1 text-sky-200 hover:text-white transition-colors p-2 hover:bg-sky-700 rounded-full"
                title={t('profileTitle')}
             >
                 <span className="text-xs font-semibold hidden lg:inline">{currentUser}</span>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
             </button>
          </div>
          
          <p className="text-[10px] md:text-sm text-sky-200 mt-8 md:mt-2 tracking-wide opacity-90">{t('headerSubtitle')}</p>
          <h1 className="text-base md:text-2xl font-bold mt-3 mb-2 tracking-[0.25em] text-white drop-shadow-sm uppercase">{t('headerTitle')}</h1>
          <div className="flex flex-col items-center mt-2">
            <div className="bg-sky-900/50 px-3 py-0.5 rounded-full border border-sky-600/50 text-[10px] font-mono mb-1">
                Day {currentProgressDay} / {TOTAL_DAYS}
            </div>
          </div>
        </div>

        {showBackupSuccess && (
            <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[100] bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl animate-fade-in flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-bold">{t('backupSuccess')}</span>
            </div>
        )}

        <nav className="container mx-auto px-2 md:px-4 flex justify-around mt-4 overflow-x-auto no-scrollbar">
          <NavButton tab="reading" label={t('navReading')} />
          <NavButton tab="diary" label={t('navDiary')} />
          <NavButton tab="mission" label={t('navMission')} />
          <NavButton tab="dashboard" label={t('navDashboard')} />
        </nav>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        {activeTab === 'reading' && (
            <BibleReading 
                reading={dailyReading} 
                onPassageLoaded={setPassage} 
                day={currentProgressDay}
                onComplete={handleDayComplete}
            />
        )}
        {activeTab === 'diary' && <FaithDiary storageKey={`diary-${storageKey}`} />}
        {activeTab === 'mission' && (passage ? <EvangelismMission passage={passage} storageKey={`mission-${storageKey}`}/> : <div className="text-center p-8 bg-slate-800 rounded-lg">{t('readingFirst')}</div>) }
        {activeTab === 'dashboard' && <Dashboard />}
      </main>

      <div className="container mx-auto px-4 py-8 border-t border-slate-800">
          <div className="max-w-3xl mx-auto bg-slate-800/30 p-4 rounded-xl border border-slate-700 flex items-start space-x-4">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                  {t('offlineStorageNotice')}
              </p>
          </div>
      </div>

      <footer className="text-center py-6 text-slate-400">
        <p className="text-xs">{t('footer', { year: new Date().getFullYear() })}</p>
      </footer>

      {isProfileOpen && (
        <ProfileModal 
            username={currentUser} 
            onClose={() => setIsProfileOpen(false)} 
            onLogout={handleLogout} 
        />
      )}
    </div>
  );
};

export default App;
