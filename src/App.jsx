import React from "react"
import LoginScreen from "./pages/LoginScreen"
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useProductionStore from "./store/productionStore";
import WorkStation from "./pages/WorkStation"
import ModelConfig from './pages/ModelConfig';
import AccountManager from './components/login/AccountManager'
import { useGlobalSSE } from './hooks/useGlobalSSE';

function App() {
  const { isAuthenticated } = useProductionStore();
  useGlobalSSE();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          isAuthenticated ? 
          <Navigate to="/workstation"/> : <Navigate to="/login"/>
        }/>

      <Route path="/login" element={<LoginScreen/>} />

      <Route path="/workstation" element={
        isAuthenticated ? 
        <WorkStation/> : <Navigate to="/login" />
      } />
      
      <Route path="/workstation" element={<WorkStation/>} />
          
       <Route path="/model-config" element={<ModelConfig />} />

       <Route path="/accounts" element={<AccountManager />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App
