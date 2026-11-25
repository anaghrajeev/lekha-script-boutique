import React, { useState, useEffect, useMemo } from 'react';
import PosLayout from './PosLayout';
import { usePosStore } from '../../store/usePosStore.jsx';
import { toast } from 'react-hot-toast';

export default function PosCrmPage({ onLogout }) {
  const { 
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
  } = usePosStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState({ bills: [], onlineOrders: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLoyaltySettingsModal, setShowLoyaltySettingsModal] = useState(false);
  const [showAdjustPointsModal, setShowAdjustPointsModal] = useState(false);

  // Forms
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    loyalty_points: 0
  });

  const [loyaltyForm, setLoyaltyForm] = useState({
    points_per_rupee: 0.01,
    rupees_per_point: 1.0,
    min_points_to_redeem: 50,
    silver_min_spend: 5000,
    gold_min_spend: 15000,
    vip_min_spend: 30000,
    enable_loyalty: true
  });

  const [adjustPointsData, setAdjustPointsData] = useState({
    points: '',
    reason: ''
  });

  useEffect(() => {
    fetchCustomers();
    fetchLoyaltySettings();
  }, [fetchCustomers, fetchLoyaltySettings]);

  useEffect(() => {
    if (loyaltySettings) {
      setLoyaltyForm({
        points_per_rupee: loyaltySettings.points_per_rupee ?? 0.01,
        rupees_per_point: loyaltySettings.rupees_per_point ?? 1.0,
        min_points_to_redeem: loyaltySettings.min_points_to_redeem ?? 50,
        silver_min_spend: loyaltySettings.silver_min_spend ?? 5000,
        gold_min_spend: loyaltySettings.gold_min_spend ?? 15000,
        vip_min_spend: loyaltySettings.vip_min_spend ?? 30000,
        enable_loyalty: loyaltySettings.enable_loyalty ?? true
      });
    }
  }, [loyaltySettings]);

  // Load history when a customer is selected
  useEffect(() => {
    if (selectedCustomer?.phone) {
      setLoadingHistory(true);
      fetchCustomerHistory(selectedCustomer.phone)
        .then(res => setCustomerHistory(res))
        .finally(() => setLoadingHistory(false));
    } else {
      setCustomerHistory({ bills: [], onlineOrders: [] });
    }
  }, [selectedCustomer, fetchCustomerHistory]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || 
        c.name?.toLowerCase().includes(q) || 
        c.phone?.toLowerCase().includes(q) || 
        c.notes?.toLowerCase().includes(q);
      
      const matchTier = tierFilter === 'ALL' || (c.tier || 'Bronze').toUpperCase() === tierFilter.toUpperCase();
      return matchSearch && matchTier;
    });
  }, [customers, searchQuery, tierFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalSpend = customers.reduce((sum, c) => sum + (Number(c.total_spend) || 0), 0);
    const totalPoints = customers.reduce((sum, c) => sum + (Number(c.loyalty_points) || 0), 0);
    const vipCount = customers.filter(c => c.tier === 'VIP' || c.tier === 'Gold').length;
    return { totalCustomers, totalSpend, totalPoints, vipCount };
  }, [customers]);

  // Inferred sizing & product insights for selected customer
  const customerInsights = useMemo(() => {
    if (!customerHistory.bills && !customerHistory.onlineOrders) return { sizes: [], categories: [] };
    
    const sizeCount = {};
    const catCount = {};

    // Analyze POS bills
    customerHistory.bills.forEach(bill => {
      (bill.items || []).forEach(item => {
        const size = (item.size || item.product?.size || '').trim().toUpperCase();
        if (size) sizeCount[size] = (sizeCount[size] || 0) + (item.quantity || 1);
        
        const cat = (item.product?.category || '').trim().toUpperCase();
        if (cat) catCount[cat] = (catCount[cat] || 0) + (item.quantity || 1);
      });
    });

    // Analyze Online orders
    customerHistory.onlineOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const size = (item.size || item.product?.size || '').trim().toUpperCase();
        if (size) sizeCount[size] = (sizeCount[size] || 0) + (item.quantity || 1);
        
        const cat = (item.product?.category || '').trim().toUpperCase();
        if (cat) catCount[cat] = (catCount[cat] || 0) + (item.quantity || 1);
      });
    });

    const sortedSizes = Object.entries(sizeCount).sort((a, b) => b[1] - a[1]);
    const sortedCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
    return { sizes: sortedSizes, categories: sortedCats };
  }, [customerHistory]);

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.phone.trim()) {
      toast.error('Customer phone number is required');
      return;
    }
    try {
      if (showEditModal && selectedCustomer) {
        await updateCustomer(selectedCustomer.id, {
          name: customerForm.name.trim() || 'Walk-in',
          phone: customerForm.phone.trim(),
          email: customerForm.email.trim() || null,
          address: customerForm.address.trim() || null,
          notes: customerForm.notes.trim() || null
        });
        toast.success('Customer updated successfully');
        setShowEditModal(false);
      } else {
        await addCustomer({
          name: customerForm.name.trim() || 'Walk-in',
          phone: customerForm.phone.trim(),
          email: customerForm.email.trim() || null,
          address: customerForm.address.trim() || null,
          notes: customerForm.notes.trim() || null,
          loyalty_points: Number(customerForm.loyalty_points) || 0,
          lifetime_points: Number(customerForm.loyalty_points) || 0,
          total_spend: 0,
          visit_count: 0
        });
        toast.success('New customer created');
        setShowAddModal(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save customer');
    }
  };

  const handleSaveLoyaltySettings = async (e) => {
    e.preventDefault();
    try {
      await updateLoyaltySettings({
        ...loyaltySettings,
        ...loyaltyForm
      });
      toast.success('Loyalty settings updated successfully');
      setShowLoyaltySettingsModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update settings');
    }
  };

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    const pts = Number(adjustPointsData.points);
    if (isNaN(pts) || pts === 0) {
      toast.error('Please enter a valid positive or negative number');
      return;
    }
    try {
      const currentPoints = Number(selectedCustomer.loyalty_points) || 0;
      const newPoints = Math.max(0, currentPoints + pts);
      await updateCustomer(selectedCustomer.id, { loyalty_points: newPoints });
      setSelectedCustomer(prev => ({ ...prev, loyalty_points: newPoints }));
      toast.success(`Points updated to ${newPoints}`);
      setShowAdjustPointsModal(false);
      setAdjustPointsData({ points: '', reason: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to adjust points');
    }
  };

  const getTierColor = (tier) => {
    switch ((tier || '').toUpperCase()) {
      case 'VIP': return { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' };
      case 'GOLD': return { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' };
      case 'SILVER': return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
      default: return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' }; // Bronze
    }
  };

  return (
    <PosLayout activeTab="crm" onLogout={onLogout}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
        
        {/* Top Header & Metrics */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="font-serif text-headline-lg" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>loyalty</span>
              Customer CRM & Loyalty
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--on-surface-variant)', fontSize: '14px' }}>
              Omnichannel customer intelligence, purchase history, and loyalty reward tiers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowLoyaltySettingsModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--outline)',
                backgroundColor: 'var(--surface)', color: 'var(--on-surface)',
                fontWeight: '600', fontSize: '13px', cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>tune</span>
              Loyalty Settings
            </button>
            <button
              onClick={() => {
                setCustomerForm({ name: '', phone: '', email: '', address: '', notes: '', loyalty_points: 0 });
                setShowAddModal(true);
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
              Add Customer
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--surface-container)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Total Customers</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: 'var(--primary)' }}>{stats.totalCustomers}</div>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>In-store & Online Shoppers</div>
          </div>

          <div style={{ backgroundColor: 'var(--surface-container)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Combined Lifetime Spend</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: 'var(--on-surface)' }}>₹{stats.totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>Total Gross Revenue Tracked</div>
          </div>

          <div style={{ backgroundColor: 'var(--surface-container)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Active Loyalty Points</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: '#16a34a' }}>★ {stats.totalPoints.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>Value: ₹{(stats.totalPoints * (loyaltySettings?.rupees_per_point || 1)).toLocaleString('en-IN')}</div>
          </div>

          <div style={{ backgroundColor: 'var(--surface-container)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Gold & VIP Members</div>
            <div style={{ fontSize: '26px', fontWeight: '700', marginTop: '4px', color: '#d97706' }}>{stats.vipCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>High-Value Patrons</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }}>search</span>
            <input
              type="text"
              placeholder="Search by name, phone, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 40px',
                borderRadius: '8px', border: '1px solid var(--outline-variant)',
                backgroundColor: 'var(--surface)', fontSize: '14px', outline: 'none'
              }}
            />
          </div>

          {/* Tier Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'BRONZE', 'SILVER', 'GOLD', 'VIP'].map(tier => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                style={{
                  padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                  border: '1px solid var(--outline-variant)',
                  backgroundColor: tierFilter === tier ? 'var(--primary)' : 'var(--surface)',
                  color: tierFilter === tier ? 'white' : 'var(--on-surface-variant)',
                  cursor: 'pointer'
                }}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area: Customers Table & Slide-over Drawer */}
        <div style={{ flex: 1, display: 'flex', gap: '20px', overflow: 'hidden' }}>
          
          {/* Customers Table */}
          <div style={{ flex: selectedCustomer ? 1.5 : 1, backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--outline-variant)', overflowY: 'auto' }}>
            {crmLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
                Loading customers...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '8px' }}>person_off</span>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>No customers found</p>
                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Try adjusting your search or add a new customer.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface-container-high)', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Customer</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Tier</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Total Spend</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Visits</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Points</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600' }}>Last Visit</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => {
                    const isSelected = selectedCustomer?.id === customer.id;
                    const tierStyle = getTierColor(customer.tier);
                    const cleanPhone = customer.phone?.replace(/[^0-9]/g, '');

                    return (
                      <tr 
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        style={{
                          borderBottom: '1px solid var(--outline-variant)',
                          backgroundColor: isSelected ? 'var(--primary-container)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--on-surface)' }}>{customer.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{customer.phone}</div>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 8px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: '700',
                            backgroundColor: tierStyle.bg, color: tierStyle.text, border: `1px solid ${tierStyle.border}`
                          }}>
                            {customer.tier || 'Bronze'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>
                          ₹{Number(customer.total_spend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '500' }}>
                          {customer.visit_count || 1}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>
                          ★ {customer.loyalty_points || 0}
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: '12.5px', color: 'var(--on-surface-variant)' }}>
                          {customer.last_visit_at ? new Date(customer.last_visit_at).toLocaleDateString('en-GB') : '-'}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(`Hi ${customer.name}, greetings from Lekha Script Inner Concepts!`)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: '32px', height: '32px', borderRadius: '6px',
                                  backgroundColor: '#25D366', color: 'white', textDecoration: 'none'
                                }}
                                title="Chat on WhatsApp"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat</span>
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setCustomerForm({
                                  name: customer.name || '',
                                  phone: customer.phone || '',
                                  email: customer.email || '',
                                  address: customer.address || '',
                                  notes: customer.notes || '',
                                  loyalty_points: customer.loyalty_points || 0
                                });
                                setShowEditModal(true);
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '32px', height: '32px', borderRadius: '6px',
                                border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)',
                                cursor: 'pointer', color: 'var(--on-surface-variant)'
                              }}
                              title="Edit Customer"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Customer Detail Drawer / Side Panel */}
          {selectedCustomer && (
            <div style={{
              flex: 1, backgroundColor: 'var(--surface)', borderRadius: '12px',
              border: '1px solid var(--outline-variant)', display: 'flex', flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Drawer Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-container)' }}>
                <div>
                  <h3 className="font-serif" style={{ margin: 0, fontSize: '18px' }}>{selectedCustomer.name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{selectedCustomer.phone}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowAdjustPointsModal(true)}
                    style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--outline)', backgroundColor: 'var(--surface)', cursor: 'pointer', fontWeight: '600' }}
                    title="Add or deduct points"
                  >
                    Adjust Points
                  </button>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Stats Summary in Drawer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>LOYALTY BALANCE</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a', marginTop: '2px' }}>★ {selectedCustomer.loyalty_points || 0}</div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Value: ₹{(Number(selectedCustomer.loyalty_points || 0) * (loyaltySettings?.rupees_per_point || 1)).toFixed(2)}</div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>MEMBERSHIP TIER</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', marginTop: '4px' }}>{selectedCustomer.tier || 'Bronze'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Lifetime Spend: ₹{Number(selectedCustomer.total_spend || 0).toFixed(0)}</div>
                  </div>
                </div>

                {/* Boutique Smart Insights (Sizes & Categories) */}
                <div style={{ padding: '16px', backgroundColor: 'var(--surface-container)', borderRadius: '10px', border: '1px solid var(--outline-variant)' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>auto_awesome</span>
                    Boutique Insights & Sizing
                  </div>

                  {loadingHistory ? (
                    <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Analyzing shopping habits...</div>
                  ) : (customerInsights.sizes.length === 0 && customerInsights.categories.length === 0) ? (
                    <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>No item sizing details recorded yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {customerInsights.sizes.length > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>FREQUENT SIZES:</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {customerInsights.sizes.slice(0, 4).map(([size, count]) => (
                              <span key={size} style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--surface)', fontSize: '12px', fontWeight: '600', border: '1px solid var(--outline-variant)' }}>
                                {size} ({count} pcs)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {customerInsights.categories.length > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>PREFERRED CATEGORIES:</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {customerInsights.categories.slice(0, 4).map(([cat, count]) => (
                              <span key={cat} style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--surface)', fontSize: '12px', fontWeight: '600', border: '1px solid var(--outline-variant)' }}>
                                {cat} ({count})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Private Staff Notes */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>Customer Notes:</div>
                  <div style={{ padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px', fontSize: '13px', minHeight: '60px', color: selectedCustomer.notes ? 'var(--on-surface)' : 'var(--on-surface-variant)', fontStyle: selectedCustomer.notes ? 'normal' : 'italic' }}>
                    {selectedCustomer.notes || 'No notes added for this customer yet.'}
                  </div>
                </div>

                {/* Purchase History Timeline */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Purchase History ({customerHistory.bills.length + customerHistory.onlineOrders.length})</span>
                  </div>

                  {loadingHistory ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Loading purchases...</div>
                  ) : (customerHistory.bills.length === 0 && customerHistory.onlineOrders.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--on-surface-variant)', fontSize: '13px' }}>No previous invoices found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* POS Bills */}
                      {customerHistory.bills.map(bill => (
                        <div key={bill.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '13px' }}>
                            <span>In-Store: {bill.bill_no}</span>
                            <span>₹{Number(bill.total).toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                            <span>{new Date(bill.bill_date || bill.created_at).toLocaleDateString('en-GB')} | {bill.payment_mode || 'Cash'}</span>
                            <span>{bill.items?.length || 0} items</span>
                          </div>
                        </div>
                      ))}

                      {/* Online Orders */}
                      {customerHistory.onlineOrders.map(order => (
                        <div key={order.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '13px' }}>
                            <span>Online: {order.order_no}</span>
                            <span>₹{Number(order.total).toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                            <span>{new Date(order.created_at).toLocaleDateString('en-GB')} | Status: {order.status}</span>
                            <span>{order.items?.length || 0} items</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* Modal: Add / Edit Customer */}
      {(showAddModal || showEditModal) && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true" style={{ zIndex: 9999 }}>
          <div className="admin-confirm-box" style={{ maxWidth: '480px', textAlign: 'left' }}>
            <h3 className="font-serif" style={{ margin: '0 0 16px', fontSize: '20px' }}>
              {showEditModal ? 'Edit Customer' : 'Add New Customer'}
            </h3>

            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anagha Nair"
                  value={customerForm.name}
                  onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Phone Number (10 digits) *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9745298723"
                  value={customerForm.phone}
                  onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Email (Optional)</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={customerForm.email}
                  onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Delivery Address (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="House name, street, city..."
                  value={customerForm.address}
                  onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Private Staff Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Preferences, preferred bra sizes, etc."
                  value={customerForm.notes}
                  onChange={e => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)', resize: 'vertical' }}
                />
              </div>

              {!showEditModal && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Initial Loyalty Points</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={customerForm.loyalty_points}
                    onChange={e => setCustomerForm({ ...customerForm, loyalty_points: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {showEditModal ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Loyalty Settings */}
      {showLoyaltySettingsModal && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true" style={{ zIndex: 9999 }}>
          <div className="admin-confirm-box" style={{ maxWidth: '520px', textAlign: 'left' }}>
            <h3 className="font-serif" style={{ margin: '0 0 16px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>tune</span>
              Loyalty Program Settings
            </h3>

            <form onSubmit={handleSaveLoyaltySettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--surface-container)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>Enable Loyalty Rewards</div>
                  <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Award and redeem points on POS & Online checkouts</div>
                </div>
                <input
                  type="checkbox"
                  checked={loyaltyForm.enable_loyalty}
                  onChange={e => setLoyaltyForm({ ...loyaltyForm, enable_loyalty: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Points per ₹100 Spent</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={(loyaltyForm.points_per_rupee * 100).toFixed(1)}
                    onChange={e => setLoyaltyForm({ ...loyaltyForm, points_per_rupee: (parseFloat(e.target.value) || 0) / 100 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>e.g. 1 point = 1% cashback</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Rupee Value per Point (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={loyaltyForm.rupees_per_point}
                    onChange={e => setLoyaltyForm({ ...loyaltyForm, rupees_per_point: parseFloat(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>e.g. 1 point = ₹1.00 discount</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Minimum Points to Redeem</label>
                <input
                  type="number"
                  min="0"
                  value={loyaltyForm.min_points_to_redeem}
                  onChange={e => setLoyaltyForm({ ...loyaltyForm, min_points_to_redeem: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>Prevents tiny point redemptions (e.g. 50 points = ₹50 off)</div>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Tier Spend Thresholds (₹)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Silver Tier (₹)</label>
                    <input
                      type="number"
                      value={loyaltyForm.silver_min_spend}
                      onChange={e => setLoyaltyForm({ ...loyaltyForm, silver_min_spend: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Gold Tier (₹)</label>
                    <input
                      type="number"
                      value={loyaltyForm.gold_min_spend}
                      onChange={e => setLoyaltyForm({ ...loyaltyForm, gold_min_spend: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>VIP Tier (₹)</label>
                    <input
                      type="number"
                      value={loyaltyForm.vip_min_spend}
                      onChange={e => setLoyaltyForm({ ...loyaltyForm, vip_min_spend: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowLoyaltySettingsModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Loyalty Points */}
      {showAdjustPointsModal && selectedCustomer && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true" style={{ zIndex: 9999 }}>
          <div className="admin-confirm-box" style={{ maxWidth: '400px', textAlign: 'left' }}>
            <h3 className="font-serif" style={{ margin: '0 0 8px', fontSize: '18px' }}>
              Adjust Points: {selectedCustomer.name}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
              Current balance: <strong>★ {selectedCustomer.loyalty_points || 0}</strong> points
            </p>

            <form onSubmit={handleAdjustPoints} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Points to Add or Deduct (+/-)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50 or -50"
                  value={adjustPointsData.points}
                  onChange={e => setAdjustPointsData({ ...adjustPointsData, points: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Reason / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special anniversary bonus"
                  value={adjustPointsData.reason}
                  onChange={e => setAdjustPointsData({ ...adjustPointsData, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdjustPointsModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </PosLayout>
  );
}
