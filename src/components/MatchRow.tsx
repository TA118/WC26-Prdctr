import { useState, useEffect, useRef } from 'react';
import type { Match, Team } from '../types';
import { GROUP_SCHEDULE } from '../data/groupSchedule';
import { gcalUrl } from '../utils/gcal';
import { scoreGroupMatch } from '../logic/predictionScoring';

interface Props {
  match: Match;
  teams: Team[];
  locked?: boolean;
  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
  onScoreChange: (matchId: string, homeScore: number | null, awayScore: number | null) => void;
}

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return `${date} · ${time}`;
}

const PTS_CLASS = ['match-pts--miss', 'match-pts--dir', 'match-pts--exact'];
const PTS_LABEL = ['0 pts', '1 pt', '2 pts'];

export function MatchRow({ match, teams, locked = false, actualHomeScore, actualAwayScore, onScoreChange }: Props) {
  const home = teams.find((t) => t.id === match.homeTeamId)!;
  const away = teams.find((t) => t.id === match.awayTeamId)!;

  const [homeVal, setHomeVal] = useState(match.homeScore !== null ? String(match.homeScore) : '');
  const [awayVal, setAwayVal] = useState(match.awayScore !== null ? String(match.awayScore) : '');
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    const hs = homeVal === '' ? null : parseInt(homeVal, 10);
    const as_ = awayVal === '' ? null : parseInt(awayVal, 10);
    const validH = hs !== null && !isNaN(hs) && hs >= 0;
    const validA = as_ !== null && !isNaN(as_) && as_ >= 0;
    onScoreChange(match.id, validH ? hs : null, validA ? as_ : null);
  }, [homeVal, awayVal]);

  const homeRef = useRef<HTMLInputElement>(null);
  const awayRef = useRef<HTMLInputElement>(null);

  function advanceFromHome(val: string) {
    if (val.length === 1 && /^\d$/.test(val)) awayRef.current?.focus();
  }

  function advanceFromAway(val: string) {
    if (val.length === 1 && /^\d$/.test(val)) {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]:not(:disabled)'));
      const idx = inputs.indexOf(awayRef.current!);
      if (idx >= 0 && inputs[idx + 1]) inputs[idx + 1].focus();
    }
  }

  const played = homeVal !== '' && awayVal !== '';
  const schedule = GROUP_SCHEDULE[match.id];

  const hasActual = actualHomeScore !== null && actualHomeScore !== undefined
    && actualAwayScore !== null && actualAwayScore !== undefined;
  const hasPred = homeVal !== '' && awayVal !== '';
  const pts = hasActual && hasPred
    ? scoreGroupMatch(parseInt(homeVal, 10), parseInt(awayVal, 10), actualHomeScore!, actualAwayScore!)
    : null;

  return (
    <div className="match-row-wrapper">
      <div className={`match-row ${played ? 'played' : ''}`}>
        <span className="match-team home">
          <span className="flag">{home.flag}</span>
          {home.name}
        </span>
        <div className="score-inputs">
          <input
            ref={homeRef}
            type="number"
            min="0"
            max="99"
            value={homeVal}
            onChange={(e) => { setHomeVal(e.target.value); advanceFromHome(e.target.value); }}
            placeholder="–"
            disabled={locked}
          />
          {hasActual && <span className="actual-score">({actualHomeScore})</span>}
          <span className="score-sep">:</span>
          {hasActual && <span className="actual-score">({actualAwayScore})</span>}
          <input
            ref={awayRef}
            type="number"
            min="0"
            max="99"
            value={awayVal}
            onChange={(e) => { setAwayVal(e.target.value); advanceFromAway(e.target.value); }}
            placeholder="–"
            disabled={locked}
          />
        </div>
        <span className="match-team away">
          <span className="flag">{away.flag}</span>
          {away.name}
        </span>
      </div>
      {schedule && (
        <div className="match-row-meta">
          <span>{formatKickoff(schedule.kickoff)}</span>
          <span className="match-row-venue">{schedule.venue}</span>
          <a
            className="gcal-btn"
            href={gcalUrl(`${home.name} vs ${away.name}`, schedule.kickoff, schedule.venue)}
            target="_blank"
            rel="noopener noreferrer"
          >+ Google Calendar</a>
        </div>
      )}
      {pts !== null && (
        <div className={`match-pts ${PTS_CLASS[pts]}`}>
          {PTS_LABEL[pts]}
        </div>
      )}
    </div>
  );
}
