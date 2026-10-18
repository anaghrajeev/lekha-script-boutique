import React, { useState, useMemo, useRef, useEffect } from 'react';
import PosLayout from './PosLayout';
import { usePosStore } from '../../store/usePosStore.jsx';
import { useStore } from '../../store/useStore.jsx';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase.js';
import { generateBatchNumber } from '../../lib/batchUtils.js';
import { printThermalReceipt } from '../../lib/printReceipt.js';

const PosBillingPage = ({ onLogout }) => {
  const { 
    batches, 
    suppliers,
    fetchPosData,
    posCart, 
    addToPosCart, 
    updatePosCartQty, 
    removeFromPosCart, 
    clearPosCart, 
    checkoutPos,
    customerInfo,
    settings,
    setCustomerInfo,
    updatePosCartItemPrice,
    addMiscItem,
    parkedCarts,
    parkCart,
    resumeCart,
    lastBillData
  } = usePosStore();
  
  const { products, fetchData: fetchGlobalData } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastBillNo, setLastBillNo] = useState(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', card: '', upi: '' });
  const [discountType, setDiscountType] = useState('amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [showMiscDialog, setShowMiscDialog] = useState(false);
  const [miscName, setMiscName] = useState('Misc Charge');
  const [miscPrice, setMiscPrice] = useState('');
  const [showParkedDialog, setShowParkedDialog] = useState(false);

  // Quick Add Stock Batch State from POS
  const [addBatchProduct, setAddBatchProduct] = useState(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchFormData, setBatchFormData] = useState({
    supplier: '',
    batch_date: new Date().toISOString().split('T')[0],
    batch_no: '',
    quantity: 10,
    cost_price: 0,
    selling_price: 0
  });

  const handleOpenAddBatchForProduct = (prod) => {
    setBatchFormData({
      supplier: (suppliers && suppliers.length > 0) ? suppliers[0].id : '',
      batch_date: new Date().toISOString().split('T')[0],
      batch_no: '',
      quantity: 10,
      cost_price: prod.supplier_price || 0,
      selling_price: prod.retail_price || prod.price || 0
    });
    setAddBatchProduct(prod);
  };

  const handleSaveNewBatch = async (e) => {
    e.preventDefault();
    if (!batchFormData.supplier) {
      toast.error('Please select a supplier.');
      return;
    }
    if (!batchFormData.quantity || parseInt(batchFormData.quantity) < 1) {
      toast.error('Please enter a valid quantity.');
      return;
    }
    setBatchSaving(true);
    try {
      const finalBatchNo = (batchFormData.batch_no && batchFormData.batch_no.trim())
        ? batchFormData.batch_no.trim().toUpperCase()
        : generateBatchNumber();

      const newRecord = {
        product_id: addBatchProduct.id,
        supplier: batchFormData.supplier,
        batch_date: batchFormData.batch_date,
        batch_no: finalBatchNo,
        quantity: parseInt(batchFormData.quantity),
        cost_price: parseFloat(batchFormData.cost_price) || 0,
        selling_price: parseFloat(batchFormData.selling_price) || addBatchProduct.price || 0
      };

      const { data: insertedBatch, error } = await supabase
        .from('batches')
        .insert([newRecord])
        .select('*')
        .single();

      if (error) throw error;

      await fetchPosData();
      await fetchGlobalData();

      toast.success(`Batch ${finalBatchNo} added (${newRecord.quantity} in stock)!`);
      setAddBatchProduct(null);

      // If the batch selection modal was open for this product, update its batches
      if (selectedProduct && selectedProduct.product.id === addBatchProduct.id) {
        setSelectedProduct(prev => ({
          ...prev,
          batches: [insertedBatch, ...(prev.batches || [])]
        }));
      }
    } catch (err) {
      toast.error('Failed to create batch: ' + err.message);
    } finally {
      setBatchSaving(false);
    }
  };

  const searchRef = useRef(null);
  const searchItemRefs = useRef([]);
  const batchItemRefs = useRef([]);

  // Search logic (name, sku, barcode from products, or batch_no from batches)
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    
    // Find products matching the term (expanded up to 150 items so user is never cut off)
    return products.filter(p => {
      const matchName = p.name.toLowerCase().includes(term);
      const matchSku = p.sku?.toLowerCase().includes(term);
      const matchBarcode = p.barcode?.toLowerCase().includes(term);
      return matchName || matchSku || matchBarcode;
    }).slice(0, 150);
  }, [searchTerm, products]);

  // Auto-scroll selected search result item into view during arrow key navigation
  useEffect(() => {
    if (selectedIndex >= 0 && searchItemRefs.current[selectedIndex]) {
      searchItemRefs.current[selectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Auto-scroll selected batch item into view during modal keyboard navigation
  useEffect(() => {
    if (selectedBatchIndex >= 0 && batchItemRefs.current[selectedBatchIndex]) {
      batchItemRefs.current[selectedBatchIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedBatchIndex]);

  const handleSelectProduct = (product) => {
    // Find available batches for this product
    const availableBatches = batches.filter(b => b.product_id === product.id && b.quantity > 0);
    
    if (availableBatches.length === 0) {
      toast.error('No available stock batches for this product!');
      return;
    }
    
    if (availableBatches.length === 1) {
      // Auto add if only 1 batch
      const b = availableBatches[0];
      addToPosCart(product, b.id, b.selling_price || product.price, 1);
      setSearchTerm('');
      setSelectedIndex(-1);
      searchRef.current?.focus();
    } else {
      setSelectedProduct({ product, batches: availableBatches });
      setSelectedBatchIndex(0);
    }
  };

  const handleSelectBatch = (product, batch) => {
    addToPosCart(product, batch.id, batch.selling_price || product.price, 1);
    setSelectedProduct(null);
    setSearchTerm('');
    setSelectedIndex(-1);
    searchRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (selectedProduct) {
      // Handle batch selection modal keyboard navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedBatchIndex(prev => (prev < selectedProduct.batches.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedBatchIndex(prev => (prev > 0 ? prev - 1 : selectedProduct.batches.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedProduct.batches[selectedBatchIndex]) {
          handleSelectBatch(selectedProduct.product, selectedProduct.batches[selectedBatchIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedProduct(null);
      }
      return;
    }

    if (!searchTerm || searchResults.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelectProduct(searchResults[selectedIndex]);
      } else if (searchResults.length > 0) {
        // Automatically select the first/only item if Enter is pressed and none is explicitly selected
        handleSelectProduct(searchResults[0]);
      }
    }
  };

  const handleCheckout = async () => {
    if (posCart.length === 0) return;

    let effectivePaymentMode = paymentMode;
    if (paymentMode === 'Split') {
      if (Math.abs(splitRemaining) > 0.01) {
        toast.error(`Split total (₹${splitSum.toFixed(2)}) must equal bill total (₹${cartTotal.toFixed(2)})`);
        return;
      }
      const parts = [];
      if (splitCash > 0) parts.push(`Cash: ₹${splitCash.toFixed(2)}`);
      if (splitCard > 0) parts.push(`Card: ₹${splitCard.toFixed(2)}`);
      if (splitUpi > 0) parts.push(`UPI: ₹${splitUpi.toFixed(2)}`);
      effectivePaymentMode = `Split (${parts.join(', ')})`;
    }

    setCheckoutLoading(true);
    try {
      const res = await checkoutPos(effectivePaymentMode, gstAmount, computedDiscountAmount);
      await fetchGlobalData(); // Refresh global Admin inventory
      setLastBillNo(res.billNo);
      setShowCheckoutDialog(true);
      setSplitAmounts({ cash: '', card: '', upi: '' });
    } catch (err) {
      toast.error('Checkout failed: ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePrintLastReceipt = () => {
    if (!lastBillData) {
      toast.error("No previous bill available in this session.");
      return;
    }
    printThermalReceipt('print-receipt');
  };

  const handleAddMiscItem = () => {
    if (!miscPrice || isNaN(miscPrice) || miscPrice < 0) return;
    addMiscItem(miscName, parseFloat(miscPrice), 1);
    setShowMiscDialog(false);
    setMiscName('Misc Charge');
    setMiscPrice('');
  };

  const cartSubtotal = posCart.reduce((sum, item) => sum + item.subtotal, 0);
  const gstAmount = settings?.enableGst ? (cartSubtotal * (settings.gstPercentage / 100)) : 0;
  
  const computedDiscountAmount = discountType === 'percentage' 
    ? (cartSubtotal * (discountValue / 100)) 
    : discountValue;
    
  const cartTotal = cartSubtotal + gstAmount - computedDiscountAmount;

  const splitCash = parseFloat(splitAmounts.cash) || 0;
  const splitCard = parseFloat(splitAmounts.card) || 0;
  const splitUpi = parseFloat(splitAmounts.upi) || 0;
  const splitSum = Math.round((splitCash + splitCard + splitUpi) * 100) / 100;
  const splitRemaining = Math.round((cartTotal - splitSum) * 100) / 100;

  return (
    <PosLayout activeTab="billing" onLogout={onLogout}>
      <div className="no-print" style={{ display: 'flex', gap: '24px', height: '100%' }}>
        
        {/* Left Side: Search & Selection */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h1 className="font-serif text-headline-lg">Point of Sale</h1>
            <p className="text-body-md" style={{ color: 'var(--on-surface-variant)' }}>Search products or scan barcode</p>
          </div>
          
          <input 
            ref={searchRef}
            type="text" 
            placeholder="Search by name, SKU, or scan barcode..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            style={{ 
              padding: '16px', fontSize: '18px', width: '100%', 
              borderRadius: '8px', border: '1px solid var(--outline)',
              outline: 'none'
            }}
            autoFocus
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setShowMiscDialog(true)}
              className="btn btn-outline"
              style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_box</span>
              Add Custom Item
            </button>
            <button 
              onClick={() => parkCart()}
              disabled={posCart.length === 0}
              className="btn btn-outline"
              style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pause_circle</span>
              Park Sale
            </button>
            {parkedCarts.length > 0 && (
              <button 
                onClick={() => setShowParkedDialog(true)}
                className="btn btn-primary"
                style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>list_alt</span>
                Parked Sales ({parkedCarts.length})
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchTerm && !selectedProduct && (
            <div style={{ 
              backgroundColor: 'var(--surface)', 
              borderRadius: '8px', 
              border: '1px solid var(--outline-variant)', 
              maxHeight: 'calc(100vh - 240px)', 
              overflowY: 'auto',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
            }}>
              <div style={{ 
                padding: '8px 16px', 
                fontSize: '12px', 
                color: 'var(--on-surface-variant)', 
                borderBottom: '1px solid var(--outline-variant)', 
                backgroundColor: 'var(--surface-container-low)', 
                display: 'flex', 
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 2
              }}>
                <span>Found {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} (Use ↑ / ↓ to navigate, Enter to select)</span>
                {selectedIndex >= 0 && <span style={{ fontWeight: '600', color: 'var(--primary)' }}>Item {selectedIndex + 1} of {searchResults.length}</span>}
              </div>
              {searchResults.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--on-surface-variant)' }}>No products found.</div>
              ) : (
                searchResults.map((p, index) => (
                  <div 
                    key={p.id}
                    ref={el => searchItemRefs.current[index] = el}
                    onClick={() => handleSelectProduct(p)}
                    style={{ 
                      padding: '16px', borderBottom: '1px solid var(--outline-variant)', 
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      backgroundColor: index === selectedIndex ? 'var(--surface-container)' : 'var(--surface-container-lowest)',
                      borderLeft: index === selectedIndex ? '4px solid var(--primary)' : '4px solid transparent',
                      transition: 'background-color 0.1s ease'
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '12px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--on-surface)' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                        SKU: {p.sku || 'N/A'} | Barcode: {p.barcode || 'N/A'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', minWidth: '95px' }}>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--on-surface)' }}>₹{p.price}</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddBatchForProduct(p);
                        }}
                        style={{
                          marginTop: '6px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          borderRadius: '6px',
                          border: '1px solid var(--primary)',
                          backgroundColor: 'var(--surface-container-low)',
                          color: 'var(--primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--primary)';
                          e.currentTarget.style.color = 'var(--on-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--surface-container-low)';
                          e.currentTarget.style.color = 'var(--primary)';
                        }}
                        title="Add Stock Batch for this product"
                        id={`pos-add-batch-${p.id}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>add_circle</span>
                        + Batch
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Batch Selection Modal/Area */}
          {selectedProduct && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '32px', borderRadius: '12px', width: '500px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 className="font-serif">Select Batch for {selectedProduct.product.name}</h3>
                  <button onClick={() => setSelectedProduct(null)} className="btn btn-icon" style={{ color: 'var(--error)' }}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div style={{ display: 'grid', gap: '12px', overflowY: 'auto', paddingRight: '8px' }}>
                  {selectedProduct.batches.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--on-surface-variant)', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px dashed var(--outline-variant)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>inventory_2</span>
                      <div style={{ fontWeight: '600', color: 'var(--on-surface)' }}>No active stock batches found</div>
                      <div style={{ fontSize: '13px', marginTop: '4px' }}>All previous batches are out of stock or none have been added yet.</div>
                    </div>
                  ) : (
                    selectedProduct.batches.map((b, index) => (
                      <button 
                        key={b.id}
                        ref={el => batchItemRefs.current[index] = el}
                        onClick={() => handleSelectBatch(selectedProduct.product, b)}
                        style={{ 
                          padding: '16px', backgroundColor: index === selectedBatchIndex ? 'var(--surface-container-high)' : 'var(--surface)', 
                          border: index === selectedBatchIndex ? '2px solid var(--primary)' : '1px solid var(--outline-variant)', borderRadius: '8px',
                          display: 'flex', justifyContent: 'space-between', textAlign: 'left',
                          outline: 'none', cursor: 'pointer'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600' }}>Batch: {b.batch_no || 'Default'}</div>
                          {b.supplier && <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Supplier: {suppliers?.find(s => s.id === b.supplier)?.name || b.supplier}</div>}
                          {b.batch_date && <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Date: {new Date(b.batch_date).toLocaleDateString()}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '600', fontSize: '16px' }}>₹{b.selling_price || selectedProduct.product.price}</div>
                          <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '500' }}>Qty: {b.quantity} left</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--outline-variant)' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleOpenAddBatchForProduct(selectedProduct.product)}
                    style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    id="modal-add-batch-btn"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_box</span>
                    + Add Stock Batch for this Product
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Cart */}
        <div style={{ flex: 1, backgroundColor: 'var(--surface-container)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column' }} className="pos-cart-panel">
          <h2 className="font-serif" style={{ marginBottom: '16px' }}>Current Bill</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <input 
              type="text" 
              placeholder="Customer Name (optional)" 
              value={customerInfo.name}
              onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
              style={{ width: '100%', padding: '10px', marginBottom: '8px', borderRadius: '6px', border: '1px solid var(--outline-variant)' }}
            />
            <input 
              type="text" 
              placeholder="Customer Phone (optional)" 
              value={customerInfo.phone}
              onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline-variant)' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)', padding: '16px 0' }}>
            {posCart.length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: '20px' }}>Cart is empty</p>
            ) : (
              posCart.map(item => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                      ₹<input 
                        type="number" 
                        value={item.unit_price}
                        onChange={(e) => updatePosCartItemPrice(item.key, parseFloat(e.target.value) || 0)}
                        style={{ width: '60px', padding: '2px', borderRadius: '4px', border: '1px solid transparent', backgroundColor: 'transparent', outline: 'none', cursor: 'text', borderBottom: '1px dotted var(--outline)' }}
                        onFocus={(e) => e.target.style.border = '1px solid var(--primary)'}
                        onBlur={(e) => e.target.style.border = '1px solid transparent'}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      min="1" 
                      value={item.quantity} 
                      onChange={(e) => updatePosCartQty(item.key, parseInt(e.target.value) || 1)}
                      style={{ width: '50px', padding: '4px', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--outline)' }}
                    />
                    <div style={{ fontWeight: '600', width: '60px', textAlign: 'right' }}>₹{item.subtotal}</div>
                    <button onClick={() => removeFromPosCart(item.key)} style={{ color: 'var(--error)', padding: '4px' }}>✕</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ paddingTop: '20px' }}>
            
            {settings?.enableDiscounts && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Discount:</span>
                  <select 
                    value={discountType} 
                    onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(0); }}
                    style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--outline-variant)', fontSize: '12px' }}
                  >
                    <option value="amount">Amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <input 
                  type="number" 
                  min="0"
                  max={discountType === 'percentage' ? 100 : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  style={{ width: '80px', padding: '6px', textAlign: 'right', borderRadius: '4px', border: '1px solid var(--outline)' }}
                />
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
              <span>Subtotal:</span>
              <span>₹{cartSubtotal.toFixed(2)}</span>
            </div>

            {settings?.enableGst && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
                <span>GST ({settings.gstPercentage}%):</span>
                <span>₹{gstAmount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: '600', margin: '16px 0' }}>
              <span>Total:</span>
              <span>₹{cartTotal.toFixed(2)}</span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Payment Mode</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Cash', 'Card', 'UPI', 'Split'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => {
                      setPaymentMode(mode);
                      if (mode === 'Split' && !splitAmounts.cash && !splitAmounts.card && !splitAmounts.upi) {
                        setSplitAmounts({ cash: cartTotal > 0 ? cartTotal.toFixed(2) : '', card: '', upi: '' });
                      }
                    }}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: '6px', fontWeight: '500', fontSize: '13px',
                      border: paymentMode === mode ? '2px solid var(--primary)' : '1px solid var(--outline-variant)',
                      backgroundColor: paymentMode === mode ? 'var(--primary-container)' : 'transparent',
                      color: paymentMode === mode ? 'var(--on-primary-container)' : 'var(--on-surface)'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Split Breakdown */}
              {paymentMode === 'Split' && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  backgroundColor: 'var(--surface-container)', 
                  borderRadius: '8px',
                  border: '1px solid var(--outline-variant)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '12px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--on-surface)' }}>Split Allocation:</span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: Math.abs(splitRemaining) < 0.01 ? 'var(--whatsapp, #128C7E)' : splitRemaining > 0 ? 'var(--primary)' : 'var(--error)' 
                    }}>
                      {Math.abs(splitRemaining) < 0.01 
                        ? '✓ Total Matched' 
                        : splitRemaining > 0 
                          ? `Remaining: ₹${splitRemaining.toFixed(2)}` 
                          : `Over: ₹${Math.abs(splitRemaining).toFixed(2)}`}
                    </span>
                  </div>

                  {/* Cash Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ width: '45px', fontSize: '13px', fontWeight: '500' }}>Cash:</span>
                    <input 
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      value={splitAmounts.cash}
                      onChange={e => setSplitAmounts(s => ({ ...s, cash: e.target.value }))}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--outline)', fontSize: '13px', textAlign: 'right' }}
                    />
                    <button
                      type="button"
                      onClick={() => setSplitAmounts(s => {
                        const cur = parseFloat(s.cash) || 0;
                        const target = Math.max(0, cur + splitRemaining);
                        return { ...s, cash: target > 0 ? target.toFixed(2) : '' };
                      })}
                      disabled={splitRemaining <= 0}
                      style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--outline)', backgroundColor: 'var(--surface)', cursor: 'pointer', fontWeight: '500' }}
                      title="Auto-fill remainder into Cash"
                    >
                      Fill
                    </button>
                  </div>

                  {/* Card Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ width: '45px', fontSize: '13px', fontWeight: '500' }}>Card:</span>
                    <input 
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      value={splitAmounts.card}
                      onChange={e => setSplitAmounts(s => ({ ...s, card: e.target.value }))}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--outline)', fontSize: '13px', textAlign: 'right' }}
                    />
                    <button
                      type="button"
                      onClick={() => setSplitAmounts(s => {
                        const cur = parseFloat(s.card) || 0;
                        const target = Math.max(0, cur + splitRemaining);
                        return { ...s, card: target > 0 ? target.toFixed(2) : '' };
                      })}
                      disabled={splitRemaining <= 0}
                      style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--outline)', backgroundColor: 'var(--surface)', cursor: 'pointer', fontWeight: '500' }}
                      title="Auto-fill remainder into Card"
                    >
                      Fill
                    </button>
                  </div>

                  {/* UPI Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '45px', fontSize: '13px', fontWeight: '500' }}>UPI:</span>
                    <input 
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      value={splitAmounts.upi}
                      onChange={e => setSplitAmounts(s => ({ ...s, upi: e.target.value }))}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--outline)', fontSize: '13px', textAlign: 'right' }}
                    />
                    <button
                      type="button"
                      onClick={() => setSplitAmounts(s => {
                        const cur = parseFloat(s.upi) || 0;
                        const target = Math.max(0, cur + splitRemaining);
                        return { ...s, upi: target > 0 ? target.toFixed(2) : '' };
                      })}
                      disabled={splitRemaining <= 0}
                      style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--outline)', backgroundColor: 'var(--surface)', cursor: 'pointer', fontWeight: '500' }}
                      title="Auto-fill remainder into UPI"
                    >
                      Fill
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  clearPosCart();
                  setSplitAmounts({ cash: '', card: '', upi: '' });
                }}
                style={{ flex: 1, padding: '16px', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', fontWeight: '600' }}
              >
                Clear
              </button>
              <button 
                onClick={handleCheckout}
                disabled={posCart.length === 0 || checkoutLoading}
                style={{ 
                  flex: 2, padding: '16px', backgroundColor: 'var(--primary)', color: 'white', 
                  borderRadius: '8px', fontWeight: '600', opacity: (posCart.length === 0 || checkoutLoading) ? 0.5 : 1 
                }}
              >
                {checkoutLoading ? 'Processing...' : 'Checkout'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button 
                onClick={handlePrintLastReceipt}
                disabled={!lastBillData}
                style={{ flex: 1, padding: '12px', backgroundColor: 'var(--surface-container-high)', border: '1px solid var(--outline)', color: 'var(--on-surface)', borderRadius: '8px', fontWeight: '500' }}
              >
                Reprint Last Bill
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Misc Item Dialog */}
      {showMiscDialog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '24px', borderRadius: '12px', width: '350px' }}>
            <h3 className="font-serif" style={{ marginBottom: '16px' }}>Add Custom Charge</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Description</label>
              <input type="text" value={miscName} onChange={e => setMiscName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Price (₹)</label>
              <input type="number" min="0" value={miscPrice} onChange={e => setMiscPrice(e.target.value)} autoFocus style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMiscDialog(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleAddMiscItem} className="btn btn-primary">Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* Parked Sales Dialog */}
      {showParkedDialog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '24px', borderRadius: '12px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="font-serif">Parked Sales</h3>
              <button onClick={() => setShowParkedDialog(false)} className="btn btn-icon" style={{ color: 'var(--error)' }}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {parkedCarts.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--outline-variant)', borderRadius: '8px', backgroundColor: 'var(--surface)' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{p.customerInfo?.name || 'Walkin Customer'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{p.cart.length} items | Parked at {p.time}</div>
                  </div>
                  <button onClick={() => { resumeCart(p.id); setShowParkedDialog(false); }} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>Resume</button>
                </div>
              ))}
              {parkedCarts.length === 0 && <p style={{ color: 'var(--on-surface-variant)' }}>No parked sales.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Receipt Template */}
      <div id="print-receipt" className="receipt-container" style={{ display: 'none', padding: '10px' }}>
        {(() => {
          const pData = lastBillData || {
            billNo: 'SINV-0000',
            items: posCart,
            customerInfo,
            subtotal: cartSubtotal,
            tax: gstAmount,
            discount: computedDiscountAmount,
            total: cartTotal,
            paymentMode,
            time: new Date()
          };
          return (
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', marginBottom: '5px', textTransform: 'uppercase' }}>Sales Invoice</div>
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
                <div><b>Inv No :</b> {pData.billNo}</div>
                <div><b>Date :</b> {new Date(pData.time).toLocaleDateString('en-GB').replace(/\//g, '-')}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
                <div><b>Customer Name :</b> {pData.customerInfo.name || 'Walkin Customer'}</div>
                <div><b>Time :</b> {new Date(pData.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</div>
              </div>

              {/* Separator */}
              <div style={{ borderBottom: '1px solid #000', margin: '5px 0' }}></div>

              {/* Table */}
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Product</th>
                    <th style={{ textAlign: 'center', paddingBottom: '4px' }}>Size</th>
                    <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Rate</th>
                    <th style={{ textAlign: 'center', paddingBottom: '4px' }}>Qty</th>
                    <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5">
                      <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }}></div>
                    </td>
                  </tr>
                  {pData.items.map((i, idx) => (
                    <tr key={i.key || idx}>
                      <td style={{ textAlign: 'left', paddingBottom: '4px', maxWidth: '100px', wordWrap: 'break-word' }}>{`${i.model || ''}-${i.category || ''}`.toUpperCase().replace(/^-|-$/, '') || (i.name || i.custom_name || 'Unknown').toUpperCase()}</td>
                      <td style={{ textAlign: 'center', paddingBottom: '4px' }}>{i.size || '-'}</td>
                      <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{i.unit_price.toFixed(2)}</td>
                      <td style={{ textAlign: 'center', paddingBottom: '4px', whiteSpace: 'nowrap' }}>{i.quantity} PCS</td>
                      <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{i.subtotal.toFixed(2)}</td>
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
                        <div style={{ marginBottom: '8px' }}><b>Items :</b> {pData.items.reduce((sum, i) => sum + i.quantity, 0)}</div>
                        <div><b>Pay Mode :</b> {pData.paymentMode}</div>
                      </td>
                      <td style={{ textAlign: 'left', paddingBottom: '4px', borderLeft: '1px solid #000', paddingLeft: '8px', width: '35%' }}><b>Grand Total</b></td>
                      <td style={{ textAlign: 'right', paddingBottom: '4px', width: '20%' }}>{pData.subtotal.toFixed(2)}</td>
                    </tr>
                  {settings?.enableGst && (
                    <tr>
                      <td style={{ paddingBottom: '4px' }}></td>
                      <td style={{ textAlign: 'left', paddingBottom: '4px', borderLeft: '1px solid #000', paddingLeft: '8px' }}><b>GST ({settings.gstPercentage}%)</b></td>
                      <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{pData.tax.toFixed(2)}</td>

              </tr>
            )}
            <tr>
              <td style={{ paddingBottom: '4px' }}></td>
              <td style={{ textAlign: 'left', paddingBottom: '4px', borderLeft: '1px solid #000', paddingLeft: '8px' }}><b>Bill Discount</b></td>
              <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{pData.discount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '4px' }}></td>
              <td style={{ textAlign: 'left', paddingBottom: '4px', borderLeft: '1px solid #000', paddingLeft: '8px' }}><b>Net Total</b></td>
              <td style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>{pData.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Separator */}
        <div style={{ borderBottom: '1px solid #000', margin: '5px 0' }}></div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', fontStyle: 'italic', marginTop: '5px' }}>Thank You... Visit Again !</div>
        </div>
        </>
        );
        })()}
      </div>

      {showCheckoutDialog && (
        <div className="no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--surface-container-high)', padding: '32px', borderRadius: '16px',
            textAlign: 'center', minWidth: '300px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 className="font-serif" style={{ marginBottom: '16px', fontSize: '24px', color: 'var(--primary)' }}>Checkout Completed</h2>
            <p style={{ marginBottom: '24px', color: 'var(--on-surface-variant)' }}>Bill No: {lastBillNo}</p>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  setShowCheckoutDialog(false);
                  clearPosCart();
                }}
                style={{
                  padding: '12px 24px', border: '1px solid var(--outline)', borderRadius: '8px',
                  fontWeight: '600', backgroundColor: 'var(--surface)', color: 'var(--on-surface)'
                }}
              >
                Close
              </button>
              <button 
                onClick={() => {
                  printThermalReceipt('print-receipt');
                  setShowCheckoutDialog(false);
                  clearPosCart();
                }}
                style={{
                  padding: '12px 24px', backgroundColor: 'var(--primary)', color: 'white',
                  borderRadius: '8px', fontWeight: '600'
                }}
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Stock Batch Modal from POS */}
      {addBatchProduct && (
        <div 
          className="no-print" 
          style={{ 
            position: 'fixed', inset: 0, 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 10000 
          }}
        >
          <div 
            style={{ 
              backgroundColor: 'var(--surface-container-lowest)', 
              padding: '28px', 
              borderRadius: '16px', 
              width: '560px', 
              maxWidth: '92vw', 
              maxHeight: '90vh', 
              overflowY: 'auto', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              border: '1px solid var(--outline-variant)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 className="font-serif" style={{ margin: 0, fontSize: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined">add_box</span>
                  Add Stock Batch
                </h3>
                <p style={{ margin: '6px 0 0', fontWeight: '600', fontSize: '14px', color: 'var(--on-surface)' }}>
                  {addBatchProduct.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                  SKU: {addBatchProduct.sku || 'N/A'} | Barcode: {addBatchProduct.barcode || 'N/A'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setAddBatchProduct(null)} 
                className="btn btn-icon" 
                style={{ color: 'var(--on-surface-variant)' }}
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewBatch}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--on-surface)' }}>
                    Supplier *
                  </label>
                  <select
                    required
                    value={batchFormData.supplier}
                    onChange={(e) => setBatchFormData({ ...batchFormData, supplier: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                    id="pos-modal-supplier-select"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--on-surface)' }}>
                    Batch Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={batchFormData.batch_date}
                    onChange={(e) => setBatchFormData({ ...batchFormData, batch_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--on-surface)' }}>
                    Batch No (Optional)
                  </label>
                  <input
                    type="text"
                    value={batchFormData.batch_no}
                    onChange={(e) => setBatchFormData({ ...batchFormData, batch_no: e.target.value })}
                    placeholder="Auto-gen if empty"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--on-surface)' }}>
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={batchFormData.quantity}
                    onChange={(e) => setBatchFormData({ ...batchFormData, quantity: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                    id="pos-modal-quantity-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--on-surface)' }}>
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={batchFormData.cost_price}
                    onChange={(e) => setBatchFormData({ ...batchFormData, cost_price: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--on-surface)' }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={batchFormData.selling_price}
                    onChange={(e) => setBatchFormData({ ...batchFormData, selling_price: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setAddBatchProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={batchSaving}
                  id="pos-save-batch-btn"
                >
                  {batchSaving ? 'Saving...' : 'Save & Add Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PosLayout>
  );
};

export default PosBillingPage;
