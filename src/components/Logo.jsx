import React from 'react';
import logoImage from '../assets/logo.png'; 

const Logo = ({ className }) => {
  return (
    <div className={`flex justify-center ${className}`}>
      <img 
        src={logoImage} 
        alt="Interplex Logo" 
        className="h-24 w-auto object-contain" 
      />
    </div>
  );
};

export default Logo;