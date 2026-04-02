import React from 'react';
import { useTranslation } from 'react-i18next';

const DashboardStats = () => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
      <DashboardCard title={t('dashboard.totalJobs')} value="12" color="blue" />
      <DashboardCard title={t('dashboard.efficiency')} value="87%" color="green" />
      <DashboardCard title={t('dashboard.defects')} value="3" color="red" />
      <DashboardCard title={t('dashboard.pending')} value="5" color="orange" />
    </div>
  );
};

const DashboardCard = ({ title, value, color }) => {
  const gradients = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400",
    green: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400",
    red: "from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400",
    orange: "from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400",
  };
  
  return (
    <div className={`bg-gradient-to-br ${gradients[color].split(" ")[0]} ${gradients[color].split(" ")[1]} 
      bg-slate-800 rounded-2xl p-6 border ${gradients[color].split(" ")[2]} 
      shadow-xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 cursor-default`}>
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-colors"></div>
      <h3 className={`text-sm font-bold uppercase tracking-wider ${gradients[color].split(" ").pop()}`}>{title}</h3>
      <p className="text-4xl font-black text-white mt-3 tracking-tight">{value}</p>
      <div className="mt-4 h-1 w-full bg-slate-700/50 rounded-full overflow-hidden">
         <div className={`h-full w-2/3 ${color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-emerald-500' : color === 'red' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
      </div>
    </div>
  )
}

export default DashboardStats;