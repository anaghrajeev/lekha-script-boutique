import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore.jsx';
import { navigate } from '../router.jsx';

const WHATSAPP_NUMBER = '919745298723';

const WhatsAppSVG = () => (
  <svg style={{ width: '22px', height: '22px', fill: 'currentColor' }} viewBox="0 0 24 24">
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

function SizeChartModal({ onClose }) {
  const cellStyle = { padding: '12px 8px', borderBottom: '1px solid var(--outline-variant)', textAlign: 'center', fontSize: '14px' };
  const thStyle = { ...cellStyle, fontWeight: '600', color: 'var(--on-surface)' };
  
  return (
    <div className="admin-form-overlay" role="dialog" aria-modal="true" style={{ zIndex: 1000 }}>
      <div className="admin-form-card" style={{ maxWidth: '800px', width: '95%' }}>
        <div className="admin-form-header">
          <h2 className="text-headline-md">Size Chart</h2>
          <button className="admin-close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="admin-form-scroll" style={{ padding: '24px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <tbody>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>Bra Size</th>
                <td style={cellStyle}>28</td><td style={cellStyle}>30</td><td style={cellStyle}>32</td><td style={cellStyle}>34</td><td style={cellStyle}>36</td><td style={cellStyle}>38</td><td style={cellStyle}>40</td><td style={cellStyle}>42</td>
              </tr>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>Under-bust (cm)</th>
                <td style={cellStyle}>58-62</td><td style={cellStyle}>63-67</td><td style={cellStyle}>68-72</td><td style={cellStyle}>73-77</td><td style={cellStyle}>78-82</td><td style={cellStyle}>83-87</td><td style={cellStyle}>88-92</td><td style={cellStyle}>93-97</td>
              </tr>
              <tr>
                <th rowSpan="4" style={{ ...thStyle, textAlign: 'left', verticalAlign: 'middle' }}>Over-bust (cm)</th>
                <th style={{ ...thStyle, border: '1px solid var(--outline-variant)' }}>A</th>
                <td style={cellStyle}>72-74</td><td style={cellStyle}>77-79</td><td style={cellStyle}>82-84</td><td style={cellStyle}>87-89</td><td style={cellStyle}>92-94</td><td style={cellStyle}>97-99</td><td style={cellStyle}>102-104</td><td style={cellStyle}>107-109</td>
              </tr>
              <tr>
                <th style={{ ...thStyle, border: '1px solid var(--outline-variant)' }}>B</th>
                <td style={cellStyle}>74-76</td><td style={cellStyle}>79-81</td><td style={cellStyle}>84-86</td><td style={cellStyle}>89-91</td><td style={cellStyle}>94-96</td><td style={cellStyle}>99-101</td><td style={cellStyle}>104-106</td><td style={cellStyle}>109-111</td>
              </tr>
              <tr>
                <th style={{ ...thStyle, border: '1px solid var(--outline-variant)' }}>C</th>
                <td style={cellStyle}>76-78</td><td style={cellStyle}>81-83</td><td style={cellStyle}>86-88</td><td style={cellStyle}>91-93</td><td style={cellStyle}>96-98</td><td style={cellStyle}>101-103</td><td style={cellStyle}>106-108</td><td style={cellStyle}>111-113</td>
              </tr>
              <tr>
                <th style={{ ...thStyle, border: '1px solid var(--outline-variant)' }}>D</th>
                <td style={cellStyle}>78-80</td><td style={cellStyle}>83-85</td><td style={cellStyle}>88-90</td><td style={cellStyle}>93-95</td><td style={cellStyle}>98-100</td><td style={cellStyle}>103-105</td><td style={cellStyle}>108-110</td><td style={cellStyle}>113-115</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ProductPage({ id }) {
  const { getProduct, getBrand, addToCart, incrementClick, loading } = useStore();
  const product = getProduct(id);
  const brand   = product ? getBrand(product.brand_id) : null;

  const [selectedSize, setSelectedSize] = useState('');
  const [customSize,   setCustomSize]   = useState('');
  const [qty,          setQty]          = useState(1);
  const [sizeError,    setSizeError]    = useState(false);
  const [showSizeChart,setShowSizeChart] = useState(false);
  const [toast,        setToast]        = useState({ visible: false, message: '' });

  // Track click / view — runs once when product is found
  useEffect(() => {
    if (product?.id) {
      incrementClick(product.id);
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set default size when product changes
  useEffect(() => {
    if (!product) return;
    if (product.size_type === 'standard' && product.sizes?.length > 0) {
      setSelectedSize(product.sizes[0]);
    } else if (product.size_type === 'none') {
      setSelectedSize('One Size');
    } else {
      setSelectedSize('');
    }
    setCustomSize('');
    setSizeError(false);
    setQty(1);
  }, [id, product?.size_type]);

  // Loading state
  if (loading && !product) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="product-detail-grid" style={{ marginTop: '40px' }}>
            <div className="product-detail-image-wrap" style={{ background: 'var(--surface-container)', borderRadius: '20px', animation: 'pulse 1.5s ease infinite' }} />
            <div style={{ paddingTop: '40px' }}>
              <div className="catalog-skeleton-line" style={{ width: '40%', marginBottom: '16px', height: '28px' }} />
              <div className="catalog-skeleton-line" style={{ width: '70%', marginBottom: '12px', height: '40px' }} />
              <div className="catalog-skeleton-line" style={{ width: '30%', height: '32px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-not-found">
        <div className="container">
          <div className="not-found-content">
            <span className="material-symbols-outlined not-found-icon">search_off</span>
            <h2 className="text-headline-lg">Product not found</h2>
            <p className="text-body-md">This product may have been removed or the link is incorrect.</p>
            <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => navigate('#/shop')}>
              Back to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveSize =
    product.size_type === 'custom' ? customSize.trim() : selectedSize;

  const validateSize = () => {
    if (product.size_type === 'custom' && !customSize.trim()) {
      setSizeError(true); return false;
    }
    if (product.size_type === 'standard' && !selectedSize) {
      setSizeError(true); return false;
    }
    setSizeError(false); return true;
  };

  const buildWaMessage = () => {
    const size  = effectiveSize || 'Not specified';
    const total = (product.price * qty).toLocaleString();
    return encodeURIComponent(
      [
        `🛍️ *Order Request — Lekha Script Boutique*`,
        ``,
        `Product: ${product.name}`,
        brand ? `Brand: ${brand.name}` : '',
        `Size: ${size}`,
        `Qty: ${qty}`,
        `Price: ₹${Number(product.price).toLocaleString()} × ${qty} = ₹${total}`,
        ``,
        `Please confirm availability and share payment details.`,
        `Thank you! 🙏`,
      ]
        .filter(Boolean)
        .join('\n')
    );
  };

  const handleAddToCart = useCallback(() => {
    if (!validateSize()) return;
    addToCart(product, effectiveSize, qty);
    setToast({ visible: true, message: 'Added to cart!' });
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  }, [product, effectiveSize, qty, addToCart]);

  const handleBuyNow = useCallback(() => {
    if (!validateSize()) return;
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${buildWaMessage()}`,
      '_blank',
      'noopener,noreferrer'
    );
  }, [effectiveSize, qty, product, brand]);

  return (
    <div className="product-detail-page">
      <Toast message={toast.message} visible={toast.visible} />
      {showSizeChart && <SizeChartModal onClose={() => setShowSizeChart(false)} />}

      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <a href="#/" onClick={(e) => { e.preventDefault(); navigate('#/'); }}>Home</a>
          <span className="material-symbols-outlined breadcrumb-sep">chevron_right</span>
          <a href="#/shop" onClick={(e) => { e.preventDefault(); navigate('#/shop'); }}>Shop</a>
          {brand && (
            <>
              <span className="material-symbols-outlined breadcrumb-sep">chevron_right</span>
              <span>{brand.name}</span>
            </>
          )}
          <span className="material-symbols-outlined breadcrumb-sep">chevron_right</span>
          <span>{product.name}</span>
        </nav>

        {/* Product grid */}
        <div className="product-detail-grid">
          {/* ── Image ── */}
          <div className="product-detail-image-col">
            <div className="product-detail-image-wrap">
              {product.image ? (
                <img src={product.image} alt={product.name} />
              ) : (
                <div className="product-detail-placeholder">
                  <span className="material-symbols-outlined">checkroom</span>
                  <p>No image available</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Details ── */}
          <div className="product-detail-info-col">
            {brand && <span className="product-brand-badge">{brand.name}</span>}

            <h1 className="product-detail-name">{product.name}</h1>
            <p className="product-detail-price">₹{Number(product.price).toLocaleString()}</p>

            {!product.in_stock && (
              <div className="product-out-of-stock-notice">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
                Currently out of stock
              </div>
            )}

            {product.description && (
              <p className="product-detail-desc">{product.description}</p>
            )}

            <div className="product-detail-divider" />

            {/* Size selector — standard */}
            {product.size_type === 'standard' && product.sizes?.length > 0 && (
              <div className="size-section">
                <div className="size-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Select Size</span>
                  <button type="button" className="btn-text" style={{ fontSize: '13px', color: 'var(--primary)', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setShowSizeChart(true)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>straighten</span>
                    Size Chart
                  </button>
                </div>
                <div className="size-buttons">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      className={`size-btn ${selectedSize === s ? 'active' : ''}`}
                      onClick={() => { setSelectedSize(s); setSizeError(false); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {sizeError && <p className="size-error">Please select a size</p>}
              </div>
            )}

            {/* Size selector — custom */}
            {product.size_type === 'custom' && (
              <div className="size-section">
                <div className="size-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Enter Your Size / Measurement</span>
                  <button type="button" className="btn-text" style={{ fontSize: '13px', color: 'var(--primary)', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setShowSizeChart(true)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>straighten</span>
                    Size Chart
                  </button>
                </div>
                <input
                  className={`custom-size-input ${sizeError ? 'input-error' : ''}`}
                  type="text"
                  placeholder="e.g. 34B, 36C, or custom measurement"
                  value={customSize}
                  onChange={(e) => { setCustomSize(e.target.value); setSizeError(false); }}
                  id="custom-size-field"
                />
                {sizeError && <p className="size-error">Please enter your size</p>}
              </div>
            )}

            {/* Qty */}
            <div className="qty-section">
              <span className="qty-label">Quantity</span>
              <div className="qty-stepper">
                <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease">
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <span className="qty-value">{qty}</span>
                <button className="qty-btn" onClick={() => setQty((q) => q + 1)} aria-label="Increase">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            <div className="product-detail-divider" />

            {/* CTA */}
            <div className="product-detail-cta">
              <button
                className="btn btn-add-to-cart-lg"
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                id="add-to-cart-btn"
              >
                <span className="material-symbols-outlined">shopping_bag</span>
                Add to Cart
              </button>
              <button
                className="btn btn-buy-now"
                onClick={handleBuyNow}
                disabled={!product.in_stock}
                id="buy-now-btn"
              >
                <WhatsAppSVG />
                Buy Now via WhatsApp
              </button>
            </div>

            <p className="product-detail-note">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>local_shipping</span>
              &nbsp;Free shipping on orders over ₹2,000
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
