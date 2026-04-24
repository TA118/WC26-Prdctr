import { useState } from 'react';
import type { Team, ManualRankings } from '../types';

interface Props {
  tiedGroups: string[][];
  teams: Team[];
  onConfirm: (rankings: ManualRankings) => void;
  onDismiss: () => void;
}

function ReorderList({
  order,
  teams,
  onReorder,
}: {
  order: string[];
  teams: Team[];
  onReorder: (next: string[]) => void;
}) {
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...order];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    onReorder(next);
  };

  return (
    <ol className="tiebreak-list">
      {order.map((id, i) => {
        const team = teams.find(t => t.id === id)!;
        return (
          <li key={id} className="tiebreak-item">
            <span className="tiebreak-rank">{i + 1}</span>
            <span className="tiebreak-team">
              <span className="flag">{team.flag}</span>
              {team.name}
            </span>
            <div className="tiebreak-arrows">
              <button onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
              <button onClick={() => move(i, 1)} disabled={i === order.length - 1}>▼</button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ManualTiebreakModal({ tiedGroups, teams, onConfirm, onDismiss }: Props) {
  const [orders, setOrders] = useState<string[][]>(() => tiedGroups.map(g => [...g]));

  const handleConfirm = () => {
    const rankings: ManualRankings = {};
    orders.forEach(order => order.forEach((id, i) => { rankings[id] = i + 1; }));
    onConfirm(rankings);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onDismiss()}>
      <div className="modal">
        <div className="modal-header">
          <h3>🎲 Tiebreaker Decision Required</h3>
          <button className="modal-close" onClick={onDismiss}>✕</button>
        </div>

        <p className="modal-desc">
          All matches have been played but these teams are still equal on points,
          goal difference, and goals scored. Use the arrows to set the final ranking.
        </p>

        {tiedGroups.map((_, gi) => (
          <div key={gi}>
            {tiedGroups.length > 1 && (
              <p className="tiebreak-group-label">Tie {gi + 1}</p>
            )}
            <ReorderList
              order={orders[gi]}
              teams={teams}
              onReorder={next => setOrders(prev => prev.map((o, i) => i === gi ? next : o))}
            />
          </div>
        ))}

        <div className="modal-footer">
          <button className="modal-confirm" onClick={handleConfirm}>Confirm Order</button>
        </div>
      </div>
    </div>
  );
}
