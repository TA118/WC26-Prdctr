import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1 className="home-title">⚽ World Cup 2026</h1>
        <p className="home-subtitle">Choose your experience</p>
      </div>

      <div className="home-cards">
        <button className="home-card home-card--simulator" onClick={() => navigate('/simulator')}>
          <div className="home-card-icon">🏟️</div>
          <div className="home-card-body">
            <h2>WC 2026 Simulator</h2>
            <p>Simulate the entire tournament — fill in group stage results and watch the bracket resolve automatically.</p>
          </div>
        </button>

        <button className="home-card home-card--prediction" onClick={() => navigate('/prediction')}>
          <div className="home-card-icon">🎯</div>
          <div className="home-card-body">
            <h2>Prediction Game</h2>
            <p>Predict every match result before the tournament starts and earn points based on how accurate you are.</p>
          </div>
        </button>
      </div>
    </div>
  );
}
