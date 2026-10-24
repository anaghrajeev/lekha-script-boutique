import React, { useState, useMemo } from 'react';
import PosLayout from './PosLayout';
import { usePosStore } from '../../store/usePosStore.jsx';
import { useStore } from '../../store/useStore.jsx';
import { supabase } from '../../lib/supabase.js';
import { generateBatchNumber } from '../../lib/batchUtils.js';
import { toast } from 'react-hot-toast';
import { broadcastStockChange } from '../../lib/stockSync.js';

// Searchable product selector for Add/Edit Batch
function SearchableProductSelect({ products, value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  
  const selectedProduct = products.find(p => p.id === value);
  const displayValue = open ? search : (selectedProduct ? selectedProduct.name : '');
  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder="Search or select a product..."
        value={displayValue}
        onChange={e => { setSearch(e.target.value); setOpen(true); onChange(''); }}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
        required={!value}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: '8px', maxHeight: '220px', overflowY: 'auto', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '12px', color: 'var(--on-surface-variant)', fontSize: '13px' }}>No products found</div>
          )}
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); setSearch(''); }}
              style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--outline-variant)', color: 'var(--on-surface)', fontSize: '13px' }}
              onMouseEnter={(e) => e.target.style.background = 'var(--surface-container)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              <div style={{ fontWeight: '600' }}>{p.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>₹{p.price} | SKU: {p.sku || 'N/A'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// In-app confirmation modal
function ConfirmDeleteModal({ batch, onConfirm, onCancel }) {
  if (!batch) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '24px', borderRadius: '12px', maxWidth: '420px', width: '90vw', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--error)', marginBottom: '12px' }}>warning</span>
        <h3 style={{ margin: '0 0 8px' }}>Delete Batch</h3>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--on-surface-variant)' }}>
          Are you sure you want to delete batch <strong>"{batch.batch_no || 'selected batch'}"</strong>?
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function PosBatchesPage({ onLogout }) {
  const { batches, suppliers, fetchPosData, updateBatch, deleteBatch } = usePosStore();
  const { products, fetchData: fetchGlobalData } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    batch_no: '',
    quantity: 10,
    cost_price: 0,
    selling_price: 0,
    supplier: '',
    batch_date: new Date().toISOString().split('T')[0]
  });

  // Filter batches by search term
  const filteredBatches = useMemo(() => {
    if (!searchTerm.trim()) return batches;
    const term = searchTerm.toLowerCase();
    return batches.filter(b => {
      const prodName = b.product?.name?.toLowerCase() || '';
      const batchNo = b.batch_no?.toLowerCase() || '';
      const supplierName = suppliers?.find(s => s.id === b.supplier)?.name?.toLowerCase() || b.supplier?.toLowerCase() || '';
      return prodName.includes(term) || batchNo.includes(term) || supplierName.includes(term);
    });
  }, [batches, searchTerm, suppliers]);

  const totalStockUnits = useMemo(() => {
    return batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
  }, [batches]);

  const lowStockCount = useMemo(() => {
    return batches.filter(b => b.quantity > 0 && b.quantity <= 5).length;
  }, [batches]);

  const handleOpenAddModal = (productId = '') => {
    const prod = products.find(p => p.id === productId);
    setFormData({
      product_id: productId,
      batch_no: '',
      quantity: 10,
      cost_price: prod ? (prod.supplier_price || 0) : 0,
      selling_price: prod ? (prod.retail_price || prod.price || 0) : 0,
      supplier: (suppliers && suppliers.length > 0) ? suppliers[0].id : '',
      batch_date: new Date().toISOString().split('T')[0]
    });
    setEditingBatchId(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (batch) => {
    setFormData({
      product_id: batch.product_id,
      batch_no: batch.batch_no || '',
      quantity: batch.quantity || 0,
      cost_price: batch.cost_price || 0,
      selling_price: batch.selling_price || 0,
      supplier: batch.supplier || '',
      batch_date: batch.batch_date || new Date().toISOString().split('T')[0]
    });
    setEditingBatchId(batch.id);
    setShowAddModal(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!formData.supplier) {
      toast.error('Please select a supplier.');
      return;
    }
    if (!formData.product_id) {
      toast.error('Please select a product.');
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity) < 1) {
      toast.error('Please enter a valid quantity.');
      return;
    }

    setSaving(true);
    try {
      if (editingBatchId) {
        await updateBatch(editingBatchId, {
          product_id: formData.product_id,
          batch_no: (formData.batch_no && formData.batch_no.trim()) ? formData.batch_no.trim().toUpperCase() : generateBatchNumber(),
          quantity: parseInt(formData.quantity),
          cost_price: parseFloat(formData.cost_price) || 0,
          selling_price: parseFloat(formData.selling_price) || 0,
          supplier: formData.supplier,
          batch_date: formData.batch_date
        });
        toast.success('Batch updated successfully!');
      } else {
        const finalBatchNo = (formData.batch_no && formData.batch_no.trim())
          ? formData.batch_no.trim().toUpperCase()
          : generateBatchNumber();

        const { error } = await supabase.from('batches').insert([{
          ...formData,
          batch_no: finalBatchNo,
          quantity: parseInt(formData.quantity),
          cost_price: parseFloat(formData.cost_price) || 0,
          selling_price: parseFloat(formData.selling_price) || 0
        }]);
        if (error) throw error;
        toast.success(`Batch ${finalBatchNo} created successfully!`);
      }

      await fetchPosData();
      await fetchGlobalData();
      broadcastStockChange(editingBatchId ? 'BATCH_UPDATED' : 'BATCH_CREATED');
      setShowAddModal(false);
      setEditingBatchId(null);
    } catch (err) {
      toast.error('Failed to save batch: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteBatch) return;
    try {
      await deleteBatch(confirmDeleteBatch.id);
      toast.success('Batch deleted successfully!');
      setConfirmDeleteBatch(null);
      await fetchPosData();
      await fetchGlobalData();
    } catch (err) {
      toast.error('Failed to delete batch: ' + err.message);
    }
  };

  return (
    <PosLayout activeTab="batches" onLogout={onLogout}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="font-serif" style={{ fontSize: '24px', margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">inventory_2</span>
              Inventory Batches
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--on-surface-variant)' }}>
              Manage, monitor, and add product stock batches across suppliers.
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => handleOpenAddModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px' }}
            id="pos-add-stock-batch-btn"
          >
            <span className="material-symbols-outlined">add_box</span>
            Add Stock Batch
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--outline-variant)' }}>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: '600', textTransform: 'uppercase' }}>Total Batches</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)', marginTop: '4px' }}>{batches.length}</div>
          </div>
          <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--outline-variant)' }}>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: '600', textTransform: 'uppercase' }}>Units In Stock</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--on-surface)', marginTop: '4px' }}>{totalStockUnits.toLocaleString()}</div>
          </div>
          <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--outline-variant)' }}>
            <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: '600', textTransform: 'uppercase' }}>Low Stock Batches</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: lowStockCount > 0 ? 'var(--error)' : 'var(--on-surface-variant)', marginTop: '4px' }}>
              {lowStockCount}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--outline-variant)', padding: '8px 16px', gap: '10px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>search</span>
          <input
            type="text"
            placeholder="Search batches by product name, batch number, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: 'var(--on-surface)' }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          )}
        </div>

        {/* Batches Table */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--outline-variant)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-container)', borderBottom: '1px solid var(--outline-variant)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Product</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Batch No</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>In Stock</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Cost Price</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Selling Price</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Supplier</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                      No batches found. Click "Add Stock Batch" to register inventory.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((b) => {
                    const isLow = b.quantity > 0 && b.quantity <= 5;
                    const isOut = b.quantity <= 0;
                    const supplierName = suppliers?.find(s => s.id === b.supplier)?.name || b.supplier || '-';

                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--outline-variant)', transition: 'background-color 0.15s' }}>
                        <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--on-surface)' }}>
                          {b.product?.name || 'Unknown Product'}
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '600', color: 'var(--primary)' }}>
                          {b.batch_no || 'Default'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: isOut ? 'rgba(186,26,26,0.1)' : isLow ? 'rgba(234,136,0,0.12)' : 'rgba(37,211,102,0.12)',
                            color: isOut ? 'var(--error)' : isLow ? '#d97706' : '#166534'
                          }}>
                            {b.quantity} {isOut ? '(Out)' : isLow ? '(Low)' : 'left'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--on-surface-variant)' }}>
                          ₹{b.cost_price ? Number(b.cost_price).toFixed(2) : '0.00'}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                          ₹{b.selling_price ? Number(b.selling_price).toFixed(2) : (b.product?.price || 0)}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--on-surface-variant)' }}>
                          {supplierName}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--on-surface-variant)' }}>
                          {b.batch_date ? new Date(b.batch_date).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => handleOpenEditModal(b)}
                              style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--outline-variant)', background: 'transparent', cursor: 'pointer', color: 'var(--primary)' }}
                              title="Edit batch"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                            </button>
                            <button
                              onClick={() => setConfirmDeleteBatch(b)}
                              style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--outline-variant)', background: 'transparent', cursor: 'pointer', color: 'var(--error)' }}
                              title="Delete batch"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add / Edit Stock Batch Modal */}
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '28px', borderRadius: '16px', width: '600px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', border: '1px solid var(--outline-variant)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="font-serif" style={{ margin: 0, fontSize: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined">{editingBatchId ? 'edit_note' : 'add_box'}</span>
                  {editingBatchId ? 'Edit Stock Batch' : 'Add New Stock Batch'}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="btn btn-icon" style={{ color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveBatch}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--on-surface)' }}>
                      Product *
                    </label>
                    <SearchableProductSelect
                      products={products}
                      value={formData.product_id}
                      onChange={val => {
                        const prod = products.find(p => p.id === val);
                        setFormData({
                          ...formData,
                          product_id: val,
                          cost_price: prod ? (prod.supplier_price || 0) : formData.cost_price,
                          selling_price: prod ? (prod.retail_price || prod.price || 0) : formData.selling_price
                        });
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--on-surface)' }}>
                        Supplier *
                      </label>
                      <select
                        required
                        value={formData.supplier}
                        onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                      >
                        <option value="">-- Select Supplier --</option>
                        {suppliers?.map(s => (
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
                        value={formData.batch_date}
                        onChange={e => setFormData({ ...formData, batch_date: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--on-surface)' }}>
                        Batch No (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.batch_no}
                        onChange={e => setFormData({ ...formData, batch_no: e.target.value })}
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
                        value={formData.quantity}
                        onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
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
                        value={formData.cost_price}
                        onChange={e => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--on-surface)' }}>
                        Selling Price (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0"
                        value={formData.selling_price}
                        onChange={e => setFormData({ ...formData, selling_price: parseFloat(e.target.value) })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingBatchId ? 'Update Batch' : 'Save Batch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          batch={confirmDeleteBatch}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteBatch(null)}
        />
      </div>
    </PosLayout>
  );
}
