import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useProductionStore from "./store/productionStore";
import { useGlobalSSE } from './hooks/useGlobalSSE';
import useAuthStore from "./store/AuthStore";

// Import các trang (Pages/Components)
import LoginScreen from "./pages/LoginScreen";
import WorkStation from "./pages/WorkStation";
import ModelConfig from './pages/ModelConfig';
import AccountManager from './components/login/AccountManager';
import DefectCodeRegistration from "./pages/DefectCodeRegistration";
import BomConfig from "./pages/BomConfig"
import DatabaseEnginePage from "./pages/DatabaseEngine";

const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  useGlobalSSE();

  return (
    <BrowserRouter>
      <Routes>
        
        {/* 1. ĐƯỜNG DẪN GỐC (ROOT) */}

        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/workstation" : "/login"} replace />} 
        />

        {/* 2. ĐƯỜNG DẪN CÔNG KHAI (PUBLIC) */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/workstation" replace /> : <LoginScreen />} 
        />

        {/* 3. CÁC ĐƯỜNG DẪN CẦN BẢO VỆ (PRIVATE ROUTES) */}
        <Route 
          path="/workstation" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <WorkStation />
            </ProtectedRoute>
          } 
        />
          
        {/* <Route 
          path="/model-config" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ModelConfig />
            </ProtectedRoute>
          } 
        /> */}

        <Route 
          path="/accounts" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AccountManager />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/defects" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DefectCodeRegistration />
            </ProtectedRoute>
          } 
        />

        <Route
          path="/model-config"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <BomConfig/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dbengine"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DatabaseEnginePage/>
            </ProtectedRoute>
          }
        />

        {/* CATCH ALL: Bắt các đường dẫn không tồn tại (404) */}
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;