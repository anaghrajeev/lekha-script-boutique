import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore.jsx';
import { navigate } from '../../router.jsx';

const WhatsAppSVG = () => (
  <svg style={{ width: '22px', height: '22px', fill: 'currentColor' }} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const Navbar = ({ currentRoute }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount } = useStore();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentRoute]);

  const isHome = currentRoute === 'home';

  const handleNavClick = (e, hash) => {
    e.preventDefault();
    if (hash.startsWith('#/')) {
      navigate(hash);
    } else {
      // Anchor link — go home first then scroll
      if (!isHome) {
        navigate('#/');
        setTimeout(() => {
          const el = document.querySelector(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className={`site-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container inner">
          {/* Logo */}
          <a href="#/" className="logo" onClick={(e) => handleNavClick(e, '#/')}>
            <img src="/logo.png" alt="Lekha Script – Inner Concepts" />
          </a>

          {/* Desktop nav */}
          <nav className="desktop-nav" aria-label="Main navigation">
            <a
              href="#/"
              className={currentRoute === 'home' ? 'active' : ''}
              onClick={(e) => handleNavClick(e, '#/')}
            >
              Home
            </a>
            <a
              href="#/shop"
              className={currentRoute === 'shop' || currentRoute === 'product' ? 'active' : ''}
              onClick={(e) => handleNavClick(e, '#/shop')}
            >
              Shop
            </a>
            <a
              href="#about"
              onClick={(e) => handleNavClick(e, '#about')}
            >
              About
            </a>
            <a
              href="#contact"
              onClick={(e) => handleNavClick(e, '#contact')}
            >
              Contact
            </a>

          </nav>

          {/* Actions */}
          <div className="header-actions">
            {/* WhatsApp */}
            <a
              href="https://wa.me/919745298723"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Order on WhatsApp"
              className="whatsapp-icon-btn"
            >
              <WhatsAppSVG />
            </a>

            {/* Cart */}
            <button
              className="cart-icon-btn"
              onClick={() => navigate('#/cart')}
              aria-label={`Cart (${cartCount} items)`}
              id="cart-nav-btn"
            >
              <span className="material-symbols-outlined">shopping_bag</span>
              {cartCount > 0 && (
                <span className="cart-badge" aria-hidden="true">{cartCount > 99 ? '99+' : cartCount}</span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              className="mobile-menu-btn"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen(o => !o)}
              id="mobile-menu-toggle"
            >
              <span className="material-symbols-outlined">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`} role="navigation" aria-label="Mobile navigation">
        <div className="mobile-drawer-inner">
          <nav className="mobile-nav">
            <a href="#/" onClick={(e) => handleNavClick(e, '#/')}>
              <span className="material-symbols-outlined">home</span>
              Home
            </a>
            <a href="#/shop" onClick={(e) => handleNavClick(e, '#/shop')}>
              <span className="material-symbols-outlined">storefront</span>
              Shop
            </a>
            <a href="#about" onClick={(e) => handleNavClick(e, '#about')}>
              <span className="material-symbols-outlined">info</span>
              About
            </a>
            <a href="#contact" onClick={(e) => handleNavClick(e, '#contact')}>
              <span className="material-symbols-outlined">call</span>
              Contact
            </a>
            <a href="#/cart" onClick={(e) => handleNavClick(e, '#/cart')} className="mobile-cart-link">
              <span className="material-symbols-outlined">shopping_bag</span>
              Cart
              {cartCount > 0 && <span className="mobile-cart-count">{cartCount}</span>}
            </a>

          </nav>
        </div>
      </div>

      {/* Overlay to close mobile menu */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Navbar;
