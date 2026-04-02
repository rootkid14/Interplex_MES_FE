import React, { useState } from "react";

export const BoxContentExpandable = ({ 
  title, 
  variant = "default", 
  defaultOpen = false,
  BoxTotal = 0, 
  BoxQty = 0,  
  children 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Cấu hình 4 biến màu hài hòa cho giao diện Dark Theme
  const colorSchemes = {
    default: {
      header: "bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-100",
      body: "bg-slate-800/50 border-slate-600 text-slate-200"
    },
    orange: {
      header: "bg-amber-600/90 hover:bg-amber-500 border-amber-500 text-white shadow-amber-900/30",
      body: "bg-slate-800/80 border-amber-500/40 text-slate-200"
    }
  };

  const activeColor = colorSchemes[variant] || colorSchemes.default;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        // Flex justify-between để dàn trải 3 phần tử
        className={`w-full px-6 py-3 flex justify-between items-center transition-all duration-200 border shadow-md font-medium tracking-wide
          ${activeColor.header} 
          ${isOpen ? 'rounded-t-2xl border-b-0' : 'rounded-full'}
        `}
      >
        {/* Cột 1: Tiêu đề (Căn trái) */}
        <span className="flex-1 text-left">{title}</span>
        
        {/* Cột 2: Thông số (Căn giữa) */}
        <div className="flex-1 text-center font-bold tracking-widest bg-black/10 rounded-full px-3 py-0.5 max-w-fit mx-auto">
            <span>{BoxQty} / {BoxTotal}</span>
        </div>

        {/* Cột 3: Nút đóng/mở (Căn phải) */}
        <span className="flex-1 text-right text-xl font-light">{isOpen ? '−' : '+'}</span>
      </button>
      
      {isOpen && (
        <div className={`p-6 border border-t-0 rounded-b-2xl ${activeColor.body}`}>
          {children}
        </div>
      )}
    </div>
  );
};