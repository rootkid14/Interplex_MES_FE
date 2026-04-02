import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellRing, ChevronRight } from 'lucide-react';
import { jobApi } from '../../api/jobApi';
import MaterialRequestModal from './MaterialRequestModel';

const ActiveJobsTable = () => {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for the Modal
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const loadActiveJobs = async () => {
      try {
        // Reuse your API but filter strictly for 'InProgress'
        const result = await jobApi.getJobs({ 
            page: 1, 
            limit: 10, // Only show top 10 urgent jobs
            status: 'InProgress' 
        });
        setJobs(result.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadActiveJobs();
    
    // Optional: Set up an interval to auto-refresh every 30 seconds for the dashboard
    const interval = setInterval(loadActiveJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-full animate-fade-in-up delay-100">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
        <h3 className="font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active Production Monitor
        </h3>
        <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold">
            View All <ChevronRight size={14}/>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase font-bold">
                <tr>
                    <th className="p-3">Job No</th>
                    <th className="p-3">Product</th>
                    <th className="p-3 text-center">Progress</th>
                    <th className="p-3 text-center">Mat. Request</th> {/* The Bell Column */}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-sm">
                {loading ? (
                    <tr><td colSpan="4" className="p-4 text-center text-slate-500">Updating...</td></tr>
                ) : jobs.length === 0 ? (
                    <tr><td colSpan="4" className="p-4 text-center text-slate-500">No active jobs running.</td></tr>
                ) : (
                    jobs.map((job, idx) => {
                        // MOCK LOGIC: Let's pretend even Job IDs have a request pending
                        // Later, your Python backend will send "has_request: true"
                        const hasRequest = idx % 2 === 0; 

                        return (
                            <tr key={job.Job_ID} className="hover:bg-slate-700/30 transition-colors">
                                <td className="p-3 font-bold text-blue-400">{job.Job_No}</td>
                                <td className="p-3 text-slate-300">{job.Part_No || 'N/A'}</td>
                                
                                {/* Progress Bar Column */}
                                <td className="p-3 w-1/3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 rounded-full" 
                                                style={{width: `${(job.Processed_Qty / job.Target_Qty) * 100}%`}}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {Math.round((job.Processed_Qty / job.Target_Qty) * 100)}%
                                        </span>
                                    </div>
                                </td>

                                {/* Notification Bell Column */}
                                <td className="p-3 text-center">
                                    <button 
                                        onClick={() => hasRequest && setSelectedRequest(job)}
                                        className={`p-2 rounded-full transition-all relative ${
                                            hasRequest 
                                            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white animate-pulse-slow' 
                                            : 'text-slate-600 cursor-default'
                                        }`}
                                    >
                                        {hasRequest ? <BellRing size={18} /> : <Bell size={18} />}
                                        
                                        {/* Red Dot for urgent */}
                                        {hasRequest && (
                                            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-800"></span>
                                        )}
                                    </button>
                                </td>
                            </tr>
                        )
                    })
                )}
            </tbody>
          </table>
      </div>

      {/* Render Modal */}
      {selectedRequest && (
          <MaterialRequestModal 
            job={selectedRequest} 
            onClose={() => setSelectedRequest(null)} 
          />
      )}
    </div>
  );
};

export default ActiveJobsTable;