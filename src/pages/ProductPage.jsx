import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore.jsx';
import { navigate } from '../router.jsx';

const WHATSAPP_NUMBER = '919745298723';

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
  const { virtualProducts, addToCart, incrementClick, loading, batches } = useStore();
  
  // Find the virtual product containing the variant ID passed in URL
  const vProduct = virtualProducts.find(vp => vp.variants.some(v => v.id === id)) || virtualProducts.find(vp => vp.id === id);
  const brand = vProduct && vProduct.brand ? { name: vProduct.brand } : null;

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [qty, setQty] = useState(1);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  // Initialize selections
  useEffect(() => {
    if (vProduct) {
      if (vProduct.sizes?.length > 0 && !selectedSize) setSelectedSize(vProduct.sizes[0]);
      if (vProduct.colors?.length > 0 && !selectedColor) setSelectedColor(vProduct.colors[0]);
    }
  }, [vProduct, selectedSize, selectedColor]);

  useEffect(() => {
    if (vProduct?.id) {
      incrementClick(vProduct.id);
    }
  }, [vProduct?.id]); 

  if (loading) {
    return (
      <div className="product-detail-page" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--on-surface-variant)' }}>Loading product details...</p>
      </div>
    );
  }

  if (!vProduct) {
    return (
      <div className="product-detail-page">
        <div className="product-not-found">
          <div className="container">
            <div className="not-found-content">
              <span className="material-symbols-outlined not-found-icon" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px' }}>search_off</span>
              <h2 className="text-headline-lg">Product not found</h2>
              <p className="text-body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
                This product may have been removed or the link is incorrect.
              </p>
              <button className="btn btn-primary" onClick={() => navigate('#/shop')}>Back to Shop</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Find exact variant
  let selectedVariant = vProduct.variants[0];
  let combinationExists = true;
  if (!vProduct.isLegacy) {
    const matched = vProduct.variants.find(v => (v.size === selectedSize || !vProduct.sizes.length) && (v.colour === selectedColor || !vProduct.colors.length));
    if (matched) {
      selectedVariant = matched;
    } else {
      combinationExists = false;
    }
  }

  // Calculate actual stock
  let stockAvailable = 0;
  if (combinationExists) {
    if (vProduct.isLegacy && !vProduct.variants[0].brand) {
      const batchStock = batches.filter(b => b.product_id === selectedVariant.id).reduce((sum, b) => sum + (b.quantity || 0), 0);
      stockAvailable = batchStock > 0 ? batchStock : (selectedVariant.in_stock ? 999 : 0);
    } else {
      stockAvailable = batches.filter(b => b.product_id === selectedVariant.id).reduce((sum, b) => sum + (b.quantity || 0), 0);
    }
  }
  
  const handleAddToCart = () => {
    if (!combinationExists || stockAvailable <= 0) {
      return;
    }
    
    // For legacy products, pass the selected size explicitly
    if (vProduct.isLegacy) {
      addToCart(selectedVariant, selectedSize, qty);
    } else {
      addToCart(selectedVariant, null, qty); // addToCart falls back to variant.size
    }
    
    setToast({ visible: true, message: `${vProduct.name} added to cart!` });
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  };

  const handlePlaceOrder = () => {
    if (!combinationExists || stockAvailable <= 0) {
      return;
    }
    
    // Add to cart first
    if (vProduct.isLegacy) {
      addToCart(selectedVariant, selectedSize, qty);
    } else {
      addToCart(selectedVariant, null, qty);
    }
    
    // Redirect to checkout directly
    navigate('#/cart?checkout=true');
  };

  const currentDisplayImage = combinationExists ? (selectedVariant.image || vProduct.image) : vProduct.image;
  const currentDisplayPrice = vProduct.price;

  return (
    <div className="product-detail-page">
      <Toast message={toast.message} visible={toast.visible} />
      {showSizeChart && <SizeChartModal onClose={() => setShowSizeChart(false)} />}
      
      <div className="container">
        
        <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: '24px' }}>
          <button className="btn-link" onClick={() => navigate('#/shop')}>← Back to Shop</button>
        </nav>

        <div className="product-detail-grid">
          
          <div className="product-detail-image-col">
            <div className="product-detail-image-wrap">
              {currentDisplayImage ? (
                <img src={currentDisplayImage} alt={vProduct.name} loading="eager" />
              ) : (
                <div className="product-detail-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)' }}>checkroom</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="product-detail-info-col">
            {brand && brand.name && brand.name !== '-' && <span className="product-brand-badge">{brand.name}</span>}
            
            <h1 className="product-detail-name">
              {vProduct.name ? vProduct.name.split('-').map(p => p.trim().charAt(0).toUpperCase() + p.trim().slice(1).toLowerCase()).join(' ') : ''}
            </h1>
            <p className="product-detail-price">
              {combinationExists ? `₹${Number(currentDisplayPrice).toLocaleString()}` : '-'}
            </p>
            
            {(selectedVariant.description || vProduct.variants[0].description) && (
              <p className="product-detail-desc">{selectedVariant.description || vProduct.variants[0].description}</p>
            )}

            <div className="product-detail-divider" />

            <div className="product-options">
              {/* Size Selector */}
              {vProduct.sizes.length > 0 && (
                <div className="size-section">
                  <div className="size-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Select Size</span>
                    <button type="button" className="btn-text" style={{ fontSize: '13px', color: 'var(--primary)', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setShowSizeChart(true)}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>straighten</span>
                      Size Chart
                    </button>
                  </div>
                  <div className="size-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {vProduct.sizes.map(size => {
                      return (
                        <button
                          key={size}
                          className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                          onClick={() => setSelectedSize(size)}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color Selector */}
              {vProduct.colors.length > 0 && (
                <div className="size-section" style={{ marginTop: '24px' }}>
                  <div className="size-section-header">
                    <span>Select Color</span>
                  </div>
                  <div className="size-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {vProduct.colors.map(color => {
                      return (
                        <button
                          key={color}
                          className={`size-btn ${selectedColor === color ? 'active' : ''}`}
                          onClick={() => setSelectedColor(color)}
                          style={{ minWidth: '0' }}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="qty-section" style={{ marginTop: '24px' }}>
                <span className="qty-label">Quantity</span>
                <div className="qty-stepper">
                  <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease">
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <span className="qty-value">{qty}</span>
                  <button className="qty-btn" onClick={() => setQty(q => Math.min(stockAvailable, q + 1))} disabled={!combinationExists || qty >= stockAvailable || stockAvailable <= 0} aria-label="Increase">
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
                {!combinationExists && (
                  <div style={{ padding: '12px', background: 'var(--error-container)', color: 'var(--on-error-container)', borderRadius: '8px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined">warning</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>This size and color combination is not available.</span>
                  </div>
                )}
                {combinationExists && stockAvailable > 0 && stockAvailable <= 5 && (
                  <p style={{ color: 'var(--error)', fontSize: '13px', marginTop: '8px', fontWeight: '500' }}>
                    Only {stockAvailable} left in stock!
                  </p>
                )}
                {combinationExists && stockAvailable <= 0 && (
                  <div style={{ padding: '12px', background: 'var(--error-container)', color: 'var(--on-error-container)', borderRadius: '8px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined">inventory_2</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Out of stock in this combination.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="product-detail-divider" />

            <div className="product-detail-cta">
              <button 
                className="btn btn-add-to-cart-lg"
                onClick={handleAddToCart}
                disabled={!combinationExists || stockAvailable <= 0}
              >
                <span className="material-symbols-outlined">shopping_bag</span>
                Add to Cart
              </button>
              
              <button 
                className="btn btn-buy-now" 
                style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={handlePlaceOrder}
                disabled={!combinationExists || stockAvailable <= 0}
              >
                <span className="material-symbols-outlined">bolt</span>
                Place Order
              </button>
            </div>
            
            <p className="product-detail-note" style={{ marginTop: '24px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>local_shipping</span>
              Free shipping on orders over ₹2,000
            </p>
          </div>
        </div>
      </div>
      
      {/* Sticky Bottom Bar for Mobile */}
      <div className="sticky-mobile-cta">
        <div className="sticky-mobile-price">
          <span className="sticky-price-label">Total</span>
          <span className="sticky-price-value">{combinationExists ? `₹${Number(currentDisplayPrice * qty).toLocaleString()}` : '-'}</span>
        </div>
        <button 
          className="btn btn-add-to-cart-lg"
          onClick={handleAddToCart}
          disabled={!combinationExists || stockAvailable <= 0}
          style={{ padding: '0 24px' }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
