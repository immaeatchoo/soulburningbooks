import { useState } from 'react';
import supabase from './supabaseClient';
import './LoginModal.css';

function LoginModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName }
      }
    });
    if (error) setError(error.message);
    else alert('Check your inbox to confirm!');
  };

  return (
    <div className="modal-overlay">
      <div className="login-modal">
  <button className="close-btn" onClick={onClose}>❌</button>

  {/* 🔥 Logo Goes Here */}
  <img src="/ptsb_logo.jpg" alt="Page Turning & Soul Burning" className="login-logo" />

  <h2>🔐 {isSignUp ? 'Create Account' : 'Login'}</h2>
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
          {isSignUp && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </>
          )}
          <div className="login-actions">
            {!isSignUp ? (
              <>
                <button type="submit">🚪 Sign In</button>
                <button type="button" onClick={() => setIsSignUp(true)}>🆕 Create Account</button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleSignup}>✨ Sign Up</button>
                <button type="button" onClick={() => setIsSignUp(false)}>🔙 Back to Login</button>
              </>
            )}
          </div>
          {error && <p className="error-msg">{error}</p>}
        </form>
        <p className="contact-help">Having trouble? <a href="mailto:soulburningbooks@gmail.com">Contact us</a></p>
      </div>
    </div>
  );
}

export default LoginModal;