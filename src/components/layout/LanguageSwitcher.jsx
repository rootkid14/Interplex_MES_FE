import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex bg-slate-800 rounded-md overflow-hidden border border-slate-700">
      <button
        onClick={() => changeLanguage('vi')}
        className={`px-3 py-1 text-xs font-bold transition-colors ${
          i18n.language === 'vi' 
            ? 'bg-blue-600 text-white' 
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
      >
        VN
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 text-xs font-bold transition-colors ${
          i18n.language === 'en' 
            ? 'bg-blue-600 text-white' 
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;