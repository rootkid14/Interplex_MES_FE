import React, { useState } from 'react';
import { Play, Loader2, BarChart2, PieChart, TrendingUp, Settings2, Save, X, LayoutDashboard, PlusCircle, SplitSquareVertical } from 'lucide-react';
import { useDBEngineStore } from '../../../store/DatabaseEngineStore';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1', '#ec4899', '#14b8a6'];

const SavePresetModal = ({ onClose, onSave, isSaving }) => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4 uppercase tracking-wider flex items-center gap-2"><Save size={20} className="text-emerald-500"/> Lưu cấu hình Biểu đồ</h3>
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tên Tool phân tích</label>
                        <input value={name} onChange={e=>setName(e.target.value)} placeholder="VD: Báo cáo Lỗi theo Trạm" className="w-full bg-slate-950 border border-slate-700 text-white rounded p-2 text-sm outline-none focus:border-emerald-500"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Mô tả mục đích</label>
                        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Dùng để xem..." className="w-full bg-slate-950 border border-slate-700 text-white rounded p-2 text-sm outline-none focus:border-emerald-500" rows={2}/>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm">Hủy</button>
                    <button onClick={() => {onSave({name, description: desc}); onClose();}} disabled={!name || isSaving} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow font-bold text-sm flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} LƯU TOOL
                    </button>
                </div>
            </div>
        </div>
    );
};

const PlotEngineView = () => {
    const store = useDBEngineStore();
    const [activePresetId, setActivePresetId] = useState(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    
    const numericColumns = store.schema.filter(c => ['number', 'REAL', 'INTEGER', 'decimal'].includes(c.type));
    const allColumns = store.schema;

    const loadSavedPreset = (preset) => {
        setActivePresetId(preset.ID);
        store.updatePlotConfig({
            chartType: preset.ChartType,
            xAxis: preset.XAxis,
            yAxis: preset.YAxis || '',
            aggregation: preset.Aggregation,
            breakdown: preset.BreakdownColumn || '',
            timeGrain: preset.TimeGrain || 'day'
        });
        setTimeout(() => store.executePlotQuery(), 50);
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            {showSaveModal && <SavePresetModal isSaving={store.isSavingPreset} onClose={() => setShowSaveModal(false)} onSave={store.saveNewPreset} />}

            {/* CỘT CONFIG BIỂU ĐỒ (400px) */}
            <div className="w-[400px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 shadow-[10px_0_15px_-3px_rgba(0,0,0,0.3)] z-10">
                
                {/* 1. KHU VỰC TOOL ĐÃ LƯU */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2"><LayoutDashboard size={16}/> Saved Dashboards</label>
                    </div>
                    
                    {store.savedPresets.length === 0 ? (
                        <div className="text-center p-4 border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs italic mb-6">Chưa có Tool nào được lưu cho bảng này.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 mb-6">
                            {store.savedPresets.map(preset => (
                                <button key={preset.ID} onClick={() => loadSavedPreset(preset)} className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${activePresetId === preset.ID ? 'bg-emerald-600/20 border-emerald-500 ring-1 ring-emerald-500/50' : 'bg-slate-950 border-slate-700 hover:border-slate-500'}`}>
                                    <BarChart2 size={18} className={activePresetId === preset.ID ? 'text-emerald-400 mt-0.5' : 'text-slate-500 mt-0.5'}/>
                                    <div>
                                        <h3 className={`text-xs font-bold ${activePresetId === preset.ID ? 'text-emerald-400' : 'text-slate-300'}`}>{preset.PresetName}</h3>
                                        {preset.Description && <p className="text-[10px] text-slate-500 mt-1 truncate">{preset.Description}</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    <hr className="border-slate-800 mb-6" />

                    {/* 2. KHU VỰC CUSTOM CONFIG (Chỉnh tay) */}
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Settings2 size={16}/> Custom Builder</label>
                        <button onClick={() => setShowSaveModal(true)} disabled={!store.plotConfig.xAxis || store.plotData.length===0} className="text-[10px] bg-slate-800 hover:bg-emerald-600 text-white px-2 py-1 rounded font-bold transition-colors disabled:opacity-30">LƯU TOOL</button>
                    </div>

                    <div className="space-y-4">
                        {/* CHART TYPE */}
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
                            {['bar', 'line', 'pie'].map(type => (
                                <button key={type} onClick={() => {setActivePresetId(null); store.updatePlotConfig({ chartType: type });}} className={`flex-1 py-1.5 flex justify-center items-center gap-2 rounded text-xs font-bold uppercase transition-all ${store.plotConfig.chartType === type ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                                    {type==='bar'?<BarChart2 size={14}/> : type==='line'?<TrendingUp size={14}/> : <PieChart size={14}/>} {type}
                                </button>
                            ))}
                        </div>

                        {/* X-AXIS */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">X-Axis (Phân nhóm)</label>
                            <select value={store.plotConfig.xAxis} onChange={e => {setActivePresetId(null); store.updatePlotConfig({ xAxis: e.target.value });}} className="w-full bg-slate-950 border border-slate-700 text-blue-300 font-bold text-sm rounded px-3 py-2 outline-none">
                                <option value="">-- Chọn cột --</option>
                                {allColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Y-AXIS */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Y-Axis (Đo lường)</label>
                            <div className="flex gap-2">
                                <select value={store.plotConfig.aggregation} onChange={e => {setActivePresetId(null); store.updatePlotConfig({ aggregation: e.target.value });}} className="bg-slate-800 border border-slate-700 text-amber-400 font-black text-xs rounded px-2 outline-none w-[80px] text-center">
                                    <option value="SUM">SUM</option><option value="COUNT">COUNT</option><option value="AVG">AVG</option>
                                </select>
                                <select value={store.plotConfig.yAxis} onChange={e => {setActivePresetId(null); store.updatePlotConfig({ yAxis: e.target.value });}} disabled={store.plotConfig.aggregation === 'COUNT'} className="flex-1 bg-slate-950 border border-slate-700 text-amber-500 font-bold text-sm rounded px-3 py-2 outline-none disabled:opacity-30">
                                    <option value="">-- Cột giá trị --</option>
                                    {numericColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* BREAKDOWN / LEGEND */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><SplitSquareVertical size={12}/> Legend (Tách nhóm màu)</label>
                            <select value={store.plotConfig.breakdown} onChange={e => {setActivePresetId(null); store.updatePlotConfig({ breakdown: e.target.value });}} disabled={store.plotConfig.chartType === 'pie'} className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-bold text-sm rounded px-3 py-2 outline-none disabled:opacity-30">
                                <option value="">-- Không chẻ dữ liệu --</option>
                                {allColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
                    <button onClick={store.executePlotQuery} disabled={store.isPlotLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                        {store.isPlotLoading ? <Loader2 size={18} className="animate-spin"/> : <Play size={18}/>} 
                        {store.isPlotLoading ? 'PLOTTING...' : 'RENDER CHART'}
                    </button>
                </div>
            </div>

            {/* VÙNG HIỂN THỊ CHÍNH (CANVAS) */}
            <div className="flex-1 bg-slate-950 flex flex-col min-w-0 p-6">
                {store.plotData.length === 0 ? (
                    <div className="flex-1 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600">
                        <BarChart2 size={80} className="mb-4 opacity-50"/>
                        <p className="text-sm">Config the Plot Settings and click Render.</p>
                    </div>
                ) : (
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col relative">
                        {store.isPlotLoading && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
                                <Loader2 size={40} className="animate-spin text-emerald-500" />
                            </div>
                        )}
                        <h2 className="text-lg font-black text-white text-center mb-6 uppercase tracking-wider">
                            {store.plotConfig.aggregation} {store.plotConfig.aggregation!=='COUNT' && `of ${store.plotConfig.yAxis}`} by {store.plotConfig.xAxis} {store.plotConfig.breakdown && `(split by ${store.plotConfig.breakdown})`}
                        </h2>
                        
                        <div className="flex-1 min-h-0 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {store.plotConfig.chartType === 'bar' ? (
                                    <BarChart data={store.plotData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} angle={-45} textAnchor="end" />
                                        <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} />
                                        <ChartTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px'}} cursor={{fill: '#1e293b'}} />
                                        {store.plotConfig.breakdown && <Legend />}
                                        {/* TỰ ĐỘNG RENDER RA NHIỀU CỘT DỰA VÀO PLOT_KEYS */}
                                        {store.plotKeys.map((key, i) => (
                                            <Bar key={key} dataKey={key} stackId={store.plotConfig.breakdown ? "a" : undefined} fill={COLORS[i % COLORS.length]} radius={store.plotConfig.breakdown ? 0 : [4,4,0,0]} />
                                        ))}
                                    </BarChart>
                                ) : store.plotConfig.chartType === 'line' ? (
                                    <LineChart data={store.plotData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} angle={-45} textAnchor="end" />
                                        <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} />
                                        <ChartTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px'}} />
                                        {store.plotConfig.breakdown && <Legend />}
                                        {store.plotKeys.map((key, i) => (
                                            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{r: 4, fill: COLORS[i % COLORS.length], stroke: '#022c22', strokeWidth: 2}} />
                                        ))}
                                    </LineChart>
                                ) : (
                                    <RechartsPie>
                                        <Pie data={store.plotData} dataKey={store.plotKeys[0]} nameKey="name" cx="50%" cy="50%" outerRadius="80%" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {store.plotData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <ChartTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px'}} />
                                        <Legend wrapperStyle={{paddingTop: '20px'}}/>
                                    </RechartsPie>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlotEngineView;