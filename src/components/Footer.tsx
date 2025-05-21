import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-100 py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="text-center" style={{ color: '#6B7280' }}>
          <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()} TaskMe</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 