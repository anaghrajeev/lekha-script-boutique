import React, { useState, useEffect } from 'react';
import PosLayout from './PosLayout';
import { usePosStore } from '../../store/usePosStore';

const PosSettingsPage = ({ onLogout }) => {
  const { settings, updateSettings } = usePosStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = (field) => {
    setLocalSettings({ ...localSettings, [field]: !localSettings[field] });
  };

  const handleChange = (field, value) => {
    setLocalSettings({ ...localSettings, [field]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings);
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PosLayout activeTab="settings" onLogout={onLogout}>
      <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '24px', paddingBottom: '48px' }}>
        <h1 className="font-serif text-headline-lg" style={{ marginBottom: '8px' }}>POS Settings</h1>
        <p className="text-body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '32px' }}>
          Configure billing settings, taxes, and discounts for the terminal.
        </p>

        <div style={{ backgroundColor: 'var(--surface-container)', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
          
          {/* GST Settings */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontWeight: '600', fontSize: '16px' }}>Enable GST</h3>
                <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>Calculate and add GST to the bill automatically.</p>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                <input 
                  type="checkbox" 
                  checked={localSettings.enableGst} 
                  onChange={() => handleToggle('enableGst')}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{ 
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                  backgroundColor: localSettings.enableGst ? 'var(--primary)' : '#ccc', 
                  transition: '.4s', borderRadius: '24px' 
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '16px', width: '16px', 
                    left: localSettings.enableGst ? '30px' : '4px', bottom: '4px', 
                    backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                  }}></span>
                </span>
              </label>
            </div>
            
            {localSettings.enableGst && (
              <div style={{ padding: '16px', backgroundColor: 'var(--surface-container-high)', borderRadius: '8px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>GST Percentage (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  step="0.1"
                  value={localSettings.gstPercentage} 
                  onChange={(e) => handleChange('gstPercentage', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                />
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--outline-variant)' }}></div>

          {/* Discounts Settings */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: '600', fontSize: '16px' }}>Enable Discounts</h3>
                <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>Allow entering a manual discount amount during checkout.</p>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                <input 
                  type="checkbox" 
                  checked={localSettings.enableDiscounts} 
                  onChange={() => handleToggle('enableDiscounts')}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{ 
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                  backgroundColor: localSettings.enableDiscounts ? 'var(--primary)' : '#ccc', 
                  transition: '.4s', borderRadius: '24px' 
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '16px', width: '16px', 
                    left: localSettings.enableDiscounts ? '30px' : '4px', bottom: '4px', 
                    backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                  }}></span>
                </span>
              </label>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--outline-variant)' }}></div>

          {/* Invoice Settings */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontWeight: '600', fontSize: '16px' }}>Invoice Start Number</h3>
                <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>Set the starting number for your billing invoices. Next bills will increment from this.</p>
              </div>
              <input 
                type="number" 
                min="1"
                value={localSettings.invoiceStartNumber || 1000} 
                onChange={(e) => handleChange('invoiceStartNumber', parseInt(e.target.value) || 1)}
                style={{ width: '120px', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--outline-variant)' }}></div>

          {/* Branding Settings */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, paddingRight: '24px' }}>
                <h3 style={{ fontWeight: '600', fontSize: '16px' }}>Store Logo URL</h3>
                <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>Provide an image URL for the logo to appear on printed receipts.</p>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="https://example.com/logo.png"
                  value={localSettings.logoUrl || ''} 
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--outline)' }}
                />
                {localSettings.logoUrl && (
                  <div style={{ marginTop: '4px', padding: '12px', border: '1px solid var(--outline-variant)', borderRadius: '6px', background: 'white', alignSelf: 'flex-start' }}>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>Logo Preview:</div>
                    <img 
                      src={localSettings.logoUrl} 
                      alt="Logo Preview" 
                      style={{ maxHeight: '60px', objectFit: 'contain', display: 'block' }} 
                      onError={(e) => { 
                        e.target.style.display = 'none'; 
                        if (!e.target.nextSibling) {
                          const span = document.createElement('span');
                          span.style.color = 'var(--error)';
                          span.style.fontSize = '12px';
                          span.innerText = '⚠️ Image failed to load. Please check the URL.';
                          e.target.parentNode.appendChild(span);
                        }
                      }} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleSave}
            disabled={saving}
            style={{ 
              padding: '14px 32px', backgroundColor: 'var(--primary)', color: 'white', 
              borderRadius: '8px', fontWeight: '600', opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </div>
    </PosLayout>
  );
};

export default PosSettingsPage;
