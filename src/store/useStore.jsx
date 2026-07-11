import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { supabase } from '../lib/supabase.js';

// ── Cart helpers (localStorage) ───────────────────────────────────────────────
const CART_KEY = 'ls_cart';
const loadCart  = () => { try { const r = localStorage.getItem(CART_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
const saveCart  = (v) => { try { localStorage.setItem(CART_KEY, JSON.stringify(v)); } catch {} };

const makeSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
  '-' + Date.now();

// ── Context ───────────────────────────────────────────────────────────────────
const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [brands,   setBrands]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [cart,     setCart]     = useState(loadCart);

  // Persist cart
  useEffect(() => { saveCart(cart); }, [cart]);

  // ── Fetch data from Supabase ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: prods, error: e1 }, { data: brnds, error: e2 }] =
        await Promise.all([
          supabase
            .from('products')
            .select('*, brand:brands(id, name, slug)')
            .order('created_at', { ascending: false }),
          supabase.from('brands').select('*').order('name'),
        ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setProducts(prods || []);
      setBrands(brnds || []);
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setError(err?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Product CRUD ──────────────────────────────────────────────────────────
  const addProduct = useCallback(async (data) => {
    const { data: newProd, error } = await supabase
      .from('products')
      .insert([data])
      .select('*, brand:brands(id, name, slug)')
      .single();
    if (error) throw error;
    setProducts((prev) => [newProd, ...prev]);
    return newProd;
  }, []);

  const updateProduct = useCallback(async (id, updates) => {
    // Strip non-column fields before sending to Supabase
    const { brand, created_at, click_count, ...safeUpdates } = updates;
    const { data: updated, error } = await supabase
      .from('products')
      .update(safeUpdates)
      .eq('id', id)
      .select('*, brand:brands(id, name, slug)')
      .single();
    if (error) throw error;
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((i) => i.productId !== id));
  }, []);

  const incrementClick = useCallback(async (id) => {
    // Read-then-write is fine for low-traffic boutique
    const { data: current } = await supabase
      .from('products')
      .select('click_count')
      .eq('id', id)
      .single();
    if (current) {
      const newCount = (current.click_count || 0) + 1;
      await supabase
        .from('products')
        .update({ click_count: newCount })
        .eq('id', id);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, click_count: newCount } : p
        )
      );
    }
  }, []);

  // ── Brand CRUD ────────────────────────────────────────────────────────────
  const addBrand = useCallback(async (name) => {
    const slug = makeSlug(name);
    const { data: newBrand, error } = await supabase
      .from('brands')
      .insert([{ name, slug }])
      .select()
      .single();
    if (error) throw error;
    setBrands((prev) =>
      [...prev, newBrand].sort((a, b) => a.name.localeCompare(b.name))
    );
    return newBrand;
  }, []);

  const updateBrand = useCallback(async (id, name) => {
    const { error } = await supabase
      .from('brands')
      .update({ name })
      .eq('id', id);
    if (error) throw error;
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
  }, []);

  const deleteBrand = useCallback(async (id) => {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
    setBrands((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ── Cart (localStorage only) ──────────────────────────────────────────────
  const addToCart = useCallback((product, size, qty = 1) => {
    setCart((prev) => {
      const key = product.id + '||' + size;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name:      product.name,
          brand_id:  product.brand_id,
          image:     product.image,
          price:     product.price,
          size,
          qty,
        },
      ];
    });
  }, []);

  const removeFromCart  = useCallback((key) => setCart((prev) => prev.filter((i) => i.key !== key)), []);
  const updateCartQty   = useCallback((key, qty) => { if (qty < 1) return; setCart((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i))); }, []);
  const clearCart       = useCallback(() => setCart([]), []);

  // ── Derived helpers ───────────────────────────────────────────────────────
  const cartCount  = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const getBrand   = useCallback((id) => brands.find((b) => b.id === id), [brands]);
  const getProduct = useCallback((id) => products.find((p) => p.id === id), [products]);
  const getProductsByBrand = useCallback(
    (brandId) => (brandId === 'all' ? products : products.filter((p) => p.brand_id === brandId)),
    [products]
  );
  /** Top N products sorted by click_count descending */
  const getTopProducts = useCallback(
    (limit = 8) =>
      [...products]
        .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
        .slice(0, limit),
    [products]
  );

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    products, brands, cart, cartCount, cartTotal, loading, error,
    fetchData,
    addProduct, updateProduct, deleteProduct, incrementClick,
    addBrand, updateBrand, deleteBrand,
    addToCart, removeFromCart, updateCartQty, clearCart,
    getBrand, getProduct, getProductsByBrand, getTopProducts,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}
