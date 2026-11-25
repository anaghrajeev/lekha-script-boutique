import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase, fetchAllRows } from '../lib/supabase.js';
import { broadcastStockChange, onStockChange } from '../lib/stockSync.js';

const PosStoreContext = createContext(null);

const convertUrlToBase64 = async (url) => {
  if (!url) return '';
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not convert logo to base64:', e);
    return '';
  }
};

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

  // POS Settings with instant Base64 logo from localStorage if available
  const [settings, setSettings] = useState(() => {
    let cachedBase64 = '';
    let cachedUrl = '';
    try {
      if (typeof window !== 'undefined') {
        cachedBase64 = localStorage.getItem('pos_cached_logo_base64') || '';
        cachedUrl = localStorage.getItem('pos_cached_logo_url') || '';
      }
    } catch (_) {}
    return {
      enableDiscounts: false,
      enableGst: false,
      gstPercentage: 18,
      invoiceStartNumber: 1000,
      logoUrl: cachedUrl,
      logoBase64: cachedBase64
    };
  });

  // ── CRM & Loyalty State ──────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [loyaltySettings, setLoyaltySettings] = useState({
    points_per_rupee: 0.01,
    rupees_per_point: 1.0,
    min_points_to_redeem: 50,
    bronze_min_spend: 0,
    silver_min_spend: 5000,
    gold_min_spend: 15000,
    vip_min_spend: 30000,
    enable_loyalty: true
  });
  const [crmLoading, setCrmLoading] = useState(false);

  const fetchLoyaltySettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('loyalty_settings').select('*').limit(1);
      if (!error && data && data.length > 0) {
        setLoyaltySettings(data[0]);
      }
    } catch (err) {
      console.warn('Fetch loyalty settings error (using defaults):', err);
    }
  }, []);

  const updateLoyaltySettings = useCallback(async (newSettings) => {
    setLoyaltySettings(newSettings);
    try {
      if (newSettings.id) {
        const { error } = await supabase.from('loyalty_settings').update(newSettings).eq('id', newSettings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('loyalty_settings').insert([newSettings]).select().single();
        if (error) throw error;
        if (data) setLoyaltySettings(data);
      }
    } catch (err) {
      console.error('Update loyalty settings error:', err);
      throw err;
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setCrmLoading(true);
    try {
      // 1. Try fetching from customers table
      const { data, error } = await supabase.from('customers').select('*').order('total_spend', { ascending: false });
      if (!error && data && data.length > 0) {
        setCustomers(data);
        return data;
      }
      
      // 2. Fallback: if table doesn't exist yet, construct customer insights from bills
      const { data: billsData } = await supabase
        .from('bills')
        .select('*, items:bill_items(*, product:products(name, category, size))')
        .order('created_at', { ascending: false });
      
      const phoneMap = new Map();
      (billsData || []).forEach(b => {
        const rawPhone = (b.customer_phone || '').trim();
        if (!rawPhone) return;
        const phone = rawPhone;
        const total = Number(b.total) || 0;
        const date = b.bill_date || b.created_at;

        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, {
            id: `temp-${phone}`,
            name: b.customer_name?.trim() || 'Walk-in',
            phone: phone,
            total_spend: total,
            visit_count: 1,
            loyalty_points: Math.floor(total * 0.01),
            lifetime_points: Math.floor(total * 0.01),
            tier: total >= 30000 ? 'VIP' : total >= 15000 ? 'Gold' : total >= 5000 ? 'Silver' : 'Bronze',
            last_visit_at: date,
            created_at: date,
            bills: [b]
          });
        } else {
          const c = phoneMap.get(phone);
          c.total_spend += total;
          c.visit_count += 1;
          c.loyalty_points += Math.floor(total * 0.01);
          c.lifetime_points += Math.floor(total * 0.01);
          c.tier = c.total_spend >= 30000 ? 'VIP' : c.total_spend >= 15000 ? 'Gold' : c.total_spend >= 5000 ? 'Silver' : 'Bronze';
          if (new Date(date) > new Date(c.last_visit_at)) {
            c.last_visit_at = date;
          }
          if (b.customer_name && b.customer_name !== 'Walk-in') {
            c.name = b.customer_name;
          }
          c.bills.push(b);
        }
      });

      const aggregated = Array.from(phoneMap.values()).sort((a, b) => b.total_spend - a.total_spend);
      setCustomers(aggregated);
      return aggregated;
    } catch (err) {
      console.error('Fetch customers error:', err);
      return [];
    } finally {
      setCrmLoading(false);
    }
  }, []);

  const addCustomer = useCallback(async (customerData) => {
    try {
      const { data, error } = await supabase.from('customers').insert([customerData]).select().single();
      if (error) throw error;
      setCustomers(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Add customer error:', err);
      throw err;
    }
  }, []);

  const updateCustomer = useCallback(async (id, updates) => {
    try {
      const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      return data;
    } catch (err) {
      console.error('Update customer error:', err);
      throw err;
    }
  }, []);

  const deleteCustomer = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      setCustomers(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      console.error('Delete customer error:', err);
      throw err;
    }
  }, []);

  const fetchCustomerHistory = useCallback(async (phone) => {
    if (!phone) return { bills: [], onlineOrders: [] };
    try {
      const [billsRes, ordersRes] = await Promise.all([
        supabase.from('bills').select('*, items:bill_items(*, product:products(name, model, category, size))').eq('customer_phone', phone).order('created_at', { ascending: false }),
        supabase.from('online_orders').select('*, items:online_order_items(*, product:products(name, model, category, size))').eq('customer_phone', phone).order('created_at', { ascending: false })
      ]);
      return {
        bills: billsRes.data || [],
        onlineOrders: ordersRes.data || []
      };
    } catch (err) {
      console.error('Fetch customer history error:', err);
      return { bills: [], onlineOrders: [] };
    }
  }, []);

  const fetchPosSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('pos_settings').select('*').limit(1);
      if (!error && data && data.length > 0) {
        const row = data[0];
        const currentUrl = row.logo_url || '';
        
        let cachedBase64 = '';
        let cachedUrl = '';
        try {
          cachedBase64 = localStorage.getItem('pos_cached_logo_base64') || '';
          cachedUrl = localStorage.getItem('pos_cached_logo_url') || '';
        } catch (_) {}

        // If logo URL exists and either isn't cached or URL changed, cache in background
        if (currentUrl && (currentUrl !== cachedUrl || !cachedBase64)) {
          convertUrlToBase64(currentUrl).then((b64) => {
            if (b64) {
              try {
                localStorage.setItem('pos_cached_logo_base64', b64);
                localStorage.setItem('pos_cached_logo_url', currentUrl);
              } catch (_) {}
              setSettings((prev) => ({ ...prev, logoBase64: b64 }));
            }
          });
        }

        setSettings({
          id: row.id,
          enableDiscounts: row.enable_discounts,
          enableGst: row.enable_gst,
          gstPercentage: row.gst_percentage,
          invoiceStartNumber: row.invoice_start_number || 1000,
          logoUrl: currentUrl,
          logoBase64: (currentUrl === cachedUrl && cachedBase64) ? cachedBase64 : ''
        });
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    if (newSettings.logoUrl) {
      convertUrlToBase64(newSettings.logoUrl).then(b64 => {
        if (b64) {
          try {
            localStorage.setItem('pos_cached_logo_base64', b64);
            localStorage.setItem('pos_cached_logo_url', newSettings.logoUrl);
          } catch (_) {}
          setSettings(prev => ({ ...prev, logoBase64: b64 }));
        }
      });
    }
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
    fetchLoyaltySettings();
    fetchCustomers();
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
  }, [fetchPosSettings, fetchSuppliers, fetchLoyaltySettings, fetchCustomers]);

  useEffect(() => {
    fetchPosData();
  }, [fetchPosData]);

  // ── Realtime & Cross-tab Stock & Customer Synchronization ──────────────────
  useEffect(() => {
    // 1. Cross-tab and in-memory changes
    const unsubscribe = onStockChange((payload) => {
      fetchPosData();
      if (payload?.type === 'CUSTOMER_UPDATED' || payload?.type === 'CHECKOUT' || payload?.type === 'RETURN_PROCESSED' || payload?.type === 'DELETE_BILL') {
        fetchCustomers();
      }
    });

    // 2. Supabase Realtime channel for Batches and Customers
    const batchesChannel = supabase
      .channel('realtime_batches_pos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => {
        fetchPosData();
      })
      .subscribe();

    const customersChannel = supabase
      .channel('realtime_customers_pos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
        if (payload.new && payload.new.id) {
          setCustomers(prev => {
            const exists = prev.some(c => c.id === payload.new.id);
            return exists ? prev.map(c => c.id === payload.new.id ? payload.new : c) : [payload.new, ...prev];
          });
        } else {
          fetchCustomers();
        }
      })
      .subscribe();

    // 3. Tab visibility / window focus revalidation (throttled to at most once per 6 seconds)
    let lastFocusSync = 0;
    const handleFocusOrVisible = () => {
      const now = Date.now();
      if (now - lastFocusSync > 6000) {
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
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(customersChannel);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPosData, fetchCustomers]);

  const fetchBills = useCallback(async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, items:bill_items(*, product:products(name, model, category))')
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
  const checkoutPos = useCallback(async (paymentMode = 'UPI', tax = 0, discount = 0, customBillingDate = null, loyaltyInfo = null) => {
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

    // Calculate final billing timestamp
    let finalDate = new Date();
    if (customBillingDate) {
      const parts = String(customBillingDate).trim().split('-');
      if (parts.length === 3) {
        let y, m, d;
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          [y, m, d] = parts.map(Number);
        } else {
          // DD-MM-YYYY
          [d, m, y] = parts.map(Number);
        }
        if (y && m && d) {
          const now = new Date();
          finalDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        }
      }
    }

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

      // Update bill_date and created_at to the chosen billing date
      if (data?.bill_id) {
        const { error: updateErr } = await supabase
          .from('bills')
          .update({
            bill_date: finalDate.toISOString(),
            created_at: finalDate.toISOString()
          })
          .eq('id', data.bill_id);
        if (updateErr) console.warn('Could not update bill_date:', updateErr);
      }

      // ── Customer CRM & Loyalty Processing ──
      let pointsEarned = 0;
      let pointsBalance = 0;
      const cleanPhone = (customerInfo.phone || '').trim();

      if (cleanPhone) {
        try {
          const isLoyaltyEnabled = Boolean(loyaltySettings?.enable_loyalty);
          const rate = Number(loyaltySettings?.points_per_rupee) || 0.01;
          pointsEarned = isLoyaltyEnabled ? Math.floor(total * rate) : 0;
          const redeemedPoints = isLoyaltyEnabled ? (Number(loyaltyInfo?.points ?? loyaltyInfo?.redeemedPoints) || 0) : 0;

          // Check if customer exists in DB
          const { data: existingCust } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', cleanPhone)
            .maybeSingle();

          const vipSpend = Number(loyaltySettings?.vip_min_spend) || 30000;
          const goldSpend = Number(loyaltySettings?.gold_min_spend) || 15000;
          const silverSpend = Number(loyaltySettings?.silver_min_spend) || 5000;

          if (existingCust) {
            const newSpend = Number(existingCust.total_spend || 0) + total;
            const newVisits = Number(existingCust.visit_count || 0) + 1;
            const newLifetime = Number(existingCust.lifetime_points || 0) + pointsEarned;
            pointsBalance = Math.max(0, Number(existingCust.loyalty_points || 0) - redeemedPoints + pointsEarned);
            const newTier = newSpend >= vipSpend ? 'VIP' : newSpend >= goldSpend ? 'Gold' : newSpend >= silverSpend ? 'Silver' : 'Bronze';
            const resolvedName = customerInfo.name?.trim() || existingCust.name || `Customer (${cleanPhone})`;

            await supabase.from('customers').update({
              name: resolvedName,
              total_spend: newSpend,
              visit_count: newVisits,
              loyalty_points: pointsBalance,
              lifetime_points: newLifetime,
              tier: newTier,
              last_visit_at: finalDate.toISOString()
            }).eq('id', existingCust.id);

            // Update in-memory customers state immediately
            setCustomers(prev => prev.map(c => c.id === existingCust.id ? {
              ...c,
              name: resolvedName,
              total_spend: newSpend,
              visit_count: newVisits,
              loyalty_points: pointsBalance,
              lifetime_points: newLifetime,
              tier: newTier,
              last_visit_at: finalDate.toISOString()
            } : c));

            if (isLoyaltyEnabled) {
              if (redeemedPoints > 0) {
                await supabase.from('loyalty_transactions').insert([{
                  customer_id: existingCust.id,
                  points: -redeemedPoints,
                  type: 'redeem_pos',
                  bill_id: data.bill_id,
                  description: `Redeemed at checkout for Bill #${data.bill_no}`
                }]).catch(() => {});
              }
              if (pointsEarned > 0) {
                await supabase.from('loyalty_transactions').insert([{
                  customer_id: existingCust.id,
                  points: pointsEarned,
                  type: 'earn_pos',
                  bill_id: data.bill_id,
                  description: `Earned from POS Bill #${data.bill_no}`
                }]).catch(() => {});
              }
            }
          } else {
            // New customer registration on-the-fly
            pointsBalance = pointsEarned;
            const newTier = total >= vipSpend ? 'VIP' : total >= goldSpend ? 'Gold' : total >= silverSpend ? 'Silver' : 'Bronze';
            const newCustName = customerInfo.name?.trim() || `Customer (${cleanPhone})`;

            const { data: createdCust } = await supabase.from('customers').insert([{
              name: newCustName,
              phone: cleanPhone,
              total_spend: total,
              visit_count: 1,
              loyalty_points: pointsEarned,
              lifetime_points: pointsEarned,
              tier: newTier,
              last_visit_at: finalDate.toISOString()
            }]).select().single().catch(() => ({ data: null }));

            if (createdCust) {
              setCustomers(prev => [createdCust, ...prev]);
              if (isLoyaltyEnabled && pointsEarned > 0) {
                await supabase.from('loyalty_transactions').insert([{
                  customer_id: createdCust.id,
                  points: pointsEarned,
                  type: 'earn_pos',
                  bill_id: data.bill_id,
                  description: `First purchase rewards from POS Bill #${data.bill_no}`
                }]).catch(() => {});
              }
            }
          }
        } catch (crmErr) {
          console.warn('CRM sync error (skipped non-blocking):', crmErr);
        }
      }
      
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
        time: finalDate,
        loyalty: cleanPhone && loyaltySettings?.enable_loyalty ? {
          pointsEarned,
          redeemedPoints: Number(loyaltyInfo?.points ?? loyaltyInfo?.redeemedPoints) || 0,
          balance: pointsBalance
        } : null
      });

      // Optimistically decrement sold batch quantities in memory right away so stock adjusts with 0ms lag
      setBatches(prev => {
        const soldBatchMap = new Map();
        posCart.forEach(item => {
          if (item.batch_id) {
            soldBatchMap.set(item.batch_id, (soldBatchMap.get(item.batch_id) || 0) + item.quantity);
          }
        });
        if (soldBatchMap.size === 0) return prev;
        return prev.map(b => {
          if (soldBatchMap.has(b.id)) {
            return { ...b, quantity: Math.max(0, (Number(b.quantity) || 0) - soldBatchMap.get(b.id)) };
          }
          return b;
        });
      });

      // Background silent sync
      fetchPosData().catch(err => console.warn('Background POS fetch error:', err));
      broadcastStockChange('CHECKOUT', { billNo: data.bill_no, billId: data.bill_id });
      return { success: true, billId: data.bill_id, billNo: data.bill_no };
    } catch (err) {
      console.error('Checkout failed:', err);
      throw err;
    }
  }, [posCart, customerInfo, clearPosCart, fetchPosData]);

  // Delete Bill with Automatic CRM & Loyalty Reversal (Option A with Net Return Deduction)
  const deleteBill = useCallback(async (billId) => {
    try {
      let targetBill = bills.find(b => b.id === billId);
      if (!targetBill || !targetBill.items) {
        const { data } = await supabase.from('bills').select('*, items:bill_items(*)').eq('id', billId).maybeSingle();
        if (data) targetBill = data;
      }

      const cleanPhone = (targetBill?.customer_phone || '').trim();
      if (cleanPhone) {
        try {
          const { data: cust } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (cust) {
            // Calculate any amount already returned on this bill previously
            const alreadyReturnedAmount = (targetBill?.items || []).reduce((sum, item) => {
              const retQty = Number(item.returned_quantity) || 0;
              const uPrice = Number(item.unit_price) || 0;
              return sum + (retQty * uPrice);
            }, 0);

            const billTotal = Number(targetBill?.total || 0);
            // Net remaining spend on this bill that hasn't been refunded yet
            const netRemainingSpend = Math.max(0, billTotal - alreadyReturnedAmount);

            // Find points earned and redeemed for this bill
            const { data: txList } = await supabase
              .from('loyalty_transactions')
              .select('*')
              .eq('bill_id', billId);

            let pointsEarnedOnBill = 0;
            let pointsAlreadyReversedOnReturns = 0;
            let pointsRedeemedOnBill = 0;

            if (txList && txList.length > 0) {
              txList.forEach(tx => {
                const ptVal = Number(tx.points) || 0;
                if (tx.type === 'earn_pos' || (ptVal > 0 && tx.type !== 'refund')) {
                  pointsEarnedOnBill += ptVal;
                } else if (tx.type === 'reverse_return') {
                  pointsAlreadyReversedOnReturns += Math.abs(ptVal);
                } else if (tx.type === 'redeem_pos' || (ptVal < 0 && tx.type !== 'reverse_return')) {
                  pointsRedeemedOnBill += Math.abs(ptVal);
                }
              });
            } else {
              const rate = Number(loyaltySettings?.points_per_rupee) || 0.01;
              pointsEarnedOnBill = Math.floor(billTotal * rate);
            }

            // Only deduct remaining points that were not already reversed by prior returns
            const netPointsToDeduct = Math.max(0, pointsEarnedOnBill - pointsAlreadyReversedOnReturns);

            const newSpend = Math.max(0, Number(cust.total_spend || 0) - netRemainingSpend);
            const newVisits = Math.max(0, Number(cust.visit_count || 1) - 1);
            const newPoints = Math.max(0, Number(cust.loyalty_points || 0) - netPointsToDeduct + pointsRedeemedOnBill);
            const newLifetime = Math.max(0, Number(cust.lifetime_points || 0) - netPointsToDeduct);

            const vipSpend = Number(loyaltySettings?.vip_min_spend) || 30000;
            const goldSpend = Number(loyaltySettings?.gold_min_spend) || 15000;
            const silverSpend = Number(loyaltySettings?.silver_min_spend) || 5000;
            const newTier = newSpend >= vipSpend ? 'VIP' : newSpend >= goldSpend ? 'Gold' : newSpend >= silverSpend ? 'Silver' : 'Bronze';

            await supabase.from('customers').update({
              total_spend: newSpend,
              visit_count: newVisits,
              loyalty_points: newPoints,
              lifetime_points: newLifetime,
              tier: newTier
            }).eq('id', cust.id);

            const netAdjustment = pointsRedeemedOnBill - netPointsToDeduct;
            await supabase.from('loyalty_transactions').insert([{
              customer_id: cust.id,
              points: netAdjustment,
              type: 'reverse_bill_delete',
              description: `Points adjustment for deleted Bill #${targetBill.bill_no || ''} (${pointsRedeemedOnBill > 0 ? `+${pointsRedeemedOnBill} pts refunded, ` : ''}-${netPointsToDeduct} net pts deducted)`
            }]).catch(() => {});

            // Update in-memory CRM state immediately
            setCustomers(prev => prev.map(c => c.id === cust.id ? {
              ...c,
              total_spend: newSpend,
              visit_count: newVisits,
              loyalty_points: newPoints,
              lifetime_points: newLifetime,
              tier: newTier
            } : c));
          }
        } catch (crmErr) {
          console.warn('CRM reversal error on bill delete:', crmErr);
        }
      }

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
  }, [bills, loyaltySettings, fetchPosData]);

  // Process Item Return in CRM & Loyalty (Option A)
  const processItemReturnLoyalty = useCallback(async (bill, itemsToReturn) => {
    const cleanPhone = (bill?.customer_phone || '').trim();
    if (!cleanPhone) return;

    try {
      const { data: cust } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!cust) return;

      const totalRefundAmount = itemsToReturn.reduce((sum, r) => {
        const item = (bill.items || []).find(i => i.id === r.bill_item_id);
        const unitPrice = Number(item?.unit_price || 0);
        return sum + (unitPrice * r.return_qty);
      }, 0);

      if (totalRefundAmount <= 0) return;

      const rate = Number(loyaltySettings?.points_per_rupee) || 0.01;
      const pointsToDeduct = Math.floor(totalRefundAmount * rate);

      const newSpend = Math.max(0, Number(cust.total_spend || 0) - totalRefundAmount);
      const newPoints = Math.max(0, Number(cust.loyalty_points || 0) - pointsToDeduct);
      const newLifetime = Math.max(0, Number(cust.lifetime_points || 0) - pointsToDeduct);

      const vipSpend = Number(loyaltySettings?.vip_min_spend) || 30000;
      const goldSpend = Number(loyaltySettings?.gold_min_spend) || 15000;
      const silverSpend = Number(loyaltySettings?.silver_min_spend) || 5000;
      const newTier = newSpend >= vipSpend ? 'VIP' : newSpend >= goldSpend ? 'Gold' : newSpend >= silverSpend ? 'Silver' : 'Bronze';

      await supabase.from('customers').update({
        total_spend: newSpend,
        loyalty_points: newPoints,
        lifetime_points: newLifetime,
        tier: newTier
      }).eq('id', cust.id);

      if (pointsToDeduct > 0) {
        await supabase.from('loyalty_transactions').insert([{
          customer_id: cust.id,
          points: -pointsToDeduct,
          type: 'reverse_return',
          bill_id: bill.id,
          description: `Deducted ${pointsToDeduct} pts for return of items (₹${totalRefundAmount.toFixed(2)}) on Bill #${bill.bill_no || ''}`
        }]).catch(() => {});
      }

      setCustomers(prev => prev.map(c => c.id === cust.id ? {
        ...c,
        total_spend: newSpend,
        loyalty_points: newPoints,
        lifetime_points: newLifetime,
        tier: newTier
      } : c));
    } catch (err) {
      console.warn('Item return loyalty sync error:', err);
    }
  }, [loyaltySettings]);

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
    processItemReturnLoyalty,
    updateBatch,
    deleteBatch,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    customers,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    loyaltySettings,
    fetchLoyaltySettings,
    updateLoyaltySettings,
    fetchCustomerHistory,
    crmLoading
  };

  return <PosStoreContext.Provider value={value}>{children}</PosStoreContext.Provider>;
}

export function usePosStore() {
  const ctx = useContext(PosStoreContext);
  if (!ctx) throw new Error('usePosStore must be used within <PosStoreProvider>');
  return ctx;
}
