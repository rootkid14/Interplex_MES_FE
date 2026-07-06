import React, { useState } from "react";
import { ChevronDown } from "lucide-react"; // Dùng icon thay cho dấu +/- sẽ chuyên nghiệp hơn

export const ExpandableSection = ({ 
  title, 
  variant = "default", 
  defaultOpen = false, 
  children 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorSchemes = {
    default: {
      header: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/50",
      body: "bg-slate-900/40 border-slate-700 text-slate-400"
    },
    blue: {
      header: "bg-blue-900/20 border-blue-500/30 text-blue-400 hover:bg-blue-900/40",
      body: "bg-slate-900/60 border-blue-500/20 text-slate-300"
    },
    green: {
      header: "bg-emerald-900/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40",
      body: "bg-slate-900/60 border-emerald-500/20 text-slate-300"
    },
    warning: {
      header: "bg-amber-900/20 border-amber-500/30 text-amber-400 hover:bg-amber-900/40",
      body: "bg-slate-900/60 border-amber-500/20 text-slate-300"
    }
  };

  const activeColor = colorSchemes[variant] || colorSchemes.default;

  return (
    <div className="mb-3 transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-3 flex justify-between items-center transition-all duration-300 border backdrop-blur-sm
          ${activeColor.header} 
          ${isOpen ? 'rounded-t-xl border-b-0' : 'rounded-xl'}
        `}
      >
        <span className="font-bold text-sm tracking-wide uppercase">{title}</span>
        {/* Sử dụng icon xoay thay vì dấu +/- */}
        <ChevronDown 
            size={18} 
            className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} 
        />
      </button>
      
      {/* Thêm hiệu ứng transition cho phần body */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className={`p-5 border border-t-0 rounded-b-xl ${activeColor.body}`}>
          {children}
        </div>
      </div>
    </div>
  );
};