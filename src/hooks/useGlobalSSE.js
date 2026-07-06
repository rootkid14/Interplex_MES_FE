// src/hooks/useGlobalSSE.js
import { useEffect } from 'react';
import useProductionStore from '../store/productionStore';
import useAuthStore from '../store/AuthStore';

export const useGlobalSSE = () => {
  const setActiveJobs = useProductionStore(state => state.setActiveJobs);
  const setSystemMessages = useProductionStore(state => state.setSystemMessages);
  const setEcnAlerts = useProductionStore(state => state.setEcnAlerts); 
  const setConfigAlerts = useProductionStore(state => state.setConfigAlerts); // <--- Kéo hàm này từ store
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. LUỒNG WORK ORDERS
    const woStreamUrl = `/api/v1/dashboard/stream`;
    const woSource = new EventSource(woStreamUrl);
    woSource.onmessage = (event) => {
      try {
        let parsed = JSON.parse(event.data);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        setActiveJobs(Array.isArray(parsed) ? parsed : []);
      } catch (e) { console.error("WO SSE Parse Error:", e); }
    };

    // 2. LUỒNG MESSAGES
    const msgStreamUrl = `/api/v1/dashboard/messages/stream`;
    const msgSource = new EventSource(msgStreamUrl);
    msgSource.onmessage = (event) => {
      try {
        let parsed = JSON.parse(event.data);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        setSystemMessages(Array.isArray(parsed) ? parsed : []);
      } catch (e) { console.error("Msg SSE Parse Error:", e); }
    };

    // 3. LUỒNG ECN ALERTS
    const ecnStreamUrl = `/api/v1/dashboard/ecn/stream`;
    const ecnSource = new EventSource(ecnStreamUrl);
    ecnSource.onmessage = (event) => {
      try {
        let parsed = JSON.parse(event.data);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        setEcnAlerts(Array.isArray(parsed) ? parsed : []);
      } catch (e) { console.error("ECN SSE Parse Error:", e); }
    };

    // ==========================================
    // 4. LUỒNG CONFIG CHANGES (MỚI THÊM)
    // ==========================================
    const configStreamUrl = `/api/v1/dashboard/config-changes/stream`; // Đảm bảo đúng path với backend
    const configSource = new EventSource(configStreamUrl);
    configSource.onmessage = (event) => {
      try {
        let parsed = JSON.parse(event.data);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        setConfigAlerts(Array.isArray(parsed) ? parsed : []);
      } catch (e) { console.error("Config SSE Parse Error:", e); }
    };

    // Cleanup khi đóng App hoặc Logout
    return () => {
      woSource.close();
      msgSource.close();
      ecnSource.close(); 
      configSource.close(); // <--- Đóng cả luồng Config
    };
  }, [isAuthenticated, setActiveJobs, setSystemMessages, setEcnAlerts, setConfigAlerts]);
};