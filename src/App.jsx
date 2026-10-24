import React from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import BrandMarquee from './components/sections/BrandMarquee';
import ProductCatalog from './components/sections/ProductCatalog';
import AboutSection from './components/sections/AboutSection';
import { Toaster } from 'react-hot-toast';

const ShopPage = React.lazy(() => import('./pages/ShopPage'));
const ProductPage = React.lazy(() => import('./pages/ProductPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const PosBillingPage = React.lazy(() => import('./pages/pos/PosBillingPage'));
const PosBatchesPage = React.lazy(() => import('./pages/pos/PosBatchesPage'));
const PosReturnsPage = React.lazy(() => import('./pages/pos/PosReturnsPage'));
const PosAnalyticsPage = React.lazy(() => import('./pages/pos/PosAnalyticsPage'));
const PosSettingsPage = React.lazy(() => import('./pages/pos/PosSettingsPage'));
import { StoreProvider, useStore } from './store/useStore.jsx';
import { PosStoreProvider, usePosStore } from './store/usePosStore.jsx';
import { useAuth } from './store/useAuth.js';
import { useRouter } from './router.jsx';
import './index.css';

const WhatsAppSVG = () => (
  <svg style={{ width: '26px', height: '26px', fill: 'currentColor' }} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const HomePage = () => (
  <main id="home">
    <Hero />
    <BrandMarquee />
    <ProductCatalog />
    <AboutSection />
  </main>
);

// Inner app that has access to both router and auth
function AppInner() {
  const location = useRouter();
  const { isLoggedIn, login, logout, loading } = useAuth();
  const { refreshBatches } = useStore();
  const { fetchPosData } = usePosStore();
  const isPos = location.route.startsWith('pos');
  const isAdminOrPos = location.route === 'admin' || isPos;

  React.useEffect(() => {
    // Silently re-sync stock batches whenever navigating between admin/pos/shop
    if (location.route === 'admin' || location.route.startsWith('pos') || location.route === 'shop') {
      refreshBatches?.();
      fetchPosData?.();
    }
  }, [location.route, refreshBatches, fetchPosData]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.route, location.id]);

  React.useEffect(() => {
    // When running as an installed standalone desktop app, open directly to Admin Panel
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;
    if (isStandalone && (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#')) {
      window.location.hash = '#/admin';
    }
  }, []);

  const renderPage = () => {
    if (isAdminOrPos && loading) {
      return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><div className="loading-spinner"></div></div>;
    }
    
    switch (location.route) {
      case 'home':    return <HomePage />;
      case 'shop':    return <ShopPage />;
      case 'product': return <ProductPage id={location.id} />;
      case 'cart':    return <CartPage />;
      case 'admin':
        return isLoggedIn
          ? <AdminPanel onLogout={logout} />
          : <AdminLogin onLogin={login} />;
      case 'pos':
        return isLoggedIn ? <PosBillingPage onLogout={logout} /> : <AdminLogin onLogin={login} />;
      case 'pos-batches':
        return isLoggedIn ? <PosBatchesPage onLogout={logout} /> : <AdminLogin onLogin={login} />;
      case 'pos-returns':
        return isLoggedIn ? <PosReturnsPage onLogout={logout} /> : <AdminLogin onLogin={login} />;
      case 'pos-analytics':
        return isLoggedIn ? <PosAnalyticsPage onLogout={logout} /> : <AdminLogin onLogin={login} />;
      case 'pos-settings':
        return isLoggedIn ? <PosSettingsPage onLogout={logout} /> : <AdminLogin onLogin={login} />;
      default:        return <HomePage />;
    }
  };

  return (
    <>
      {!isAdminOrPos && <Navbar currentRoute={location.route} />}
      <React.Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><div className="loading-spinner"></div></div>}>
        {renderPage()}
      </React.Suspense>
      {!isAdminOrPos && <Footer />}
      {!isAdminOrPos && (
        <a
          href="https://wa.me/919745298723"
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-fab"
          aria-label="Chat on WhatsApp"
        >
          <WhatsAppSVG />
        </a>
      )}
    </>
  );
}

function App() {
  return (
    <StoreProvider>
      <PosStoreProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)' } }} />
        <AppInner />
      </PosStoreProvider>
    </StoreProvider>
  );
}

export default App;
