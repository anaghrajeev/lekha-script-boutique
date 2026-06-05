import React from 'react';

const AboutSection = () => (
  <section className="about-section" id="about">
    <div className="container">
      <div className="about-grid">
        <div className="about-text">
          <h2 className="text-display-lg">A Boutique Experience Near You</h2>
          <p className="body-lg text-body-lg">
            Located near the bustling PC Junction, Lekha Script is your serene sanctuary for finding
            the perfect fit. We believe that lingerie is the foundation of confidence, and our curated
            selection from top brands ensures you never have to compromise between comfort and elegance.
          </p>
          <p className="body-md text-body-md">
            Our experienced staff provides personalized fittings in a discreet, welcoming environment
            designed with the quiet luxury you deserve.
          </p>
          <a href="https://www.google.com/maps/dir//Lekha+Script+Ladies+Inner+Wear+Shop,+PC+Junction,+near+Traffic+Signal,+Mukkam,+Kerala+673602/@11.3153153,75.9997877,14z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3ba641841d1b0abd:0x492d811fbd375941!2m2!1d75.9952921!2d11.3210311?entry=ttu&g_ep=EgoyMDI2MDYwMS4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" className="about-link">
            Get Directions <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
          </a>
        </div>

        <div className="about-image" style={{ aspectRatio: '4/3' }}>
          <img
            src="/bq.png"
            alt="Lekha Script Boutique Interior"
          />
        </div>
      </div>
    </div>
  </section>
);

export default AboutSection;
