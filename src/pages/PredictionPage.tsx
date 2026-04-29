import { useNavigate } from 'react-router-dom';

export function PredictionPage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <button className="back-btn" onClick={() => navigate('/')}>← Back</button>

      <div className="home-hero">
        <h1 className="home-title">🎯 Prediction Game</h1>
        <p className="home-subtitle">Choose your prediction mode</p>
      </div>

      <div className="home-cards">
        <button className="home-card home-card--prediction" onClick={() => navigate('/prediction/full')}>
          <div className="home-card-icon">📋</div>
          <div className="home-card-body">
            <h2>Full WC Prediction</h2>
            <p>Predict all 72 group stage matches and the full knockout bracket before the tournament begins.</p>
          </div>
        </button>

        <button className="home-card home-card--live" disabled>
          <div className="home-card-icon">📡</div>
          <div className="home-card-body">
            <h2>Live WC Prediction</h2>
            <p>Coming soon — predict match by match as the tournament unfolds in real time.</p>
          </div>
        </button>
      </div>
    </div>
  );
}
