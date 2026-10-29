import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { supabase, fetchAllRows } from '../lib/supabase.js';
import { broadcastStockChange, onStockChange } from '../lib/stockSync.js';

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
  const [products,       setProducts]       = useState([]);
  const [brands,         setBrands]         = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [batches,        setBatches]        = useState([]);
  const [onlineOrders,   setOnlineOrders]   = useState([]);
  const [storeSettings,  setStoreSettings]  = useState(null);
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
      const [prods, batchesData, { data: settingsData, error: e3 }] =
        await Promise.all([
          fetchAllRows(
            'products',
            '*',
            (q) => q.neq('is_active', false).order('created_at', { ascending: false })
          ),
          fetchAllRows(
            'batches',
            '*',
            (q) => q.order('created_at', { ascending: false })
          ),
          supabase.from('store_settings').select('*').limit(1).maybeSingle(),
        ]);

      if (e3) console.warn("Failed to load store settings", e3);

      setProducts(prods || []);
      setBatches(batchesData || []);
      setStoreSettings(settingsData || { delivery_charge: 0, free_delivery_threshold: 0 });
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setError(err?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Dedicated fast batches refresh fetching all batches
  const refreshBatches = useCallback(async () => {
    try {
      const batchesData = await fetchAllRows(
        'batches',
        '*',
        (q) => q.order('created_at', { ascending: false })
      );
      setBatches(batchesData || []);
    } catch (err) {
      console.warn('Refresh batches error:', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Realtime & Cross-tab Stock Synchronization ──────────────────────────
  useEffect(() => {
    // 1. Listen for cross-tab and in-memory stock changes
    const unsubscribe = onStockChange(() => {
      refreshBatches();
    });

    // 2. Supabase Realtime channel for multi-device push updates
    const channel = supabase
      .channel('realtime_batches_store')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => {
        refreshBatches();
      })
      .subscribe();

    // 3. Tab visibility / window focus revalidation (throttled to at most once per 8 seconds)
    let lastFocusSync = 0;
    const handleFocusOrVisible = () => {
      const now = Date.now();
      if (now - lastFocusSync > 8000) {
        lastFocusSync = now;
        refreshBatches();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocusOrVisible();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Gentle background sync every 25 seconds ONLY while tab is actively visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshBatches();
      }
    }, 25000);

    return () => {
      unsubscribe();
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [refreshBatches]);

  // ── Product CRUD ──────────────────────────────────────────────────────────
  const addProduct = useCallback(async (data) => {
    const { data: newProd, error } = await supabase
      .from('products')
      .insert([data])
      .select('*')
      .single();
    if (error) throw error;
    setProducts((prev) => [newProd, ...prev]);
    return newProd;
  }, []);

  const updateProduct = useCallback(async (id, updates) => {
    // Strip non-column fields before sending to Supabase
    const { created_at, click_count, ...safeUpdates } = updates;
    const { data: updated, error } = await supabase
      .from('products')
      .update(safeUpdates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') {
          // Foreign key violation (billed items exist). Perform soft delete instead.
          const { error: softErr } = await supabase.from('products').update({ is_active: false }).eq('id', id);
          if (softErr) throw new Error("Failed to soft-delete product. Please run the SQL migration to add 'is_active' column.");
          setProducts((prev) => prev.filter((p) => p.id !== id));
          setCart((prev) => prev.filter((i) => i.productId !== id));
          return;
        }
        throw error;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setCart((prev) => prev.filter((i) => i.productId !== id));
    } catch(err) {
      alert(err.message);
      throw err;
    }
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

  // ── Size CRUD ─────────────────────────────────────────────────────────────
  const addSize = useCallback(async (name) => {
    const { data: newSize, error } = await supabase
      .from('sizes')
      .insert([{ name }])
      .select()
      .single();
    if (error) throw error;
    setAvailableSizes((prev) => [...prev, newSize.name]);
    return newSize.name;
  }, []);

  // ── Cart (localStorage only) ──────────────────────────────────────────────
  const addToCart = useCallback((product, size, qty = 1) => {
    setCart((prev) => {
      const resolvedSize = size || product.size || '';
      const key = product.id + '||' + resolvedSize;
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
          price:     product.price,
          size:      resolvedSize,
          image:     product.image,
          qty,
          colour:    product.colour || ''
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

  // ── Online Orders ──────────────────────────────────────────────────────────
  const fetchOnlineOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('online_orders')
        .select('*, items:online_order_items(*, product:products(*))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOnlineOrders(data || []);
    } catch (err) {
      console.error('Fetch online orders error:', err);
    }
  }, []);

  const placeOnlineOrder = useCallback(async (customerDetails) => {
    if (cart.length === 0) throw new Error("Cart is empty");
    
    // Calculate delivery fee
    const deliveryFee = storeSettings && cartTotal < (storeSettings.free_delivery_threshold || 0) 
      ? (storeSettings.delivery_charge || 0) 
      : 0;
    const finalTotal = cartTotal + deliveryFee;

    // Create order record
    const orderNo = `ORD-${Date.now()}`;
    const { data: newOrder, error: orderErr } = await supabase
      .from('online_orders')
      .insert([{
        order_no: orderNo,
        customer_name: customerDetails.name,
        customer_phone: customerDetails.phone,
        customer_address: customerDetails.address,
        total: finalTotal
      }])
      .select()
      .single();
      
    if (orderErr) throw orderErr;
    
    // Create order items
    const orderItems = cart.map(item => ({
      order_id: newOrder.id,
      product_id: item.productId,
      size: item.size,
      quantity: item.qty,
      price: item.price
    }));
    
    const { error: itemsErr } = await supabase.from('online_order_items').insert(orderItems);
    if (itemsErr) throw itemsErr;
    
    setCart([]); // Clear cart on success
    return newOrder;
  }, [cart, cartTotal, storeSettings]);

  const acceptOrder = useCallback(async (orderId) => {
    const { error } = await supabase.rpc('accept_online_order', { p_order_id: orderId });
    if (error) throw error;
    await fetchOnlineOrders(); // refresh
    await fetchData(); // refresh batches and products
    broadcastStockChange('ORDER_ACCEPTED', { orderId });
  }, [fetchOnlineOrders, fetchData]);

  const rejectOrder = useCallback(async (orderId) => {
    const { error } = await supabase.from('online_orders').update({ status: 'rejected' }).eq('id', orderId);
    if (error) throw error;
    await fetchOnlineOrders();
  }, [fetchOnlineOrders]);

  const cancelOnlineOrder = useCallback(async (orderId) => {
    const { error } = await supabase.rpc('cancel_online_order', { p_order_id: orderId });
    if (error) throw error;
    await fetchOnlineOrders(); // refresh
    await fetchData(); // refresh batches and products
    broadcastStockChange('ORDER_CANCELLED', { orderId });
  }, [fetchOnlineOrders, fetchData]);

  const updateStoreSettings = useCallback(async (updates) => {
    if (storeSettings?.id) {
      const { error } = await supabase.from('store_settings').update(updates).eq('id', storeSettings.id);
      if (error) throw error;
      setStoreSettings(prev => ({ ...prev, ...updates }));
    } else {
      const { data, error } = await supabase.from('store_settings').insert([updates]).select().single();
      if (error) throw error;
      setStoreSettings(data);
    }
  }, [storeSettings]);

  const getBrand   = useCallback((id) => brands.find((b) => b.id === id), [brands]);
  const getProduct = useCallback((id) => products.find((p) => p.id === id), [products]);
  const getProductsByBrand = useCallback(
    (brandId) => (brandId === 'all' ? products : products.filter((p) => p.brand_id === brandId)),
    [products]
  );

  const virtualProducts = useMemo(() => {
    const groups = {};
    products.forEach(p => {
      const isLegacy = !p.brand && !p.model;
      const brandVal = (p.brand || (p.name ? p.name.split('-')[0]?.trim() : '') || 'Unknown').trim();
      const modelVal = (p.model || (p.name ? p.name.split('-')[1]?.trim() : '') || p.name || '').trim();
      const catVal = (p.category || (p.name ? p.name.split('-')[2]?.trim() : '') || '').trim().toUpperCase();
      const key = isLegacy ? `legacy_${p.name}` : `new_${brandVal}_${modelVal}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: p.id, // ID of first variant for routing
          isLegacy,
          name: isLegacy ? p.name : `${brandVal} - ${modelVal}`,
          brand_id: p.brand_id,
          brand: brandVal,
          model: modelVal,
          category: catVal,
          categories: new Set(catVal ? [catVal] : []),
          price: p.price,
          image: p.image,
          variants: [],
          sizes: new Set(),
          colors: new Set(),
          total_stock: 0,
          click_count: 0
        };
      }
      
      const v = groups[key];
      v.variants.push(p);
      if (catVal) v.categories.add(catVal);
      if (p.image && !v.image) v.image = p.image;
      v.click_count += (p.click_count || 0);
      
      const activeBatches = batches.filter(b => b.product_id === p.id && b.quantity > 0);
      const variantStock = activeBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
      
      // Determine the minimum selling price across available batches
      const batchPrices = activeBatches.map(b => b.selling_price).filter(sp => sp != null);
      if (batchPrices.length > 0) {
        const minBatchPrice = Math.min(...batchPrices);
        // Set to min batch price if we haven't set one yet, or if it's lower than what's currently set
        if (v.price === 0 || minBatchPrice < v.price) {
          v.price = minBatchPrice;
        }
      } else if (v.price === 0 && p.price > 0) {
        // Fallback to product.price if no batches are available (for legacy products or zero-stock products)
        v.price = p.price;
      }

      if (isLegacy && variantStock === 0 && p.in_stock) {
        v.total_stock += 999;
      } else {
        v.total_stock += variantStock;
      }
      
      if (isLegacy) {
        if (p.sizes && Array.isArray(p.sizes)) {
          p.sizes.forEach(s => v.sizes.add(s));
        }
      } else {
        if (p.size) v.sizes.add(p.size);
        if (p.colour) v.colors.add(p.colour);
      }
      
      v.click_count = Math.max(v.click_count, p.click_count || 0);
    });

    return Object.values(groups).map(g => ({
      ...g,
      sizes: Array.from(g.sizes),
      colors: Array.from(g.colors),
      categories: Array.from(g.categories)
    }));
  }, [products, batches]);

  /** Top N products sorted by click_count descending */
  const getTopProducts = useCallback(
    (limit = 8) =>
      [...virtualProducts]
        .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
        .slice(0, limit),
    [virtualProducts]
  );

  // ── Context value ──────────────────────────────────────────────────────────
  const value = {
    products, virtualProducts, brands, availableSizes, cart, cartCount, cartTotal, loading, error, batches, onlineOrders, storeSettings,
    fetchData, refreshBatches, fetchOnlineOrders, placeOnlineOrder, acceptOrder, rejectOrder, cancelOnlineOrder,
    addProduct, updateProduct, deleteProduct, incrementClick,
    addBrand, updateBrand, deleteBrand, addSize, updateStoreSettings,
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
