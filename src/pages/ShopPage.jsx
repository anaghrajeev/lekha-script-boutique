import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore.jsx';
import { navigate } from '../router.jsx';

const WhatsAppSVG = () => (
  <svg style={{ width: '18px', height: '18px', fill: 'currentColor' }} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

function Toast({ message, visible }) {
  return (
    <div className={`toast-notification ${visible ? 'toast-visible' : ''}`}>
      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
      {message}
    </div>
  );
}

// Skeleton card for loading
function SkeletonCard() {
  return (
    <div className="shop-product-card">
      <div className="shop-card-image" style={{ background: 'var(--surface-container)', animation: 'pulse 1.5s ease infinite' }} />
      <div className="shop-card-info">
        <div className="catalog-skeleton-line" style={{ width: '50%', marginBottom: '8px' }} />
        <div className="catalog-skeleton-line" style={{ width: '80%', marginBottom: '6px' }} />
        <div className="catalog-skeleton-line" style={{ width: '35%' }} />
      </div>
    </div>
  );
}

function ShopProductCard({ product, brand, onAddToCart }) {
  const defaultSize =
    product.size_type === 'standard' && product.sizes?.length > 0
      ? product.sizes[0]
      : product.size_type === 'custom'
      ? 'Free Size'
      : 'One Size';

  return (
    <div className="shop-product-card" id={`shop-card-${product.id}`}>
      <div
        className="shop-card-image"
        onClick={() => navigate(`#/shop/${product.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`#/shop/${product.id}`)}
        aria-label={`View ${product.name}`}
      >
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <div className="shop-card-placeholder">
            <span className="material-symbols-outlined">checkroom</span>
          </div>
        )}
        <div className="shop-card-overlay">
          <span className="view-details-pill">View Details</span>
        </div>
        {!product.in_stock && (
          <div className="shop-card-badge out-of-stock-badge">Out of Stock</div>
        )}
      </div>

      <div className="shop-card-info">
        <div className="shop-card-text">
          {brand && <span className="brand-chip">{brand.name}</span>}
          <h3 className="shop-card-name" onClick={() => navigate(`#/shop/${product.id}`)}>
            {product.name}
          </h3>
          <p className="shop-card-price">₹{Number(product.price).toLocaleString()}</p>
        </div>
        <div className="shop-card-actions">
          <button
            className="btn btn-outline shop-view-btn"
            onClick={() => navigate(`#/shop/${product.id}`)}
          >
            View
          </button>
          <button
            className="btn btn-add-cart"
            onClick={() => onAddToCart(product, defaultSize)}
            disabled={!product.in_stock}
            aria-label={`Add ${product.name} to cart`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shopping_bag</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const { products, brands, getBrand, addToCart, loading } = useStore();
  const [activeBrand, setActiveBrand] = useState('all');
  const [toast, setToast] = useState({ visible: false, message: '' });

  const filteredProducts =
    activeBrand === 'all'
      ? products
      : products.filter((p) => p.brand_id === activeBrand);

  const handleAddToCart = useCallback(
    (product, size) => {
      addToCart(product, size);
      setToast({ visible: true, message: `${product.name} added to cart!` });
      setTimeout(() => setToast({ visible: false, message: '' }), 2500);
    },
    [addToCart]
  );

  return (
    <div className="shop-page">
      <Toast message={toast.message} visible={toast.visible} />

      {/* Header */}
      <div className="shop-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="#/" onClick={(e) => { e.preventDefault(); navigate('#/'); }}>Home</a>
            <span className="material-symbols-outlined breadcrumb-sep">chevron_right</span>
            <span>Shop</span>
          </nav>
          <h1 className="text-display-lg shop-page-title">Our Collections</h1>
          <p className="text-body-lg shop-page-subtitle">
            Premium lingerie &amp; innerwear across top brands — crafted for comfort, elegance, and everyday confidence.
          </p>
        </div>
      </div>

      {/* Brand filter tabs */}
      <div className="shop-filters-bar">
        <div className="container">
          <div className="shop-filters">
            <button
              className={`brand-tab ${activeBrand === 'all' ? 'active' : ''}`}
              onClick={() => setActiveBrand('all')}
              id="brand-tab-all"
            >
              All
              <span className="brand-tab-count">{products.length}</span>
            </button>
            {brands.map((brand) => {
              const count = products.filter((p) => p.brand_id === brand.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={brand.id}
                  className={`brand-tab ${activeBrand === brand.id ? 'active' : ''}`}
                  onClick={() => setActiveBrand(brand.id)}
                  id={`brand-tab-${brand.id}`}
                >
                  {brand.name}
                  <span className="brand-tab-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="shop-grid-wrapper">
        <div className="container">
          {loading ? (
            <div className="shop-product-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="shop-empty">
              <span className="material-symbols-outlined shop-empty-icon">inventory_2</span>
              <p>No products found in this category yet.</p>
              {activeBrand !== 'all' && (
                <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={() => setActiveBrand('all')}>
                  View All Products
                </button>
              )}
            </div>
          ) : (
            <div className="shop-product-grid">
              {filteredProducts.map((product) => (
                <ShopProductCard
                  key={product.id}
                  product={product}
                  brand={getBrand(product.brand_id)}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
