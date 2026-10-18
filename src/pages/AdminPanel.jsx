import React, { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useStore } from '../store/useStore.jsx';
import { usePosStore } from '../store/usePosStore.jsx';
import { supabase } from '../lib/supabase.js';
import { navigate } from '../router.jsx';
import { generateBatchNumber } from '../lib/batchUtils.js';
import { usePwaInstall } from '../lib/usePwaInstall.js';

const emptyForm = {
  brand:       '',
  model:       '',
  category:    '',
  size:        '',
  colour:      '',
  description: '',
  image:       '',
  in_stock:    true,
  featured:    false,
  supplier_price: '',
  retail_price: '',
};

function SearchableProductSelect({ products, value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  
  const selectedProduct = products.find(p => p.id === value);
  const displayValue = open ? search : (selectedProduct ? selectedProduct.name : '');

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder="Search or select a product..."
        value={displayValue}
        onChange={e => { setSearch(e.target.value); setOpen(true); onChange(''); }}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--outline)' }}
        required={!value}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface-container-lowest)', border: '1px solid var(--outline)', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {filtered.length === 0 && <div style={{ padding: '12px', color: 'var(--on-surface-variant)' }}>No products found</div>}
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); setSearch(''); }}
              style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid var(--outline-variant)', color: 'var(--on-surface)' }}
              onMouseEnter={(e) => e.target.style.background = 'var(--surface-container)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Desktop App Install Modal ──────────────────────────────────────────────────
function InstallDesktopAppModal({ isOpen, onClose, onInstall, canPrompt, isStandalone }) {
  if (!isOpen) return null;

  return (
    <div className="admin-confirm-overlay" role="dialog" aria-modal="true" style={{ zIndex: 1200 }}>
      <div className="admin-confirm-box" style={{ maxWidth: '500px', textAlign: 'left', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
          <div style={{ 
            width: '52px', height: '52px', borderRadius: '14px', 
            backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>desktop_windows</span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--on-surface)' }}>Install as Desktop App</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--on-surface-variant)' }}>Lekha Script Boutique & Retail POS</p>
          </div>
        </div>

        {isStandalone ? (
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--surface-container-high)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--whatsapp)', fontWeight: '600', marginBottom: '4px' }}>
              <span className="material-symbols-outlined">check_circle</span>
              <span>Already Installed!</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--on-surface-variant)' }}>
              You are currently running Lekha Script inside its dedicated desktop app window.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: 'var(--on-surface)', lineHeight: '1.6', marginBottom: '16px' }}>
              Install Lekha Script as a dedicated standalone desktop app on your PC. It launches instantly from your Desktop or Taskbar, runs in full screen without browser toolbars, and streamlines daily store management and POS printing.
            </p>

            {canPrompt ? (
              <div style={{ marginBottom: '20px' }}>
                <button
                  className="btn btn-primary"
                  onClick={onInstall}
                  style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '15px' }}
                >
                  <span className="material-symbols-outlined">download</span>
                  Install to Desktop Now
                </button>
              </div>
            ) : (
              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--surface-container)', marginBottom: '20px', border: '1px solid var(--outline-variant)' }}>
                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px', color: 'var(--primary)' }}>
                  How to install in your browser:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--on-surface)', lineHeight: '1.4' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)', marginTop: '1px' }}>input</span>
                    <div>
                      <strong>Address Bar 1-Click:</strong> Look at the right side of your browser URL bar (near the star). Click the <strong>Install App (⊕ or 💻)</strong> icon &rarr; click <strong>Install</strong>.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)', marginTop: '1px' }}>more_vert</span>
                    <div>
                      <strong>Browser Menu:</strong>
                      <div style={{ marginTop: '4px', color: 'var(--on-surface-variant)' }}>
                        • <strong>Chrome:</strong> Click Menu (⋮) &rarr; <em>Save and share</em> &rarr; <em>Install Lekha Script</em><br/>
                        • <strong>Edge:</strong> Click Menu (...) &rarr; <em>Apps</em> &rarr; <em>Install this site as an app</em>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="admin-confirm-overlay" role="dialog" aria-modal="true">
      <div className="admin-confirm-box">
        <span className="material-symbols-outlined admin-confirm-icon">warning</span>
        <p>{message}</p>
        <div className="admin-confirm-actions">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Product Form ──────────────────────────────────────────────────────────────
function ProductForm({ initial, availableSizes = [], onSave, onCancel, editingId, saving }) {
  const [form,         setForm]         = useState(initial || emptyForm);
  const [errors,       setErrors]       = useState({});

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const toggleSize = (size) => {
    setForm((f) => {
      const has = f.sizes.includes(size);
      return { ...f, sizes: has ? f.sizes.filter((s) => s !== size) : [...f.sizes, size] };
    });
  };

  const validate = () => {
    const e = {};
    if (!form.brand.trim()) e.brand = 'Brand name is required';
    if (!form.model.trim()) e.model = 'Model is required';
    if (!form.category?.trim()) e.category = 'Category is required';
    if (!form.size.trim())  e.size  = 'Size is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    // Generate Name: Brand-Model-Category-Size-Colour
    let generatedName = `${form.brand.trim()}-${form.model.trim()}-${form.category.trim()}-${form.size.trim()}`;
    if (form.colour && form.colour.trim()) {
      generatedName += `-${form.colour.trim()}`;
    }

    onSave({ 
      ...form, 
      name: generatedName,
      price: parseFloat(form.retail_price) || 0,
      supplier_price: parseFloat(form.supplier_price) || 0,
      retail_price: parseFloat(form.retail_price) || 0
    });
  };

  return (
    <div className="admin-form-overlay" role="dialog" aria-modal="true">
      <div className="admin-form-card">
        <div className="admin-form-header">
          <h2 className="text-headline-md">
            {editingId ? 'Edit Product' : 'Register Product'}
          </h2>
          <button className="admin-close-btn" onClick={onCancel}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <div className="admin-form-scroll">

            {/* Brand */}
            <div className="form-group">
              <label htmlFor="form-brand">Brand Name *</label>
              <input
                id="form-brand"
                type="text"
                value={form.brand}
                onChange={(e) => set('brand', e.target.value)}
                placeholder="e.g. WELLFIT"
                className={errors.brand ? 'input-error' : ''}
              />
              {errors.brand && <span className="form-error">{errors.brand}</span>}
            </div>

            {/* Model */}
            <div className="form-group">
              <label htmlFor="form-model">Model *</label>
              <input
                id="form-model"
                type="text"
                value={form.model}
                onChange={(e) => set('model', e.target.value)}
                placeholder="e.g. ALPA"
                className={errors.model ? 'input-error' : ''}
              />
              {errors.model && <span className="form-error">{errors.model}</span>}
            </div>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="form-category">Category *</label>
              <input
                id="form-category"
                type="text"
                value={form.category || ''}
                onChange={(e) => set('category', e.target.value)}
                placeholder="e.g. BRA, PANTY"
                className={errors.category ? 'input-error' : ''}
              />
              {errors.category && <span className="form-error">{errors.category}</span>}
            </div>
            
            {/* Size */}
            <div className="form-group">
              <label htmlFor="form-size">Size *</label>
              <input
                id="form-size"
                type="text"
                value={form.size}
                onChange={(e) => set('size', e.target.value)}
                placeholder="e.g. 34 C"
                className={errors.size ? 'input-error' : ''}
              />
              {errors.size && <span className="form-error">{errors.size}</span>}
            </div>

            {/* Colour */}
            <div className="form-group">
              <label htmlFor="form-colour">Colour (Optional)</label>
              <input
                id="form-colour"
                type="text"
                value={form.colour || ''}
                onChange={(e) => set('colour', e.target.value)}
                placeholder="e.g. GREY"
              />
            </div>

            {/* Supplier Price */}
            <div className="form-group">
              <label htmlFor="form-supplier-price">Supplier Price</label>
              <input
                id="form-supplier-price"
                type="number"
                value={form.supplier_price}
                onChange={(e) => set('supplier_price', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            {/* Retail Price */}
            <div className="form-group">
              <label htmlFor="form-retail-price">Retail Price</label>
              <input
                id="form-retail-price"
                type="number"
                value={form.retail_price}
                onChange={(e) => set('retail_price', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="form-desc">Description</label>
              <textarea
                id="form-desc"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="Describe the product…"
              />
            </div>

            {/* Image URL */}
            <div className="form-group">
              <label htmlFor="form-image">Image URL</label>
              <input
                id="form-image"
                type="url"
                value={form.image}
                onChange={(e) => set('image', e.target.value)}
                placeholder="https://…"
              />
              {form.image && (
                <div className="image-preview-wrap">
                  <img
                    src={form.image}
                    alt="Preview"
                    className="image-preview"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>



            {/* Toggles */}
            <div className="form-group form-toggles">
              <label className="toggle-label">                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set('featured', e.target.checked)}
                />
                <span className="toggle-track" />
                <span>Featured on Homepage</span>
              </label>
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <><span className="login-spinner" /> Saving…</>
              ) : (
                editingId ? 'Save Changes' : 'Register Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Bulk Product Upload Modal ─────────────────────────────────────────────────
function BulkProductUploadModal({ onClose, onSaved, existingProducts }) {
  const [rawText, setRawText] = useState('');
  const [parsedProducts, setParsedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'preview'
  const [results, setResults] = useState({ success: 0, skipped: 0, failed: 0, errors: [] });

  const parseLines = () => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map((line, idx) => {
      const mainParts = line.split(',');
      const productPart = mainParts[0].trim();
      const parts = productPart.split('_');
      if (parts.length < 4) {
        return { raw: line, error: 'Needs at least 4 parts: BRAND_MODEL_CATEGORY_SIZE', valid: false };
      }
      const brand = parts[0];
      const model = parts[1];
      const category = parts[2];
      const size = parts[3];
      const colour = parts[4] || '';
      const supplierPrice = parseFloat(mainParts[1]) || 0;
      const retailPrice = parseFloat(mainParts[2]) || 0;
      
      // Generate name in the same format as ProductForm
      let name = `${brand}-${model}-${category}-${size}`;
      if (colour) name += `-${colour}`;
      
      // Check for duplicate in existing products
      const isDuplicate = existingProducts.some(p => p.name.toLowerCase() === name.toLowerCase());
      
      return {
        raw: line,
        brand,
        model,
        category,
        size,
        colour,
        supplierPrice,
        retailPrice,
        name,
        isDuplicate,
        valid: true,
        include: !isDuplicate // auto-uncheck duplicates
      };
    });
    setParsedProducts(parsed);
    setStep('preview');
  };

  const toggleInclude = (idx) => {
    setParsedProducts(prev => prev.map((p, i) => i === idx ? { ...p, include: !p.include } : p));
  };

  const toggleAll = (checked) => {
    setParsedProducts(prev => prev.map(p => p.valid ? { ...p, include: checked } : p));
  };

  const includedProducts = parsedProducts.filter(p => p.valid && p.include);
  const duplicateCount = parsedProducts.filter(p => p.valid && p.isDuplicate).length;

  const handleUpload = async () => {
    if (includedProducts.length === 0) return;
    setLoading(true);
    let success = 0, skipped = 0, failed = 0;
    const errors = [];

    // Insert in batches of 20 for efficiency
    const batchSize = 20;
    for (let i = 0; i < includedProducts.length; i += batchSize) {
      const chunk = includedProducts.slice(i, i + batchSize);
      const records = chunk.map(p => ({
        name: p.name,
        brand: p.brand,
        model: p.model,
        category: p.category,
        size: p.size,
        colour: p.colour,
        price: p.retailPrice,
        supplier_price: p.supplierPrice,
        retail_price: p.retailPrice,
        description: '',
        image: '',
        in_stock: true,
        featured: false
      }));

      try {
        const { data, error } = await supabase.from('products').insert(records).select();
        if (error) throw error;
        success += data.length;
      } catch (err) {
        failed += chunk.length;
        errors.push(err.message);
      }
    }

    setResults({ success, skipped, failed, errors });
    setStep('done');
    if (success > 0) onSaved();
  };

  return (
    <div className="admin-form-overlay" role="dialog" aria-modal="true">
      <div className="admin-form-card" style={{ maxWidth: '950px', width: '95vw' }}>
        <div className="admin-form-header">
          <div>
            <h2 className="text-headline-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">upload_file</span>
              Bulk Product Upload
            </h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', marginTop: '4px' }}>
              Paste product names in <strong>BRAND_MODEL_CATEGORY_SIZE_COLOUR,SUPPLIERPRICE,RETAIL_PRICE</strong> format
            </p>
          </div>
          <button className="admin-close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {step === 'input' && (
          <div style={{ padding: '0 24px 24px' }}>
            {/* Format guide */}
            <div style={{ 
              padding: '16px', marginBottom: '20px', 
              backgroundColor: 'var(--surface-container)', borderRadius: '12px',
              border: '1px solid var(--outline-variant)'
            }}>
              <h4 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>info</span>
                Format Guide
              </h4>
              <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: '1.6' }}>
                <p style={{ margin: '0 0 8px' }}>Each line should follow this format (comma separated prices):</p>
                <code style={{ 
                  display: 'block', padding: '10px 14px', 
                  backgroundColor: 'var(--surface-container-highest)', 
                  borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px',
                  color: 'var(--primary)', letterSpacing: '0.5px'
                }}>
                  BRAND_MODEL_CATEGORY_SIZE_COLOUR,SUPPLIERPRICE,RETAIL_PRICE
                </code>
                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '12px' }}>
                  <span>• <strong>BRAND</strong> → e.g. MISLEEVE, WELLFIT</span>
                  <span>• <strong>MODEL</strong> → e.g. MATHAFULLCOTTON</span>
                  <span>• <strong>CATEGORY</strong> → e.g. BRA, PANTY</span>
                  <span>• <strong>SIZE</strong> → e.g. 36B, 34C</span>
                  <span>• <strong>COLOUR</strong> → optional, e.g. SKIN</span>
                  <span>• <strong>SUPPLIERPRICE</strong> → e.g. 150</span>
                  <span>• <strong>RETAIL_PRICE</strong> → e.g. 299</span>
                </div>
              </div>
            </div>

            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={14}
              placeholder={`Paste product names here, one per line...\n\nExample:\nMISLEEVE_MATHAFULLCOTTON_BRA_36B_SKIN,150,299\nMISLEEVE_MATHAFULLCOTTON_BRA_38B_SKIN,150,299\nMISLEEVE_COOLTSHIRT_BRA_34B_ASSORTED,200,350`}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px',
                border: '1px solid var(--outline)', fontFamily: 'monospace',
                fontSize: '14px', lineHeight: '1.6', resize: 'vertical',
                backgroundColor: 'var(--surface-container-lowest)',
                color: 'var(--on-surface)'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                {rawText.split('\n').filter(l => l.trim()).length} line(s) detected
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
                <button 
                  type="button" 
                  onClick={parseLines} 
                  className="btn btn-primary"
                  disabled={!rawText.trim()}
                >
                  <span className="material-symbols-outlined">search</span>
                  Parse & Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div style={{ padding: '0 24px 24px' }}>
            {/* Summary bar */}
            <div style={{ 
              display: 'flex', gap: '16px', marginBottom: '16px', padding: '12px 16px',
              backgroundColor: 'var(--surface-container)', borderRadius: '12px', flexWrap: 'wrap', alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px' }}>
                <strong style={{ color: 'var(--primary)' }}>{parsedProducts.filter(p => p.valid).length}</strong> valid
              </span>
              <span style={{ fontSize: '14px' }}>
                <strong style={{ color: 'var(--error)' }}>{parsedProducts.filter(p => !p.valid).length}</strong> invalid
              </span>
              <span style={{ fontSize: '14px' }}>
                <strong style={{ color: '#e67e22' }}>{duplicateCount}</strong> duplicates
              </span>
              <span style={{ fontSize: '14px' }}>
                <strong style={{ color: 'var(--whatsapp, #25D366)' }}>{includedProducts.length}</strong> will be uploaded
              </span>
              <div style={{ marginLeft: 'auto' }}>
                <label style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" checked={includedProducts.length === parsedProducts.filter(p => p.valid).length} onChange={e => toggleAll(e.target.checked)} />
                  Select All
                </label>
              </div>
            </div>

            {/* Preview table */}
            <div style={{ maxHeight: '45vh', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface-container)', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '40px' }}>✓</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Brand</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Model</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Size</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Colour</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Sup. Price</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Ret. Price</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedProducts.map((p, idx) => (
                    <tr key={idx} style={{ 
                      borderBottom: '1px solid var(--outline-variant)',
                      backgroundColor: !p.valid ? 'rgba(255,0,0,0.05)' : p.isDuplicate ? 'rgba(255,165,0,0.05)' : (idx % 2 === 0 ? 'transparent' : 'var(--surface-container-low)'),
                      opacity: p.valid && !p.include ? 0.5 : 1
                    }}>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {p.valid && (
                          <input type="checkbox" checked={p.include} onChange={() => toggleInclude(idx)} />
                        )}
                      </td>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{p.valid ? p.brand : <span style={{ color: 'var(--error)' }}>{p.raw}</span>}</td>
                      <td style={{ padding: '8px' }}>{p.model || '-'}</td>
                      <td style={{ padding: '8px' }}>{p.category || '-'}</td>
                      <td style={{ padding: '8px' }}>{p.size || '-'}</td>
                      <td style={{ padding: '8px' }}>{p.colour || '-'}</td>
                      <td style={{ padding: '8px' }}>{p.valid ? `₹${p.supplierPrice}` : '-'}</td>
                      <td style={{ padding: '8px' }}>{p.valid ? `₹${p.retailPrice}` : '-'}</td>
                      <td style={{ padding: '8px' }}>
                        {!p.valid ? (
                          <span style={{ color: 'var(--error)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                            {p.error}
                          </span>
                        ) : p.isDuplicate ? (
                          <span style={{ color: '#e67e22', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
                            Duplicate
                          </span>
                        ) : (
                          <span style={{ color: 'var(--whatsapp, #25D366)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button type="button" onClick={() => setStep('input')} className="btn btn-outline">
                <span className="material-symbols-outlined">arrow_back</span>
                Back to Edit
              </button>
              <button 
                type="button" 
                onClick={handleUpload} 
                className="btn btn-primary"
                disabled={loading || includedProducts.length === 0}
                style={{ minWidth: '180px' }}
              >
                {loading ? (
                  <><span className="login-spinner" /> Uploading...</>
                ) : (
                  <><span className="material-symbols-outlined">cloud_upload</span> Upload {includedProducts.length} Product{includedProducts.length !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ 
              fontSize: '64px', 
              color: results.failed === 0 ? 'var(--whatsapp, #25D366)' : 'var(--error)',
              marginBottom: '16px', display: 'block'
            }}>
              {results.failed === 0 ? 'task_alt' : 'error_outline'}
            </span>
            <h3 style={{ marginBottom: '24px' }}>Upload Complete</h3>
            
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ padding: '16px 24px', backgroundColor: 'var(--surface-container)', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--whatsapp, #25D366)' }}>{results.success}</div>
                <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Uploaded</div>
              </div>
              {results.failed > 0 && (
                <div style={{ padding: '16px 24px', backgroundColor: 'var(--surface-container)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--error)' }}>{results.failed}</div>
                  <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Failed</div>
                </div>
              )}
            </div>

            {results.errors.length > 0 && (
              <div style={{ textAlign: 'left', padding: '12px', backgroundColor: 'rgba(255,0,0,0.05)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--error)' }}>
                {results.errors.map((e, i) => <p key={i} style={{ margin: '4px 0' }}>• {e}</p>)}
              </div>
            )}

            <button type="button" onClick={onClose} className="btn btn-primary">
              <span className="material-symbols-outlined">check</span>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Online Orders Manager ───────────────────────────────────────────────────────
function OnlineOrdersManager() {
  const { onlineOrders, fetchOnlineOrders, acceptOrder, rejectOrder, cancelOnlineOrder } = useStore();
  const [loadingAction, setLoadingAction] = useState(null);

  const [confirmCancelId, setConfirmCancelId] = useState(null);

  React.useEffect(() => {
    fetchOnlineOrders();
  }, [fetchOnlineOrders]);

  const handleAction = async (action, id) => {
    if (action === 'cancel') {
      setConfirmCancelId(id);
      return;
    }
    setLoadingAction(id);
    try {
      if (action === 'accept') {
        await acceptOrder(id);
        toast.success('Order accepted and stock deducted successfully!');
      } else if (action === 'reject') {
        await rejectOrder(id);
        toast.success('Order rejected.');
      }
    } catch (err) {
      toast.error('Error processing order: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!confirmCancelId) return;
    setLoadingAction(confirmCancelId);
    try {
      await cancelOnlineOrder(confirmCancelId);
      toast.success('Order cancelled and items restocked.');
      setConfirmCancelId(null);
    } catch (err) {
      toast.error('Error cancelling order: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="admin-main" style={{ width: '100%' }}>
      <h3 className="admin-section-title">
        <span className="material-symbols-outlined">shopping_cart</span>
        Online Orders
      </h3>
      
      {onlineOrders.length === 0 ? (
        <div className="admin-empty">
          <span className="material-symbols-outlined">inbox</span>
          <p>No online orders found.</p>
        </div>
      ) : (
        <div className="admin-orders-list">
          {onlineOrders.map(order => {
            const badgeClass = order.status === 'pending' 
              ? 'admin-badge-pending' 
              : order.status === 'accepted' || order.status === 'completed'
                ? 'admin-badge-success' 
                : 'admin-badge-error';

            return (
              <div key={order.id} className="admin-order-card" style={{ opacity: order.status === 'cancelled' ? 0.7 : 1 }}>
                <div className="admin-order-header">
                  <div>
                    <h4 className="admin-order-title">{order.order_no}</h4>
                    <span className="admin-order-meta">{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                  <div className={`admin-badge ${badgeClass}`}>
                    {order.status}
                  </div>
                </div>

                <div className="admin-order-body">
                  <div className="admin-order-section">
                    <h4>Customer Details</h4>
                    <div className="admin-order-details">
                      <p><strong>Name:</strong> {order.customer_name}</p>
                      <p><strong>Phone:</strong> {order.customer_phone}</p>
                      <p><strong>Address:</strong> {order.customer_address}</p>
                    </div>
                  </div>
                  
                  <div className="admin-order-section" style={{ flex: 2 }}>
                    <h4>Order Summary</h4>
                    <ul className="admin-order-items">
                      {order.items?.map(item => (
                        <li key={item.id}>
                          <span>
                            {item.product?.name || 'Unknown'} {item.size && `(${item.size})`} × {item.quantity}
                          </span>
                          <span>₹{item.price * item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="admin-order-total">Total: ₹{order.total}</div>
                  </div>
                </div>

                {order.status === 'pending' && (
                  <div className="admin-order-actions">
                    <button 
                      className="btn btn-outline" 
                      style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                      onClick={() => handleAction('reject', order.id)}
                      disabled={loadingAction === order.id}
                    >
                      Reject Order
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ backgroundColor: 'var(--whatsapp)', borderColor: 'var(--whatsapp)' }}
                      onClick={() => handleAction('accept', order.id)}
                      disabled={loadingAction === order.id}
                    >
                      {loadingAction === order.id ? 'Processing...' : 'Accept & Deduct Stock'}
                    </button>
                  </div>
                )}
                {order.status === 'accepted' && (
                  <div className="admin-order-actions">
                    <button 
                      className="btn btn-outline" 
                      style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                      onClick={() => handleAction('cancel', order.id)}
                      disabled={loadingAction === order.id}
                    >
                      {loadingAction === order.id ? 'Processing...' : 'Cancel & Restock'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {confirmCancelId && (
        <ConfirmDialog
          message="Are you sure you want to cancel this accepted order and restock the items?"
          onConfirm={handleConfirmCancelOrder}
          onCancel={() => setConfirmCancelId(null)}
        />
      )}
    </div>
  );
}

// ── Online Orders Analytics ─────────────────────────────────────────────────────
function OnlineOrdersAnalytics() {
  const { onlineOrders, batches } = useStore();

  const analytics = React.useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let successfulOrders = 0;
    const topProducts = {};

    onlineOrders.forEach(order => {
      if (order.status === 'accepted' || order.status === 'completed') {
        successfulOrders++;
        revenue += Number(order.total) || 0;
        
        // Calculate estimated profit
        if (order.items) {
          order.items.forEach(item => {
            const activeBatches = batches.filter(b => b.product_id === item.product_id && b.quantity > 0);
            let avgCost = 0;
            if (activeBatches.length > 0) {
              avgCost = activeBatches.reduce((sum, b) => sum + (b.cost_price || 0), 0) / activeBatches.length;
            }
            
            const itemRevenue = (Number(item.price) || 0) * item.quantity;
            const itemCost = avgCost * item.quantity;
            profit += (itemRevenue - itemCost);
            
            // Track top products
            if (!topProducts[item.product_id]) {
              topProducts[item.product_id] = { name: item.product?.name || 'Unknown', qty: 0, revenue: 0 };
            }
            topProducts[item.product_id].qty += item.quantity;
            topProducts[item.product_id].revenue += itemRevenue;
          });
        }
      }
    });

    const topList = Object.values(topProducts).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    
    return { revenue, profit, successfulOrders, topList };
  }, [onlineOrders, batches]);

  return (
    <div className="admin-main" style={{ width: '100%' }}>
      <h3 className="admin-section-title">
        <span className="material-symbols-outlined">monitoring</span>
        Online Sales Analytics
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div style={{ padding: '24px', backgroundColor: 'var(--surface-container)', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
          <div style={{ color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Total Online Revenue</div>
          <div className="font-serif text-display-lg" style={{ fontSize: '32px' }}>₹{analytics.revenue.toFixed(2)}</div>
        </div>
        <div style={{ padding: '24px', backgroundColor: 'var(--surface-container)', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
          <div style={{ color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Estimated Profit</div>
          <div className="font-serif text-display-lg" style={{ fontSize: '32px', color: 'var(--primary)' }}>₹{analytics.profit.toFixed(2)}</div>
          <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>*Based on current inventory cost</div>
        </div>
        <div style={{ padding: '24px', backgroundColor: 'var(--surface-container)', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
          <div style={{ color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Successful Orders</div>
          <div className="font-serif text-display-lg" style={{ fontSize: '32px' }}>{analytics.successfulOrders}</div>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--surface-container-lowest)', borderRadius: '12px', border: '1px solid var(--outline-variant)', padding: '24px' }}>
        <h2 className="font-serif" style={{ marginBottom: '16px' }}>Top Selling Online Products</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--outline)' }}>
              <th style={{ padding: '8px 0' }}>Product</th>
              <th style={{ padding: '8px 0', textAlign: 'right' }}>Qty Sold</th>
              <th style={{ padding: '8px 0', textAlign: 'right' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {analytics.topList.map((p, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                <td style={{ padding: '12px 0' }}>{p.name}</td>
                <td style={{ padding: '12px 0', textAlign: 'right' }}>{p.qty}</td>
                <td style={{ padding: '12px 0', textAlign: 'right' }}>₹{p.revenue.toFixed(2)}</td>
              </tr>
            ))}
            {analytics.topList.length === 0 && <tr><td colSpan="3" style={{ padding: '16px 0', color: 'var(--on-surface-variant)' }}>No sales data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Online Store Settings ───────────────────────────────────────────────────────
function OnlineStoreSettings() {
  const { storeSettings, updateStoreSettings } = useStore();
  const [formData, setFormData] = React.useState({ delivery_charge: 0, free_delivery_threshold: 0 });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (storeSettings) {
      setFormData({
        delivery_charge: storeSettings.delivery_charge || 0,
        free_delivery_threshold: storeSettings.free_delivery_threshold || 0
      });
    }
  }, [storeSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateStoreSettings(formData);
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error('Error saving settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-main" style={{ width: '100%', maxWidth: '600px' }}>
      <h3 className="admin-section-title">
        <span className="material-symbols-outlined">settings</span>
        Online Store Settings
      </h3>
      
      <form onSubmit={handleSave} className="admin-form" style={{ backgroundColor: 'var(--surface-container)', padding: '24px', borderRadius: '12px' }}>
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Delivery Charge (₹)</label>
          <input 
            type="number" 
            min="0" 
            value={formData.delivery_charge} 
            onChange={(e) => setFormData({...formData, delivery_charge: Number(e.target.value)})}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline)' }}
          />
          <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>Applied to all online orders below the threshold.</p>
        </div>
        
        <div className="form-group" style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Free Delivery Threshold (₹)</label>
          <input 
            type="number" 
            min="0" 
            value={formData.free_delivery_threshold} 
            onChange={(e) => setFormData({...formData, free_delivery_threshold: Number(e.target.value)})}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline)' }}
          />
          <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>Orders above this amount will get free shipping. Set to 0 to always charge for delivery.</p>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '16px' }}>
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

// ── Bulk Stock Entry Modal ──────────────────────────────────────────────────────
function BulkStockEntryModal({ supplierId, supplierName, products, onClose, onSaved }) {
  const emptyRow = () => ({ id: Date.now(), product_id: '', quantity: 1, cost_price: 0, selling_price: 0 });
  const [rows, setRows] = useState([emptyRow()]);
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchNoPrefix, setBatchNoPrefix] = useState('');
  const [loading, setLoading] = useState(false);

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (id) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const duplicateRow = (id) => {
    const source = rows.find(r => r.id === id);
    if (source) {
      setRows(prev => [...prev, { ...source, id: Date.now(), product_id: '' }]);
    }
  };

  const validRows = rows.filter(r => r.product_id && r.quantity > 0 && r.selling_price > 0);
  const totalItems = validRows.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const totalCost = validRows.reduce((sum, r) => sum + ((r.cost_price || 0) * (r.quantity || 0)), 0);

  const handleSaveAll = async (e) => {
    e.preventDefault();
    if (validRows.length === 0) {
      toast.error('Please add at least one product with quantity and selling price.');
      return;
    }
    setLoading(true);
    try {
      const sharedSalt = Math.random().toString(36).substring(2, 6).toUpperCase();
      const batchRecords = validRows.map((row, idx) => ({
        product_id: row.product_id,
        batch_no: generateBatchNumber(batchNoPrefix, idx, sharedSalt),
        quantity: row.quantity,
        cost_price: row.cost_price || 0,
        selling_price: row.selling_price,
        supplier: supplierId,
        batch_date: batchDate
      }));

      const { error } = await supabase.from('batches').insert(batchRecords);
      if (error) throw error;

      toast.success(`${validRows.length} batch(es) added successfully!`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-form-overlay" role="dialog" aria-modal="true">
      <div className="admin-form-card" style={{ maxWidth: '950px', width: '95vw' }}>
        <div className="admin-form-header">
          <div>
            <h2 className="text-headline-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">playlist_add</span>
              Bulk Stock Entry
            </h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', marginTop: '4px' }}>
              Supplier: <strong style={{ color: 'var(--primary)' }}>{supplierName}</strong>
            </p>
          </div>
          <button className="admin-close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSaveAll} className="admin-form">
          <div className="admin-form-scroll" style={{ maxHeight: '65vh' }}>
            {/* Shared fields */}
            <div className="admin-batch-header">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Batch Date *</label>
                <input type="date" required value={batchDate} onChange={e => setBatchDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Batch No Prefix (Optional)</label>
                <input type="text" value={batchNoPrefix} onChange={e => setBatchNoPrefix(e.target.value)} placeholder="e.g. INV-2024-01" />
              </div>
            </div>

            {/* Product rows */}
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--on-surface)' }}>Products ({rows.length} rows, {validRows.length} valid)</h4>
              <button type="button" className="btn btn-outline" onClick={addRow} style={{ padding: '6px 14px', fontSize: '13px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                Add Row
              </button>
            </div>

            {/* Header row */}
            <div className="admin-bulk-header">
              <span>Product</span>
              <span>Qty</span>
              <span>Cost ₹</span>
              <span>Sell ₹</span>
              <span></span>
            </div>

            {/* Data rows */}
            {rows.map((row, idx) => (
              <div key={row.id} className="admin-bulk-row" style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--surface-container-low)' }}>
                <div className="admin-bulk-row-product">
                  <SearchableProductSelect
                    products={products}
                    value={row.product_id}
                    onChange={val => {
                      const selectedProduct = products.find(p => p.id === val);
                      setRows(prev => prev.map(r => r.id === row.id ? { 
                        ...r, 
                        product_id: val,
                        cost_price: selectedProduct ? (selectedProduct.supplier_price || 0) : r.cost_price,
                        selling_price: selectedProduct ? (selectedProduct.retail_price || selectedProduct.price || 0) : r.selling_price
                      } : r));
                    }}
                  />
                </div>
                <input
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={e => updateRow(row.id, 'quantity', parseInt(e.target.value) || 0)}
                  placeholder="Qty"
                  title="Quantity"
                  style={{ padding: '10px 6px', borderRadius: '6px', border: '1px solid var(--outline)', textAlign: 'center', width: '100%' }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.cost_price}
                  onChange={e => updateRow(row.id, 'cost_price', parseFloat(e.target.value) || 0)}
                  placeholder="Cost ₹"
                  title="Cost Price"
                  style={{ padding: '10px 6px', borderRadius: '6px', border: '1px solid var(--outline)', textAlign: 'right', width: '100%' }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.selling_price}
                  onChange={e => updateRow(row.id, 'selling_price', parseFloat(e.target.value) || 0)}
                  placeholder="Sell ₹"
                  title="Selling Price"
                  style={{ padding: '10px 6px', borderRadius: '6px', border: '1px solid var(--outline)', textAlign: 'right', width: '100%' }}
                />
                <div className="admin-bulk-row-delete">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    title="Remove row"
                    style={{
                      background: 'none', border: 'none', cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                      color: rows.length <= 1 ? 'var(--outline)' : 'var(--error)', padding: '4px', borderRadius: '4px',
                      display: 'flex', alignItems: 'center', width: 'auto'
                    }}
                    disabled={rows.length <= 1}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Quick add more button at the bottom of rows */}
            <button
              type="button"
              onClick={addRow}
              style={{
                width: '100%', padding: '12px', marginTop: '8px',
                border: '2px dashed var(--outline-variant)', borderRadius: '8px',
                background: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontSize: '14px', transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--outline-variant)'; e.target.style.color = 'var(--on-surface-variant)'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
              Add another product
            </button>

            {/* Summary */}
            {validRows.length > 0 && (
              <div style={{
                marginTop: '16px', padding: '16px', backgroundColor: 'var(--primary-container)',
                borderRadius: '12px', display: 'flex', justifyContent: 'space-around', textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--on-primary-container)', opacity: 0.7 }}>Products</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--on-primary-container)' }}>{validRows.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--on-primary-container)', opacity: 0.7 }}>Total Items</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--on-primary-container)' }}>{totalItems}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--on-primary-container)', opacity: 0.7 }}>Total Cost</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--on-primary-container)' }}>₹{totalCost.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>

          <div className="admin-form-actions">
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={loading || validRows.length === 0} className="btn btn-primary" style={{ minWidth: '160px' }}>
              {loading ? (
                <><span className="login-spinner" /> Saving...</>
              ) : (
                <><span className="material-symbols-outlined">save</span> Save {validRows.length} Batch{validRows.length !== 1 ? 'es' : ''}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Inventory Batches Manager ───────────────────────────────────────────────────
function InventoryBatchesManager({ activeSupplierIdToBatch, onBatchModalClosed }) {
  const { batches, fetchPosData, updateBatch, deleteBatch, suppliers } = usePosStore();
  const { products, fetchData: fetchGlobalData } = useStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSupplierId, setBulkSupplierId] = useState(null);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '', batch_no: '', quantity: 10, cost_price: 0, selling_price: 0, supplier: '', batch_date: new Date().toISOString().split('T')[0]
  });

  const [editingBatchId, setEditingBatchId] = useState(null);

  React.useEffect(() => {
    if (activeSupplierIdToBatch) {
      setBulkSupplierId(activeSupplierIdToBatch);
      setShowBulkModal(true);
    }
  }, [activeSupplierIdToBatch]);

  const handleCloseBulkModal = () => {
    setShowBulkModal(false);
    setBulkSupplierId(null);
    if (onBatchModalClosed) onBatchModalClosed();
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!formData.supplier) {
      toast.error('Please select a supplier.');
      return;
    }
    setLoading(true);
    try {
      if (editingBatchId) {
        await updateBatch(editingBatchId, {
          product_id: formData.product_id,
          batch_no: (formData.batch_no && formData.batch_no.trim()) ? formData.batch_no.trim().toUpperCase() : generateBatchNumber(),
          quantity: formData.quantity,
          cost_price: formData.cost_price,
          selling_price: formData.selling_price,
          supplier: formData.supplier,
          batch_date: formData.batch_date
        });
      } else {
        const finalBatchNo = (formData.batch_no && formData.batch_no.trim())
          ? formData.batch_no.trim().toUpperCase()
          : generateBatchNumber();

        const { error } = await supabase.from('batches').insert([{
          ...formData,
          batch_no: finalBatchNo
        }]);
        if (error) throw error;
        await fetchPosData();
        await fetchGlobalData();
      }
      handleCloseModal();
      setEditingBatchId(null);
      setFormData({ product_id: '', batch_no: '', quantity: 10, cost_price: 0, selling_price: 0, supplier: '', batch_date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (batch) => {
    setFormData({
      product_id: batch.product_id,
      batch_no: batch.batch_no || '',
      quantity: batch.quantity || 0,
      cost_price: batch.cost_price || 0,
      selling_price: batch.selling_price || 0,
      supplier: batch.supplier || '',
      batch_date: batch.batch_date || ''
    });
    setEditingBatchId(batch.id);
    setShowAddModal(true);
  };

  const handleDelete = (batch) => {
    setConfirmDeleteBatch(batch);
  };

  const handleConfirmDeleteBatch = async () => {
    if (!confirmDeleteBatch) return;
    try {
      await deleteBatch(confirmDeleteBatch.id);
      toast.success('Batch deleted');
      setConfirmDeleteBatch(null);
      await fetchPosData();
      await fetchGlobalData();
    } catch (err) {
      toast.error('Failed to delete batch: ' + err.message);
    }
  };

  const bulkSupplierName = suppliers?.find(s => s.id === bulkSupplierId)?.name || 'Unknown Supplier';

  return (
    <div className="admin-main" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 className="admin-section-title">
          <span className="material-symbols-outlined">inventory</span>
          Inventory Batches
        </h3>
        <button 
          onClick={() => {
            setFormData({ product_id: '', batch_no: '', quantity: 10, cost_price: 0, selling_price: 0, supplier: '', batch_date: new Date().toISOString().split('T')[0] });
            setEditingBatchId(null);
            setShowAddModal(true);
          }}
          className="btn btn-primary"
        >
          <span className="material-symbols-outlined">add</span>
          Add Stock Batch
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Batch No</th>
              <th>Qty</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Supplier</th>
              <th>Batch Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight: '500' }}>{b.product?.name || 'Unknown'}</td>
                <td>{b.batch_no}</td>
                <td style={{ fontWeight: '600', color: b.quantity <= 5 ? 'var(--error)' : 'inherit' }}>{b.quantity}</td>
                <td style={{ color: 'var(--on-surface-variant)' }}>₹{b.cost_price || 0}</td>
                <td>₹{b.selling_price || b.product?.price}</td>
                <td style={{ color: 'var(--on-surface-variant)' }}>
                  {suppliers?.find(s => s.id === b.supplier)?.name || b.supplier || '-'}
                </td>
                <td style={{ color: 'var(--on-surface-variant)' }}>{b.batch_date ? new Date(b.batch_date).toLocaleDateString() : '-'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => handleEdit(b)} className="admin-icon-btn" title="Edit" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button onClick={() => handleDelete(b)} className="admin-icon-btn admin-icon-btn-danger" title="Delete" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>No batches found. Add one to start selling.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Single batch modal (for Add / Edit) */}
      {showAddModal && (
        <div className="admin-form-overlay" role="dialog" aria-modal="true">
          <div className="admin-form-card" style={{ maxWidth: '650px' }}>
            <div className="admin-form-header">
              <h2 className="text-headline-md">
                {editingBatchId ? 'Edit Stock Batch' : 'Add New Stock Batch'}
              </h2>
              <button className="admin-close-btn" onClick={handleCloseModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveBatch} className="admin-form">
              <div className="admin-form-scroll">
                <div className="form-group">
                  <label>Product *</label>
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
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label>Supplier *</label>
                    <select 
                      required
                      value={formData.supplier || ''} 
                      onChange={e => setFormData({...formData, supplier: e.target.value})}
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers?.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      {/* Keep ability to show legacy free-text suppliers if they edit an old one */}
                      {formData.supplier && !suppliers?.find(s => s.id === formData.supplier) && (
                        <option value={formData.supplier}>{formData.supplier}</option>
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Batch Date *</label>
                    <input type="date" required value={formData.batch_date || ''} onChange={e => setFormData({...formData, batch_date: e.target.value})} />
                  </div>

                  <div className="form-group">
                    <label>Batch No (Optional)</label>
                    <input type="text" value={formData.batch_no} onChange={e => setFormData({...formData, batch_no: e.target.value})} placeholder="Auto-gen if empty" />
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input type="number" required min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
                  </div>

                  <div className="form-group">
                    <label>Cost Price (₹)</label>
                    <input type="number" step="0.01" min="0" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value)})} />
                  </div>
                  <div className="form-group">
                    <label>Selling Price (₹) *</label>
                    <input type="number" step="0.01" required min="0" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: parseFloat(e.target.value)})} />
                  </div>
                </div>
              </div>

              <div className="admin-form-actions">
                <button type="button" onClick={handleCloseModal} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Saving...' : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk stock entry modal (for supplier-triggered additions) */}
      {showBulkModal && bulkSupplierId && (
        <BulkStockEntryModal
          supplierId={bulkSupplierId}
          supplierName={bulkSupplierName}
          products={products}
          onClose={handleCloseBulkModal}
          onSaved={() => fetchPosData()}
        />
      )}

      {/* Confirm Delete Batch Dialog */}
      {confirmDeleteBatch && (
        <ConfirmDialog
          message={`Are you sure you want to delete batch "${confirmDeleteBatch.batch_no || 'selected batch'}"?`}
          onConfirm={handleConfirmDeleteBatch}
          onCancel={() => setConfirmDeleteBatch(null)}
        />
      )}
    </div>
  );
}

// ── Suppliers Manager ─────────────────────────────────────────────────────────
function SuppliersManager({ onAddBatchForSupplier }) {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = usePosStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteSupplier, setConfirmDeleteSupplier] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateSupplier(editingId, formData);
        toast.success('Supplier updated');
      } else {
        await addSupplier(formData);
        toast.success('Supplier added');
      }
      setShowAddModal(false);
      setEditingId(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (s) => {
    setFormData({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '' });
    setEditingId(s.id);
    setShowAddModal(true);
  };

  const handleDelete = (s) => {
    setConfirmDeleteSupplier(s);
  };

  const handleConfirmDeleteSupplier = async () => {
    if (!confirmDeleteSupplier) return;
    try {
      await deleteSupplier(confirmDeleteSupplier.id);
      toast.success('Supplier deleted');
      setConfirmDeleteSupplier(null);
    } catch (err) {
      toast.error('Failed to delete supplier');
    }
  };

  return (
    <div className="admin-main" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 className="admin-section-title">
          <span className="material-symbols-outlined">local_shipping</span>
          Suppliers
        </h3>
        <button 
          onClick={() => {
            setFormData({ name: '', phone: '', email: '', address: '' });
            setEditingId(null);
            setShowAddModal(true);
          }}
          className="btn btn-primary"
        >
          <span className="material-symbols-outlined">add</span>
          Add Supplier
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers?.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: '500' }}>{s.name}</td>
                <td>{s.phone || '-'}</td>
                <td>{s.email || '-'}</td>
                <td>{s.address || '-'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => onAddBatchForSupplier(s.id)} className="admin-icon-btn" title="Add Batch" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '8px' }}>
                    <span className="material-symbols-outlined">add_box</span>
                  </button>
                  <button onClick={() => handleEdit(s)} className="admin-icon-btn" title="Edit" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button onClick={() => handleDelete(s)} className="admin-icon-btn admin-icon-btn-danger" title="Delete" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {(!suppliers || suppliers.length === 0) && (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>No suppliers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="admin-form-overlay" role="dialog" aria-modal="true">
          <div className="admin-form-card" style={{ maxWidth: '500px' }}>
            <div className="admin-form-header">
              <h2 className="text-headline-md">{editingId ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button className="admin-close-btn" onClick={() => setShowAddModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="admin-form">
              <div className="admin-form-scroll">
                <div className="form-group">
                  <label>Supplier Name *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>
              <div className="admin-form-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : 'Save Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteSupplier && (
        <ConfirmDialog
          message={`Are you sure you want to delete supplier "${confirmDeleteSupplier.name}"?`}
          onConfirm={handleConfirmDeleteSupplier}
          onCancel={() => setConfirmDeleteSupplier(null)}
        />
      )}
    </div>
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────
export default function AdminPanel({ onLogout }) {
  const {
    products, cart, availableSizes, batches,
    addProduct, updateProduct, deleteProduct,
    loading, fetchData,
  } = useStore();

  const [showForm,        setShowForm]        = useState(false);
  const [editingProduct,  setEditingProduct]  = useState(null);
  const [confirm,         setConfirm]         = useState(null);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [filterBrand,     setFilterBrand]     = useState('all');
  const [saving,          setSaving]          = useState(false);
  const [opError,         setOpError]         = useState('');
  const [activeTab,       setActiveTab]       = useState('dashboard');
  const [activeProductTab,setActiveProductTab]= useState('products');
  const [activeOrderTab,  setActiveOrderTab]  = useState('list');
  const [activeSupplierIdToBatch, setActiveSupplierIdToBatch] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const { isStandalone, canPrompt, triggerInstall } = usePwaInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleInstallClick = async () => {
    if (isStandalone) {
      toast.success('Lekha Script is already running as an installed desktop app!');
      return;
    }
    if (canPrompt) {
      const res = await triggerInstall();
      if (res.success) {
        toast.success('Lekha Script installed to your Desktop successfully!');
      } else if (res.outcome === 'dismissed') {
        toast('Installation was cancelled.');
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const handleAddBatchForSupplier = (supplierId) => {
    setActiveSupplierIdToBatch(supplierId);
    setActiveProductTab('inventory');
  };

  const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();

  const duplicateKeys = useMemo(() => {
    const counts = {};
    const dupes = new Set();
    products.forEach(p => {
      const key = `${(p.name || '').trim().toLowerCase()}--${(p.size || '').trim().toLowerCase()}--${(p.colour || '').trim().toLowerCase()}`;
      if (counts[key]) {
        dupes.add(key);
      } else {
        counts[key] = true;
      }
    });
    return dupes;
  }, [products]);

  const filteredProducts = products.filter((p) => {
    const matchBrand  = filterBrand === 'all' || p.brand === filterBrand;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (showDuplicatesOnly) {
      const key = `${(p.name || '').trim().toLowerCase()}--${(p.size || '').trim().toLowerCase()}--${(p.colour || '').trim().toLowerCase()}`;
      if (!duplicateKeys.has(key)) return false;
    }
    return matchBrand && matchSearch;
  });

  // ── Save (add / edit) ────────────────────────────────────────────────────
  const handleSave = useCallback(async (formData) => {
    setSaving(true);
    setOpError('');
    try {
      const data = { ...formData };
      delete data.created_at;

      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
      } else {
        await addProduct(data);
      }
      setShowForm(false);
      setEditingProduct(null);
    } catch (err) {
      setOpError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [editingProduct, addProduct, updateProduct]);

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!filteredProducts || filteredProducts.length === 0) {
      toast.error('No products to export');
      return;
    }
    const headers = ['id', 'name', 'brand', 'model', 'category', 'size', 'colour', 'description', 'in_stock', 'featured', 'supplier_price', 'retail_price'];
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const p of filteredProducts) {
      const row = headers.map(header => {
        let val = p[header];
        if (val === null || val === undefined) val = '';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(row.join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `products_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Products exported successfully');
  }, [filteredProducts]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const doDelete = useCallback(async () => {
    if (!confirm) return;
    setSaving(true);
    setOpError('');
    try {
      await deleteProduct(confirm.id);
      setConfirm(null);
    } catch (err) {
      setOpError('Delete failed: ' + err.message);
      setConfirm(null);
    } finally {
      setSaving(false);
    }
  }, [confirm, deleteProduct]);

  return (
    <div className="admin-page">
      {confirm && (
        <ConfirmDialog
          message={`Delete "${confirm.name}"? This cannot be undone.`}
          onConfirm={doDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {showInstallModal && (
        <InstallDesktopAppModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
          onInstall={async () => {
            const res = await triggerInstall();
            if (res.success) {
              toast.success('Lekha Script installed to Desktop!');
              setShowInstallModal(false);
            }
          }}
          canPrompt={canPrompt}
          isStandalone={isStandalone}
        />
      )}

      {showForm && (
        <ProductForm
          initial={
            editingProduct
              ? { ...editingProduct, price: String(editingProduct.price) }
              : emptyForm
          }
          availableSizes={availableSizes}
          editingId={editingProduct?.id}
          saving={saving}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingProduct(null); }}
        />
      )}

      {/* ── Header ── */}
      <div className="admin-header">
        <div className="container">
          <div className="admin-header-inner">
            <div>
              <h1 className="admin-page-title">
                <span className="material-symbols-outlined">admin_panel_settings</span>
                Admin Panel
              </h1>
              <p className="admin-page-subtitle">Manage your products and brands</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className="btn btn-primary"
                onClick={handleInstallClick}
                id="admin-install-desktop-btn"
                style={{
                  backgroundColor: isStandalone ? 'rgba(255,255,255,0.1)' : 'var(--primary-container)',
                  borderColor: isStandalone ? 'rgba(255,255,255,0.2)' : 'var(--primary)',
                  color: isStandalone ? 'white' : 'var(--on-primary-container)',
                  fontWeight: '600'
                }}
                title={isStandalone ? "Running as Desktop App" : "Install as an app on your Desktop"}
              >
                <span className="material-symbols-outlined">{isStandalone ? 'verified' : 'desktop_windows'}</span>
                {isStandalone ? 'Desktop App' : 'Install Desktop App'}
              </button>
              <button className="btn btn-primary" onClick={() => navigate('#/')} id="admin-back-home-btn">
                <span className="material-symbols-outlined">home</span>
                Back to Site
              </button>
              <button className="btn btn-primary" onClick={() => navigate('#/pos')} style={{ backgroundColor: 'var(--whatsapp)' }}>
                <span className="material-symbols-outlined">point_of_sale</span>
                Retail POS
              </button>
              <button
                className="btn btn-primary"
                onClick={onLogout}
                style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                id="admin-logout-btn"
              >
                <span className="material-symbols-outlined">logout</span>
                Logout
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="admin-stats">
            {[
              { icon: 'inventory_2', value: products.length, label: 'Products' },
              { icon: 'shopping_bag',value: cart.length,     label: 'Cart Items' },
              { icon: 'check_circle',value: products.filter((p) => p.in_stock).length, label: 'In Stock' },
            ].map(({ icon, value, label }) => (
              <div key={label} className="admin-stat-card">
                <span className="material-symbols-outlined">{icon}</span>
                <div>
                  <p className="stat-value">{value}</p>
                  <p className="stat-label">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="container admin-body">
        {opError && (
          <div className="login-error" style={{ marginBottom: '16px', borderRadius: '12px', maxWidth: '100%' }}>
            <span className="material-symbols-outlined">error</span>
            {opError}
          </div>
        )}

        {/* Back to Dashboard Button (if not on dashboard) */}
        {activeTab !== 'dashboard' && (
          <button 
            className="btn btn-outline"
            style={{ marginBottom: '24px' }}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Dashboard
          </button>
        )}

        {/* Dynamic Content based on activeTab */}
        {activeTab === 'dashboard' ? (
          <div className="admin-dash-grid">
            {/* Online Storefront Card */}
            <div className="admin-dash-card" onClick={() => setActiveTab('orders')}>
              <span className="material-symbols-outlined">language</span>
              <h2>Online Storefront</h2>
              <p>Manage incoming online orders and confirm payments.</p>
            </div>

            {/* Product Catalog Card */}
            <div className="admin-dash-card" onClick={() => setActiveTab('catalog')}>
              <span className="material-symbols-outlined">inventory_2</span>
              <h2>Product Catalog</h2>
              <p>Create new products, brands, and manage inventory batches.</p>
            </div>

            {/* Retail POS Card */}
            <div className="admin-dash-card" onClick={() => navigate('#/pos')}>
              <span className="material-symbols-outlined">point_of_sale</span>
              <h2>Retail POS</h2>
              <p>Physical store billing, sales & returns, and analytics.</p>
            </div>

            {/* Install Desktop App Card */}
            <div 
              className="admin-dash-card" 
              onClick={handleInstallClick}
              id="admin-dash-card-install-app"
              style={{
                borderColor: isStandalone ? 'var(--outline-variant)' : 'var(--primary)',
                position: 'relative'
              }}
            >
              <span className="material-symbols-outlined" style={{ color: isStandalone ? 'var(--whatsapp)' : 'var(--primary)' }}>
                {isStandalone ? 'verified' : 'desktop_windows'}
              </span>
              <h2>{isStandalone ? 'Desktop App Installed' : 'Install Desktop App'}</h2>
              <p>
                {isStandalone 
                  ? 'Lekha Script is running in standalone desktop app mode.' 
                  : 'Install to your Desktop or Taskbar for 1-click POS & boutique management without browser tabs.'}
              </p>
              {!isStandalone && (
                <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
                  <span>Install Now</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--outline-variant)' }}>
              <button 
                style={{ 
                  padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: activeOrderTab === 'list' ? '2px solid var(--primary)' : '2px solid transparent',
                  fontWeight: activeOrderTab === 'list' ? '600' : '400',
                  color: activeOrderTab === 'list' ? 'var(--primary)' : 'var(--on-surface-variant)',
                  display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
                onClick={() => setActiveOrderTab('list')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list_alt</span>
                Orders List
              </button>
              <button 
                style={{ 
                  padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: activeOrderTab === 'analytics' ? '2px solid var(--primary)' : '2px solid transparent',
                  fontWeight: activeOrderTab === 'analytics' ? '600' : '400',
                  color: activeOrderTab === 'analytics' ? 'var(--primary)' : 'var(--on-surface-variant)',
                  display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
                onClick={() => setActiveOrderTab('analytics')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>analytics</span>
                Analytics
              </button>
              <button 
                style={{ 
                  padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: activeOrderTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent',
                  fontWeight: activeOrderTab === 'settings' ? '600' : '400',
                  color: activeOrderTab === 'settings' ? 'var(--primary)' : 'var(--on-surface-variant)',
                  display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
                onClick={() => setActiveOrderTab('settings')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
                Settings
              </button>
            </div>
            {activeOrderTab === 'list' && <OnlineOrdersManager />}
            {activeOrderTab === 'analytics' && <OnlineOrdersAnalytics />}
            {activeOrderTab === 'settings' && <OnlineStoreSettings />}
          </>
        ) : activeTab === 'catalog' ? (
          <>
            {/* Catalog Sub-nav tabs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--outline-variant)' }}>
              <button 
                style={{ 
                  padding: '12px 24px', 
                  border: 'none', 
                  borderBottom: activeProductTab === 'products' ? '2px solid var(--primary)' : '2px solid transparent',
                  background: 'none', 
                  fontWeight: activeProductTab === 'products' ? '600' : '400',
                  color: activeProductTab === 'products' ? 'var(--primary)' : 'var(--on-surface-variant)',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
                onClick={() => setActiveProductTab('products')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>inventory_2</span>
                Products Manager
              </button>
              <button 
                style={{ 
                  padding: '12px 24px', 
                  border: 'none', 
                  borderBottom: activeProductTab === 'inventory' ? '2px solid var(--primary)' : '2px solid transparent',
                  background: 'none', 
                  fontWeight: activeProductTab === 'inventory' ? '600' : '400',
                  color: activeProductTab === 'inventory' ? 'var(--primary)' : 'var(--on-surface-variant)',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
                onClick={() => setActiveProductTab('inventory')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>layers</span>
                Inventory Batches
              </button>
              <button 
                style={{ 
                  padding: '12px 24px', 
                  border: 'none', 
                  borderBottom: activeProductTab === 'suppliers' ? '2px solid var(--primary)' : '2px solid transparent',
                  background: 'none', 
                  fontWeight: activeProductTab === 'suppliers' ? '600' : '400',
                  color: activeProductTab === 'suppliers' ? 'var(--primary)' : 'var(--on-surface-variant)',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
                onClick={() => setActiveProductTab('suppliers')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>local_shipping</span>
                Suppliers
              </button>
            </div>

            {activeProductTab === 'inventory' ? (
              <InventoryBatchesManager 
                activeSupplierIdToBatch={activeSupplierIdToBatch} 
                onBatchModalClosed={() => setActiveSupplierIdToBatch(null)} 
              />
            ) : activeProductTab === 'suppliers' ? (
              <SuppliersManager onAddBatchForSupplier={handleAddBatchForSupplier} />
            ) : (
              <div className="admin-layout" style={{ gridTemplateColumns: '1fr' }}>
          {/* Main — products */}
          <main className="admin-main">
            <div className="admin-products-header">
              <h3 className="admin-section-title">
                <span className="material-symbols-outlined">grid_view</span>
                Products
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-outline"
                  onClick={handleExport}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span className="material-symbols-outlined">download</span>
                  Export Excel
                </button>
                <button
                  className={`btn ${showDuplicatesOnly ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span className="material-symbols-outlined">
                    {showDuplicatesOnly ? 'filter_alt_off' : 'content_copy'}
                  </span>
                  {showDuplicatesOnly ? 'Show All' : 'Check Duplicates'}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setShowBulkUpload(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span className="material-symbols-outlined">upload_file</span>
                  Bulk Upload
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => { setEditingProduct(null); setShowForm(true); }}
                  id="add-product-btn"
                >
                  <span className="material-symbols-outlined">add</span>
                  Register Product
                </button>
              </div>
            </div>

            {showBulkUpload && (
              <BulkProductUploadModal
                onClose={() => setShowBulkUpload(false)}
                existingProducts={products}
                onSaved={() => { fetchData(); }}
              />
            )}

            {/* Filters */}
            <div className="admin-filters">
              <input
                type="search"
                placeholder="Search products…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-search"
                id="admin-search-input"
              />
              <select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="admin-brand-filter"
              >
                <option value="all">All Brands</option>
                {uniqueBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Product list */}
            {loading ? (
              <div className="admin-empty">
                <div className="login-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', marginBottom: '12px' }} />
                <p>Loading products from database…</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="admin-empty">
                <span className="material-symbols-outlined">inventory_2</span>
                <p>
                  {products.length === 0
                    ? 'No products yet. Click "Register Product" to create your first listing.'
                    : 'No products match your search.'}
                </p>
              </div>
            ) : (
              <div className="admin-product-list">
                {filteredProducts.map((product) => {
                  const productBatches = batches.filter(b => b.product_id === product.id);
                  const totalStock = productBatches.reduce((sum, b) => sum + b.quantity, 0);

                  return (
                    <div key={product.id} className="admin-product-row" id={`admin-row-${product.id}`}>
                      {/* Thumb */}
                      <div className="admin-product-thumb">
                        {product.image ? (
                          <img src={product.image} alt={product.name} />
                        ) : (
                          <div className="admin-thumb-placeholder">
                            <span className="material-symbols-outlined">checkroom</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="admin-product-info">
                        <p className="admin-product-name">{product.name}</p>
                        <div className="admin-product-meta">
                          {product.brand && <span className="brand-chip">{product.brand}</span>}
                          <span className={`stock-badge ${totalStock > 0 ? 'in-stock' : 'out-stock'}`}>
                            {totalStock > 0 ? `${totalStock} In Stock (POS)` : 'Out of Stock'}
                          </span>
                          {product.featured && (
                            <span className="featured-badge">
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>star</span>
                              Featured
                            </span>
                          )}
                          {product.click_count > 0 && (
                            <span className="featured-badge" style={{ background: 'rgba(37,211,102,0.1)', color: '#1a8a3a' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span>
                              {product.click_count} views
                            </span>
                          )}
                        </div>
                        <p className="admin-product-sizes">
                          {product.size_type === 'standard' && product.sizes?.length > 0
                            ? `Sizes: ${product.sizes.join(', ')}`
                            : product.size_type === 'custom'
                            ? 'Custom size'
                            : 'One Size'}
                        </p>
                      </div>

                      {/* Price */}
                      <p className="admin-product-price">₹{Number(product.price).toLocaleString()}</p>

                      {/* Actions */}
                      <div className="admin-product-actions">
                        <button
                          className="admin-icon-btn"
                          onClick={() => setActiveProductTab('inventory')}
                          title="Manage Stock Batches"
                        >
                          <span className="material-symbols-outlined">inventory</span>
                        </button>
                        <button
                          className="admin-icon-btn"
                          onClick={() => navigate(`#/shop/${product.id}`)}
                          title="View"
                        >
                          <span className="material-symbols-outlined">open_in_new</span>
                        </button>
                        <button
                          className="admin-icon-btn"
                          onClick={() => { setEditingProduct(product); setShowForm(true); }}
                          title="Edit"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          className="admin-icon-btn admin-icon-btn-danger"
                          onClick={() => setConfirm({ id: product.id, name: product.name })}
                          title="Delete"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
        )}
      </>
        ) : null}
      </div>
    </div>
  );
}
