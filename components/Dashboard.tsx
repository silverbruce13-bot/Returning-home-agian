
import React, { useState, useEffect, useMemo } from 'react';
import { ArchivedReading } from '../types';
import { getMeditationStatus, getArchivedReadings, MeditationRecord } from '../services/syncService';
import { getCurrentUser } from '../services/userService';
import { PAULINE_EPISTLES, TOTAL_DAYS } from '../constants';
import Card from './common/Card';
import Spinner from './common/Spinner';
import ArchivedReadingModal from './ArchivedReadingModal';
import { useLanguage } from '../i18n';

const Dashboard: React.FC = () => {
  const { language, t } = useLanguage();
  const [meditationStatus, setMeditationStatus] = useState<MeditationRecord>({});
  const [archivedReadings, setArchivedReadings] = useState<Record<string, ArchivedReading>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewingArchiveKey, setViewingArchiveKey] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const user = getCurrentUser();
        setUserName(user || '');

        const [status, archives] = await Promise.all([
          getMeditationStatus(),
          getArchivedReadings()
        ]);
        setMeditationStatus(status);
        setArchivedReadings(archives);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate Statistics
  const stats = useMemo(() => {
    const values = Object.values(meditationStatus);
    const good = values.filter(v => v === 'good').length;
    const ok = values.filter(v => v === 'ok').length;
    const bad = values.filter(v => v === 'bad').length;
    const total = Object.keys(archivedReadings).length;
    const completionRate = Math.round((good + ok + bad) / TOTAL_DAYS * 100);

    return { good, ok, bad, total, completionRate };
  }, [meditationStatus, archivedReadings]);

  // Determine Spiritual Identity based on progress
  const identity = useMemo(() => {
    if (stats.total < 5) return { label: t('identityLevel1'), color: 'bg-emerald-500/20 text-emerald-400' };
    if (stats.total < 15) return { label: t('identityLevel2'), color: 'bg-blue-500/20 text-blue-400' };
    if (stats.total < 30) return { label: t('identityLevel3'), color: 'bg-purple-500/20 text-purple-400' };
    return { label: t('identityLevel4'), color: 'bg-amber-500/20 text-amber-400' };
  }, [stats.total, t]);

  // Sort archives by date for history view
  const history = useMemo(() => {
    return (Object.entries(archivedReadings) as [string, ArchivedReading][])
      .map(([key, reading]) => ({ key, ...reading }))
      .sort((a, b) => new Date(b.dateSaved).getTime() - new Date(a.dateSaved).getTime());
  }, [archivedReadings]);

  // Format book text based on verses if needed, but here we just show book progress
  const bookProgress = useMemo(() => {
    return PAULINE_EPISTLES.map(epistle => {
        const count = (Object.values(archivedReadings) as ArchivedReading[]).filter(r => r.readingReference.includes(epistle.book[language])).length;
        const totalPossible = Math.ceil(epistle.chapters / 2);
        const percent = Math.min(100, Math.round((count / totalPossible) * 100));
        return { name: epistle.book[language], percent, count };
    });
  }, [archivedReadings, language]);

  if (isLoading) return <Spinner message={t('loading')} />;

  const formatText = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.match(/^\d+\./) || line.match(/^\d+:/)) return <p key={index} className="mb-2 text-sm"><span className="font-semibold text-sky-400 mr-2">{line.split(' ')[0]}</span>{line.substring(line.indexOf(' ') + 1)}</p>;
      if(line.startsWith('**')) return <h3 key={index} className="text-lg font-bold text-slate-200 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h3>;
      return <p key={index} className="mb-2 text-sm">{line}</p>;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-slate-700 pb-6">
          <div>
              <h2 className="text-3xl font-bold text-slate-100 mb-1">
                {t('dashboardTitle', { name: userName })}
              </h2>
              <p className="text-slate-400">{t('dashboardSubtitle')}</p>
          </div>
          <div className={`mt-4 md:mt-0 px-4 py-2 rounded-full font-bold text-sm border border-current shadow-lg ${identity.color}`}>
              {identity.label}
          </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-sky-500/10 shadow-lg group hover:border-sky-500/30 transition-all">
          <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">{t('statsTotalDays')}</p>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-5xl font-black text-white group-hover:scale-110 transition-transform origin-left">{stats.total}</span>
            <span className="text-slate-500 font-bold uppercase tracking-tighter">Days</span>
          </div>
        </Card>
        
        <Card className="border border-sky-500/10 shadow-lg group hover:border-sky-500/30 transition-all">
          <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">{t('statsCompletionRate')}</p>
          <div className="flex items-center mt-2">
            <span className="text-5xl font-black text-sky-400 group-hover:scale-110 transition-transform origin-left">{stats.completionRate}%</span>
            <div className="flex-1 ml-6 h-3 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-sky-600 to-sky-400 shadow-glow" style={{ width: `${stats.completionRate}%` }}></div>
            </div>
          </div>
        </Card>

        <Card className="border border-sky-500/10 shadow-lg group hover:border-sky-500/30 transition-all">
          <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase mb-3">{t('statsSpiritualStatus')}</p>
          <div className="flex space-x-2 h-10">
            <div title={t('statusGood')} className="bg-green-500 rounded-lg shadow-lg hover:brightness-110 transition-all" style={{ flex: stats.good || 0.1 }}></div>
            <div title={t('statusOk')} className="bg-amber-500 rounded-lg shadow-lg hover:brightness-110 transition-all" style={{ flex: stats.ok || 0.1 }}></div>
            <div title={t('statusBad')} className="bg-red-500 rounded-lg shadow-lg hover:brightness-110 transition-all" style={{ flex: stats.bad || 0.1 }}></div>
          </div>
          <div className="flex justify-between mt-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
             <span className="flex items-center"><span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-1.5"></span> {t('statusGood')}</span>
             <span className="flex items-center"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-1.5"></span> {t('statusOk')}</span>
             <span className="flex items-center"><span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-1.5"></span> {t('statusBad')}</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Epistle Progress */}
        <Card className="border border-slate-700/50">
            <h3 className="text-lg font-bold text-slate-100 mb-5 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                {t('epistleProgress')}
            </h3>
            <div className="space-y-5 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                {bookProgress.map(book => (
                    <div key={book.name} className="group">
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-300 font-bold group-hover:text-white transition-colors">{book.name}</span>
                            <span className="text-slate-500 font-mono">{book.percent}%</span>
                        </div>
                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/30">
                            <div 
                                className={`h-full transition-all duration-1000 shadow-glow-sm ${book.percent === 100 ? 'bg-emerald-400' : 'bg-sky-500'}`} 
                                style={{ width: `${book.percent}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>

        {/* Recent History Log */}
        <Card className="border border-slate-700/50">
            <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-slate-100 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t('recentMeditations')}
                </h3>
                <span className="text-[10px] font-bold text-sky-400 bg-sky-900/30 px-3 py-1 rounded-full border border-sky-400/20">
                    {t('totalRecordCount', { count: history.length })}
                </span>
            </div>
            {history.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <p className="italic">{t('noHistoryYet')}</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                    {history.map(item => {
                        const date = new Date(item.dateSaved).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
                            month: 'short',
                            day: 'numeric'
                        });
                        return (
                            <div 
                                key={item.key} 
                                onClick={() => setViewingArchiveKey(item.key)}
                                className="group flex items-center p-3.5 bg-slate-900/40 hover:bg-slate-700 rounded-xl cursor-pointer transition-all border border-slate-700/30 hover:border-sky-500/30 hover:shadow-lg"
                            >
                                <div className="text-[11px] font-bold text-slate-500 w-12 group-hover:text-slate-300 transition-colors">{date}</div>
                                <div className="flex-1 px-4 border-l border-slate-700 group-hover:border-sky-500/30 transition-colors">
                                    <div className="text-sm font-bold text-slate-200 group-hover:text-sky-400 transition-colors">
                                        {item.readingReference}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                                        {item.day > 0 ? t('day', { day: item.day }) : t('manualArchivedTitle')}
                                    </div>
                                </div>
                                <div className="text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
      </div>

      <ArchivedReadingModal 
        reading={viewingArchiveKey ? archivedReadings[viewingArchiveKey] : null} 
        onClose={() => setViewingArchiveKey(null)} 
        formatText={formatText} 
      />
    </div>
  );
};

export default Dashboard;
