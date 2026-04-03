import React, { useState } from 'react';
import useAuthStore from '../store/AuthStore'; // 1. Đổi import sang AuthStore mới
import { User, Lock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import LoginHeader from '../components/login/LoginHeader';
import LoginInput from '../components/login/LoginInput';
import LoginError from '../components/login/LoginError';

const LoginScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // 2. Lấy login và authError từ AuthStore
  const { login, authError } = useAuthStore(); 
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Hàm login lúc này đang gọi từ AuthStore
      const success = await login(username, password);
      
      // Chỉ chuyển trang nếu login trả về true (thành công)
      if (success) {
        navigate('/workstation');
      }
    } catch (error) {
      console.error("Login Failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <LoginHeader/>

        <div className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <LoginInput 
              label={t('login.username')}
              icon={User}
              type="text"
              placeholder={t('login.placeholderUser')}
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
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg shadow-md transition-transform active:scale-95 mt-4 flex justify-center items-center"
            >
              {isLoading ? <Loader2 className='animate-spin'/> : t('login.signIn')}
            </button>
          </form>

          {/* 3. Truyền authError xuống Component hiển thị lỗi */}
          <LoginError message={authError} />
        </div>
        
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
          {t('login.footer')}
        </div>

      </div>
    </div>
  );
};

export default LoginScreen;