import React, { useMemo, useEffect, useState } from 'react';
import PosLayout from './PosLayout';
import { usePosStore } from '../../store/usePosStore';

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PosAnalyticsPage = ({ onLogout }) => {
  const { bills, batches, fetchBills, fetchPosData } = usePosStore();

  const [startDate, setStartDate] = useState(getTodayStr);
  const [endDate, setEndDate] = useState(getTodayStr);
  const [showAllLowStock, setShowAllLowStock] = useState(false);

  useEffect(() => {
    fetchBills(1000); // fetch more for analytics
    fetchPosData();
  }, [fetchBills, fetchPosData]);

  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const rawDate = b.created_at || b.bill_date;
      if (!rawDate) return false;
      const billDate = new Date(rawDate);
      if (isNaN(billDate.getTime())) return false;

      if (startDate) {
        const [y, m, d] = startDate.split('-').map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        if (billDate < start) return false;
      }
      if (endDate) {
        const [y, m, d] = endDate.split('-').map(Number);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        if (billDate > end) return false;
      }
      return true;
    });
  }, [bills, startDate, endDate]);

  const { totalRevenue, totalTax, totalDiscount, returnedRevenue, totalCogs } = useMemo(() => {
    let rev = 0, tax = 0, disc = 0, retRev = 0, cogs = 0;
    filteredBills.forEach(b => {
      rev += Number(b.total) || 0;
      tax += Number(b.tax) || 0;
      disc += Number(b.discount) || 0;

      // Calculate returned revenue and COGS
      if (b.items) {
        b.items.forEach(item => {
          const qty = item.quantity;
          const retQty = item.returned_quantity || 0;
          const netQty = qty - retQty;
          
          retRev += retQty * Number(item.unit_price);
          cogs += netQty * Number(item.cost_price || 0);
        });
      }
    });
    return { totalRevenue: rev, totalTax: tax, totalDiscount: disc, returnedRevenue: retRev, totalCogs: cogs };
  }, [filteredBills]);

  const netRevenue = totalRevenue - returnedRevenue;
  const grossProfit = netRevenue - totalCogs;

  const { cashTotal, cardTotal, upiTotal } = useMemo(() => {
    let cash = 0, card = 0, upi = 0;
    filteredBills.forEach(b => {
      const mode = (b.payment_mode || '').trim();
      const amount = Number(b.total) || 0;
      const lower = mode.toLowerCase();
      if (lower === 'cash') {
        cash += amount;
      } else if (lower === 'card') {
        card += amount;
      } else if (lower === 'upi') {
        upi += amount;
      } else if (lower.startsWith('split')) {
        // e.g. "Split (Cash: ₹100.00, UPI: ₹98.00)"
        const cashMatch = mode.match(/Cash:?\s*₹?\s*([\d.]+)/i);
        const cardMatch = mode.match(/Card:?\s*₹?\s*([\d.]+)/i);
        const upiMatch = mode.match(/UPI:?\s*₹?\s*([\d.]+)/i);
        if (cashMatch) cash += parseFloat(cashMatch[1]) || 0;
        if (cardMatch) card += parseFloat(cardMatch[1]) || 0;
        if (upiMatch) upi += parseFloat(upiMatch[1]) || 0;
      }
    });
    return { cashTotal: cash, cardTotal: card, upiTotal: upi };
  }, [filteredBills]);

  const lowStockBatches = useMemo(() => {
    return batches.filter(b => b.quantity <= 5).sort((a, b) => a.quantity - b.quantity);
  }, [batches]);

  const topSellingProducts = useMemo(() => {
    const productSales = {};
    filteredBills.forEach(b => {
      if (b.items) {
        b.items.forEach(item => {
          const qty = item.quantity - (item.returned_quantity || 0);
          if (qty > 0) {
            productSales[item.product_id] = productSales[item.product_id] || { name: item.product?.name || 'Unknown', qty: 0, revenue: 0 };
            productSales[item.product_id].qty += qty;
            productSales[item.product_id].revenue += qty * Number(item.unit_price);
          }
        });
      }
    });
    return Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredBills]);

  return (
    <PosLayout activeTab="analytics" onLogout={onLogout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 className="font-serif text-headline-lg" style={{ marginBottom: '8px' }}>Analytics & Reports</h1>
          <p className="text-body-md" style={{ color: 'var(--on-surface-variant)' }}>Overview of POS performance</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--outline)', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--outline)', fontSize: '14px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
            <button 
              type="button"
              onClick={() => { const today = getTodayStr(); setStartDate(today); setEndDate(today); }}
              style={{ 
                padding: '8px 14px', 
                borderRadius: '6px', 
                border: '1px solid var(--outline)', 
                backgroundColor: (startDate === getTodayStr() && endDate === getTodayStr()) ? 'var(--primary)' : 'var(--surface)', 
                color: (startDate === getTodayStr() && endDate === getTodayStr()) ? '#fff' : 'var(--on-surface)', 
                fontWeight: '600', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Today
            </button>
            {(startDate || endDate) && (
              <button 
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{ padding: '8px 12px', color: 'var(--primary)', fontWeight: '600', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div style={{ padding: '24px', backgroundColor: 'var(--surface-container)', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
          <div style={{ color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Net Revenue</div>
          <div className="font-serif text-display-lg" style={{ fontSize: '32px' }}>₹{netRevenue.toFixed(2)}</div>
        </div>
        <div style={{ padding: '24px', backgroundColor: 'var(--surface-container)', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
          <div style={{ color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Gross Profit</div>
          <div className="font-serif text-display-lg" style={{ fontSize: '32px', color: 'var(--primary)' }}>₹{grossProfit.toFixed(2)}</div>
        </div>
        <div style={{ padding: '24px', backgroundColor: 'var(--surface-container)', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
          <div style={{ color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Total Bills</div>
          <div className="font-serif text-display-lg" style={{ fontSize: '32px' }}>{filteredBills.length}</div>
        </div>
        <div style={{ padding: '24px', backgroundColor: 'var(--surface-container)', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
          <div style={{ color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Total Refunds</div>
          <div className="font-serif text-display-lg" style={{ fontSize: '32px', color: 'var(--error)' }}>₹{returnedRevenue.toFixed(2)}</div>
        </div>
      </div>

      {/* Collection Breakdown / EOD Summary */}
      <div style={{ backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', border: '1px solid var(--outline-variant)', padding: '24px', marginBottom: '32px' }}>
        <h2 className="font-serif" style={{ marginBottom: '16px' }}>Collection Breakdown (EOD Summary)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--outline)' }}>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cash</div>
            <div style={{ fontSize: '24px', fontWeight: '600' }}>₹{cashTotal.toFixed(2)}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--outline)' }}>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>UPI</div>
            <div style={{ fontSize: '24px', fontWeight: '600' }}>₹{upiTotal.toFixed(2)}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--outline)' }}>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Card</div>
            <div style={{ fontSize: '24px', fontWeight: '600' }}>₹{cardTotal.toFixed(2)}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px dashed var(--outline)' }}>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Collected</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary)' }}>₹{(cashTotal + upiTotal + cardTotal).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Top Products */}
        <div style={{ backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', border: '1px solid var(--outline-variant)', padding: '24px' }}>
          <h2 className="font-serif" style={{ marginBottom: '16px' }}>Top Selling Products</h2>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--outline)' }}>
                <th style={{ padding: '8px 0' }}>Product</th>
                <th style={{ padding: '8px 0', textAlign: 'right' }}>Qty Sold</th>
                <th style={{ padding: '8px 0', textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topSellingProducts.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                  <td style={{ padding: '12px 0' }}>{p.name}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>{p.qty}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>₹{p.revenue.toFixed(2)}</td>
                </tr>
              ))}
              {topSellingProducts.length === 0 && <tr><td colSpan="3" style={{ padding: '16px 0', color: 'var(--on-surface-variant)' }}>No sales data.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Low Stock Alerts */}
        <div style={{ backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', border: '1px solid var(--outline-variant)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="font-serif" style={{ margin: 0, color: 'var(--error)' }}>Low Stock Alerts (≤ 5)</h2>
            {lowStockBatches.length > 0 && (
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                backgroundColor: 'rgba(186, 26, 26, 0.1)', 
                color: 'var(--error)', 
                padding: '3px 10px', 
                borderRadius: '12px' 
              }}>
                {lowStockBatches.length} {lowStockBatches.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>

          <div style={{ flex: 1, maxHeight: showAllLowStock && lowStockBatches.length > 10 ? '480px' : 'none', overflowY: showAllLowStock && lowStockBatches.length > 10 ? 'auto' : 'visible' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead style={{ position: showAllLowStock && lowStockBatches.length > 10 ? 'sticky' : 'static', top: 0, backgroundColor: 'var(--surface-container-lowest)', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid var(--outline)' }}>
                  <th style={{ padding: '8px 0' }}>Product</th>
                  <th style={{ padding: '8px 0' }}>Batch / Size</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {(showAllLowStock ? lowStockBatches : lowStockBatches.slice(0, 10)).map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                    <td style={{ padding: '12px 0' }}>{b.product?.name || 'Unknown'}</td>
                    <td style={{ padding: '12px 0' }}>{b.batch_no || 'N/A'} {b.size ? `(${b.size})` : ''}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--error)' }}>{b.quantity}</td>
                  </tr>
                ))}
                {lowStockBatches.length === 0 && <tr><td colSpan="3" style={{ padding: '16px 0', color: 'var(--on-surface-variant)' }}>Stock levels are healthy.</td></tr>}
              </tbody>
            </table>
          </div>

          {lowStockBatches.length > 10 && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowAllLowStock(prev => !prev)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--outline)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--primary)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {showAllLowStock ? 'expand_less' : 'expand_more'}
                </span>
                {showAllLowStock ? 'Show Less (Top 10)' : `Show More (${lowStockBatches.length - 10} more)`}
              </button>
            </div>
          )}
        </div>

      </div>
    </PosLayout>
  );
};

export default PosAnalyticsPage;
