import React from 'react';
import { useTranslation } from 'react-i18next'; // <--- Import
import Logo from '../Logo'

const LoginHeader = () => {
  const { t, i18n } = useTranslation(); // <--- Get i18n instance

  // Function to switch language
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
      
      <button 
        onClick={toggleLanguage}
        className="absolute top-4 right-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold py-1 px-3 rounded border border-blue-500 transition-colors"
      >
        {i18n.language === 'en' ? 'TIẾNG VIỆT' : 'ENGLISH'}
      </button>

      <div className="mx-auto bg-white w-48 h-24 rounded-lg flex items-center justify-center mb-6 shadow-lg p-2">
        <Logo />
      </div>

      <h1 className="text-3xl font-bold text-white tracking-wide">{t('login.title')}</h1>
    </div>
  );
};

export default LoginHeader;