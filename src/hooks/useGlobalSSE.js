// src/hooks/useGlobalSSE.js
import { useEffect } from 'react';
import useProductionStore from '../store/productionStore';
const hostname = window.location.hostname;

export const useGlobalSSE = () => {
  const setActiveJobs = useProductionStore(state => state.setActiveJobs);
  const setSystemMessages = useProductionStore(state => state.setSystemMessages);
  const isAuthenticated = useProductionStore(state => state.isAuthenticated);

  useEffect(() => {
    // Chỉ mở luồng khi đã đăng nhập
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

    // Cleanup khi đóng App hoặc Logout
    return () => {
      woSource.close();
      msgSource.close();
    };
  }, [isAuthenticated, setActiveJobs, setSystemMessages]);
};