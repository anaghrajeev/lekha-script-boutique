import React, { useCallback } from 'react';
import { useStore } from '../store/useStore.jsx';
import { navigate } from '../router.jsx';

const WHATSAPP_NUMBER = '919745298723';

const WhatsAppSVG = () => (
  <svg style={{ width: '22px', height: '22px', fill: 'currentColor' }} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

function CartItemRow({ item, onQtyChange, onRemove }) {
  return (
    <div className="cart-item-row" id={`cart-item-${item.key}`}>
      {/* Thumbnail */}
      <div className="cart-item-thumb">
        {item.image ? (
          <img src={item.image} alt={item.name} />
        ) : (
          <div className="cart-thumb-placeholder">
            <span className="material-symbols-outlined">checkroom</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="cart-item-info">
        <p className="cart-item-name">{item.name}</p>
        <p className="cart-item-meta">Size: <strong>{item.size}</strong></p>
        <p className="cart-item-unit-price">₹{item.price.toLocaleString()} each</p>
      </div>

      {/* Qty stepper */}
      <div className="cart-item-qty">
        <button
          className="qty-btn"
          onClick={() => onQtyChange(item.key, item.qty - 1)}
          disabled={item.qty <= 1}
          aria-label="Decrease quantity"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <span className="qty-value">{item.qty}</span>
        <button
          className="qty-btn"
          onClick={() => onQtyChange(item.key, item.qty + 1)}
          aria-label="Increase quantity"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {/* Line total */}
      <p className="cart-item-total">₹{(item.price * item.qty).toLocaleString()}</p>

      {/* Remove */}
      <button
        className="cart-remove-btn"
        onClick={() => onRemove(item.key)}
        aria-label={`Remove ${item.name} from cart`}
      >
        <span className="material-symbols-outlined">delete_outline</span>
      </button>
    </div>
  );
}

// ── Main CartPage ─────────────────────────────────────────────────────────────
export default function CartPage() {
  const { cart, cartTotal, removeFromCart, updateCartQty, clearCart } = useStore();

  const buildWhatsAppMessage = useCallback(() => {
    if (cart.length === 0) return '';
    const itemLines = cart.map((item, i) =>
      `${i + 1}. ${item.name} (Size: ${item.size}) × ${item.qty} = ₹${(item.price * item.qty).toLocaleString()}`
    );
    const lines = [
      `🛍️ *Cart Order — Lekha Script Boutique*`,
      ``,
      ...itemLines,
      ``,
      `*Total: ₹${cartTotal.toLocaleString()}*`,
      ``,
      `Please confirm availability and share payment details.`,
      `Thank you! 🙏`,
    ];
    return encodeURIComponent(lines.join('\n'));
  }, [cart, cartTotal]);

  const handleCheckout = useCallback(() => {
    const msg = buildWhatsAppMessage();
    if (!msg) return;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank', 'noopener,noreferrer');
  }, [buildWhatsAppMessage]);

  return (
    <div className="cart-page">
      <div className="container">
        {/* Header */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <a href="#/" onClick={(e) => { e.preventDefault(); navigate('#/'); }}>Home</a>
          <span className="material-symbols-outlined breadcrumb-sep">chevron_right</span>
          <span>Cart</span>
        </nav>

        <h1 className="text-headline-lg cart-page-title">
          <span className="material-symbols-outlined" style={{ fontSize: '32px', verticalAlign: 'middle' }}>shopping_bag</span>
          &nbsp;Your Cart
        </h1>

        {cart.length === 0 ? (
          /* Empty state */
          <div className="cart-empty">
            <span className="material-symbols-outlined cart-empty-icon">shopping_bag</span>
            <h2 className="text-headline-md">Your cart is empty</h2>
            <p className="text-body-md">Add items from the shop to get started.</p>
            <button className="btn btn-primary" onClick={() => navigate('#/shop')}>
              Browse Collections
            </button>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Items */}
            <div className="cart-items-col">
              <div className="cart-items-header">
                <span>{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
                <button className="cart-clear-btn" onClick={clearCart}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete_sweep</span>
                  Clear all
                </button>
              </div>

              <div className="cart-items-list">
                {cart.map(item => (
                  <CartItemRow
                    key={item.key}
                    item={item}
                    onQtyChange={updateCartQty}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>

              <button className="btn btn-outline continue-shopping-btn" onClick={() => navigate('#/shop')}>
                <span className="material-symbols-outlined">arrow_back</span>
                Continue Shopping
              </button>
            </div>

            {/* Order summary */}
            <div className="order-summary">
              <h2 className="order-summary-title">Order Summary</h2>

              <div className="order-summary-rows">
                {cart.map(item => (
                  <div key={item.key} className="summary-row">
                    <span className="summary-item-name">{item.name} × {item.qty}</span>
                    <span className="summary-item-price">₹{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="summary-divider" />

              <div className="summary-total-row">
                <span>Total</span>
                <span className="summary-total">₹{cartTotal.toLocaleString()}</span>
              </div>

              {cartTotal < 2000 && (
                <div className="shipping-notice">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>local_shipping</span>
                  Add ₹{(2000 - cartTotal).toLocaleString()} more for free shipping
                </div>
              )}
              {cartTotal >= 2000 && (
                <div className="shipping-notice free-shipping">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>local_shipping</span>
                  You qualify for free shipping! 🎉
                </div>
              )}

              <button
                className="btn btn-buy-now checkout-btn"
                onClick={handleCheckout}
                id="checkout-whatsapp-btn"
              >
                <WhatsAppSVG />
                Checkout via WhatsApp
              </button>

              <p className="checkout-note">
                You'll be redirected to WhatsApp with a pre-filled order message. Our team will confirm availability and payment.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
