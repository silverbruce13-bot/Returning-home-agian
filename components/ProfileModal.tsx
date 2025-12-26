import React, { useRef, useState } from 'react';
import { useLanguage } from '../i18n';
import { backupUserData, restoreUserData } from '../services/userService';

interface ProfileModalProps {
  username: string;
  onClose: () => void;
  onLogout: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ username, onClose, onLogout }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleBackup = () => {
    const data = backupUserData(username);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `${username}_backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage({ text: t('backupSuccess'), type: 'success' });
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = restoreUserData(username, content);
        if (success) {
          setMessage({ text: t('restoreSuccess'), type: 'success' });
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setMessage({ text: t('restoreFail'), type: 'error' });
        }
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be selected again if needed
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl border border-slate-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="bg-slate-800 p-6 border-b border-slate-700 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-sky-400">{t('profileTitle')}</h2>
                <p className="text-slate-300 mt-1">{t('welcomeUser', { name: username })}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </header>

        <div className="p-6 space-y-6">
            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-lg font-bold text-slate-100 mb-2">{t('backupTitle')}</h3>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">{t('backupDesc')}</p>
                <button
                    onClick={handleBackup}
                    className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold rounded-lg transition-colors flex items-center justify-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {t('backupButton')}
                </button>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-lg font-bold text-slate-100 mb-2">{t('restoreTitle')}</h3>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">{t('restoreDesc')}</p>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/json"
                    className="hidden"
                />
                <button
                    onClick={handleRestoreClick}
                    className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-green-400 font-semibold rounded-lg transition-colors flex items-center justify-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t('restoreButton')}
                </button>
            </div>
            
             <div className="border-t border-slate-700 pt-4">
                <button
                    onClick={onLogout}
                    className="w-full py-3 px-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-semibold rounded-lg transition-colors flex items-center justify-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t('logoutButton')}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;