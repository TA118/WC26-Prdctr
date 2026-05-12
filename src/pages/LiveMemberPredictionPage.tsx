import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { syncAndFetchResults, buildActualGroups } from '../lib/actualResults';
import { totalGroupScore } from '../logic/predictionScoring';
import { computeStandings } from '../logic/standings';
import { INITIAL_GROUPS } from '../data/groups';
import { GROUP_SCHEDULE } from '../data/groupSchedule';
import type { Group } from '../types';

const KO_DATES: Record<string, string> = {
  R32: '2026-07-04T00:00:00Z',
  R16: '2026-07-09T00:00:00Z',
  QF:  '2026-07-14T00:00:00Z',
  SF:  '2026-07-18T00:00:00Z',
  F:   '2026-07-19T00:00:00Z',
};

const KO_ROUNDS = [
  { label: 'Round of 32',    key: 'R32', ids: Array.from({ length: 16 }, (_, i) => i + 65) },
  { label: 'Round of 16',    key: 'R16', ids: Array.from({ length: 8 },  (_, i) => i + 81) },
  { label: 'Quarter-finals', key: 'QF',  ids: Array.from({ length: 4 },  (_, i) => i + 89) },
  { label: 'Semi-finals',    key: 'SF',  ids: Array.from({ length: 2 },  (_, i) => i + 93) },
  { label: 'Final',          key: 'F',   ids: [104] },
];

function isKickoffPassed(isoDate: string) {
  return Date.now() >= new Date(isoDate).getTime();
}

function isTeamEliminated(teamId: string, actualGroups: Group[]): boolean {
  if (actualGroups.length === 0) return false;
  for (const ag of actualGroups) {
    const allPlayed = ag.matches.every(m => m.homeScore !== null && m.awayScore !== null);
    if (!allPlayed) return false; // group not finished yet, can't tell
    const standings = computeStandings(ag.teams, ag.matches);
    if (standings.some(s => s.team.id === teamId)) {
      // team is in this group — check if they finished top 2
      const rank = standings.findIndex(s => s.team.id === teamId);
      return rank >= 2; // 3rd or 4th = eliminated (simplified, ignores best 3rd)
    }
  }
  return false;
}

export function LiveMemberPredictionPage() {
  const { groupId, userId } = useParams<{ groupId: string; userId: string }>();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [predData, setPredData] = useState<any>(null);
  const [perfectCount, setPerfectCount] = useState(0);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [winnerEliminated, setWinnerEliminated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('A');

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase.from('profiles').select('username').eq('id', userId).single(),
      supabase.from('live_predictions').select('data').eq('user_id', userId).single(),
      syncAndFetchResults(),
    ]).then(([{ data: profile }, { data: pred }, { results }]) => {
      if (profile) setUsername(profile.username);
      if (pred) {
        setPredData(pred.data);
        if (results.length > 0 && pred.data?.groups) {
          const actualGroups = buildActualGroups(results);
          let count = 0;
          for (const pg of pred.data.groups as Group[]) {
            const ag = actualGroups.find(g => g.id === pg.id);
            if (!ag) continue;
            for (const pm of pg.matches) {
              if (pm.homeScore === null || pm.awayScore === null) continue;
              const am = ag.matches.find(m => m.id === pm.id);
              if (!am || am.homeScore === null || am.awayScore === null) continue;
              if (pm.homeScore === am.homeScore && pm.awayScore === am.awayScore) count++;
            }
          }
          setPerfectCount(count);
          setUserScore(totalGroupScore(pred.data.groups, actualGroups));
          if (pred.data?.predWinner?.id) {
            setWinnerEliminated(isTeamEliminated(pred.data.predWinner.id, actualGroups));
          }
        }
      }
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
      <button className="back-btn mp-back" onClick={() => navigate(`/prediction/live/groups/${groupId}`)}>← Back</button>

      <div className="mp-header">
        <h1 className="mp-title">📋 {username}'s Predictions</h1>
        <div className="mp-stats-bar">
          <div className={`mp-stat-card${winnerEliminated ? ' mp-stat-card--eliminated' : ''}`}>
            <div className="mp-stat-label">🏆 Predicted Winner</div>
            <div className="mp-stat-value">
              {predData?.predWinner
                ? <><span className="mp-stat-flag">{predData.predWinner.flag}</span>{predData.predWinner.name}</>
                : <span className="mp-stat-empty">Not chosen</span>}
            </div>
            {winnerEliminated && <div className="mp-stat-eliminated">Eliminated</div>}
          </div>
          <div className="mp-stat-card">
            <div className="mp-stat-label">👟 Top Scorer</div>
            <div className="mp-stat-value">
              {predData?.goldenBoot
                ? <><span className="mp-stat-flag">{predData.goldenBoot.flag}</span>{predData.goldenBoot.name}</>
                : <span className="mp-stat-empty">Not chosen</span>}
            </div>
          </div>
          <div className="mp-stat-card">
            <div className="mp-stat-label">🏅 Score</div>
            <div className="mp-stat-value mp-stat-value--highlight">
              {userScore !== null ? userScore : '—'}
            </div>
          </div>
          <div className="mp-stat-card">
            <div className="mp-stat-label">⭐ Perfect Predictions</div>
            <div className="mp-stat-value mp-stat-value--highlight">{perfectCount}</div>
          </div>
        </div>
      </div>

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
                      <span className="mp-team mp-team--home">{closed ? 'TBD' : '?'}</span>
                      <span className="mp-score">
                        {closed && result.home !== null && result.away !== null
                          ? `${result.home} – ${result.away}`
                          : '? – ?'}
                      </span>
                      <span className="mp-team mp-team--away">{closed ? 'TBD' : '?'}</span>
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
