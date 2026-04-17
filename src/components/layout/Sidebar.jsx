import React from 'react';
import useAuthStore from '../../store/AuthStore';
import { useTranslation } from 'react-i18next';
import { LogOut, User, Bell, Settings, ChevronLeft, ChevronRight, Factory, Users, ScreenShare, FileWarning } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm(t('app.confirmLogout'))) {
      logout();
      navigate("/login")
    }
  };

  return (
    <>
      {/* 1. SIDEBAR CONTAINER 
        - 'fixed': Floats on top of content (solves mobile layout squishing)
        - 'z-50': Ensures it sits above everything
        - 'translate': Slides in and out completely
      */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-800 border-r border-slate-700 shadow-2xl transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        
        {/* 2. FLOATING TOGGLE BUTTON 
          - Positioned OUTSIDE the sidebar (-right-10)
          - Always visible even when sidebar is hidden
        */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-20 -right-10 bg-blue-600 text-white rounded-r-lg p-2 shadow-[4px_0_15px_rgba(0,0,0,0.3)] border-y border-r border-blue-400 hover:bg-blue-500 hover:w-12 transition-all duration-200 flex items-center justify-center group"
          title="Toggle Sidebar"
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* --- SIDEBAR CONTENT (Hidden when closed) --- */}
        <div className="h-full flex flex-col overflow-hidden">
          
          {/* Header / User Profile */}
          <div className="p-6 border-b border-slate-700 flex flex-col items-center bg-slate-900/50">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg ring-4 ring-slate-800">
              <User size={32} className="text-white" />
            </div>
            <div className="text-center w-full animate-fade-in">
              <h3 className="font-bold text-lg text-white truncate px-2">
                {user?.name || t('sidebar.unknownUser')}
              </h3>
              <p className="text-blue-400 text-xs uppercase tracking-wider font-bold mt-1">
                  {user?.id || t('sidebar.operator')}
              </p>
              <p className="text-blue-400 text-xs uppercase tracking-wider font-bold mt-1">
                  {user?.role || t('sidebar.operator')}
              </p>
              <p className="text-blue-400 text-xs uppercase tracking-wider font-bold mt-1">
                  {user?.dept || t('sidebar.operator')}
              </p>
              <div className="mt-4 flex justify-center">
                 <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> 
                    {t('sidebar.online')}
                 </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">

              <SidebarItem 
                  icon={<ScreenShare size={20} />} 
                  label={t('sidebar.mainscreen', 'Màn hình chính')} 
                  onClick={() => navigate('/')} 
              />
              
              {/* Menu dành riêng cho Admin (Bọc 2 nút trong thẻ Fragment <>) */}
              {user?.role?.toLowerCase() === 'admin' && (
                  <>

                      <SidebarItem 
                          icon={<Settings size={20} />} 
                          label={t('sidebar.settings', 'Cài đặt model')} 
                          onClick={() => navigate('/model-config')} 
                      />
                      
                      <SidebarItem 
                          icon={<Users size={20} />} 
                          label={t('sidebar.accounts', 'Quản lý Tài khoản')} 
                          onClick={() => navigate('/accounts')} 
                      />

                      <SidebarItem 
                          icon={<FileWarning size={20} />} 
                          label={t('sidebar.defects', 'Cấu hình mã lỗi')} 
                          onClick={() => navigate('/defects')} 
                      />
                  </>
              )}

          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 bg-slate-900/30">
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center w-full py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all duration-200 border border-transparent hover:border-red-500/20 group"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="ml-3 font-medium">{t('sidebar.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 3. BACKDROP (Optional)
        - Adds a dark overlay on mobile when sidebar is open to focus attention 
        - Clicking it closes the sidebar
      */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </>
  );
};

const SidebarItem = ({ icon, label, badge, onClick }) => (
  <div 
    onClick={onClick}
    className="flex items-center px-4 py-3 text-slate-400 hover:bg-slate-700/80 hover:text-white rounded-xl cursor-pointer transition-all duration-200 group relative overflow-hidden active:scale-95"
  >
    <div className="group-hover:text-blue-400 transition-colors">
      {icon}
    </div>
    
    <div className="ml-3 flex-1 flex justify-between items-center">
      <span className="font-medium text-sm tracking-wide">{label}</span>
      {badge && (
        <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
          {badge}
        </span>
      )}
    </div>
  </div>
);

export default Sidebar;