import React from 'react';

const products = [
  {
    id: 1,
    name: 'Amante Silk Bralette',
    desc: 'Blush Pink • Intricate Lace',
    price: '₹1,499',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcoHGkQ6NDudP3j5DetlrCnHm-6xS3CbXEkzvYc-PFiWZMyfnJz4vsOYoI91C1RE_kfZ-h1Sv4fUlqsEo0Fd1MdxiNRALL-F2luzQaM4L_mp9YvyO_jWVizf57aaLiQrlPl1KmzCtYlAA-OVCbj1Kkjbg_GUfZGSrOVQvuu0b6fCUHuFw7LbyZxHOXB25gDzBDygjvHMn6z1gsaPiPOb9R4qi6Wc9rA5lpb_37LZEBnHk1ePukmmHoW5PxjuYy68a7Nwr3Yz_J1yN-',
  },
  {
    id: 2,
    name: 'Van Heusen Bodysuit',
    desc: 'Midnight Black • Sheer Mesh',
    price: '₹2,199',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8pr1gs99oau4FjuAh71jLPUuERgoERgFvAOS95VPMfWlwgmT_TQv1n1ix99dzTx1JFDUD4qBnW1iZBXSgOw7BQouOaxXxYBdBxYSxsrn2baur873KgAq356tmxfv_D6_uCG1Xwrpw1YAb8TDQeRbLmn1brJ7Rx37wm_I7TQ3fJgyhr-Ie-o4Pm-ro6GcRHNQbWjm4HhBWpTM-5zNlEc74i76oG12eRU6lxCJfG6ETu8WmYAMGtpdE2ZTEf_d3VHFnGVlRvyQk5zW0',
  }
];

const ProductGallery = () => {
  return (
    <section className="container" id="collections" style={{ padding: '64px 20px' }}>
      <div style={{ marginBottom: '64px' }}>
        <div className="section-title flex justify-between items-end">
          <div>
            <h2 className="font-headline-lg text-primary" style={{ marginBottom: '8px' }}>Premium Lingerie</h2>
            <p className="font-body-md text-on-surface-variant">Delicate lace and silk for elegant intimacy.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3">
          {products.map(product => (
            <div key={product.id} className="product-card-container" style={{ cursor: 'pointer' }}>
              <div className="product-card aspect-3-4 bg-surface-container ambient-shadow">
                <img src={product.image} alt={product.name} />
              </div>
              <div className="product-info">
                <div>
                  <h3 className="font-headline-md text-on-surface" style={{ fontSize: '20px', marginBottom: '4px' }}>{product.name}</h3>
                  <p className="font-label-sm text-outline">{product.desc}</p>
                </div>
                <span className="font-body-md text-primary">{product.price}</span>
              </div>
            </div>
          ))}
          
          <div className="flex flex-col justify-center items-center bg-surface-container-low ghost-border" style={{ borderRadius: '8px', padding: '32px', textAlign: 'center' }}>
            <div className="ambient-shadow" style={{ width: '128px', height: '128px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 24px' }}>
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7nINnAus-GqErIkGuHpYlIALZ0wVNdMEeIZU_AoQekpekCUmh9twmxvtotPBOm5e75WO6wGVByo3rICeuGYg-bxik4tVKIHbMyZSqoUIc0DxU0yzTsUMx0MPB2K7auYNGh3EqAxQ-aLTq5Kx6NROWQO12FyXdx-ZP7XlhlVdfC986idaqdhwyKGnrI0KpbaGsVQVNHG-FGVzqYHshUfnU_xmAhu5IWVLeVpKPTT4RMEnu1-Of1JMAnTE343JZdKKsLN9K9cShIF2q" alt="Fabric Detail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h4 className="font-headline-md" style={{ color: 'var(--secondary)', marginBottom: '8px' }}>The Silk Standard</h4>
            <p className="font-body-md text-on-surface-variant">Experience the unparalleled softness of pure silk blends against your skin. Crafted for breathability and a flawless drape.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductGallery;
