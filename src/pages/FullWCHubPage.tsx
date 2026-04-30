import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DEADLINE = new Date('2026-06-11T19:00:00Z');

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(() => target.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return diff;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return d > 0
    ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function FullWCHubPage() {
  const navigate = useNavigate();
  const msLeft = useCountdown(DEADLINE);
  const isPastDeadline = msLeft <= 0;

  return (
    <div className="home-page">
      <button className="back-btn" onClick={() => navigate('/prediction')}>← Back</button>

      <div className="home-hero">
        <h1 className="home-title">📋 Full WC Predictions</h1>
        <p className="home-subtitle">Predict every match from the World Cup 2026</p>
      </div>

      <div className="home-cards hub-cards">
        <button className="home-card home-card--prediction" onClick={() => navigate('/prediction/full/predict')}>
          <div className="home-card-icon">🎯</div>
          <div className="home-card-body">
            <h2>My Predictions</h2>
            <p>Fill your prediction for each one of the matches in the World Cup.</p>
            <div className="card-countdown">
              {isPastDeadline ? (
                <span className="card-countdown--locked">🔒 Predictions locked</span>
              ) : (
                <>
                  <span className="card-countdown--label">Closes in </span>
                  <span className="card-countdown--clock">{formatCountdown(msLeft)}</span>
                </>
              )}
            </div>
          </div>
        </button>

        <button className="home-card home-card--groups" onClick={() => navigate('/prediction/full/groups')}>
          <div className="home-card-icon">👥</div>
          <div className="home-card-body">
            <h2>My Groups</h2>
            <p>Compete with friends in private leagues and see where you stand on the global leaderboard.</p>
          </div>
        </button>

        <button className="home-card home-card--rules" onClick={() => navigate('/prediction/full/rules')}>
          <div className="home-card-icon">📖</div>
          <div className="home-card-body">
            <h2>Rules of the Game</h2>
            <p>Learn how the scoring system works and how points are awarded for each match.</p>
          </div>
        </button>
      </div>
    </div>
  );
}
