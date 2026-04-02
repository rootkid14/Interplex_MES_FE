import React from 'react';
import { AlertCircle } from 'lucide-react';

const LoginError = ({ message }) => {
  if (!message) return null;

  return (
    <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm border border-red-200 animate-bounce">
      <AlertCircle size={16} className="mr-2" />
      {message}
    </div>
  );
};

export default LoginError;