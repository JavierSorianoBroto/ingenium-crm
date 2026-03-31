import { useState, useEffect } from 'react';
import { supabase } from './supabase.js';

const LIGHT = {
  bg: '#f6f8fb',
  surface: '#ffffff',
  border: '#e5eaf2',
  accent: '#2563eb',
  text: '#0f172a',
  muted: '#64748b',
};

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsResetting(true);
    }
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setErrorMsg(error.message);
    } else {
      setErrorMsg('');
      alert('Password updated! Please log in.');
      setIsResetting(false);
      window.location.hash = '';
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message || 'Login failed');
      } else {
        onLogin && onLogin(data.user);
      }
    } catch (err) {
      setErrorMsg('Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  if (isResetting) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:LIGHT.bg, padding:20 }}>
        <div style={{ width:420, maxWidth:'100%', background:LIGHT.surface, border:`1px solid ${LIGHT.border}`, borderRadius:12, padding:28, boxShadow:'0 8px 30px rgba(16,24,40,.06)' }}>
          <img src="/ingenium.png" alt="Ingenium" style={{ width:48, height:48, objectFit:'contain', marginBottom:16 }} />
          <div style={{ fontSize:18, fontWeight:700, color:LIGHT.text, marginBottom:20, fontFamily:"'Rajdhani',sans-serif" }}>Set New Password</div>
          <form onSubmit={handlePasswordReset}>
            <label style={{ display:'block', marginBottom:8, fontSize:11, color:LIGHT.muted, textTransform:'uppercase', letterSpacing:.8 }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${LIGHT.border}`, background:LIGHT.surface, color:LIGHT.text, marginBottom:16, boxSizing:'border-box' }}
            />
            <button type="submit" disabled={loading} style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'none', background:LIGHT.accent, color:'#fff', fontWeight:700, cursor:loading?'default':'pointer' }}>
              {loading ? 'Saving...' : 'Set Password'}
            </button>
          </form>
          {errorMsg && <div style={{ marginTop:12, color:'#b91c1c', fontSize:13 }}>{errorMsg}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:LIGHT.bg, padding:20 }}>
      <div style={{ width:420, maxWidth:'100%', background:LIGHT.surface, border:`1px solid ${LIGHT.border}`, borderRadius:12, padding:28, boxShadow:'0 8px 30px rgba(16,24,40,.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
          <img src="/ingenium.png" alt="Ingenium" style={{ width:48, height:48, objectFit:'contain' }} />
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:LIGHT.text, fontFamily:"'Rajdhani',sans-serif" }}>Ingenium CRM</div>
            <div style={{ fontSize:12, color:LIGHT.muted }}>Sign in to your account</div>
          </div>
        </div>
        <form onSubmit={handleLogin}>
          <label style={{ display:'block', marginBottom:8, fontSize:11, color:LIGHT.muted, textTransform:'uppercase', letterSpacing:.8 }}>Email</label>
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
            style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${LIGHT.border}`, background:LIGHT.surface, color:LIGHT.text, marginBottom:12, boxSizing:'border-box' }}
          />
          <label style={{ display:'block', marginBottom:8, fontSize:11, color:LIGHT.muted, textTransform:'uppercase', letterSpacing:.8 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Your password"
            style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${LIGHT.border}`, background:LIGHT.surface, color:LIGHT.text, marginBottom:16, boxSizing:'border-box' }}
          />
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'none', background:LIGHT.accent, color:'#fff', fontWeight:700, cursor:loading?'default':'pointer' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {errorMsg && <div style={{ marginTop:12, color:'#b91c1c', fontSize:13 }}>{errorMsg}</div>}
        <div style={{ marginTop:18, fontSize:12, color:LIGHT.muted, textAlign:'center' }}>
          <span>Don't have an account? </span>
          <a href="#" style={{ color:LIGHT.accent, textDecoration:'none', fontWeight:600 }}>Contact admin</a>
        </div>
      </div>
    </div>
  );
}