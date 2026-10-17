import React from 'react';
import { navigate } from '../../router.jsx';

const PosLayout = ({ children, activeTab, onLogout }) => {
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--surface-container-low)' }} className="pos-layout">
      {/* Sidebar */}
      <aside className="no-print" style={{ width: '250px', backgroundColor: 'var(--surface-container)', borderRight: '1px solid var(--outline-variant)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 'var(--stack-sm)', borderBottom: '1px solid var(--outline-variant)' }}>
          <h2 className="font-serif" style={{ color: 'var(--primary)' }}>POS System</h2>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>lekhascript inner concepts</p>
        </div>
        
        <nav style={{ flex: 1, padding: 'var(--stack-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            style={{ 
              padding: '12px', 
              textAlign: 'left', 
              borderRadius: '8px', 
              backgroundColor: activeTab === 'billing' ? 'var(--primary-container)' : 'transparent',
              color: activeTab === 'billing' ? 'var(--on-primary-container)' : 'var(--on-surface)',
              fontWeight: activeTab === 'billing' ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              border: 'none'
            }}
            onClick={() => navigate('#/pos')}
            id="pos-nav-billing"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>point_of_sale</span>
            Billing (Checkout)
          </button>

          <button 
            style={{ 
              padding: '12px', 
              textAlign: 'left', 
              borderRadius: '8px', 
              backgroundColor: activeTab === 'batches' ? 'var(--primary-container)' : 'transparent',
              color: activeTab === 'batches' ? 'var(--on-primary-container)' : 'var(--on-surface)',
              fontWeight: activeTab === 'batches' ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              border: 'none'
            }}
            onClick={() => navigate('#/pos/batches')}
            id="pos-nav-batches"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>inventory_2</span>
            Inventory Batches
          </button>

          <button 
            style={{ 
              padding: '12px', 
              textAlign: 'left', 
              borderRadius: '8px', 
              backgroundColor: activeTab === 'returns' ? 'var(--primary-container)' : 'transparent',
              color: activeTab === 'returns' ? 'var(--on-primary-container)' : 'var(--on-surface)',
              fontWeight: activeTab === 'returns' ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              border: 'none'
            }}
            onClick={() => navigate('#/pos/returns')}
            id="pos-nav-returns"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>assignment_return</span>
            Sales & Returns
          </button>

          <button 
            style={{ 
              padding: '12px', 
              textAlign: 'left', 
              borderRadius: '8px', 
              backgroundColor: activeTab === 'analytics' ? 'var(--primary-container)' : 'transparent',
              color: activeTab === 'analytics' ? 'var(--on-primary-container)' : 'var(--on-surface)',
              fontWeight: activeTab === 'analytics' ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              border: 'none'
            }}
            onClick={() => navigate('#/pos/analytics')}
            id="pos-nav-analytics"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>analytics</span>
            Analytics
          </button>

          <button 
            style={{ 
              padding: '12px', 
              textAlign: 'left', 
              borderRadius: '8px', 
              backgroundColor: activeTab === 'settings' ? 'var(--primary-container)' : 'transparent',
              color: activeTab === 'settings' ? 'var(--on-primary-container)' : 'var(--on-surface)',
              fontWeight: activeTab === 'settings' ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              border: 'none'
            }}
            onClick={() => navigate('#/pos/settings')}
            id="pos-nav-settings"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
            Settings
          </button>
        </nav>

        <div style={{ padding: 'var(--stack-sm)', borderTop: '1px solid var(--outline-variant)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            style={{ 
              padding: '10px', 
              border: '1px solid var(--outline)', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: 'var(--surface-container-low)',
              color: 'var(--on-surface)',
              cursor: 'pointer'
            }}
            onClick={() => navigate('#/admin')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Exit to Admin
          </button>
          <button 
            style={{ 
              padding: '10px', 
              backgroundColor: 'var(--error)', 
              color: 'white', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={onLogout}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--stack-md)' }}>
        {children}
      </main>
    </div>
  );
};

export default PosLayout;
