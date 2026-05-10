import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { UserMenu } from '../components/UserMenu';

export function HomePage() {
  const navigate = useNavigate();
  const { user, username } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showLoginMsg, setShowLoginMsg] = useState(false);

  const handlePredictionGames = () => {
    if (!user) {
      setShowLoginMsg(true);
    } else {
      navigate('/prediction');
    }
  };

  return (
    <div className="home-page">
      {user && <div className="user-menu-corner"><UserMenu /></div>}

      {!user && (
        <div className="auth-bar">
          <button className="auth-bar-btn auth-bar-btn--primary" onClick={() => { setShowAuth(true); setShowLoginMsg(false); }}>
            Sign In / Register
          </button>
        </div>
      )}

      <div className="home-hero">
        {user && (
          <p className="home-welcome">Welcome, <strong>{username ?? user.email}</strong></p>
        )}
        <h1 className="home-title">⚽ World Cup 2026</h1>
        <p className="home-subtitle">Choose your experience</p>
      </div>

      <div className="home-cards">
        <button className="home-card home-card--simulator" onClick={() => navigate('/simulator')}>
          <div className="home-card-icon">🏟️</div>
          <div className="home-card-body">
            <h2>WC 2026 Simulator</h2>
            <p>Simulate the entire tournament - fill in group stage results and watch the bracket resolve automatically.</p>
          </div>
        </button>

        <button className="home-card home-card--prediction" onClick={handlePredictionGames}>
          <div className="home-card-icon">🎯</div>
          <div className="home-card-body">
            <h2>Prediction Games</h2>
            <p>Predict every match from the 2026 World Cup and compete against your friends to see who knows football best.</p>
            {showLoginMsg && !user && (
              <div className="home-login-required">
                Please sign in or register to access Prediction Games
              </div>
            )}
          </div>
        </button>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
