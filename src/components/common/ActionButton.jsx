export const ActionButton = ({ label, color, icon, className = "", onClick }) => {
    // 1. Cấu trúc màu: Dùng gradient hoặc màu đậm hơn kết hợp với border glow
    const colors = {
        default: "bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300 hover:text-white",
        blue: "bg-blue-900/40 hover:bg-blue-600/40 border-blue-500/50 text-blue-400 hover:text-blue-100",
        red: "bg-rose-900/40 hover:bg-rose-600/40 border-rose-500/50 text-rose-400 hover:text-rose-100",
        emerald: "bg-emerald-900/40 hover:bg-emerald-600/40 border-emerald-500/50 text-emerald-400 hover:text-emerald-100",
        orange: "bg-amber-900/40 hover:bg-amber-600/40 border-amber-500/50 text-amber-400 hover:text-amber-100",
        indigo: "bg-indigo-900/40 hover:bg-indigo-600/40 border-indigo-500/50 text-indigo-300 hover:text-indigo-100"
    };

    return (
        <button 
            onClick={onClick}
            // 2. Thêm shadow-glow và tinh chỉnh border để tạo cảm giác "nút bấm máy móc"
            className={`${colors[color] || colors.default} ${className} 
                px-4 py-2 rounded-lg border shadow-sm backdrop-blur-sm
                font-semibold text-xs sm:text-sm flex justify-center items-center gap-2 
                transition-all duration-200 active:scale-95 active:shadow-inner
                hover:shadow-md hover:shadow-black/20`}
        >
            {icon}
            {label}
        </button>
    )
}