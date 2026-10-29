import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase, fetchAllRows } from '../lib/supabase.js';
import { broadcastStockChange, onStockChange } from '../lib/stockSync.js';

const PosStoreContext = createContext(null);

export function PosStoreProvider({ children }) {
  const [batches, setBatches] = useState([]);
  const [bills, setBills] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Local POS Cart
  const [posCart, setPosCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  
  // New features state
  const [parkedCarts, setParkedCarts] = useState([]);
  const [lastBillData, setLastBillData] = useState(null);

  // POS Settings
  const [settings, setSettings] = useState({ enableDiscounts: false, enableGst: false, gstPercentage: 18, invoiceStartNumber: 1000, logoUrl: '' });

  const fetchPosSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('pos_settings').select('*').limit(1);
      if (!error && data && data.length > 0) {
        const row = data[0];
        setSettings({
          id: row.id,
          enableDiscounts: row.enable_discounts,
          enableGst: row.enable_gst,
          gstPercentage: row.gst_percentage,
          invoiceStartNumber: row.invoice_start_number || 1000,
          logoUrl: row.logo_url || ''
        });
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    try {
      if (newSettings.id) {
        const { error } = await supabase.from('pos_settings').update({
          enable_discounts: newSettings.enableDiscounts,
          enable_gst: newSettings.enableGst,
          gst_percentage: newSettings.gstPercentage,
          invoice_start_number: newSettings.invoiceStartNumber,
          logo_url: newSettings.logoUrl
        }).eq('id', newSettings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('pos_settings').insert([{
          enable_discounts: newSettings.enableDiscounts,
          enable_gst: newSettings.enableGst,
          gst_percentage: newSettings.gstPercentage,
          invoice_start_number: newSettings.invoiceStartNumber,
          logo_url: newSettings.logoUrl
        }]).select().single();
        if (error) throw error;
        if (data) setSettings(prev => ({ ...prev, id: data.id }));
      }
    } catch (err) {
      console.error('Update settings error:', err);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      // If table doesn't exist yet, this will fail gracefully due to error catching
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Fetch suppliers error:', err);
    }
  }, []);

  // Load basic data
  const fetchPosData = useCallback(async () => {
    setLoading(true);
    fetchPosSettings();
    fetchSuppliers();
    try {
      const batchesData = await fetchAllRows(
        'batches',
        '*, product:products(name, sku, barcode, price)',
        (q) => q.order('created_at', { ascending: false })
      );
      setBatches(batchesData || []);
    } catch (err) {
      console.error('POS fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchPosSettings]);

  useEffect(() => {
    fetchPosData();
  }, [fetchPosData]);

  // ── Realtime & Cross-tab Stock Synchronization ──────────────────────────
  useEffect(() => {
    // 1. Cross-tab and in-memory stock changes
    const unsubscribe = onStockChange(() => {
      fetchPosData();
    });

    // 2. Supabase Realtime channel
    const channel = supabase
      .channel('realtime_batches_pos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => {
        fetchPosData();
      })
      .subscribe();

    // 3. Tab visibility / window focus revalidation (throttled to at most once per 8 seconds)
    let lastFocusSync = 0;
    const handleFocusOrVisible = () => {
      const now = Date.now();
      if (now - lastFocusSync > 8000) {
        lastFocusSync = now;
        fetchPosData();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocusOrVisible();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPosData]);

  const fetchBills = useCallback(async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, items:bill_items(*, product:products(name))')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      setBills(data || []);
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  // POS Cart Actions
  const addToPosCart = useCallback((product, batchId, price, qty = 1) => {
    setPosCart((prev) => {
      const key = `${product.id}-${batchId || 'nobatch'}`;
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + qty, subtotal: (i.quantity + qty) * price } : i);
      }
      return [...prev, {
        key,
        product_id: product.id,
        name: product.name,
        model: product.model,
        category: product.category,
        size: product.size,
        batch_id: batchId,
        unit_price: price,
        quantity: qty,
        subtotal: price * qty
      }];
    });
  }, []);

  const updatePosCartQty = useCallback((key, qty) => {
    if (qty < 1) return;
    setPosCart(prev => prev.map(i => i.key === key ? { ...i, quantity: qty, subtotal: qty * i.unit_price } : i));
  }, []);

  const updatePosCartItemPrice = useCallback((key, newPrice) => {
    if (newPrice < 0) return;
    setPosCart(prev => prev.map(i => i.key === key ? { ...i, unit_price: newPrice, subtotal: i.quantity * newPrice } : i));
  }, []);

  const addMiscItem = useCallback((name, price, qty = 1) => {
    setPosCart((prev) => {
      const key = `misc-${Date.now()}`;
      return [...prev, {
        key,
        product_id: null,
        name: name || 'Misc Item',
        model: '',
        category: '',
        size: '',
        batch_id: null,
        unit_price: price,
        quantity: qty,
        subtotal: price * qty
      }];
    });
  }, []);

  const removeFromPosCart = useCallback((key) => {
    setPosCart(prev => prev.filter(i => i.key !== key));
  }, []);

  const clearPosCart = useCallback(() => {
    setPosCart([]);
    setCustomerInfo({ name: '', phone: '' });
  }, []);

  const parkCart = useCallback((note = '') => {
    if (posCart.length === 0) return;
    setParkedCarts(prev => [
      ...prev, 
      { id: Date.now(), cart: posCart, customerInfo, note, time: new Date().toLocaleTimeString() }
    ]);
    clearPosCart();
  }, [posCart, customerInfo, clearPosCart]);

  const resumeCart = useCallback((id) => {
    setParkedCarts(prev => {
      const parked = prev.find(p => p.id === id);
      if (parked) {
        setPosCart(parked.cart);
        setCustomerInfo(parked.customerInfo);
      }
      return prev.filter(p => p.id !== id);
    });
  }, []);

  // Checkout
  const checkoutPos = useCallback(async (paymentMode = 'Cash', tax = 0, discount = 0) => {
    if (posCart.length === 0) throw new Error('Cart is empty');
    
    const subtotal = posCart.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal + tax - discount;
    
    const items = posCart.map(i => ({
      product_id: i.product_id,
      batch_id: i.batch_id || '',
      size: i.size || '',
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
      name: i.name
    }));

    try {
      const { data, error } = await supabase.rpc('process_pos_checkout', {
        p_customer_name: customerInfo.name || null,
        p_customer_phone: customerInfo.phone || null,
        p_subtotal: subtotal,
        p_tax: tax,
        p_discount: discount,
        p_total: total,
        p_payment_mode: paymentMode,
        p_items: items
      });

      if (error) throw error;
      
      // Save for "Reprint Last Bill" feature
      setLastBillData({
        billNo: data.bill_no,
        items: [...posCart],
        customerInfo: { ...customerInfo },
        subtotal,
        tax,
        discount,
        total,
        paymentMode,
        time: new Date()
      });

      fetchPosData(); // Refresh batches
      broadcastStockChange('CHECKOUT', { billNo: data.bill_no, billId: data.bill_id });
      return { success: true, billId: data.bill_id, billNo: data.bill_no };
    } catch (err) {
      console.error('Checkout failed:', err);
      throw err;
    }
  }, [posCart, customerInfo, clearPosCart, fetchPosData]);

  // Delete Bill
  const deleteBill = useCallback(async (billId) => {
    try {
      const { error } = await supabase.rpc('delete_pos_bill', { p_bill_id: billId });
      if (error) throw error;
      
      setBills(prev => prev.filter(b => b.id !== billId));
      fetchPosData(); // Refresh batches stock
      broadcastStockChange('DELETE_BILL', { billId });
      return true;
    } catch (err) {
      console.error('Delete bill failed:', err);
      throw err;
    }
  }, [fetchPosData]);

  const updateBatch = useCallback(async (batchId, updates) => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .update(updates)
        .eq('id', batchId)
        .select('*, product:products(name, sku, barcode, price)')
        .single();
      if (error) throw error;
      setBatches(prev => prev.map(b => b.id === batchId ? data : b));
      broadcastStockChange('BATCH_UPDATED', { batchId });
      return data;
    } catch (err) {
      console.error('Update batch failed:', err);
      throw err;
    }
  }, []);

  const deleteBatch = useCallback(async (batchId) => {
    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId);
      if (error) throw error;
      setBatches(prev => prev.filter(b => b.id !== batchId));
      broadcastStockChange('BATCH_DELETED', { batchId });
      return true;
    } catch (err) {
      console.error('Delete batch failed:', err);
      throw err;
    }
  }, []);

  const addSupplier = useCallback(async (supplierData) => {
    try {
      const { data, error } = await supabase.from('suppliers').insert([supplierData]).select().single();
      if (error) throw error;
      setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err) {
      console.error('Add supplier failed:', err);
      throw err;
    }
  }, []);

  const updateSupplier = useCallback(async (id, updates) => {
    try {
      const { data, error } = await supabase.from('suppliers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setSuppliers(prev => prev.map(s => s.id === id ? data : s));
      return data;
    } catch (err) {
      console.error('Update supplier failed:', err);
      throw err;
    }
  }, []);

  const deleteSupplier = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      setSuppliers(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (err) {
      console.error('Delete supplier failed:', err);
      throw err;
    }
  }, []);

  const value = {
    batches,
    bills,
    suppliers,
    loading,
    error,
    posCart,
    settings,
    updateSettings,
    fetchPosData,
    fetchBills,
    posCart,
    addToPosCart,
    updatePosCartQty,
    updatePosCartItemPrice,
    removeFromPosCart,
    clearPosCart,
    checkoutPos,
    addMiscItem,
    customerInfo,
    setCustomerInfo,
    parkedCarts,
    parkCart,
    resumeCart,
    lastBillData,
    deleteBill,
    updateBatch,
    deleteBatch,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier
  };

  return <PosStoreContext.Provider value={value}>{children}</PosStoreContext.Provider>;
}

export function usePosStore() {
  const ctx = useContext(PosStoreContext);
  if (!ctx) throw new Error('usePosStore must be used within <PosStoreProvider>');
  return ctx;
}
