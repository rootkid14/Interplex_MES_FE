import React from "react";

export const ActionButton = ({ label, color, icon, className = "", onClick }) => {
    const colors = {
        default: "bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-100",
        blue: "bg-blue-600 hover:bg-blue-500 border-blue-400",
        red: "bg-rose-600 hover:bg-rose-500 border-rose-400",
        emerald: "bg-emerald-600 hover:bg-emerald-500 border-emerald-400"
    };

    return (
        <button 
            onClick={onClick}
            className={`${colors[color] || colors.default} ${className} text-white px-3 py-2.5 rounded-lg border-b-4 active:border-b-0 active:translate-y-1 font-bold text-xs sm:text-sm flex justify-center items-center gap-2 transition-all shadow-lg whitespace-nowrap`}
        >
            {icon}
            {label}
        </button>
    )
}