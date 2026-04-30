import { useState, useRef, useEffect } from 'react';
import { PLAYERS, type Player } from '../data/players';

interface Props {
  onSelect: (player: Player) => void;
}

export function GoldenBootModal({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? [
        ...PLAYERS.filter(p => p.name.toLowerCase().startsWith(q)),
        ...PLAYERS.filter(p => !p.name.toLowerCase().startsWith(q) && p.name.toLowerCase().includes(q)),
        ...PLAYERS.filter(p =>
          !p.name.toLowerCase().includes(q) && p.country.toLowerCase().includes(q)
        ),
      ]
    : PLAYERS;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-icon">🥇</div>
        <h2 className="modal-title">Golden Boot</h2>
        <p className="modal-subtitle">Who will score the most goals at World Cup 2026?</p>
        <input
          ref={inputRef}
          className="player-search-input"
          type="text"
          placeholder="Search player or country…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="player-list">
          {filtered.length > 0 ? filtered.map(p => (
            <button key={p.name} className="player-item" onClick={() => onSelect(p)}>
              <span className="player-flag">{p.flag}</span>
              <span className="player-name">{p.name}</span>
              <span className="player-country">{p.country}</span>
            </button>
          )) : (
            <p className="player-no-results">No players found</p>
          )}
        </div>
      </div>
    </div>
  );
}
