import { useState, useEffect } from 'react';
import type { Match, Team } from '../types';
import { GROUP_SCHEDULE } from '../data/groupSchedule';
import { gcalUrl } from '../utils/gcal';

interface Props {
  match: Match;
  teams: Team[];
  onScoreChange: (matchId: string, homeScore: number | null, awayScore: number | null) => void;
}

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return `${date} · ${time}`;
}

export function MatchRow({ match, teams, onScoreChange }: Props) {
  const home = teams.find((t) => t.id === match.homeTeamId)!;
  const away = teams.find((t) => t.id === match.awayTeamId)!;

  const [homeVal, setHomeVal] = useState(match.homeScore !== null ? String(match.homeScore) : '');
  const [awayVal, setAwayVal] = useState(match.awayScore !== null ? String(match.awayScore) : '');

  useEffect(() => {
    const hs = homeVal === '' ? null : parseInt(homeVal, 10);
    const as_ = awayVal === '' ? null : parseInt(awayVal, 10);
    const validH = hs !== null && !isNaN(hs) && hs >= 0;
    const validA = as_ !== null && !isNaN(as_) && as_ >= 0;
    onScoreChange(match.id, validH ? hs : null, validA ? as_ : null);
  }, [homeVal, awayVal]);

  const played = homeVal !== '' && awayVal !== '';
  const schedule = GROUP_SCHEDULE[match.id];

  return (
    <div className="match-row-wrapper">
      <div className={`match-row ${played ? 'played' : ''}`}>
        <span className="match-team home">
          <span className="flag">{home.flag}</span>
          {home.name}
        </span>
        <div className="score-inputs">
          <input
            type="number"
            min="0"
            max="99"
            value={homeVal}
            onChange={(e) => setHomeVal(e.target.value)}
            placeholder="–"
          />
          <span className="score-sep">:</span>
          <input
            type="number"
            min="0"
            max="99"
            value={awayVal}
            onChange={(e) => setAwayVal(e.target.value)}
            placeholder="–"
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
    </div>
  );
}
