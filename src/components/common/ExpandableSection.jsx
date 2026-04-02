import React, { useState } from "react";

export const ExpandableSection = ({ 
  title, 
  variant = "default", // Nhận 4 giá trị: 'default' | 'blue' | 'green' | 'warning'
  defaultOpen = false, 
  children 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Cấu hình 4 biến màu hài hòa cho giao diện Dark Theme
  const colorSchemes = {
    default: {
      header: "bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-100",
      body: "bg-slate-800/50 border-slate-600 text-slate-200"
    },
    blue: {
      header: "bg-blue-400/90 hover:bg-blue-500 border-blue-500 text-white shadow-blue-900/30",
      body: "bg-slate-800/80 border-blue-500/40 text-slate-200"
    },
    green: {
      header: "bg-emerald-600/90 hover:bg-emerald-500 border-emerald-500 text-white shadow-emerald-900/30",
      body: "bg-slate-800/80 border-emerald-500/40 text-slate-200"
    },
    warning: {
      header: "bg-amber-600/90 hover:bg-amber-500 border-amber-500 text-white shadow-amber-900/30",
      body: "bg-slate-800/80 border-amber-500/40 text-slate-200"
    }
  };

  const activeColor = colorSchemes[variant] || colorSchemes.default;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        // Đổi thành flex justify-between để dấu + / - luôn nằm sát mép phải
        className={`w-full px-6 py-3 flex justify-between items-center transition-all duration-200 border shadow-md font-medium tracking-wide
          ${activeColor.header} 
          ${isOpen ? 'rounded-t-2xl border-b-0' : 'rounded-full'}
        `}
      >
        <span>{title}</span>
        <span className="text-xl font-light">{isOpen ? '−' : '+'}</span>
      </button>
      
      {isOpen && (
        <div className={`p-6 border border-t-0 rounded-b-2xl ${activeColor.body}`}>
          {children}
        </div>
      )}
    </div>
  );
};