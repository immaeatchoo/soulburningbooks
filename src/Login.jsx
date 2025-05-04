import { useState } from 'react';
import supabase from './supabaseClient';
import './LoginModal.css';

function LoginModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else {
      onClose();
      window.location.reload();
    }
  };

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else alert('Check your inbox to confirm!');
  };

  return (
    <div className="modal-overlay">
      <div className="login-modal">
        <button className="close-btn" onClick={onClose}>❌</button>
        <h2>🔐 Login</h2>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <div className="login-actions">
            <button type="submit">🚪 Sign In</button>
            <button type="button" onClick={handleSignup}>✨ Sign Up</button>
          </div>
          {error && <p className="error-msg">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default LoginModal;