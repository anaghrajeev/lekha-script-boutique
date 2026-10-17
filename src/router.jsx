import { useState, useEffect } from 'react';

// ── Hash-based router ─────────────────────────────────────────────────────────────
// Routes:
//   #/           → home
//   #/shop       → shop (all brands)
//   #/shop/:id   → product detail page
//   #/cart       → cart
//   #/admin      → admin panel

export function parseHash(hash) {
  // Strip query parameters for routing logic
  const hashWithoutQuery = (hash || '#/').split('?')[0];
  const path = hashWithoutQuery.replace(/^#/, '') || '/';
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) return { route: 'home' };

  if (segments[0] === 'shop' && segments[1]) {
    return { route: 'product', id: decodeURIComponent(segments[1]) };
  }
  if (segments[0] === 'shop') return { route: 'shop' };
  if (segments[0] === 'cart')  return { route: 'cart' };
  if (segments[0] === 'admin') return { route: 'admin' };
  if (segments[0] === 'pos') {
    if (segments[1] === 'settings') return { route: 'pos-settings' };
    if (segments[1] === 'returns') return { route: 'pos-returns' };
    if (segments[1] === 'analytics') return { route: 'pos-analytics' };
    if (segments[1] === 'batches') return { route: 'pos-batches' };
    return { route: 'pos' };
  }

  return { route: 'home' };
}

export function navigate(path) {
  window.location.hash = path;
}

export function useRouter() {
  const [location, setLocation] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const handler = () => setLocation(parseHash(window.location.hash));
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return location;
}
