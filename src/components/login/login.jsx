import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser, signupUser } from '../../lib/useUserStore';
import './login.css';

const LoginSignup = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginError, setLoginError] = useState('');
  const [loginInfo, setLoginInfo] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupInfo, setSignupInfo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    setShowSignup(mode === 'signup');
  }, [location.search]);

  const getRedirect = () => {
    const params = new URLSearchParams(location.search);
    return params.get('redirect') || null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginInfo('');
    if (!loginEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(loginEmail)) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      setLoginError('Password must be at least 6 characters.');
      return;
    }
    try {
      const resultAction = await dispatch(loginUser({ email: loginEmail, password: loginPassword }));
      const result = resultAction.payload;
      if (result.email) {
        setLoginInfo(result.message || 'Logged in successfully.');
        const redirect = getRedirect();
        if (redirect) {
          navigate(redirect);
        } else if (result.role === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate('/customer-dashboard');
        }
      } else {
        if (result.message && result.message.includes('user-not-found')) {
          setLoginError('No account found with this email.');
        } else if (result.message && result.message.includes('wrong-password')) {
          setLoginError('Incorrect password.');
        } else if (result.message && result.message.includes('too-many-requests')) {
          setLoginError('Too many failed attempts. Please try again later.');
        } else {
          setLoginError(result.message || 'An error occurred during login.');
        }
      }
    } catch (error) {
      setLoginError('An error occurred during login.');
    }
  };
  
  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError('');
    setSignupInfo('');
    if (!signupUsername || signupUsername.length < 2) {
      setSignupError('Username must be at least 2 characters.');
      return;
    }
    if (!signupEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(signupEmail)) {
      setSignupError('Please enter a valid email address.');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters.');
      return;
    }
    const result = await dispatch(signupUser({ username: signupUsername, email: signupEmail, password: signupPassword }));
    if (result.payload && result.payload.message === 'Signed up successfully') {
      setSignupInfo('Signed up successfully! Redirecting...');
      const redirect = getRedirect();
      setTimeout(() => {
        if (redirect) {
          navigate(redirect);
        } else {
          navigate('/customer-dashboard');
        }
      }, 1200);
    } else if (result.payload && result.payload.message) {
      if (result.payload.message.includes('Email already exists')) {
        setSignupError('An account with this email already exists.');
      } else if (result.payload.message.includes('weak-password')) {
        setSignupError('Password is too weak.');
      } else if (result.payload.message.includes('email-already-in-use')) {
        setSignupError('Email is already in use.');
      } else {
        setSignupError(result.payload.message);
      }
    } else {
      setSignupError('An error occurred during signup.');
    }
  };

  return (
    <div className="login-bg-fullscreen">
      <div className="login-signup-container">
        {!showSignup ? (
          <>
            <h2 className="login-title">Login</h2>
            <form onSubmit={handleLogin} className="login-form">
              <input type="email" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              <button type="submit">Login</button>
            </form>
            {loginError && <div className="login-error-message">{loginError}</div>}
            {loginInfo && <div className="login-info-message">{loginInfo}</div>}
            <div className="login-toggle">
              Not signed up?{' '}
              <span className="login-link" onClick={() => setShowSignup(true)}>
                Signup here
              </span>
            </div>
          </>
        ) : (
          <>
            <h2 className="login-title">Signup</h2>
            <form onSubmit={handleSignup} className="login-form">
              <input type="text" placeholder="Username" value={signupUsername} onChange={(e) => setSignupUsername(e.target.value)} required />
              <input type="email" placeholder="Email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
              <button type="submit">Signup</button>
            </form>
            {signupError && <div className="login-error-message">{signupError}</div>}
            {signupInfo && <div className="login-info-message">{signupInfo}</div>}
            <div className="login-toggle">
              Already have an account?{' '}
              <span className="login-link" onClick={() => setShowSignup(false)}>
                Login here
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginSignup;
