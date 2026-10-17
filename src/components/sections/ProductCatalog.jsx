import React, { useCallback } from 'react';
import { useStore } from '../../store/useStore.jsx';
import { navigate } from '../../router.jsx';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { motion } from 'framer-motion';

// ── Product card for catalog (matches existing CSS) ───────────────────────────
function CatalogCard({ product, brand, onAddToCart }) {
  const defaultSize =
    product.size_type === 'standard' && product.sizes?.length > 0
      ? product.sizes[0]
      : 'One Size';

  const handleClick = () => navigate(`#/shop/${product.id}`);

  return (
    <motion.div 
      className="product-card" 
      onClick={handleClick} 
      style={{ cursor: 'pointer' }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
    >
      <div className="product-card-image aspect-3-4">
        {product.image ? (
          <LazyLoadImage 
            src={product.image} 
            alt={product.name} 
            effect="blur"
            wrapperProps={{ style: { display: 'block', width: '100%', height: '100%' } }}
          />
        ) : (
          <div
            className="product-card-placeholder"
            style={{ 
              background: 'linear-gradient(135deg, var(--surface-container), var(--surface-container-high))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '48px', color: 'rgba(122,53,128,0.3)' }}
            >
              laundry
            </span>
          </div>
        )}
        <div className="product-card-overlay">
          <span className="view-details-pill">View Details</span>
        </div>
        {product.total_stock <= 0 && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(186,26,26,0.1)',
              color: 'var(--error)',
              border: '1px solid rgba(186,26,26,0.2)',
              borderRadius: '9999px',
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 10px',
              letterSpacing: '0.06em',
            }}
          >
            Out of Stock
          </div>
        )}
      </div>
      <div className="product-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {brand && brand.name && brand.name !== '-' && (
          <div>
            <span className="brand-chip" style={{ display: 'inline-block', marginBottom: '4px' }}>
              {brand.name}
            </span>
          </div>
        )}
        <h3 className="text-headline-md" style={{ fontSize: '15px', margin: 0, lineHeight: '1.4', wordBreak: 'break-word' }}>
          {product.name ? product.name.split('-').map(p => p.trim().charAt(0).toUpperCase() + p.trim().slice(1).toLowerCase()).join(' ') : ''}
        </h3>
        <span className="price text-body-md text-primary" style={{ fontWeight: '600', margin: 0 }}>
          ₹{Number(product.price).toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}

// ── Skeleton card (loading state) ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="catalog-skeleton-card">
      <div className="catalog-skeleton-img" />
      <div className="catalog-skeleton-text">
        <div className="catalog-skeleton-line" style={{ width: '60%' }} />
        <div className="catalog-skeleton-line" style={{ width: '40%', marginTop: '6px' }} />
      </div>
    </div>
  );
}

// ── Main ProductCatalog ───────────────────────────────────────────────────────
const ProductCatalog = () => {
  const { getTopProducts, addToCart, loading, products } = useStore();

  const topProducts = getTopProducts(6);

  return (
    <section className="catalog-section" id="collections">
      <div className="container">
        {/* Section header */}
        <div className="category-header" style={{ marginBottom: 'var(--stack-md)' }}>
          <div>
            <h2 className="text-headline-lg">
              {products.some((p) => p.click_count > 0)
                ? 'Trending Now'
                : 'Our Collections'}
            </h2>
            <p className="text-body-md">
              {products.some((p) => p.click_count > 0)
                ? 'Most loved by our customers — curated just for you.'
                : 'Premium lingerie and innerwear, crafted for comfort and elegance.'}
            </p>
          </div>
          <a
            href="#/shop"
            className="btn btn-outline"
            style={{ fontSize: '13px', padding: '10px 24px' }}
            onClick={(e) => { e.preventDefault(); navigate('#/shop'); }}
          >
            Shop All
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              arrow_forward
            </span>
          </a>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="shop-product-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <div className="catalog-empty-state">
            <span className="material-symbols-outlined">storefront</span>
            <p>Products coming soon — check back shortly!</p>
            <a href="https://wa.me/919745298723" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ marginTop: '16px' }}>
              Enquire on WhatsApp
            </a>
          </div>
        ) : (
          <motion.div 
            className="shop-product-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {topProducts.map((product) => (
              <CatalogCard
                key={product.id}
                product={product}
                brand={product.brand ? { name: product.brand } : null}
                onAddToCart={addToCart}
              />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ProductCatalog;
