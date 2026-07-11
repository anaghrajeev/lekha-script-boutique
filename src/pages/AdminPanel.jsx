import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore.jsx';
import { navigate } from '../router.jsx';

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

const emptyForm = {
  brand_id:    '',
  name:        '',
  description: '',
  price:       '',
  image:       '',
  size_type:   'standard',
  sizes:       ['S', 'M', 'L', 'XL'],
  in_stock:    true,
  featured:    false,
};

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
function ProductForm({ initial, brands, onSave, onCancel, editingId, saving }) {
  const [form,         setForm]         = useState(initial || emptyForm);
  const [newBrandName, setNewBrandName] = useState('');
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
    if (!form.brand_id && !newBrandName.trim()) e.brand_id = 'Select or add a brand';
    if (!form.name.trim())                       e.name     = 'Product name is required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      e.price = 'Enter a valid price';
    if (form.size_type === 'standard' && form.sizes.length === 0)
      e.sizes = 'Select at least one size';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, price: Number(form.price) }, newBrandName.trim());
  };

  return (
    <div className="admin-form-overlay" role="dialog" aria-modal="true">
      <div className="admin-form-card">
        <div className="admin-form-header">
          <h2 className="text-headline-md">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button className="admin-close-btn" onClick={onCancel}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <div className="admin-form-scroll">

            {/* Brand */}
            <div className="form-group">
              <label htmlFor="form-brand">Brand / Category</label>
              <select
                id="form-brand"
                value={form.brand_id}
                onChange={(e) => set('brand_id', e.target.value)}
                className={errors.brand_id ? 'input-error' : ''}
              >
                <option value="">— Select brand —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
                <option value="__new__">+ Add new brand…</option>
              </select>
              {form.brand_id === '__new__' && (
                <input
                  type="text"
                  placeholder="New brand name"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="mt-8"
                  id="new-brand-name-input"
                />
              )}
              {errors.brand_id && <span className="form-error">{errors.brand_id}</span>}
            </div>

            {/* Name */}
            <div className="form-group">
              <label htmlFor="form-name">Product Name</label>
              <input
                id="form-name"
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Silk Lace Bralette"
                className={errors.name ? 'input-error' : ''}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
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

            {/* Price */}
            <div className="form-group">
              <label htmlFor="form-price">Price (₹)</label>
              <input
                id="form-price"
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="e.g. 1499"
                className={errors.price ? 'input-error' : ''}
              />
              {errors.price && <span className="form-error">{errors.price}</span>}
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

            {/* Size type */}
            <div className="form-group">
              <label>Size Options</label>
              <div className="radio-group">
                {[
                  { value: 'standard', label: 'Standard sizes (S, M, L…)' },
                  { value: 'custom',   label: 'Customer enters size / measurement' },
                  { value: 'none',     label: 'No size needed (One Size)' },
                ].map((opt) => (
                  <label key={opt.value} className="radio-label">
                    <input
                      type="radio"
                      name="sizeType"
                      value={opt.value}
                      checked={form.size_type === opt.value}
                      onChange={() => set('size_type', opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Standard sizes */}
            {form.size_type === 'standard' && (
              <div className="form-group">
                <label>Available Sizes</label>
                <div className="size-checkbox-group">
                  {STANDARD_SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`size-btn ${form.sizes.includes(s) ? 'active' : ''}`}
                      onClick={() => toggleSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {errors.sizes && <span className="form-error">{errors.sizes}</span>}
              </div>
            )}

            {/* Toggles */}
            <div className="form-group form-toggles">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={form.in_stock}
                  onChange={(e) => set('in_stock', e.target.checked)}
                />
                <span className="toggle-track" />
                <span>In Stock</span>
              </label>
              <label className="toggle-label">
                <input
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
                editingId ? 'Save Changes' : 'Add Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Brand Manager ─────────────────────────────────────────────────────────────
function BrandManager({ brands, products, onAddBrand, onDeleteBrand, onUpdateBrand }) {
  const [newName,   setNewName]   = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName,  setEditName]  = useState('');
  const [saving,    setSaving]    = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try { await onAddBrand(newName.trim()); setNewName(''); }
    catch (err) { alert('Error adding brand: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try { await onUpdateBrand(id, editName.trim()); setEditingId(null); }
    catch (err) { alert('Error updating brand: ' + err.message); }
  };

  return (
    <div className="brand-manager">
      <h3 className="admin-section-title">
        <span className="material-symbols-outlined">label</span>
        Brands / Categories
      </h3>

      <div className="brand-add-row">
        <input
          type="text"
          placeholder="New brand name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          id="new-brand-input"
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={saving} id="add-brand-btn">
          <span className="material-symbols-outlined">add</span>
          Add
        </button>
      </div>

      <div className="brand-list">
        {brands.map((brand) => {
          const count = products.filter((p) => p.brand_id === brand.id).length;
          return (
            <div key={brand.id} className="brand-row">
              {editingId === brand.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate(brand.id)}
                  autoFocus
                  className="brand-edit-input"
                />
              ) : (
                <div className="brand-row-info">
                  <span className="brand-row-name">{brand.name}</span>
                  <span className="brand-row-count">{count} product{count !== 1 ? 's' : ''}</span>
                </div>
              )}
              <div className="brand-row-actions">
                {editingId === brand.id ? (
                  <>
                    <button className="admin-icon-btn" onClick={() => handleUpdate(brand.id)}><span className="material-symbols-outlined">check</span></button>
                    <button className="admin-icon-btn" onClick={() => setEditingId(null)}><span className="material-symbols-outlined">close</span></button>
                  </>
                ) : (
                  <>
                    <button className="admin-icon-btn" onClick={() => { setEditingId(brand.id); setEditName(brand.name); }}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      className="admin-icon-btn admin-icon-btn-danger"
                      onClick={() => count === 0 && onDeleteBrand(brand.id)}
                      disabled={count > 0}
                      title={count > 0 ? 'Remove all products first' : 'Delete brand'}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {brands.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--outline)', padding: '12px 0' }}>
            No brands yet. Add one above.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────
export default function AdminPanel({ onLogout }) {
  const {
    products, brands, cart,
    addProduct, updateProduct, deleteProduct,
    addBrand, deleteBrand, updateBrand,
    loading,
  } = useStore();

  const [showForm,        setShowForm]        = useState(false);
  const [editingProduct,  setEditingProduct]  = useState(null);
  const [confirm,         setConfirm]         = useState(null);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [filterBrand,     setFilterBrand]     = useState('all');
  const [saving,          setSaving]          = useState(false);
  const [opError,         setOpError]         = useState('');

  const getBrand = useCallback((id) => brands.find((b) => b.id === id), [brands]);

  const filteredProducts = products.filter((p) => {
    const matchBrand  = filterBrand === 'all' || p.brand_id === filterBrand;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchBrand && matchSearch;
  });

  // ── Save (add / edit) ────────────────────────────────────────────────────
  const handleSave = useCallback(async (formData, newBrandName) => {
    setSaving(true);
    setOpError('');
    try {
      let brand_id = formData.brand_id;

      if (brand_id === '__new__' || (!brand_id && newBrandName)) {
        const nb = await addBrand(newBrandName);
        brand_id = nb.id;
      }

      const data = { ...formData, brand_id };
      // Remove non-column fields
      delete data.brand;
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
  }, [editingProduct, addProduct, updateProduct, addBrand]);

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

      {showForm && (
        <ProductForm
          initial={
            editingProduct
              ? { ...editingProduct, price: String(editingProduct.price) }
              : emptyForm
          }
          brands={brands}
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
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('#/')} id="admin-back-home-btn">
                <span className="material-symbols-outlined">home</span>
                Back to Site
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
              { icon: 'label',       value: brands.length,   label: 'Brands' },
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

        <div className="admin-layout">
          {/* Sidebar — brands */}
          <aside className="admin-sidebar">
            <BrandManager
              brands={brands}
              products={products}
              onAddBrand={addBrand}
              onDeleteBrand={deleteBrand}
              onUpdateBrand={updateBrand}
            />
          </aside>

          {/* Main — products */}
          <main className="admin-main">
            <div className="admin-products-header">
              <h3 className="admin-section-title">
                <span className="material-symbols-outlined">grid_view</span>
                Products
              </h3>
              <button
                className="btn btn-primary"
                onClick={() => { setEditingProduct(null); setShowForm(true); }}
                id="add-product-btn"
              >
                <span className="material-symbols-outlined">add</span>
                Add Product
              </button>
            </div>

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
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
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
                    ? 'No products yet. Click "Add Product" to create your first listing.'
                    : 'No products match your search.'}
                </p>
              </div>
            ) : (
              <div className="admin-product-list">
                {filteredProducts.map((product) => {
                  const brand = getBrand(product.brand_id);
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
                          {brand && <span className="brand-chip">{brand.name}</span>}
                          <span className={`stock-badge ${product.in_stock ? 'in-stock' : 'out-stock'}`}>
                            {product.in_stock ? 'In Stock' : 'Out of Stock'}
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
      </div>
    </div>
  );
}
