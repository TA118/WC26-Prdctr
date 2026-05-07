import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { syncAndFetchResults } from '../lib/actualResults';
import { totalGroupScore } from '../logic/predictionScoring';
import { INITIAL_GROUPS } from '../data/groups';

const TOURNAMENT_START = new Date('2026-06-11T19:00:00Z');

export function LiveWCHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userScore, setUserScore] = useState<number | null>(null);

  useEffect(() => {
    if (!user || Date.now() < TOURNAMENT_START.getTime()) return;

    Promise.all([
      supabase.from('live_predictions').select('data').eq('user_id', user.id).maybeSingle(),
      syncAndFetchResults(),
    ]).then(([{ data: predData }, { results, actualGroups }]) => {
      if (!predData?.data || !results.length) return;
      const predGroups = predData.data.groups ?? INITIAL_GROUPS;
      setUserScore(totalGroupScore(predGroups, actualGroups));
    });
  }, [user]);

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
            {userScore !== null && (
              <div className="card-countdown">
                <span className="card-countdown--score">⭐ {userScore} pts</span>
              </div>
            )}
          </div>
        </button>

        <button className="home-card home-card--groups" onClick={() => navigate('/prediction/live/groups')}>
          <div className="home-card-icon">👥</div>
          <div className="home-card-body">
            <h2>My Groups</h2>
            <p>Compete with friends in private leagues and see who predicts live matches best.</p>
          </div>
        </button>

        <button className="home-card home-card--stats" onClick={() => navigate('/prediction/live/stats')}>
          <div className="home-card-icon">📊</div>
          <div className="home-card-body">
            <h2>Predictions Stats</h2>
            <p>See how everyone is predicting each match — winner picks, top scorer, and score distributions.</p>
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
