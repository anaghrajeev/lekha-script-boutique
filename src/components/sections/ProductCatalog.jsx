import React, { useCallback } from 'react';
import { useStore } from '../../store/useStore.jsx';
import { navigate } from '../../router.jsx';

// ── Product card for catalog (matches existing CSS) ───────────────────────────
function CatalogCard({ product, brand, onAddToCart }) {
  const defaultSize =
    product.size_type === 'standard' && product.sizes?.length > 0
      ? product.sizes[0]
      : 'One Size';

  const handleClick = () => navigate(`#/shop/${product.id}`);

  return (
    <div className="product-card" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <div className="product-card-image aspect-3-4">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <div
            className="product-card-placeholder"
            style={{ background: 'var(--surface-container)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '64px', color: 'rgba(122,53,128,0.18)' }}
            >
              checkroom
            </span>
          </div>
        )}
        <div className="product-card-overlay">
          <span className="view-details-pill">View Details</span>
        </div>
        {!product.in_stock && (
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
      <div className="product-info">
        <div>
          {brand && (
            <span
              className="brand-chip"
              style={{ display: 'inline-block', marginBottom: '4px' }}
            >
              {brand.name}
            </span>
          )}
          <h3 className="text-headline-md" style={{ fontSize: '18px', marginBottom: '4px' }}>
            {product.name}
          </h3>
        </div>
        <span className="price text-body-md text-primary">
          ₹{Number(product.price).toLocaleString()}
        </span>
      </div>
    </div>
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
  const { getTopProducts, getBrand, addToCart, loading, products } = useStore();

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
          <div className="product-grid-3">
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
          <div className="product-grid-3">
            {topProducts.map((product) => (
              <CatalogCard
                key={product.id}
                product={product}
                brand={getBrand(product.brand_id)}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductCatalog;
