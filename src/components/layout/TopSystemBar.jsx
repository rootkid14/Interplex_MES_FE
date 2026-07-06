import React from 'react';
import { useTranslation } from 'react-i18next';
import { TbLambda } from "react-icons/tb";

const TopSystemBar = () => {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi');
    };

    return (
        // 1. Thêm backdrop-blur và giảm opacity nền để tạo hiệu ứng kính mờ (Glassmorphism)
        <div className="h-16 bg-slate-800/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-50 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.3)]">
            
            {/* --- CỤM BÊN TRÁI: Logo với hiệu ứng Gradient Text --- */}
            <div className="flex items-center gap-4">
                <div className="flex flex-col justify-center">
                    <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-wider text-3xl">
                        INTERPLEX
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        <p className="text-[10px] text-blue-400 font-bold tracking-[0.5em] uppercase">
                            MES
                        </p>
                    </div>
                </div>
            </div>

            {/* --- CỤM BÊN PHẢI: Lambda Badge & Controls --- */}
            <div className="flex items-center gap-4">
                
                {/* Badge "Powered by Lambda" - Hiệu ứng viền sáng nhẹ khi hover */}
                <div className="relative group flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-white/5 rounded-lg transition-all duration-500 hover:border-blue-500/30">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <TbLambda className="w-5 h-5 text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-300">
                        Lambda AGENTIC
                    </span>
                </div>

                <div className="w-[1px] h-6 bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>

                {/* Bộ chuyển đổi Ngôn ngữ - Style "Toggle" chuyên nghiệp */}
                <button
                    onClick={toggleLanguage}
                    className="relative flex items-center bg-slate-900 border border-slate-700 hover:border-blue-500/50 px-4 py-1.5 rounded-lg transition-all active:scale-95 overflow-hidden"
                >
                    <span className="relative z-10 text-[10px] font-black text-slate-400 hover:text-blue-400 transition-colors uppercase">
                        {i18n.language}
                    </span>
                    <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                </button>
            </div>
        </div>
    );
};

export default TopSystemBar;