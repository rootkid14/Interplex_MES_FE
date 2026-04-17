import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Tag } from 'lucide-react';

export const SearchableDefectSelector = ({ codes, selectedCode, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);

    // Lọc tự do theo từ khóa (Mã, Tên Việt, Tên Anh)
    const filteredCodes = codes.filter(c => {
        const lowerSearch = search.toLowerCase();
        return c.Code.toLowerCase().includes(lowerSearch) || 
               c.VietnameseName.toLowerCase().includes(lowerSearch) ||
               (c.EnglishName && c.EnglishName.toLowerCase().includes(lowerSearch));
    });

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedObj = codes.find(c => c.Code === selectedCode);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-slate-900 border ${selectedCode ? 'border-emerald-500/50 text-emerald-300' : 'border-slate-600 text-slate-400'} px-4 py-3 rounded-lg cursor-pointer flex justify-between items-center transition-all`}
            >
                <span className="truncate font-medium">
                    {selectedObj ? `[${selectedObj.Code}] ${selectedObj.VietnameseName}` : "Tìm mã lỗi..."}
                </span>
                <ChevronDown size={18} className="text-slate-500 shrink-0"/>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden animate-fade-in-up">
                    <div className="p-2 border-b border-slate-700 bg-slate-800/80 sticky top-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                            <input 
                                type="text" autoFocus value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Gõ tên hoặc mã lỗi..." 
                                className="w-full bg-slate-900 border border-slate-600 text-white pl-9 pr-3 py-2 rounded-md outline-none focus:border-blue-500 text-sm"
                            />
                        </div>
                    </div>
                    
                    <ul className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {filteredCodes.length === 0 ? (
                            <li className="p-4 text-center text-slate-500 text-sm italic">Không thấy mã lỗi này.</li>
                        ) : (
                            filteredCodes.map(c => (
                                <li 
                                    key={c.ID}
                                    onClick={() => { onSelect(c); setIsOpen(false); setSearch(""); }}
                                    className="p-3 hover:bg-slate-700 rounded-lg cursor-pointer flex justify-between items-center group transition-colors"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-mono font-bold text-rose-400">{c.Code}</span>
                                        <span className="text-slate-200 text-sm">{c.VietnameseName}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-700 group-hover:border-blue-500/50">
                                        <Tag size={12} className="text-blue-400"/>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{c.Station}</span>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};