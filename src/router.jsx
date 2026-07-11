import { useState, useEffect } from 'react';

// ── Hash-based router ─────────────────────────────────────────────────────────
// Routes:
//   #/           → home
//   #/shop       → shop (all brands)
//   #/shop/:id   → product detail page
//   #/cart       → cart
//   #/admin      → admin panel

export function parseHash(hash) {
  const path = (hash || '#/').replace(/^#/, '') || '/';
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) return { route: 'home' };

  if (segments[0] === 'shop' && segments[1]) {
    return { route: 'product', id: decodeURIComponent(segments[1]) };
  }
  if (segments[0] === 'shop') return { route: 'shop' };
  if (segments[0] === 'cart')  return { route: 'cart' };
  if (segments[0] === 'admin') return { route: 'admin' };

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
