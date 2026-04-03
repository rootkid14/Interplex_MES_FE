import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardStats from './DashboardStats'; 
import ActiveJobsTable from './ActiveJobsTable'; 

const DashboardView = () => {
  // 1. TẠO TRẠM TRUNG CHUYỂN STATE Ở COMPONENT CHA
  const [totalActiveJobs, setTotalActiveJobs] = useState(0);

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto">
      
      {/* 2. TRUYỀN GIÁ TRỊ XUỐNG CHO BẢNG THỐNG KÊ (STATS) */}
      <div className="shrink-0">
         <DashboardStats totalActiveJobs={totalActiveJobs} /> 
      </div>

      {/* 3. TRUYỀN HÀM SETTER XUỐNG CHO BẢNG CÔNG VIỆC (TABLE) ĐỂ NÓ BÁO CÁO LÊN */}
      <div className="flex-1 min-h-[300px]">
          <ActiveJobsTable setTotalActiveJobs={setTotalActiveJobs} />
      </div>

    </div>
  );
};

export default DashboardView;