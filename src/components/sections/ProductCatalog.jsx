import React from 'react';

const WhatsAppSVG = () => (
  <svg style={{ width: '20px', height: '20px', fill: 'currentColor' }} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const premiumProducts = [
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
  },
];

const comfortProducts = [
  {
    id: 3,
    name: 'Jockey Seamless',
    price: '₹899',
    bg: 'bg-secondary-fixed',
    icon: 'checkroom',
  },
  {
    id: 4,
    name: 'V-Star Cotton T-Shirt Bra',
    price: '₹650',
    bg: 'bg-tertiary-fixed',
    icon: 'apparel',
  },
  {
    id: 5,
    name: 'Bodycare Essentials',
    price: '₹599',
    bg: 'bg-surface-variant',
    icon: 'dry_cleaning',
  },
  {
    id: 6,
    name: 'Trylo Wire-Free',
    price: '₹750',
    bg: 'bg-surface-high',
    icon: 'checkroom',
  },
];

const ProductCard3x4 = ({ product, onOpen }) => (
  <div className="product-card" onClick={() => onOpen(product)}>
    <div className="product-card-image aspect-3-4">
      <img src={product.image} alt={product.name} />
      <div className="product-card-overlay">
        <span className="view-details-pill">View Details</span>
      </div>
    </div>
    <div className="product-info">
      <div>
        <h3 className="text-headline-md" style={{ fontSize: '20px' }}>{product.name}</h3>
        <p className="text-label-sm text-outline" style={{ textTransform: 'none', letterSpacing: '0.02em' }}>{product.desc}</p>
      </div>
      <span className="price text-body-md text-primary">{product.price}</span>
    </div>
  </div>
);

const ComfortCard = ({ product, onOpen }) => (
  <div className="product-card" onClick={() => onOpen(product)}>
    <div className={`product-card-image aspect-square ${product.bg}`}>
      <div className="product-card-placeholder">
        <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'rgba(122,53,128,0.18)' }}>{product.icon}</span>
      </div>
      <div className="product-card-overlay">
        <span className="view-details-pill">View Details</span>
      </div>
    </div>
    <h3 className="text-body-lg" style={{ fontSize: '18px', color: 'var(--on-surface)', marginTop: '4px' }}>{product.name}</h3>
    <p className="text-body-md text-primary">{product.price}</p>
  </div>
);

/* ─── Product Detail Modal ─── */
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['#ebd4ee', '#1f1b20', '#e2dce2'];

const Modal = ({ product, onClose }) => {
  const [selectedSize, setSelectedSize] = React.useState('M');
  const [selectedColor, setSelectedColor] = React.useState(0);

  if (!product) return null;

  const waText = encodeURIComponent(
    `Hi, I would like to order the ${product.name} (Size: ${selectedSize}).`
  );

  return (
    <div className={`modal-overlay ${product ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        {/* Image pane */}
        <div className="modal-image-pane">
          {product.image ? (
            <img src={product.image} alt={product.name} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-container-low)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '80px', color: 'rgba(122,53,128,0.2)' }}>{product.icon || 'checkroom'}</span>
            </div>
          )}
          <button className="modal-close-mobile" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Details pane */}
        <div className="modal-detail-pane hide-scrollbar">
          <div className="modal-detail-header">
            <h2 className="text-headline-lg" style={{ color: 'var(--primary)' }}>{product.name}</h2>
            <button className="modal-close-desktop" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <p className="modal-price">{product.price}</p>
          <p className="modal-desc">
            Experience ultimate comfort without sacrificing elegance. Crafted from premium materials featuring
            delicate accents. Perfect for everyday quiet luxury.
          </p>

          {/* Size Selector */}
          <div className="size-section">
            <div className="size-section-header">
              <span>Select Size</span>
              <a href="#">Size Guide</a>
            </div>
            <div className="size-buttons">
              {SIZES.map(s => (
                <button
                  key={s}
                  className={`size-btn ${selectedSize === s ? 'active' : ''}`}
                  onClick={() => setSelectedSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color Swatches */}
          <div className="color-section">
            <span className="color-label">Color</span>
            <div className="color-swatches">
              {COLORS.map((c, i) => (
                <button
                  key={i}
                  className={`color-swatch ${selectedColor === i ? 'active' : ''}`}
                  style={{ backgroundColor: c, border: '1px solid rgba(133,122,133,0.3)' }}
                  onClick={() => setSelectedColor(i)}
                />
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="modal-cta">
            <a
              href={`https://wa.me/919745298723?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              <WhatsAppSVG /> Order on WhatsApp
            </a>
            <p>Free shipping on orders over ₹2000</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const ProductCatalog = () => {
  const [selectedProduct, setSelectedProduct] = React.useState(null);

  return (
    <>
      <section className="catalog-section" id="collections">
        <div className="container">

          {/* Premium Lingerie */}
          <div className="category-block">
            <div className="category-header">
              <div>
                <h2 className="text-headline-lg">Premium Lingerie</h2>
                <p className="text-body-md">Delicate lace and silk for elegant intimacy.</p>
              </div>
            </div>

            <div className="product-grid-3">
              {premiumProducts.map(p => (
                <ProductCard3x4 key={p.id} product={p} onOpen={setSelectedProduct} />
              ))}

              {/* Fabric Detail Card */}
              <div className="fabric-detail-card">
                <div className="fabric-img-circle">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7nINnAus-GqErIkGuHpYlIALZ0wVNdMEeIZU_AoQekpekCUmh9twmxvtotPBOm5e75WO6wGVByo3rICeuGYg-bxik4tVKIHbMyZSqoUIc0DxU0yzTsUMx0MPB2K7auYNGh3EqAxQ-aLTq5Kx6NROWQO12FyXdx-ZP7XlhlVdfC986idaqdhwyKGnrI0KpbaGsVQVNHG-FGVzqYHshUfnU_xmAhu5IWVLeVpKPTT4RMEnu1-Of1JMAnTE343JZdKKsLN9K9cShIF2q"
                    alt="Satin Texture Detail"
                  />
                </div>
                <h4 className="text-headline-md">The Silk Standard</h4>
                <p className="text-body-md">
                  Experience the unparalleled softness of pure silk blends against your skin.
                  Crafted for breathability and a flawless drape.
                </p>
              </div>
            </div>
          </div>

          {/* Everyday Comfort */}
          <div className="category-block">
            <div className="category-header">
              <div>
                <h2 className="text-headline-lg">Everyday Comfort</h2>
                <p className="text-body-md">Seamless support for your daily routine.</p>
              </div>
            </div>

            <div className="product-grid-4">
              {comfortProducts.map(p => (
                <ComfortCard key={p.id} product={p} onOpen={setSelectedProduct} />
              ))}
            </div>
          </div>

        </div>
      </section>

      <Modal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  );
};

export default ProductCatalog;
