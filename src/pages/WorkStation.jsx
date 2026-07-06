import React, { useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import TopSystemBar from "../components/layout/TopSystemBar";
import WorkStationNavbar from "../components/layout/WorkstationNavbar";

import DashboardView from "../components/dashboard/DashboardView";
import ActiveJobView from "../components/production/ActiveJobView";
import TraceabilityView from "../components/traceability/TraceabilityView";
import AllocationView from "../components/production/AllocationView";

const WorkStation = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    // THAY ĐỔI 1: Thêm flex-col vào thẻ bọc ngoài cùng
    <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* 1. TOP SYSTEM BAR NẰM TRÊN CÙNG */}
      <TopSystemBar />

      {/* THAY ĐỔI 2: Thẻ div bọc Sidebar và Main content để chúng nằm ngang dưới TopSystemBar */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 2. LEFT SIDEBAR */}
        <Sidebar 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
        />

        {/* 3. MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
          
          {/* WorkStationNavbar bây giờ là phần tử đầu tiên của main */}
          <WorkStationNavbar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />

          {/* 4. DYNAMIC CONTENT BODY */}
          <div className="flex-1 p-6 overflow-auto relative">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950 pointer-events-none"></div>

            <div className="relative max-w-7xl mx-auto">
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'production' && <ActiveJobView />}
              {activeTab === 'allocation' && <AllocationView />}
              {activeTab === 'traceability' && <TraceabilityView />}

              
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default WorkStation;