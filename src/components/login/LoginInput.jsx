import React from 'react';

const LoginInput = ({ label, icon: Icon, type, placeholder, value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-600">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-3 text-gray-400" size={20} />
        
        <input 
          type={type} 
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>
    </div>
  );
};

export default LoginInput;