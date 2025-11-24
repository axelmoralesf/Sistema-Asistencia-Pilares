import React from 'react';
import './Header.css';
import logo from '../../styles/Logo.png';

const Header = () => {
  return (
    <header className="pilares-header">
      <div className="header-container">
        <div className="pilares-logo">
          <img
            src={logo}
            alt="PILARES"
            className="logo"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
