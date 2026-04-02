import React, { useState } from 'react';
import useProductionStore from '../store/productionStore';
import { User, Lock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // <--- Import Hook
import { useNavigate } from 'react-router-dom';

import LoginHeader from '../components/login/LoginHeader';
import LoginInput from '../components/login/LoginInput';
import LoginError from '../components/login/LoginError';

const LoginScreen = () => {
  const { t } = useTranslation(); // <--- Initialize the translator
  const navigate = useNavigate()
  const { login, errorMessage} = useProductionStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(username, password);;
      navigate('/workstation');
    } catch (error) {
      console.error("Login Failed", error);
    } finally {
      setIsLoading(false)
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Pass translations down to Header if needed, or update Header component similarly */}
        <LoginHeader/>

        <div className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <LoginInput 
              label={t('login.username')} // <--- Use t() key
              icon={User}
              type="text"
              placeholder={t('login.placeholderUser')} // <--- Use t() key
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <LoginInput 
              label={t('login.password')}
              icon={Lock}
              type="password"
              placeholder={t('login.placeholderPass')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button 
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg shadow-md transition-transform active:scale-95 mt-4"
            >
              {isLoading? <Loader2 className='animate-spin'/> : t('login.signIn')}
            </button>
          </form>

          <LoginError message={errorMessage} />
        </div>
        
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
          {t('login.footer')}
        </div>

      </div>
    </div>
  );
};

export default LoginScreen;