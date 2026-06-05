import React from 'react';

const Footer = () => (
  <footer className="site-footer" id="contact">
    <div className="container">
      <div className="footer-grid">

        {/* Col 1: Brand */}
        <div className="footer-col">
          <div className="footer-logo">
            <img src="/logo.png" alt="Lekha Script Logo" />
          </div>
          <p className="footer-tagline text-body-md">
            Elevating your everyday with premium lingerie and quiet luxury.
          </p>
          <div className="footer-socials">
            <a href="#" aria-label="Instagram">
              <span className="material-symbols-outlined">camera_alt</span>
            </a>
            <a href="#" aria-label="Facebook">
              <span className="material-symbols-outlined">thumb_up</span>
            </a>
          </div>
        </div>

        {/* Col 2: Visit Us */}
        <div className="footer-col">
          <h4 className="footer-heading">Visit Us</h4>
          <address className="footer-address">
            <div className="row">
              <span className="material-symbols-outlined">location_on</span>
              <span>Near PC Junction<br />Main Road<br />Kerala 680001</span>
            </div>
            <a href="https://www.google.com/maps/dir//Lekha+Script+Ladies+Inner+Wear+Shop,+PC+Junction,+near+Traffic+Signal,+Mukkam,+Kerala+673602/@11.3153153,75.9997877,14z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3ba641841d1b0abd:0x492d811fbd375941!2m2!1d75.9952921!2d11.3210311?entry=ttu&g_ep=EgoyMDI2MDYwMS4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer">
              View on Google Maps
            </a>
          </address>
        </div>

        {/* Col 3: Contact & Hours */}
        <div className="footer-col">
          <h4 className="footer-heading">Contact &amp; Hours</h4>
          <div className="footer-contact">
            <div className="row">
              <span className="material-symbols-outlined">call</span>
              <a href="tel:+919745298723">+91 97452 98723</a>
            </div>
            <div className="row">
              <span className="material-symbols-outlined">schedule</span>
              <span>Mon – Sat: 10:00 AM – 8:00 PM<br />Sunday: Closed</span>
            </div>
          </div>
        </div>

        {/* Col 4: Customer Care */}
        <div className="footer-col">
          <h4 className="footer-heading">Customer Care</h4>
          <nav className="footer-nav">
            <a href="#">Privacy Policy</a>
            <a href="#">Shipping Info</a>
            <a href="#">Store Locator</a>
            <a href="#">Terms of Service</a>
          </nav>
        </div>

      </div>
    </div>

    <div className="footer-bottom">
      <p>© 2024 Lekha Script – Inner Concepts. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;
