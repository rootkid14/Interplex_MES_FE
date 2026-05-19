import React from 'react';
import { useTranslation } from 'react-i18next';
import { TbLambda } from "react-icons/tb";

const TopSystemBar = () => {
    const { i18n } = useTranslation();

    // Hàm chuyển đổi ngôn ngữ
    const toggleLanguage = () => {
        const currentLang = i18n.language;
        const newLang = currentLang === 'vi' ? 'en' : 'vi';
        i18n.changeLanguage(newLang);
    };

    return (
        <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm">
            
            {/* --- CỤM BÊN TRÁI: Chỉ giữ lại Text Thương hiệu --- */}
            <div className="flex items-center select-none cursor-default">
                <div className="flex flex-col justify-center">
                    <h1 className="font-black text-white leading-none tracking-wider text-2xl">
                        INTERPLEX
                    </h1>
                    <p className="text-[12px] text-blue-400 font-bold tracking-[0.2em] mt-1 uppercase">
                        MES System
                    </p>
                </div>
            </div>

            {/* --- CỤM BÊN PHẢI: Lambda Badge & Language Switcher --- */}
            <div className="flex items-center gap-3">
                
                {/* Badge "Powered by Lambda" - Hiển thị tốt trên cả Mobile và Desktop */}
                <div 
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/40 border border-slate-700/50 rounded-lg hover:bg-slate-800/80 transition-colors cursor-default" 
                    title="Powered by Lambda Engine"
                >
                    <TbLambda className="w-6 h-6 bg-blue-600 rounded-sm" />
                    <span className="text-[10px] font-bold text-slate-400 tracking-tight sm:tracking-wide">
                        Powered by <span className="text-[12px] text-blue-600">Lambda</span>
                    </span>
                </div>

                {/* Dải phân cách mỏng */}
                <div className="w-[1px] h-5 bg-slate-700/50 mx-1"></div>

                {/* Bộ chuyển đổi Ngôn ngữ VN/EN */}
                <button
                    onClick={toggleLanguage}
                    className="flex items-center justify-center bg-slate-800 border border-slate-700 hover:border-blue-500/50 px-3 py-1.5 rounded-lg transition-all active:scale-95 group"
                >
                    <span className="text-xs font-black text-slate-300 group-hover:text-blue-400">
                        {i18n.language === 'vi' ? 'VN' : 'EN'}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default TopSystemBar;