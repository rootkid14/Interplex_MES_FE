import React from 'react';
import { Factory } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const TopSystemBar = () => {
  const { t } = useTranslation();

  return (
    <div className="h-10 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 relative shadow-md z-10">
      
      <div className="w-20"></div>

      <div className="flex items-center gap-2 text-blue-400">
        <Factory size={16} />
        <h1 className="text-sm font-bold tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          {t('app.title')}
        </h1>
      </div>

      <div className="w-20 flex justify-end">
        <LanguageSwitcher />
      </div>
    </div>
  );
};

export default TopSystemBar;