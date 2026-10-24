import React, { useState, useEffect } from 'react';
import PosLayout from './PosLayout';
import { usePosStore } from '../../store/usePosStore';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { printThermalReceipt } from '../../lib/printReceipt.js';
import { broadcastStockChange } from '../../lib/stockSync.js';

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PosReturnsPage = ({ onLogout }) => {
  const { bills, fetchBills, fetchPosData, deleteBill, settings } = usePosStore();
  const { fetchData: fetchGlobalData } = useStore();
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [returnItems, setReturnItems] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState(() => getTodayDateString());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filteredBills = bills.filter(bill => {
    const q = searchQuery.trim().toLowerCase();
    const matchQuery = q 
      ? bill.bill_no.toLowerCase().includes(q) ||
        (bill.customer_name && bill.customer_name.toLowerCase().includes(q))
      : true;

    let matchDate = true;
    if (searchDate) {
      const billD = new Date(bill.bill_date);
      const billDateStr = `${billD.getFullYear()}-${String(billD.getMonth() + 1).padStart(2, '0')}-${String(billD.getDate()).padStart(2, '0')}`;
      matchDate = billDateStr === searchDate;
    }

    return matchQuery && matchDate;
  });

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleReturnChange = (itemId, maxQty, value) => {
    const qty = parseInt(value) || 0;
    if (qty < 0 || qty > maxQty) return;
    setReturnItems(prev => ({ ...prev, [itemId]: qty }));
  };

  const processReturn = async () => {
    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = selectedBill.items.find(i => i.id === id);
        return {
          bill_item_id: id,
          return_qty: qty,
          batch_id: item.batch_id || ''
        };
      });

    if (itemsToReturn.length === 0) {
      toast.error('Please enter quantities to return.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('process_pos_return', {
        p_bill_id: selectedBill.id,
        p_return_items: itemsToReturn
      });
      if (error) throw error;
      
      toast.success('Return processed successfully!');
      setSelectedBill(null);
      setReturnItems({});
      await fetchBills();
      await fetchPosData(); // Refresh POS inventory
      await fetchGlobalData(); // Refresh global Admin inventory
      broadcastStockChange('RETURN_PROCESSED', { billId: selectedBill.id });
    } catch (err) {
      toast.error('Return failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = () => {
    if (!selectedBill) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteBill = async () => {
    if (!selectedBill) return;
    setLoading(true);
    try {
      await deleteBill(selectedBill.id);
      toast.success(`Bill ${selectedBill.bill_no} deleted successfully.`);
      setSelectedBill(null);
      setReturnItems({});
      setShowDeleteConfirm(false);
      await fetchBills();
      await fetchPosData(); // Refresh POS inventory
      await fetchGlobalData(); // Refresh global Admin inventory
    } catch (err) {
      toast.error('Delete failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PosLayout activeTab="returns" onLogout={onLogout}>
      <div className="no-print" style={{ display: 'flex', gap: '24px', height: '100%' }}>
        
        {/* Left Side: Bills List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h1 className="font-serif text-headline-lg">Sales & Returns</h1>
            <p className="text-body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>Select a bill to process returns</p>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Search invoice or customer..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}
              />
              <input 
                type="date" 
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--outline-variant)', fontWeight: '500' }}
                title="Filter by Bill Date"
              />
              {searchDate !== getTodayDateString() && (
                <button
                  type="button"
                  onClick={() => setSearchDate(getTodayDateString())}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--outline-variant)',
                    backgroundColor: 'var(--surface-container-high)',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="Show Today's Bills"
                >
                  Today
                </button>
              )}
              {(searchQuery || searchDate) && (
                <button 
                  onClick={() => { setSearchQuery(''); setSearchDate(''); }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--outline-variant)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    color: 'var(--on-surface-variant)'
                  }}
                  title="Show all historical bills (Clear filter)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_alt_off</span>
                  <span>All</span>
                </button>
              )}
            </div>
          </div>
          
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--outline-variant)', overflowY: 'auto', flex: 1 }}>
            {filteredBills.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--outline)', marginBottom: '8px', display: 'block' }}>
                  receipt_long
                </span>
                <p style={{ margin: 0, fontWeight: '500' }}>
                  No bills found {searchDate === getTodayDateString() ? 'for today' : searchDate ? `for ${searchDate}` : ''}.
                </p>
                {searchDate && (
                  <button
                    onClick={() => setSearchDate('')}
                    style={{
                      marginTop: '12px',
                      padding: '6px 14px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--primary)',
                      color: 'var(--primary)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    View All Historical Bills
                  </button>
                )}
              </div>
            ) : filteredBills.map(bill => (
              <div 
                key={bill.id}
                onClick={() => { setSelectedBill(bill); setReturnItems({}); }}
                style={{ 
                  padding: '16px', borderBottom: '1px solid var(--outline-variant)', cursor: 'pointer',
                  backgroundColor: selectedBill?.id === bill.id ? 'var(--primary-container)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600' }}>{bill.bill_no}</span>
                  <span style={{ 
                    fontSize: '12px', padding: '2px 8px', borderRadius: '12px',
                    backgroundColor: bill.status === 'active' ? 'var(--whatsapp)' : 'var(--error)', color: 'white'
                  }}>
                    {bill.status}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>
                  {new Date(bill.bill_date).toLocaleString()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span>{bill.customer_name || 'Walk-in Customer'}</span>
                  <span style={{ fontWeight: '600' }}>₹{bill.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Bill Details & Return Processing */}
        <div style={{ flex: 2, backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', border: '1px solid var(--outline-variant)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          {selectedBill ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h2 className="font-serif">Bill Details: {selectedBill.bill_no}</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => printThermalReceipt('print-receipt')}
                    style={{ 
                      padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--primary)', 
                      border: '1px solid var(--primary)', borderRadius: '8px', fontSize: '14px'
                    }}
                    title="Print Bill"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '4px' }}>print</span>
                    Print Bill
                  </button>
                  <button 
                    onClick={handleDeleteBill}
                    disabled={loading}
                    style={{ 
                      padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--error)', 
                      border: '1px solid var(--error)', borderRadius: '8px', fontSize: '14px',
                      opacity: loading ? 0.5 : 1
                    }}
                    title="Delete bill and restock items"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '4px' }}>delete</span>
                    Delete Bill
                  </button>
                </div>
              </div>
              <div style={{ color: 'var(--on-surface-variant)', marginBottom: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>Date: <strong>{new Date(selectedBill.bill_date).toLocaleString()}</strong></div>
                <div>Customer: <strong>{selectedBill.customer_name || 'Walk-in'} {selectedBill.customer_phone ? `(${selectedBill.customer_phone})` : ''}</strong></div>
                <div>Payment Mode: <strong style={{ color: 'var(--primary)' }}>{selectedBill.payment_mode || 'Cash'}</strong></div>
              </div>

              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--outline)' }}>
                    <th style={{ padding: '12px 0' }}>Item</th>
                    <th style={{ padding: '12px 0' }}>Price</th>
                    <th style={{ padding: '12px 0' }}>Purchased</th>
                    <th style={{ padding: '12px 0' }}>Returned</th>
                    <th style={{ padding: '12px 0', width: '100px' }}>Return Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBill.items.map(item => {
                    const availableToReturn = item.quantity - (item.returned_quantity || 0);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                        <td style={{ padding: '12px 0' }}>{item.product?.name || item.custom_name || 'Unknown'} {item.size && `(${item.size})`}</td>
                        <td style={{ padding: '12px 0' }}>₹{item.unit_price}</td>
                        <td style={{ padding: '12px 0' }}>{item.quantity}</td>
                        <td style={{ padding: '12px 0' }}>{item.returned_quantity || 0}</td>
                        <td style={{ padding: '12px 0' }}>
                          <input 
                            type="number" 
                            min="0" 
                            max={availableToReturn}
                            value={returnItems[item.id] || 0}
                            onChange={(e) => handleReturnChange(item.id, availableToReturn, e.target.value)}
                            disabled={availableToReturn === 0}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--outline)' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {(() => {
                const alreadyReturned = selectedBill.items.reduce((sum, item) => sum + (item.returned_quantity * item.unit_price || 0), 0);
                const currentRefund = selectedBill.items.reduce((sum, item) => sum + ((returnItems[item.id] || 0) * item.unit_price), 0);
                const effectiveTotal = selectedBill.total - alreadyReturned - currentRefund;

                return (
                  <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--outline-variant)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--on-surface-variant)' }}>Original Total:</span>
                      <span>₹{selectedBill.total}</span>
                    </div>
                    {alreadyReturned > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--on-surface-variant)' }}>Prior Returns:</span>
                        <span style={{ color: 'var(--error)' }}>-₹{alreadyReturned}</span>
                      </div>
                    )}
                    {currentRefund > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--on-surface-variant)' }}>Current Refund Amount:</span>
                        <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>-₹{currentRefund}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--outline-variant)' }}>
                      <span style={{ fontWeight: '600' }}>Effective Total:</span>
                      <span style={{ fontWeight: '600', fontSize: '18px' }}>₹{effectiveTotal}</span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={processReturn}
                  disabled={loading || selectedBill.status === 'returned'}
                  style={{ 
                    padding: '12px 32px', backgroundColor: 'var(--error)', color: 'white', 
                    borderRadius: '8px', fontWeight: '600', opacity: (loading || selectedBill.status === 'returned') ? 0.5 : 1 
                  }}
                >
                  {loading ? 'Processing...' : 'Process Return'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--on-surface-variant)' }}>
              Select a bill from the left to view details and process returns.
            </div>
          )}
        </div>
      </div>

      {/* Hidden Print Receipt Template */}
      {selectedBill && (
        <div id="print-receipt" className="receipt-container" style={{ display: 'none', width: '66mm', padding: '2mm 3mm 2mm 1mm', boxSizing: 'border-box' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', marginBottom: '5px', textTransform: 'uppercase' }}>
              {selectedBill.status === 'returned' || selectedBill.status === 'partial_return' ? 'Return / Sales Invoice' : 'Sales Invoice'}
            </div>
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Store Logo" style={{ maxHeight: '60px', margin: '0 auto 8px auto', display: 'block' }} />
            ) : (
              <h1 style={{ fontFamily: '"Brush Script MT", "Pacifico", cursive', fontSize: '36px', margin: '0', lineHeight: '1', fontWeight: 'normal' }}>Lekha Script</h1>
            )}
            <div style={{ fontSize: '11px', lineHeight: '1.4' }}>Near P.C Junction Areacode Road,Mukkam kozhikode</div>
            <div style={{ fontSize: '11px', lineHeight: '1.4' }}>,kerala ,india</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>Contact : 9745298723</div>
          </div>

          {/* Separator */}
          <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

          {/* Meta Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
            <div><b>Inv No :</b> {selectedBill.bill_no}</div>
            <div><b>Date :</b> {new Date(selectedBill.bill_date).toLocaleDateString('en-GB').replace(/\//g, '-')}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
            <div><b>Customer Name :</b> {selectedBill.customer_name || 'Walkin Customer'}</div>
            <div><b>Time :</b> {new Date(selectedBill.bill_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</div>
          </div>

          {/* Separator */}
          <div style={{ borderBottom: '1px solid #000', margin: '5px 0' }}></div>

          {/* Table */}
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingBottom: '4px', width: '42%' }}>Product</th>
                <th style={{ textAlign: 'center', paddingBottom: '4px', width: '14%' }}>Size</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px', width: '16%' }}>Rate</th>
                <th style={{ textAlign: 'center', paddingBottom: '4px', width: '12%' }}>Qty</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px', width: '16%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="5">
                  <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }}></div>
                </td>
              </tr>
              {selectedBill.items.map(item => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'left', paddingBottom: '4px', width: '42%', wordBreak: 'break-word' }}>
                    {`${item.product?.model || ''}-${item.product?.category || ''}`.toUpperCase().replace(/^-|-$/, '') || (item.product?.name || item.custom_name || 'Unknown').toUpperCase()}
                    {item.returned_quantity > 0 && <div style={{ color: 'var(--error)', fontSize: '9px', marginTop: '2px' }}>(Returned: {item.returned_quantity})</div>}
                  </td>
                  <td style={{ textAlign: 'center', paddingBottom: '4px', verticalAlign: 'top', width: '14%' }}>{item.size || '-'}</td>
                  <td style={{ textAlign: 'right', paddingBottom: '4px', verticalAlign: 'top', width: '16%' }}>{Number(item.unit_price).toFixed(2)}</td>
                  <td style={{ textAlign: 'center', paddingBottom: '4px', whiteSpace: 'nowrap', verticalAlign: 'top', width: '12%' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', paddingBottom: '4px', verticalAlign: 'top', width: '16%' }}>{Number(item.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Separator */}
          <div style={{ borderBottom: '1px solid #000', margin: '5px 0' }}></div>

          {/* Totals */}
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: '4px', width: '45%', verticalAlign: 'top' }}>
                  <div style={{ marginBottom: '8px' }}><b>Items :</b> {selectedBill.items.reduce((sum, i) => sum + i.quantity, 0)}</div>
                  <div><b>Pay Mode :</b> {selectedBill.payment_mode || 'Cash'}</div>
                </td>
                <td style={{ textAlign: 'left', paddingBottom: '4px', borderLeft: '1px solid #000', paddingLeft: '8px', width: '35%' }}><b>Subtotal</b></td>
                <td style={{ textAlign: 'right', paddingBottom: '4px', width: '20%' }}>{Number(selectedBill.subtotal).toFixed(2)}</td>
              </tr>
              {Number(selectedBill.tax) > 0 && (
                <tr>
                  <td style={{ paddingBottom: '4px' }}></td>
                  <td style={{ textAlign: 'left', paddingBottom: '4px', borderLeft: '1px solid #000', paddingLeft: '8px' }}><b>Tax</b></td>
                  <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{Number(selectedBill.tax).toFixed(2)}</td>
                </tr>
              )}
              {Number(selectedBill.discount) > 0 && (
                <tr>
                  <td style={{ paddingBottom: '4px' }}></td>
                  <td style={{ textAlign: 'left', paddingBottom: '4px', borderLeft: '1px solid #000', paddingLeft: '8px' }}><b>Discount</b></td>
                  <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{Number(selectedBill.discount).toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td style={{ paddingBottom: '4px' }}></td>
                <td style={{ textAlign: 'left', paddingBottom: '4px', borderLeft: '1px solid #000', paddingLeft: '8px' }}><b>Net Total</b></td>
                <td style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>{Number(selectedBill.total).toFixed(2)}</td>
              </tr>
              {(() => {
                const alreadyReturned = selectedBill.items.reduce((sum, item) => sum + ((item.returned_quantity || 0) * item.unit_price), 0);
                if (alreadyReturned > 0) {
                  return (
                    <tr>
                      <td style={{ paddingBottom: '4px' }}></td>
                      <td style={{ textAlign: 'left', paddingBottom: '4px', borderLeft: '1px solid #000', paddingLeft: '8px' }}><b>Refunded</b></td>
                      <td style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>-{Number(alreadyReturned).toFixed(2)}</td>
                    </tr>
                  );
                }
                return null;
              })()}
            </tbody>
          </table>

          {/* Separator */}
          <div style={{ borderBottom: '1px solid #000', margin: '5px 0' }}></div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', fontStyle: 'italic', marginTop: '5px' }}>Thank You... Visit Again !</div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {showDeleteConfirm && selectedBill && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true" style={{ zIndex: 1000 }}>
          <div className="admin-confirm-box">
            <span className="material-symbols-outlined admin-confirm-icon">warning</span>
            <p style={{ margin: '16px 0 8px 0', fontSize: '16px', color: 'var(--on-surface)', fontWeight: '600' }}>
              Delete Bill {selectedBill.bill_no}?
            </p>
            <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to completely delete this bill? This will restock all unreturned items and cannot be undone.
            </p>
            <div className="admin-confirm-actions">
              <button 
                type="button"
                className="btn btn-outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn btn-danger" 
                onClick={confirmDeleteBill}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PosLayout>
  );
};

export default PosReturnsPage;
