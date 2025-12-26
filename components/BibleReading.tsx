import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DailyReading, ArchivedReading } from '../types';
import { generateComprehensiveReadingContent, generateContextImage, explainPassageSelection } from '../services/geminiService';
import { readingPlan, getFullSchedule, formatReadingRef, PAULINE_EPISTLES } from '../constants';
import { getMeditationStatus, saveMeditationStatus, MeditationRecord, MeditationStatus, getArchivedReadings, saveArchivedReading } from '../services/syncService';
import Card from './common/Card';
import Spinner from './common/Spinner';
import MusicRecommendation from './MusicRecommendation';
import PrayerTraining from './PrayerTraining';
import SermonOutline from './SermonOutline';
import BibleChat from './BibleChat';
import StoryKeywords from './StoryKeywords';
import ArchivedReadingModal from './ArchivedReadingModal';
import ExplanationModal from './ExplanationModal';
import { useLanguage } from '../i18n';

interface BibleReadingProps {
  reading: DailyReading;
  onPassageLoaded: (passage: string) => void;
  day: number;
  onComplete: () => void;
}

type ReadingMode = 'sequential' | 'manual';

const BibleReading: React.FC<BibleReadingProps> = ({ reading: initialReading, onPassageLoaded, day, onComplete }) => {
  const { language, t } = useLanguage();
  
  // States for Reading Mode
  const [readingMode, setReadingMode] = useState<ReadingMode>('sequential');
  const [selectedBookIndex, setSelectedBookIndex] = useState(0);
  const [selectedStartChapter, setSelectedStartChapter] = useState(1);
  const [manualReading, setManualReading] = useState<DailyReading | null>(null);

  // Core States
  const [passage, setPassage] = useState<string>('');
  const [preReadingQuestions, setPreReadingQuestions] = useState<string[]>([]);
  const [passageIntention, setPassageIntention] = useState<string>('');
  const [meditationGuide, setMeditationGuide] = useState<string>('');
  const [passageContext, setPassageContext] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [contextImageUrl, setContextImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isTocVisible, setIsTocVisible] = useState(false);
  const [meditationStatus, setMeditationStatus] = useState<MeditationRecord>({});
  const [isSaving, setIsSaving] = useState(false);
  const [archivedReadings, setArchivedReadings] = useState<Record<string, ArchivedReading>>({});
  const [viewingArchiveKey, setViewingArchiveKey] = useState<string | null>(null);
  const [isDayCompleted, setIsDayCompleted] = useState(false);
  
  const passageContainerRef = useRef<HTMLDivElement>(null);
  const [selectionPopover, setSelectionPopover] = useState({ visible: false, x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [explanationModal, setExplanationModal] = useState({
    isOpen: false,
    isLoading: false,
    error: null as string | null,
    content: '',
  });

  const fullSchedule = useMemo(() => getFullSchedule(language), [language]);
  const currentReading = readingMode === 'sequential' ? initialReading : manualReading || initialReading;
  const currentRef = formatReadingRef(currentReading, language);

  // Archive lookup key
  const archiveKey = useMemo(() => {
    if (readingMode === 'sequential') return `day-${day}`;
    return `manual-${currentRef.replace(/[^a-zA-Z0-9]/g, '')}`;
  }, [readingMode, day, currentRef]);

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const [status, archives] = await Promise.all([
                getMeditationStatus(),
                getArchivedReadings()
            ]);
            setMeditationStatus(status);
            
            // Convert numerical archive to string keys for uniform access
            const formattedArchives: Record<string, ArchivedReading> = {};
            Object.keys(archives).forEach(k => {
                formattedArchives[`day-${k}`] = (archives as any)[k];
            });
            // Also fetch manual archives if they exist (we'd need syncService to support this better, 
            // but for now let's use what we have and keep manual records as ephemeral or separately keyed)
            setArchivedReadings(formattedArchives);
            setIsDayCompleted(!!formattedArchives[archiveKey]);
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
        }
    };
    fetchInitialData();
  }, [day, archiveKey]);

  const handleApplyManual = () => {
    const book = PAULINE_EPISTLES[selectedBookIndex];
    const bookName = book.book[language];
    const totalChapters = book.chapters;

    const ch1 = selectedStartChapter;
    let ch2 = ch1 + 1;
    let book2Name = bookName;

    // Handle overflow to next book if possible
    if (ch2 > totalChapters) {
      if (selectedBookIndex + 1 < PAULINE_EPISTLES.length) {
        book2Name = PAULINE_EPISTLES[selectedBookIndex + 1].book[language];
        ch2 = 1;
      } else {
        ch2 = ch1; // Stick to one chapter if it's the very last one
      }
    }

    setManualReading([{ book: bookName, chapter: ch1 }, { book: book2Name, chapter: ch2 }]);
    setReadingMode('manual');
  };

  const handleStatusChange = async (targetDay: number, status: MeditationStatus) => {
    const newStatus = { ...meditationStatus };
    if (newStatus[targetDay] === status) delete newStatus[targetDay];
    else newStatus[targetDay] = status;
    setMeditationStatus(newStatus);
    await saveMeditationStatus(newStatus);
  };

  const handleCompleteReading = async () => {
    if (!passage || !meditationGuide) return;
    setIsSaving(true);
    
    const dataToArchive: ArchivedReading = {
        day: readingMode === 'sequential' ? day : -1,
        dateSaved: new Date().toISOString(),
        readingReference: currentRef,
        passage,
        meditationGuide,
        context: passageContext,
        intention: passageIntention,
        contextImageUrl,
    };

    try {
        await saveArchivedReading(readingMode === 'sequential' ? day : archiveKey, dataToArchive);
        setArchivedReadings(prev => ({...prev, [archiveKey]: dataToArchive}));
        if (readingMode === 'sequential' && meditationStatus[day] !== 'good') {
            handleStatusChange(day, 'good');
        }
        setIsDayCompleted(true);
    } finally {
        setIsSaving(false);
    }
  };

  const handleProceedToNextDay = () => {
      if (readingMode === 'sequential') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        onComplete();
      } else {
        setReadingMode('sequential');
      }
  };

  const handleQuickBackup = () => {
      if (window.handleQuickBackupGlobal) window.handleQuickBackupGlobal();
  };

  const fetchContent = useCallback(async () => {
    const readingRefKey = currentRef.replace(/[^a-zA-Z0-9가-힣]/g, '');
    const cacheKey = `reading-content-v9-${readingRefKey}`;
    const cachedItem = window.localStorage.getItem(cacheKey);
    
    if (cachedItem) {
        const cachedData = JSON.parse(cachedItem);
        setPassage(cachedData.passage);
        onPassageLoaded(cachedData.passage);
        setPreReadingQuestions(cachedData.preReadingQuestions || []);
        setMeditationGuide(cachedData.meditationGuide);
        setPassageContext(cachedData.context);
        setPassageIntention(cachedData.intention);
        setSummary(cachedData.summary);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await generateComprehensiveReadingContent(currentReading, language);
      setPassage(data.passage);
      onPassageLoaded(data.passage);
      setPreReadingQuestions(data.preReadingQuestions);
      setMeditationGuide(data.meditationGuide);
      setPassageContext(data.context);
      setPassageIntention(data.intention);
      setSummary(data.summary);
      window.localStorage.setItem(cacheKey, JSON.stringify(data));
      
      setIsImageLoading(true);
      const imageUrl = await generateContextImage({ initialPrompt: data.imagePrompt, fallbackContext: data.intention, language });
      setContextImageUrl(imageUrl);
    } catch (err) {
      setError(t('contentError'));
    } finally {
      setIsLoading(false);
      setIsImageLoading(false);
    }
  }, [currentReading, language, t, onPassageLoaded, currentRef]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const formatText = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.match(/^\d+\./) || line.match(/^\d+:/)) return <p key={index} className="mb-2"><span className="font-semibold text-sky-400 mr-2">{line.split(' ')[0]}</span>{line.substring(line.indexOf(' ') + 1)}</p>;
      if(line.startsWith('**')) return <h3 key={index} className="text-xl font-bold text-slate-200 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h3>;
      return <p key={index} className="mb-2">{line}</p>;
    });
  };

  return (
    <div className="space-y-6">
       <div className="flex bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-700">
            <button 
                onClick={() => setReadingMode('sequential')}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${readingMode === 'sequential' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
                {t('modeSequential')}
            </button>
            <button 
                onClick={() => setReadingMode('manual')}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${readingMode === 'manual' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
                {t('modeManual')}
            </button>
       </div>

       {readingMode === 'manual' && (
           <Card className="border border-sky-500/20">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1 ml-1">{t('selectBook')}</label>
                        <select 
                            value={selectedBookIndex}
                            onChange={(e) => {
                                setSelectedBookIndex(parseInt(e.target.value));
                                setSelectedStartChapter(1);
                            }}
                            className="bg-slate-700 text-slate-200 p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-sky-500"
                        >
                            {PAULINE_EPISTLES.map((book, idx) => (
                                <option key={idx} value={idx}>{book.book[language]}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1 ml-1">{t('selectChapter')}</label>
                        <select 
                            value={selectedStartChapter}
                            onChange={(e) => setSelectedStartChapter(parseInt(e.target.value))}
                            className="bg-slate-700 text-slate-200 p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-sky-500"
                        >
                            {Array.from({ length: PAULINE_EPISTLES[selectedBookIndex].chapters }, (_, i) => i + 1).map(num => (
                                <option key={num} value={num}>{num}{language === 'ko' ? '장' : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={handleApplyManual}
                            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-lg transition-all"
                        >
                            {t('applySelection')}
                        </button>
                    </div>
               </div>
           </Card>
       )}

       {readingMode === 'sequential' && (
           <Card>
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-100">{t('readingPlanTitle')}</h2>
              <button onClick={() => setIsTocVisible(!isTocVisible)} className="flex items-center px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                {isTocVisible ? t('hideButton') : t('showAllButton')}
              </button>
            </div>
            {isTocVisible && (
              <div className="mt-4 border-t border-slate-700 pt-4">
                  <div className="max-h-60 overflow-y-auto pr-2">
                    <ul className="space-y-1">
                      {fullSchedule.map(item => (
                        <li key={item.day} className={`p-2 rounded-md text-sm flex justify-between items-center ${item.day === day ? 'bg-sky-500/10 text-sky-400 font-bold ring-2 ring-sky-400' : 'text-slate-300'}`}>
                            <span>{t('day', {day: item.day})}: {item.reading}</span>
                            {!!archivedReadings[`day-${item.day}`] && <button onClick={() => setViewingArchiveKey(`day-${item.day}`)} className="ml-4 px-2 py-0.5 text-xs bg-slate-600 rounded hover:bg-slate-500 transition-colors">{t('reviewButton')}</button>}
                        </li>
                      ))}
                    </ul>
                  </div>
              </div>
            )}
          </Card>
       )}
      
      {!isLoading && preReadingQuestions.length > 0 && (
          <Card className="border border-sky-500/30">
              <h2 className="text-xl font-bold text-sky-100 mb-4">{t('preReadingTitle')}</h2>
              <ul className="space-y-3">
                  {preReadingQuestions.map((q, i) => (
                      <li key={i} className="flex items-start bg-slate-700/50 p-3 rounded-lg">
                          <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold mr-3 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <span className="text-slate-200">{q}</span>
                      </li>
                  ))}
              </ul>
          </Card>
      )}

      <Card>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-100">{t('todaysPassage')}</h2>
        </div>
        {isLoading ? <Spinner message={t('loadingPassage')} /> : (
          <div ref={passageContainerRef} className="max-h-[50vh] overflow-y-auto p-4 bg-slate-900 rounded-lg text-slate-300 leading-loose">
            {formatText(passage)}
          </div>
        )}
      </Card>

      {!isLoading && passage && (
        <>
            <StoryKeywords passage={passage} />
            <BibleChat passage={passage} />
            <Card>
                <h2 className="text-2xl font-bold text-slate-100 mb-4">{t('lordsWill')}</h2>
                <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">{passageIntention}</div>
            </Card>
            <Card>
                <h2 className="text-2xl font-bold text-slate-100 mb-4">{t('meditationGuide')}</h2>
                <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">{formatText(meditationGuide)}</div>
            </Card>
            <Card>
                <h2 className="text-2xl font-bold text-slate-100 mb-4">{t('timeAndPlace')}</h2>
                {contextImageUrl && <img src={contextImageUrl} alt="Bible Context" className="w-full h-auto rounded-lg mb-4 shadow-lg" />}
                <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">{passageContext}</div>
            </Card>

            <div className="my-8 text-center animate-fade-in">
                {isDayCompleted ? (
                    <div className="bg-slate-800 border-2 border-green-500/30 rounded-2xl p-8 shadow-2xl">
                        <div className="flex flex-col md:flex-row items-center md:space-x-8">
                             <div className="bg-green-500/20 p-4 rounded-full mb-4 md:mb-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             </div>
                             <div className="flex-1 text-center md:text-left">
                                <h3 className="text-2xl font-bold text-white mb-2">{t('meditationSaved')}</h3>
                                <p className="text-slate-400 mb-6">{t('dataSafetyDesc')}</p>
                                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                                    <button 
                                        onClick={() => setViewingArchiveKey(archiveKey)}
                                        className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 active:scale-95"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        <span>{t('reviewButton')}</span>
                                    </button>
                                    <button onClick={handleQuickBackup} className="flex-1 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 active:scale-95">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        <span>{t('dataSafetyButton')}</span>
                                    </button>
                                    <button onClick={handleProceedToNextDay} className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold rounded-xl transition-all flex items-center justify-center space-x-2 active:scale-95">
                                        <span>{readingMode === 'sequential' ? (language === 'ko' ? `${day + 1}일차 시작` : `Next Day`) : t('modeSequential')}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                ) : (
                    <button onClick={handleCompleteReading} disabled={isSaving} className="w-full md:w-auto px-12 py-5 bg-green-600 text-white font-bold text-xl rounded-2xl shadow-xl hover:bg-green-500 active:scale-95 disabled:bg-slate-700">
                        {isSaving ? t('loading') : t('completeMeditation')}
                    </button>
                )}
            </div>

            <MusicRecommendation context={passage} title={t('passageMusicTitle')} id="p-music" />
            <PrayerTraining passage={passage} />
            <SermonOutline passage={passage} />
        </>
      )}

      <ArchivedReadingModal reading={viewingArchiveKey ? archivedReadings[viewingArchiveKey] : null} onClose={() => setViewingArchiveKey(null)} formatText={formatText} />
      <ExplanationModal isOpen={explanationModal.isOpen} onClose={() => setExplanationModal(prev => ({...prev, isOpen: false}))} isLoading={explanationModal.isLoading} error={explanationModal.error} selectedText={selectedText} explanation={explanationModal.content} />
    </div>
  );
};

export default BibleReading;
