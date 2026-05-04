import { useNavigate } from 'react-router-dom';

export function LiveWCHubPage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <button className="back-btn" onClick={() => navigate('/prediction')}>← Back</button>

      <div className="home-hero">
        <h1 className="home-title">📡 Live WC Predictions</h1>
        <p className="home-subtitle">Predict match by match as the tournament unfolds</p>
      </div>

      <div className="home-cards hub-cards">
        <button className="home-card home-card--prediction" onClick={() => navigate('/prediction/live/predict')}>
          <div className="home-card-icon">🎯</div>
          <div className="home-card-body">
            <h2>My Live Predictions</h2>
            <p>Predict the outcome of each match before it kicks off, one game at a time.</p>
          </div>
        </button>

        <button className="home-card home-card--groups" onClick={() => navigate('/prediction/live/groups')}>
          <div className="home-card-icon">👥</div>
          <div className="home-card-body">
            <h2>My Groups</h2>
            <p>Compete with friends in private leagues and see who predicts live matches best.</p>
          </div>
        </button>

        <button className="home-card home-card--rules" onClick={() => navigate('/prediction/live/rules')}>
          <div className="home-card-icon">📖</div>
          <div className="home-card-body">
            <h2>Rules of the Game</h2>
            <p>Learn how points are awarded for live match predictions.</p>
          </div>
        </button>
      </div>
    </div>
  );
}
