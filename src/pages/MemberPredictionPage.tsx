import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { INITIAL_GROUPS } from '../data/groups';
import { GROUP_SCHEDULE } from '../data/groupSchedule';
import type { Group } from '../types';

// KO rounds estimated start dates (UTC)
const KO_DATES: Record<string, string> = {
  R32: '2026-07-04T00:00:00Z',
  R16: '2026-07-09T00:00:00Z',
  QF:  '2026-07-14T00:00:00Z',
  SF:  '2026-07-18T00:00:00Z',
  F:   '2026-07-19T00:00:00Z',
};

function isKickoffPassed(isoDate: string) {
  return Date.now() >= new Date(isoDate).getTime();
}

const KO_ROUNDS = [
  { label: 'Round of 32', key: 'R32', ids: Array.from({ length: 16 }, (_, i) => i + 65) },
  { label: 'Round of 16', key: 'R16', ids: Array.from({ length: 8 },  (_, i) => i + 81) },
  { label: 'Quarter-finals', key: 'QF', ids: Array.from({ length: 4 }, (_, i) => i + 89) },
  { label: 'Semi-finals', key: 'SF', ids: Array.from({ length: 2 }, (_, i) => i + 93) },
  { label: 'Final',         key: 'F',  ids: [104] },
];

export function MemberPredictionPage() {
  const { groupId, userId } = useParams<{ groupId: string; userId: string }>();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [predData, setPredData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('A');

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase.from('profiles').select('username').eq('id', userId).single(),
      supabase.from('full_predictions').select('data').eq('user_id', userId).single(),
    ]).then(([{ data: profile }, { data: pred }]) => {
      if (profile) setUsername(profile.username);
      if (pred) setPredData(pred.data);
      setLoading(false);
    });
  }, [userId]);

  const groups: Group[] = predData?.groups ?? INITIAL_GROUPS;
  const koResults: Record<number, { home: number | null; away: number | null }> = predData?.knockoutResults ?? {};

  const GROUP_IDS = INITIAL_GROUPS.map(g => g.id);
  const activeGroup = groups.find(g => g.id === activeTab) ?? groups[0];

  if (loading) return <div className="gl-page"><p className="gl-empty">Loading…</p></div>;

  return (
    <div className="mp-page">
      <button className="back-btn mp-back" onClick={() => navigate(`/prediction/full/groups/${groupId}`)}>← Back</button>

      <div className="mp-header">
        <h1 className="mp-title">📋 {username}'s Predictions</h1>
        {predData?.predWinner && (
          <p className="mp-winner-line">
            🏆 Predicted winner: <strong>{predData.predWinner.flag} {predData.predWinner.name}</strong>
          </p>
        )}
        {predData?.goldenBoot && (
          <p className="mp-winner-line">
            👟 Top scorer: <strong>{predData.goldenBoot.name}</strong>
          </p>
        )}
      </div>

      {/* Group stage tabs */}
      <div className="mp-tabs">
        {GROUP_IDS.map(gid => (
          <button
            key={gid}
            className={`mp-tab${activeTab === gid ? ' mp-tab--active' : ''}`}
            onClick={() => setActiveTab(gid)}
          >
            {gid}
          </button>
        ))}
        <button
          className={`mp-tab${activeTab === 'ko' ? ' mp-tab--active' : ''}`}
          onClick={() => setActiveTab('ko')}
        >
          KO
        </button>
      </div>

      {activeTab !== 'ko' ? (
        <div className="mp-matches">
          {activeGroup.matches.map(match => {
            const schedule = GROUP_SCHEDULE[match.id];
            const closed = schedule ? isKickoffPassed(schedule.kickoff) : false;
            const home = activeGroup.teams.find(t => t.id === match.homeTeamId);
            const away = activeGroup.teams.find(t => t.id === match.awayTeamId);
            const hScore = closed ? match.homeScore : null;
            const aScore = closed ? match.awayScore : null;

            return (
              <div key={match.id} className="mp-match">
                <span className="mp-team mp-team--home">{home?.flag} {home?.name}</span>
                <span className="mp-score">
                  {closed
                    ? (hScore !== null && aScore !== null ? `${hScore} – ${aScore}` : '? – ?')
                    : '? – ?'}
                </span>
                <span className="mp-team mp-team--away">{away?.flag} {away?.name}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mp-matches">
          {KO_ROUNDS.map(round => {
            const roundOpen = isKickoffPassed(KO_DATES[round.key]);
            return (
              <div key={round.key} className="mp-ko-round">
                <h3 className="mp-ko-label">{round.label}</h3>
                {round.ids.map(id => {
                  const result = koResults[id];
                  const closed = roundOpen && result;
                  return (
                    <div key={id} className="mp-match mp-match--ko">
                      <span className="mp-team mp-team--home">
                        {closed ? `TBD` : '?'}
                      </span>
                      <span className="mp-score">
                        {closed && result.home !== null && result.away !== null
                          ? `${result.home} – ${result.away}`
                          : '? – ?'}
                      </span>
                      <span className="mp-team mp-team--away">
                        {closed ? `TBD` : '?'}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
