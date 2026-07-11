import React, { useState } from 'react';
import { navigate } from '../router.jsx';

export default function AdminLogin({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400)); // brief visual feedback
    const result = onLogin(email, password);
    setLoading(false);
    if (!result.success) setError(result.error);
  };

  return (
    <div className="login-page">
      {/* Background decoration */}
      <div className="login-bg-deco" aria-hidden="true" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <img src="/logo.png" alt="Lekha Script" />
        </div>

        <div className="login-header">
          <h1 className="login-title">Admin Portal</h1>
          <p className="login-subtitle">Sign in to manage your store</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="login-field">
            <label htmlFor="login-email">
              <span className="material-symbols-outlined">mail</span>
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="admin@example.com"
              autoComplete="username"
              required
            />
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="login-password">
              <span className="material-symbols-outlined">lock</span>
              Password
            </label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-toggle-pass"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined">
                  {showPass ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="login-error" role="alert">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading || !email || !password}
            id="login-submit-btn"
          >
            {loading ? (
              <>
                <span className="login-spinner" />
                Signing in…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">admin_panel_settings</span>
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Back to site */}
        <button
          className="login-back-btn"
          onClick={() => navigate('#/')}
          type="button"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Store
        </button>
      </div>
    </div>
  );
}
