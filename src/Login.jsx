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
    <div className="login-modal-overlay">
      <div className="login-modal-backdrop" onClick={onClose}>
        <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
          <button
            className="login-close-btn"
            onClick={onClose}
            title="Abort mission"
          >❌</button>

          {/* 🔥 Logo Goes Here */}
          <img
            src="/ptsb_logo.jpg"
            alt="Page Turning & Soul Burning"
            className="login-logo"
            title="Welcome to the drama-filled reading spiral"
          />

          <h2 title="Gain access to your hoard of regretful reads">🔐 {isSignUp ? 'Create Account' : 'Login'}</h2>
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              title="So we can spam you with your own decisions"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              title="Enter your secrets (we won't judge... much)"
            />
            {isSignUp && (
              <>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  title="What's the name your books whisper when you're asleep?"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  title="Or make one up. You're a legend anyway."
                />
              </>
            )}
            <div className="login-actions">
              {!isSignUp ? (
                <>
                  <button type="submit" title="Brace yourself for literary judgment">🚪 Sign In</button>
                  <button type="button" onClick={() => setIsSignUp(true)} title="Enter the bookish cult">🆕 Create Account</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={handleSignup} title="Sign away your soul (and inbox)">✨ Sign Up</button>
                  <button type="button" onClick={() => setIsSignUp(false)} title="Flee the signup screen like a commitment-phobe">🔙 Back to Login</button>
                </>
              )}
            </div>
            {error && <p className="login-error-msg">{error}</p>}
          </form>
          <p className="contact-help">
            Having trouble?{' '}
            <a href="mailto:soulburningbooks@gmail.com" title="Scream into the void (or email us)">Contact us</a>
          </p>
          </div>
        </div>
      </div>
    );
  }

export default LoginModal;