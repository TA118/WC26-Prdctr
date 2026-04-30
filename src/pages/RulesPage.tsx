import { useNavigate } from 'react-router-dom';

interface RoundRule {
  pts: number;
  description: string;
}

interface RoundSection {
  round: string;
  rules: RoundRule[];
}

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
      { pts: 4, description: 'Exact matchup + correct winner' },
      { pts: 3, description: 'Exact matchup + correct direction' },
      { pts: 2, description: 'Correct winner, different opponent' },
      { pts: 1, description: 'Correct team advances via different bracket slot' },
      { pts: 0, description: 'Miss' },
    ],
  },
  {
    round: 'Round of 16',
    rules: [
      { pts: 6, description: 'Exact matchup + exact score' },
      { pts: 4, description: 'Exact matchup + correct winner' },
      { pts: 3, description: 'Correct winner, different opponent' },
      { pts: 2, description: 'Correct team advances from different bracket position' },
      { pts: 0, description: 'Miss' },
    ],
  },
  {
    round: 'Quarter-finals',
    rules: [
      { pts: 8, description: 'Exact matchup + exact score' },
      { pts: 5, description: 'Exact matchup + correct winner' },
      { pts: 4, description: 'Correct winner, different opponent' },
      { pts: 3, description: 'Correct team advances from different bracket position' },
      { pts: 0, description: 'Miss' },
    ],
  },
  {
    round: 'Semi-finals',
    rules: [
      { pts: 10, description: 'Exact matchup + exact score' },
      { pts: 7, description: 'Exact matchup + correct winner' },
      { pts: 5, description: 'Correct winner, different opponent' },
      { pts: 4, description: 'Correct team advances from other side of bracket' },
      { pts: 0, description: 'Miss' },
    ],
  },
  {
    round: 'Final',
    rules: [
      { pts: 20, description: 'Exact matchup + exact score' },
      { pts: 12, description: 'Exact matchup + correct winner' },
      { pts: 10, description: 'Correct winner, different opponent in final' },
      { pts: 0, description: 'Miss' },
    ],
  },
];

const COLORS = [
  { dot: 'green',  label: 'Perfect',                          desc: 'Both teams correct + exact score' },
  { dot: 'yellow', label: 'Correct result',                   desc: 'Both teams correct + correct winner (not exact score)' },
  { dot: 'orange', label: 'Correct winner, wrong opponent',   desc: 'You got the winner but they faced a different team' },
  { dot: 'purple', label: 'Team advanced via different path', desc: 'The team reached this stage but from a different bracket slot' },
  { dot: 'red',    label: 'Miss',                             desc: 'Team was eliminated or result was completely wrong' },
];

export function RulesPage() {
  const navigate = useNavigate();

  return (
    <div className="rules-page">
      <button className="back-btn" onClick={() => navigate('/prediction/full')}>← Back</button>

      <div className="rules-hero">
        <h1>📖 Rules of the Game</h1>
        <p>How points are awarded for your World Cup 2026 predictions</p>
      </div>

      <div className="rules-note">
        <strong>Knockout score clarification:</strong> "Exact score" means the final result after 120 minutes,
        including the penalty shoot-out winner if you predicted it correctly.
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
        <h2 className="rules-round-title">🥇 Golden Boot</h2>
        <table className="rules-table">
          <tbody>
            <tr>
              <td className="rules-pts">10 pts</td>
              <td className="rules-desc">Your predicted player wins the Golden Boot trophy (tournament top scorer) — awarded after the Final</td>
            </tr>
            <tr>
              <td className="rules-pts rules-pts--zero">0 pts</td>
              <td className="rules-desc">Your predicted player did not win the Golden Boot</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rules-colors-section">
        <h2 className="rules-round-title">Match Card Colors</h2>
        <p className="rules-colors-sub">Each prediction card is colour-coded once the real result is known.</p>
        <div className="rules-colors">
          {COLORS.map(c => (
            <div key={c.dot} className="rules-color-row">
              <span className={`rules-color-dot rules-color-dot--${c.dot}`} />
              <div>
                <span className="rules-color-label">{c.label}</span>
                <span className="rules-color-desc"> — {c.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
