import React, { useState, useEffect } from 'react';

const slides = [
  {
    image: '/hero1.png',
    label: 'Quiet Luxury',
    tagline: 'Where elegance meets comfort',
  },
  {
    image: '/hero2.png',
    label: 'Everyday Grace',
    tagline: 'Crafted for your everyday sanctuary',
  },
  {
    image: '/hero3.png',
    label: 'Confident Comfort',
    tagline: 'Premium fit, effortless confidence',
  },
];

const Hero = () => {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % slides.length);
        setFading(false);
      }, 500);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const goTo = (i) => {
    if (i === current) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(i);
      setFading(false);
    }, 400);
  };

  const slide = slides[current];

  return (
    <section className="hero-section" id="home">
      {/* Sliding background image */}
      <img
        key={slide.image}
        className="hero-bg-img"
        src={slide.image}
        alt={slide.label}
        style={{
          opacity: fading ? 0 : 0.55,
          transition: 'opacity 0.5s ease',
          objectPosition: 'top center',
        }}
      />
      <div className="hero-overlay" />

      {/* Split layout: text left, featured image right */}
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="hero-split">

          {/* Left: Text content */}
          <div className="hero-text">
            <span
              className="hero-label"
              style={{
                opacity: fading ? 0 : 1,
                transform: fading ? 'translateY(6px)' : 'translateY(0)',
                transition: 'all 0.45s ease',
              }}
            >
              {slide.label}
            </span>
            <h1
              style={{
                opacity: fading ? 0 : 1,
                transform: fading ? 'translateY(10px)' : 'translateY(0)',
                transition: 'all 0.5s ease 0.05s',
              }}
            >
              Discover Your Perfect Fit at Lekha Script
            </h1>
            <p
              style={{
                opacity: fading ? 0 : 1,
                transform: fading ? 'translateY(8px)' : 'translateY(0)',
                transition: 'all 0.5s ease 0.1s',
              }}
            >
              A curated collection of premium lingerie and activewear, designed for comfort, grace,
              and confidence. Experience quiet luxury every day.
            </p>
            <div
              className="hero-actions"
              style={{
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.5s ease 0.15s',
              }}
            >
              <a href="#collections" className="btn btn-primary">Shop the Collection</a>
              <a
                href="https://wa.me/919745298723"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                Chat with Us
              </a>
            </div>

            {/* Slide dots */}
            <div className="hero-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`hero-dot ${i === current ? 'active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right: Featured portrait image */}
          <div className="hero-portrait-wrap">
            <div
              className="hero-portrait"
              style={{
                opacity: fading ? 0 : 1,
                transform: fading ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.55s ease',
              }}
            >
              <img src={slide.image} alt={slide.label} />
              {/* Floating badge */}
              <div className="hero-badge">
                <span className="hero-badge-icon">✦</span>
                <span>{slide.tagline}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
