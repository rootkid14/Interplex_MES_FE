import React from 'react';
import { X, Package, Clock, AlertCircle } from 'lucide-react';

const MaterialRequestModal = ({ job, onClose }) => {
  // MOCK DATA: Later this will come from an API endpoint like /jobs/{id}/materials
  const mockMaterials = [
    { code: 'MAT-RES-001', name: 'Resistor 10k', qty: 500, status: 'Urgent' },
    { code: 'MAT-CAP-220', name: 'Capacitor 220uF', qty: 200, status: 'Pending' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-600/20 p-2 rounded-lg text-amber-400">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">Material Request</h3>
                        <p className="text-xs text-slate-400 font-mono">For: {job.Job_No}</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-full hover:bg-slate-700">
                    <X size={20} />
                </button>
            </div>

            {/* List */}
            <div className="p-4 space-y-2">
                {mockMaterials.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-3">
                            <Package size={16} className="text-slate-500"/>
                            <div>
                                <div className="text-sm font-bold text-slate-200">{item.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-sm font-bold text-white">{item.qty} pcs</div>
                             <span className="text-[10px] text-amber-400 font-bold uppercase">{item.status}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Action */}
            <div className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
                 <button onClick={onClose} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 text-xs font-bold">Cancel</button>
                 <button className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-xs font-bold">Acknowledge (Deliver)</button>
            </div>
        </div>
    </div>
  );
};

export default MaterialRequestModal;