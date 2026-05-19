import React from 'react';
import logoImage from '../assets/logo.png'; 

// Thêm prop imgClassName để dễ dàng override kích thước ảnh khi cần
const Logo = ({ className = "", imgClassName = "h-24 w-auto object-contain" }) => {
  return (
    <div className={`flex justify-center ${className}`}>
      <img 
        src={logoImage} 
        alt="Interplex Logo" 
        className={imgClassName} 
      />
    </div>
  );
};

export default Logo;