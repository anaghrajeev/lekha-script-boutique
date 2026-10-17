import React, { useState, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore.jsx';
import { navigate } from '../router.jsx';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { motion } from 'framer-motion';

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
  const hasVariants = product.variants?.length > 1 || product.sizes?.length > 0 || product.colors?.length > 0;
  const isOutOfStock = product.total_stock <= 0;

  return (
    <motion.div 
      className="shop-product-card" 
      id={`shop-card-${product.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
    >
      <div
        className="shop-card-image"
        onClick={() => navigate(`#/shop/${product.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`#/shop/${product.id}`)}
        aria-label={`View ${product.name}`}
      >
        {product.image ? (
          <LazyLoadImage 
            src={product.image} 
            alt={product.name} 
            effect="blur"
            wrapperProps={{ style: { display: 'block', width: '100%', height: '100%' } }}
          />
        ) : (
          <div
            className="shop-card-placeholder"
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
        <div className="shop-card-overlay">
          <span className="view-details-pill">View Details</span>
        </div>
        {isOutOfStock && (
          <div className="shop-card-badge out-of-stock-badge">Out of Stock</div>
        )}
      </div>

      <div className="shop-card-info" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="shop-card-text" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {brand && brand.name && brand.name !== '-' && (
            <div><span className="brand-chip">{brand.name}</span></div>
          )}
          <h3 className="shop-card-name" onClick={() => navigate(`#/shop/${product.id}`)} style={{ fontSize: '15px', lineHeight: '1.4', wordBreak: 'break-word', margin: 0 }}>
            {product.name ? product.name.split('-').map(p => p.trim().charAt(0).toUpperCase() + p.trim().slice(1).toLowerCase()).join(' ') : ''}
          </h3>
          <p className="shop-card-price" style={{ fontWeight: '600', margin: 0 }}>
            ₹{Number(product.price).toLocaleString()}
          </p>
        </div>
        <div className="shop-card-actions" style={{ display: 'flex', width: '100%' }}>
          {hasVariants ? (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`#/shop/${product.id}`)}
              style={{ width: '100%', padding: '8px 4px', justifyContent: 'center', fontSize: '12px', minWidth: 0, whiteSpace: 'nowrap' }}
            >
              Select Options
            </button>
          ) : (
            <button
              className="btn btn-add-cart"
              onClick={() => onAddToCart(product.variants[0])}
              disabled={isOutOfStock}
              aria-label={`Add ${product.name} to cart`}
              style={{ width: '100%', justifyContent: 'center', padding: '8px 4px', fontSize: '12px', minWidth: 0, borderRadius: '9999px', whiteSpace: 'nowrap' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '4px' }}>shopping_bag</span>
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ShopPage() {
  const { virtualProducts, addToCart, loading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBrand, setActiveBrand] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [toast, setToast] = useState({ visible: false, message: '' });

  // Extract unique brands
  const uniqueBrands = useMemo(() => {
    return [...new Set(virtualProducts.map(p => p.brand).filter(Boolean))].sort();
  }, [virtualProducts]);

  // Extract unique categories
  const uniqueCategories = useMemo(() => {
    const cats = new Set();
    virtualProducts.forEach(p => {
      if (p.category) cats.add(p.category);
      if (Array.isArray(p.categories)) {
        p.categories.forEach(c => cats.add(c));
      }
    });
    return [...cats].sort();
  }, [virtualProducts]);

  // Dynamic count helpers
  const getBrandCount = useCallback((brandName) => {
    return virtualProducts.filter(p => {
      if (p.brand !== brandName) return false;
      if (activeCategory !== 'all') {
        const catMatch = (p.category && p.category.toLowerCase() === activeCategory.toLowerCase()) ||
          (Array.isArray(p.categories) && p.categories.some(c => c.toLowerCase() === activeCategory.toLowerCase()));
        if (!catMatch) return false;
      }
      return true;
    }).length;
  }, [virtualProducts, activeCategory]);

  const getCategoryCount = useCallback((catName) => {
    return virtualProducts.filter(p => {
      const catMatch = (p.category && p.category.toLowerCase() === catName.toLowerCase()) ||
        (Array.isArray(p.categories) && p.categories.some(c => c.toLowerCase() === catName.toLowerCase()));
      if (!catMatch) return false;
      if (activeBrand !== 'all') {
        if (!p.brand || p.brand.toLowerCase() !== activeBrand.toLowerCase()) return false;
      }
      return true;
    }).length;
  }, [virtualProducts, activeBrand]);

  // Top popular categories that wrap cleanly (no horizontal sliding required)
  const popularCategories = useMemo(() => {
    return [...uniqueCategories]
      .sort((a, b) => getCategoryCount(b) - getCategoryCount(a))
      .slice(0, 7);
  }, [uniqueCategories, getCategoryCount]);

  // Comprehensive filter logic combining Search, Category, Brand, and Sort
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const list = virtualProducts.filter(p => {
      // 1. Brand filter
      if (activeBrand !== 'all') {
        if (!p.brand || p.brand.toLowerCase() !== activeBrand.toLowerCase()) {
          return false;
        }
      }

      // 2. Category filter
      if (activeCategory !== 'all') {
        const catMatch = (p.category && p.category.toLowerCase() === activeCategory.toLowerCase()) ||
          (Array.isArray(p.categories) && p.categories.some(c => c.toLowerCase() === activeCategory.toLowerCase()));
        if (!catMatch) {
          return false;
        }
      }

      // 3. Search query filter
      if (query) {
        const nameMatch = p.name && p.name.toLowerCase().includes(query);
        const brandMatch = p.brand && p.brand.toLowerCase().includes(query);
        const modelMatch = p.model && p.model.toLowerCase().includes(query);
        const categoryMatch = (p.category && p.category.toLowerCase().includes(query)) ||
          (Array.isArray(p.categories) && p.categories.some(c => c.toLowerCase().includes(query)));
        const sizeMatch = Array.isArray(p.sizes) && p.sizes.some(s => String(s).toLowerCase().includes(query));
        const colorMatch = Array.isArray(p.colors) && p.colors.some(c => String(c).toLowerCase().includes(query));
        const variantMatch = Array.isArray(p.variants) && p.variants.some(v => 
          (v.name && v.name.toLowerCase().includes(query)) ||
          (v.size && String(v.size).toLowerCase().includes(query)) ||
          (v.colour && String(v.colour).toLowerCase().includes(query)) ||
          (v.barcode && String(v.barcode).toLowerCase().includes(query))
        );

        if (!nameMatch && !brandMatch && !modelMatch && !categoryMatch && !sizeMatch && !colorMatch && !variantMatch) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    if (sortBy === 'price-asc') {
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      // featured
      list.sort((a, b) => (b.click_count || 0) - (a.click_count || 0));
    }

    return list;
  }, [virtualProducts, searchQuery, activeBrand, activeCategory, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== '' || activeBrand !== 'all' || activeCategory !== 'all' || sortBy !== 'featured';

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setActiveBrand('all');
    setActiveCategory('all');
    setSortBy('featured');
  }, []);

  const handleAddToCart = useCallback(
    (variant) => {
      addToCart(variant);
      setToast({ visible: true, message: `${variant.name} added to cart!` });
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

      {/* Search & Filter Controls Bar */}
      <div className="shop-filters-bar">
        <div className="container">
          <div className="shop-controls-bar">
            {/* Main Controls: Search Box + Dropdown Selectors */}
            <div className="shop-main-controls">
              {/* Search Box */}
              <div className="shop-search-box">
                <span className="material-symbols-outlined shop-search-icon">search</span>
                <input
                  type="text"
                  id="shop-search-input"
                  className="shop-search-input"
                  placeholder="Search products by brand, category, model, size..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search online boutique products"
                />
                {searchQuery && (
                  <button
                    className="shop-search-clear"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  </button>
                )}
              </div>

              {/* Dropdowns Group */}
              <div className="shop-dropdowns-group">
                {/* Category Dropdown */}
                <div className={`shop-dropdown-control ${activeCategory !== 'all' ? 'has-selection' : ''}`}>
                  <span className="material-symbols-outlined dropdown-icon">category</span>
                  <select
                    id="shop-category-select"
                    className="shop-custom-select"
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                    aria-label="Filter by category"
                  >
                    <option value="all">
                      All Categories ({activeBrand === 'all' ? virtualProducts.length : virtualProducts.filter(p => p.brand?.toLowerCase() === activeBrand.toLowerCase()).length})
                    </option>
                    {uniqueCategories.map((catName) => {
                      const count = getCategoryCount(catName);
                      return (
                        <option key={catName} value={catName}>
                          {catName} ({count})
                        </option>
                      );
                    })}
                  </select>
                  <span className="material-symbols-outlined dropdown-caret">expand_more</span>
                </div>

                {/* Brand Dropdown */}
                <div className={`shop-dropdown-control ${activeBrand !== 'all' ? 'has-selection' : ''}`}>
                  <span className="material-symbols-outlined dropdown-icon">sell</span>
                  <select
                    id="shop-brand-select"
                    className="shop-custom-select"
                    value={activeBrand}
                    onChange={(e) => setActiveBrand(e.target.value)}
                    aria-label="Filter by brand"
                  >
                    <option value="all">
                      All Brands ({activeCategory === 'all' ? virtualProducts.length : virtualProducts.filter(p => (p.category && p.category.toLowerCase() === activeCategory.toLowerCase()) || (Array.isArray(p.categories) && p.categories.some(c => c.toLowerCase() === activeCategory.toLowerCase()))).length})
                    </option>
                    {uniqueBrands.map((brandName) => {
                      const count = getBrandCount(brandName);
                      return (
                        <option key={brandName} value={brandName}>
                          {brandName} ({count})
                        </option>
                      );
                    })}
                  </select>
                  <span className="material-symbols-outlined dropdown-caret">expand_more</span>
                </div>

                {/* Sort Dropdown */}
                <div className={`shop-dropdown-control ${sortBy !== 'featured' ? 'has-selection' : ''}`}>
                  <span className="material-symbols-outlined dropdown-icon">swap_vert</span>
                  <select
                    id="shop-sort-select"
                    className="shop-custom-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort products"
                  >
                    <option value="featured">Sort: Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                  </select>
                  <span className="material-symbols-outlined dropdown-caret">expand_more</span>
                </div>
              </div>
            </div>

            {/* Quick Popular Categories (wraps cleanly, no sliding required!) */}
            <div className="shop-quick-tags-row">
              <span className="quick-tags-label">Popular:</span>
              <div className="quick-tags-wrap">
                <button
                  className={`quick-tag-chip ${activeCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('all')}
                  id="quick-pill-all"
                >
                  All
                </button>
                {popularCategories.map((cat) => {
                  const count = getCategoryCount(cat);
                  if (count === 0 && activeBrand !== 'all') return null;
                  return (
                    <button
                      key={cat}
                      className={`quick-tag-chip ${activeCategory === cat ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat)}
                      id={`quick-pill-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {cat} <span className="chip-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Filters Summary Strip */}
            {hasActiveFilters && (
              <div className="shop-active-filters-bar">
                <div className="shop-active-chips">
                  <span style={{ color: 'var(--on-surface-variant)', fontSize: '12px', fontWeight: '500' }}>
                    Active filters:
                  </span>
                  {searchQuery && (
                    <span className="active-filter-badge">
                      "{searchQuery}"
                      <button onClick={() => setSearchQuery('')} aria-label="Remove search filter">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </span>
                  )}
                  {activeCategory !== 'all' && (
                    <span className="active-filter-badge">
                      Category: {activeCategory}
                      <button onClick={() => setActiveCategory('all')} aria-label="Remove category filter">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </span>
                  )}
                  {activeBrand !== 'all' && (
                    <span className="active-filter-badge">
                      Brand: {activeBrand}
                      <button onClick={() => setActiveBrand('all')} aria-label="Remove brand filter">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </span>
                  )}
                  {sortBy !== 'featured' && (
                    <span className="active-filter-badge">
                      Sort: {sortBy === 'price-asc' ? 'Price ↑' : sortBy === 'price-desc' ? 'Price ↓' : 'A-Z'}
                      <button onClick={() => setSortBy('featured')} aria-label="Reset sorting">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                    Showing <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'product' : 'products'}
                  </span>
                  <button className="btn-reset-filters" onClick={resetAllFilters} id="btn-reset-filters">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>restart_alt</span>
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
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
              <p>No products match your search or filter selection.</p>
              {hasActiveFilters && (
                <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={resetAllFilters}>
                  Clear All Filters ({virtualProducts.length} Products)
                </button>
              )}
            </div>
          ) : (
            <motion.div 
              className="shop-product-grid"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
            >
              {filteredProducts.map((product) => (
                <ShopProductCard
                  key={product.id}
                  product={product}
                  brand={{ name: product.brand }}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
