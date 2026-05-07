import { useNavigate } from 'react-router-dom';

interface RoundRule { pts: number; description: string; }
interface RoundSection { round: string; rules: RoundRule[]; }

const ROUNDS: RoundSection[] = [
  {
    round: 'Group Stage',
    rules: [
      { pts: 2, description: 'Exact score' },
      { pts: 1, description: 'Correct result (win / draw)' },
      { pts: 0, description: 'Wrong result' },
    ],
  },
  {
    round: 'Round of 32',
    rules: [
      { pts: 4, description: 'Exact score (after 90/120 min)' },
      { pts: 2, description: 'Correct winner, wrong score' },
      { pts: 1, description: 'Correct winner but wrong penalty situation' },
      { pts: 0, description: 'Miss' },
    ],
  },
  {
    round: 'Round of 16',
    rules: [
      { pts: 6, description: 'Exact score (after 90/120 min)' },
      { pts: 3, description: 'Correct winner, wrong score' },
      { pts: 2, description: 'Correct winner but wrong penalty situation' },
      { pts: 0, description: 'Miss' },
    ],
  },
  {
    round: 'Quarter-Finals',
    rules: [
      { pts: 8, description: 'Exact score (after 90/120 min)' },
      { pts: 5, description: 'Correct winner, wrong score' },
      { pts: 3, description: 'Correct winner but wrong penalty situation' },
      { pts: 0, description: 'Miss' },
    ],
  },
  {
    round: 'Semi-Finals & 3rd Place Match',
    rules: [
      { pts: 10, description: 'Exact score (after 90/120 min)' },
      { pts: 7, description: 'Correct winner, wrong score' },
      { pts: 4, description: 'Correct winner but wrong penalty situation' },
      { pts: 0, description: 'Miss' },
    ],
  },
  {
    round: 'Final',
    rules: [
      { pts: 20, description: 'Exact score (after 90/120 min)' },
      { pts: 12, description: 'Correct winner, wrong score' },
      { pts: 8, description: 'Correct winner but wrong penalty situation' },
      { pts: 0, description: 'Miss' },
    ],
  },
];

export function LiveRulesPage() {
  const navigate = useNavigate();

  return (
    <div className="rules-page">
      <button className="back-btn" onClick={() => navigate('/prediction/live')}>← Back</button>

      <div className="rules-hero">
        <h1>📖 Live Predictions - Rules</h1>
        <p>How points are awarded for your live match-by-match predictions</p>
      </div>

      <div className="rules-note">
        <strong>Knockout score clarification:</strong> "Exact score" means the final result after 90/120 minutes,
        plus the penalty shoot-out winner if you predicted it correctly. "Wrong penalty situation" means you picked
        the right winner but predicted penalties when there weren't any, or vice versa.
      </div>

      <div className="rules-rounds">
        {ROUNDS.map(section => (
          <div key={section.round} className="rules-round">
            <h2 className="rules-round-title">{section.round}</h2>
            <table className="rules-table">
              <tbody>
                {section.rules.map(rule => (
                  <tr key={rule.pts + rule.description}>
                    <td className="rules-pts">{rule.pts} pt{rule.pts !== 1 ? 's' : ''}</td>
                    <td className="rules-desc">{rule.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="rules-round rules-golden-boot">
        <h2 className="rules-round-title">🏆 Bonuses</h2>
        <table className="rules-table">
          <tbody>
            <tr>
              <td className="rules-pts">10 pts</td>
              <td className="rules-desc">Correct Tournament Winner - awarded after the Final</td>
            </tr>
            <tr>
              <td className="rules-pts">10 pts</td>
              <td className="rules-desc">Correct Top Scorer - awarded after the Final</td>
            </tr>
            <tr>
              <td className="rules-pts rules-pts--zero">0 pts</td>
              <td className="rules-desc">Wrong prediction for either bonus</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="rules-colors-section">
        <h2 className="rules-round-title">Match Card Colors</h2>
        <p className="rules-colors-sub">Each prediction card is colour-coded once the real result is known.</p>
        <div className="rules-colors">
          <div className="rules-color-row">
            <span className="rules-color-dot rules-color-dot--green" />
            <div>
              <span className="rules-color-label">Perfect</span>
              <span className="rules-color-desc"> - Exact score + correct winner + correct result type</span>
            </div>
          </div>
          <div className="rules-color-row">
            <span className="rules-color-dot rules-color-dot--yellow" />
            <div>
              <span className="rules-color-label">Correct result</span>
              <span className="rules-color-desc"> - Correct winner + same result type (normal time or penalties), wrong score</span>
            </div>
          </div>
          <div className="rules-color-row">
            <span className="rules-color-dot rules-color-dot--orange" />
            <div>
              <span className="rules-color-label">Correct winner, wrong result type</span>
              <span className="rules-color-desc"> - Correct winner but different penalty situation (predicted normal time, actual went to penalties or vice versa)</span>
            </div>
          </div>
          <div className="rules-color-row">
            <span className="rules-color-dot rules-color-dot--red" />
            <div>
              <span className="rules-color-label">Wrong</span>
              <span className="rules-color-desc"> - Your predicted winner lost — no points awarded</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rules-round rules-tiebreaker">
        <h2 className="rules-round-title">⚖️ Tiebreaker</h2>
        <p className="rules-tiebreaker-desc">
          If two or more players have the same total points in the leaderboard, the player with more
          <strong> exact score predictions</strong> ranks higher.
        </p>
      </div>
    </div>
  );
}
