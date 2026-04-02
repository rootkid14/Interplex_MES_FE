import React from 'react';
import { useTranslation } from 'react-i18next';
import DashboardStats from './DashboardStats'; // Your existing component (rename the file if you want, or just import it)
import ActiveJobsTable from './ActiveJobsTable'; // The new table

const DashboardView = () => {
  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto">
      
      {/* 1. TOP STATS CARDS */}
      <div className="shrink-0">
         <DashboardStats /> 
      </div>

      {/* 2. ACTIVE JOBS & NOTIFICATIONS */}
      <div className="flex-1 min-h-[300px]">
          <ActiveJobsTable />
      </div>

    </div>
  );
};

export default DashboardView;