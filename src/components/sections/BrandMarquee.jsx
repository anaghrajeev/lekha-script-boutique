import React from 'react';

const brands = ['Jockey', 'Amante', 'Van Heusen', 'V-Star', 'Bodycare', 'Trylo', 'Blossom'];

const MarqueeStrip = () => (
  <div className="marquee-strip">
    {brands.map((brand, i) => (
      <React.Fragment key={i}>
        <span className="brand-name">{brand}</span>
        {i < brands.length - 1 && <span className="dot">•</span>}
      </React.Fragment>
    ))}
  </div>
);

const BrandMarquee = () => (
  <section className="marquee-section">
    <div className="container">
      <p className="marquee-label">Curating the finest brands</p>
    </div>
    <div className="marquee-track">
      <MarqueeStrip />
      <MarqueeStrip />
    </div>
  </section>
);

export default BrandMarquee;
