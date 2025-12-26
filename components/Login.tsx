import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import Card from './common/Card';

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Clear states if component re-mounts (e.g. after logout)
  useEffect(() => {
    setUsername('');
    setError(null);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError(t('loginRequired'));
      return;
    }
    onLogin(username.trim());
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-wider">{t('headerTitle')}</h1>
            <p className="text-sky-400 text-sm">{t('headerSubtitle')}</p>
        </div>
        <Card>
          <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">{t('loginTitle')}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-400 mb-2">
                {t('usernameLabel')}
              </label>
              <input
                type="text"
                id="username"
                autoFocus
                value={username}
                onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                }}
                placeholder={t('usernamePlaceholder')}
                className="w-full p-4 bg-slate-700 text-slate-100 border border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder-slate-500 text-lg shadow-inner"
              />
              {error && <p className="mt-2 text-sm text-red-400 animate-pulse">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-sky-600 text-white font-bold text-lg rounded-lg hover:bg-sky-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 shadow-lg"
            >
              {t('startJourney')}
            </button>
          </form>
          <p className="text-center text-slate-500 text-xs mt-6">
            {t('appDescription')}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;