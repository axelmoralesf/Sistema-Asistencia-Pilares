import React from 'react';
import './Footer.css';
import logo_f from '../../styles/Logo.png';
import logo_cdmx_f from '../../styles/logo_cdmx.png';
import logo_gob from '../../styles/Gob.png';

const Footer = () => {
  return (
    <footer className="pilares-footer">
      <div className="footer-container">
        <div className="footer-logo">
          <img
            src={logo_f}
            alt="PILARES"
            className="logo_f"
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
