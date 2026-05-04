import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { GROUP_SCHEDULE } from '../data/groupSchedule';
import { INITIAL_GROUPS } from '../data/groups';

const DEADLINE = new Date('2026-06-11T19:00:00Z');

const TEAM_MAP: Record<string, { name: string; flag: string }> = {};
for (const g of INITIAL_GROUPS) {
  for (const t of g.teams) TEAM_MAP[t.id] = { name: t.name, flag: t.flag };
}

interface NextMatch {
  homeTeam: { name: string; flag: string };
  awayTeam: { name: string; flag: string };
  kickoff: Date;
}

function getNextMatch(now: number): NextMatch | null {
  let best: { matchId: string; kickoff: Date } | null = null;
  for (const [matchId, s] of Object.entries(GROUP_SCHEDULE)) {
    const ko = new Date(s.kickoff);
    if (ko.getTime() <= now) continue;
    if (!best || ko < best.kickoff) best = { matchId, kickoff: ko };
  }
  if (!best) return null;
  for (const g of INITIAL_GROUPS) {
    const m = g.matches.find(m => m.id === best!.matchId);
    if (m) {
      const home = TEAM_MAP[m.homeTeamId];
      const away = TEAM_MAP[m.awayTeamId];
      if (home && away) return { homeTeam: home, awayTeam: away, kickoff: best.kickoff };
    }
  }
  return null;
}

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

function NextMatchCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = getNextMatch(now);
  if (!next) return null;

  const msLeft = next.kickoff.getTime() - now;

  return (
    <div className="card-countdown">
      <span className="card-countdown--label">Next match: </span>
      <span className="live-next-teams">
        {next.homeTeam.flag} {next.homeTeam.name} vs {next.awayTeam.flag} {next.awayTeam.name}
      </span>
      <br />
      <span className="card-countdown--label">Prediction closes in </span>
      <span className="card-countdown--clock">{formatCountdown(msLeft)}</span>
    </div>
  );
}

export function PredictionPage() {
  const navigate = useNavigate();
  const msLeft = useCountdown(DEADLINE);
  const isPastDeadline = msLeft <= 0;
  const { user, username, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="home-page">
      <button className="back-btn" onClick={() => navigate('/')}>← Back</button>

      {user && (
        <div className="auth-bar-top">
          <span className="auth-bar-welcome">
            Welcome, <strong>{username ?? user.email}</strong>
            <button className="auth-bar-signout" onClick={signOut}>Sign Out</button>
          </span>
        </div>
      )}

      <div className="home-hero">
        <h1 className="home-title">🎯 Prediction Games</h1>
        <p className="home-subtitle">Choose your game mode</p>
      </div>

      <div className="home-cards">
        <button className="home-card home-card--prediction" onClick={() => navigate('/prediction/full')}>
          <div className="home-card-icon">📋</div>
          <div className="home-card-body">
            <h2>Full WC Predictions</h2>
            <p>Predict every match from the World Cup before the tournament begins.</p>
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

        <button className="home-card home-card--live" onClick={() => navigate('/prediction/live')}>
          <div className="home-card-icon">📡</div>
          <div className="home-card-body">
            <h2>Live WC Predictions</h2>
            <p>Predict match by match as the tournament unfolds in real time.</p>
            <NextMatchCountdown />
          </div>
        </button>
      </div>

      {!user && (
        <div className="auth-bar">
          <button className="auth-bar-btn auth-bar-btn--primary" onClick={() => setShowAuth(true)}>
            Sign In / Register
          </button>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
