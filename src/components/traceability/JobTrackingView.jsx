import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, ListFilter, ChevronLeft, ChevronRight, Loader2, Eye, X, Package } from 'lucide-react';
import { jobApi } from '../../api/jobApi'; 

const JobTrackingView = () => {
  const { t } = useTranslation();

  // --- 1. STATE MANAGEMENT ---
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // New State for the Modal
  const [selectedJob, setSelectedJob] = useState(null); 

  const [filters, setFilters] = useState({
    jobNo: '',
    batch: '',
    status: '',
    date: ''
  });

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50; 

  // --- 2. API CALL FUNCTION ---
  const fetchJobs = async (isNewSearch = false) => {
    setLoading(true);
    try {
      const currentPage = isNewSearch ? 1 : page;
      const result = await jobApi.getJobs({
        page: currentPage,
        limit: PAGE_SIZE,
        jobNo: filters.jobNo,
        batchId: filters.batch,
        status: filters.status,
        date: filters.date
      });

      setJobs(result.data); 
      setTotalRecords(result.total);
      if (isNewSearch) setPage(1);

    } catch (error) {
      console.error("Failed to load jobs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchClick = () => {
    setPage(1);
    if (page === 1) fetchJobs(true);
  };

  const handlePageChange = (newPage) => {
    const maxPage = Math.ceil(totalRecords / PAGE_SIZE) || 1;
    if (newPage >= 1 && newPage <= maxPage) {
      setPage(newPage);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in-up relative">
      
      {/* 1. SEARCH FILTER BAR (Kept same as before) */}
      <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700 shadow-lg mb-4 sm:mb-6">
         <div className="flex flex-col lg:flex-row gap-3">
            <div className="text-slate-400 font-bold flex items-center gap-2 mb-1 lg:mb-0">
                <Filter size={16}/> <span className="hidden sm:inline">{t('production.search')}</span>
            </div>
            
            <div className="grid grid-cols-2 lg:flex gap-2 flex-1">
                <FilterInput placeholder={t('production.jobNo')} value={filters.jobNo} onChange={(e) => setFilters({...filters, jobNo: e.target.value})}/>
                <div className="relative w-full">
                    <input type="datetime-local" className="w-full bg-slate-900 border border-slate-600 text-white pl-2 sm:pl-3 pr-2 py-2 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-500"
                        value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value})}/>
                </div>
                <div className="relative w-full">
                    <select className="w-full bg-slate-900 border border-slate-600 text-white pl-2 sm:pl-3 pr-8 py-2 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                        value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
                        <option value="">{t('production.status')} (All)</option>
                        <option value="InProgress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Pending">Pending</option>
                    </select>
                    <div className="absolute right-2 top-2.5 text-slate-500 pointer-events-none hidden sm:block"><ListFilter size={14} /></div>
                </div>
                <FilterInput placeholder={t('production.batch')} value={filters.batch} onChange={(e) => setFilters({...filters, batch: e.target.value})}/>
            </div>

            <button onClick={handleSearchClick} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-lg shadow-lg transition-all active:scale-95 flex justify-center items-center mt-1 lg:mt-0 disabled:opacity-50">
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                <span className="lg:hidden ml-2 font-bold">Search</span>
            </button>
         </div>
      </div>

      {/* 2. DATA TABLE */}
      <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col min-h-0">
         <div className="p-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-300 text-sm">Master WO Log</h3>
            <span className="text-xs text-slate-500 font-mono">Total: {totalRecords}</span>
         </div>
         
         <div className="overflow-auto flex-1 w-full">
            <table className="w-full text-left border-collapse min-w-[800px]"> 
                <thead className="bg-slate-900 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <Th>WO</Th>
                        <Th>Time</Th>
                        {/* CHANGED COLUMN HEADER */}
                        <Th className="text-center">Batches</Th> 
                        <Th>Proc</Th>
                        <Th>OK</Th>
                        <Th>NG</Th>
                        <Th>Tgt</Th>
                        <Th>Status</Th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {loading && jobs.length === 0 ? (
                        <tr><td colSpan="8" className="p-8 text-center text-slate-500">Loading data...</td></tr>
                    ) : jobs.length === 0 ? (
                         <tr><td colSpan="8" className="p-8 text-center text-slate-500">No jobs found</td></tr>
                    ) : (
                        jobs.map((row) => (
                            <tr key={row.Job_ID || row.Job_No} className="hover:bg-slate-700/50 transition-colors">
                                <Td className="font-bold text-blue-400">{row.Job_No}</Td>
                                <Td className="text-slate-400 text-xs font-mono">
                                    {row.Created_At ? new Date(row.Created_At).toLocaleString() : '-'}
                                </Td>
                                
                                {/* --- NEW VIEW BUTTON COLUMN --- */}
                                <Td className="text-center">
                                    <button 
                                        onClick={() => setSelectedJob(row)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-blue-400 text-xs rounded border border-slate-600 transition-colors"
                                    >
                                        <Eye size={14} />
                                        <span className="font-medium">View</span>
                                    </button>
                                </Td>

                                <Td>{row.Processed_Qty}</Td>
                                <Td className="text-emerald-400">{row.OK_Qty}</Td>
                                <Td className={row.NG_Qty > 0 ? "text-rose-400 font-bold" : "text-slate-500"}>{row.NG_Qty}</Td>
                                <Td>{row.Target_Qty}</Td>
                                <Td>
                                    <StatusBadge status={row.Status} />
                                </Td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>

         {/* PAGINATION FOOTER */}
         <div className="p-2 border-t border-slate-700 bg-slate-900 flex justify-between items-center">
            <button onClick={() => handlePageChange(page - 1)} disabled={page === 1 || loading} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 disabled:opacity-30 transition-colors">
                <ChevronLeft size={20} />
            </button>
            <span className="text-xs text-slate-400 font-mono">Page {page} of {Math.ceil(totalRecords / PAGE_SIZE) || 1}</span>
            <button onClick={() => handlePageChange(page + 1)} disabled={page >= Math.ceil(totalRecords / PAGE_SIZE) || loading} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 disabled:opacity-30 transition-colors">
                <ChevronRight size={20} />
            </button>
         </div>

      </div>

      {/* --- 3. BATCH DETAIL MODAL --- */}
      {selectedJob && (
        <BatchDetailModal 
            job={selectedJob} 
            onClose={() => setSelectedJob(null)} 
        />
      )}

    </div>
  );
};

// --- NEW SUB-COMPONENT: BATCH DETAIL MODAL ---
const BatchDetailModal = ({ job, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                
                {/* Header */}
                <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
                            <Package size={20} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Batch Details</h3>
                            <p className="text-xs text-slate-400 font-mono">{job.Job_No}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-full hover:bg-slate-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {(!job.batches || job.batches.length === 0) ? (
                        <div className="text-center text-slate-500 py-8 text-sm">
                            No batches recorded for this job.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {job.batches.map((batch, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-white font-medium">{batch.Batch_ID}</span>
                                        <span className="text-[10px] text-slate-500">
                                            Imported: {batch.Input_Time ? new Date(batch.Input_Time).toLocaleString() : '-'}
                                        </span>
                                    </div>
                                    <div className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                                        ID: {batch.Link_ID}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-3 bg-slate-900 border-t border-slate-700 text-center">
                     <span className="text-[10px] text-slate-500">Total Batches: {job.batches ? job.batches.length : 0}</span>
                </div>
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS (Same as before) ---
const FilterInput = ({ placeholder, icon, value, onChange }) => (
    <div className="relative w-full">
        <input type="text" placeholder={placeholder} value={value} onChange={onChange} className="w-full bg-slate-900 border border-slate-600 text-white pl-2 sm:pl-3 pr-8 py-2 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-500 truncate"/>
        {icon && <div className="absolute right-2 top-2.5 text-slate-500 pointer-events-none hidden sm:block">{icon}</div>}
    </div>
);
const Th = ({ children, className }) => (<th className={`p-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${className}`}>{children}</th>);
const Td = ({ children, className }) => (<td className={`p-3 text-xs sm:text-sm text-slate-300 ${className}`}>{children}</td>);
const StatusBadge = ({ status }) => {
    const normalizedStatus = status ? status.toLowerCase() : '';
    let colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (normalizedStatus === 'completed') colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    else if (normalizedStatus === 'pending') colorClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    return (<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${colorClass}`}>{status}</span>)
}

export default JobTrackingView;