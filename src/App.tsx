import { useState, useCallback, useMemo } from 'react';
import type { Group, ManualRankings } from './types';
import { INITIAL_GROUPS } from './data/groups';
import { getBestThirdPlaced } from './logic/thirdPlace';
import { GroupView } from './components/GroupView';
import { BestThirdTable } from './components/BestThirdTable';
import { KnockoutStage } from './components/KnockoutStage';
import './index.css';

const THIRD_TAB = '3rd';
const KO_TAB = 'ko';

export default function App() {
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [activeTab, setActiveTab] = useState('A');
  // Per-group manual tiebreak rankings, cleared whenever scores in that group change
  const [allManualRankings, setAllManualRankings] = useState<Record<string, ManualRankings>>({});

  const handleScoreChange = useCallback(
    (groupId: string, matchId: string, homeScore: number | null, awayScore: number | null) => {
      setGroups(prev => prev.map(g =>
        g.id !== groupId ? g : {
          ...g,
          matches: g.matches.map(m => m.id === matchId ? { ...m, homeScore, awayScore } : m),
        }
      ));
      // A score change may create or resolve ties — reset manual decision for this group
      setAllManualRankings(prev => ({ ...prev, [groupId]: {} }));
    },
    []
  );

  const handleManualRankingsChange = useCallback(
    (groupId: string, rankings: ManualRankings) => {
      setAllManualRankings(prev => ({ ...prev, [groupId]: rankings }));
    },
    []
  );

  const totalPlayed = groups.reduce(
    (sum, g) => sum + g.matches.filter(m => m.homeScore !== null && m.awayScore !== null).length,
    0
  );

  const bestThird = useMemo(() => getBestThirdPlaced(groups), [groups]);
  const qualifyingThirdIds = useMemo(
    () => new Set(bestThird.slice(0, 8).map(t => t.team.id)),
    [bestThird]
  );
  const current = groups.find(g => g.id === activeTab);

  return (
    <div className="app">
      <header>
        <h1>⚽ World Cup 2026</h1>
        <p className="subtitle">Group Stage · {totalPlayed} / 72 matches played</p>
      </header>

      <nav className="group-tabs">
        {groups.map((g) => {
          const played = g.matches.filter(m => m.homeScore !== null && m.awayScore !== null).length;
          return (
            <button
              key={g.id}
              className={`tab-btn ${g.id === activeTab ? 'active' : ''} ${played === 6 ? 'complete' : ''}`}
              onClick={() => setActiveTab(g.id)}
            >
              {g.id}
              {played > 0 && played < 6 && <span className="tab-dot" />}
              {played === 6 && <span className="tab-check">✓</span>}
            </button>
          );
        })}

        <div className="tab-divider" />

        <button
          className={`tab-btn tab-btn--third ${activeTab === THIRD_TAB ? 'active' : ''}`}
          onClick={() => setActiveTab(THIRD_TAB)}
        >
          3rd
        </button>

        <button
          className={`tab-btn tab-btn--ko ${activeTab === KO_TAB ? 'active' : ''}`}
          onClick={() => setActiveTab(KO_TAB)}
        >
          KO
        </button>
      </nav>

      <main>
        {activeTab === KO_TAB ? (
          <KnockoutStage groups={groups} />
        ) : activeTab === THIRD_TAB ? (
          <section>
            <h2>3rd Places</h2>
            <BestThirdTable teams={bestThird} />
            <p className="qualify-note">Top 8 teams qualify ↑</p>
          </section>
        ) : current ? (
          <GroupView
            key={current.id}
            group={current}
            manualRankings={allManualRankings[current.id] ?? {}}
            qualifyingThirdIds={qualifyingThirdIds}
            onScoreChange={(matchId, hs, as_) => handleScoreChange(current.id, matchId, hs, as_)}
            onManualRankingsChange={r => handleManualRankingsChange(current.id, r)}
          />
        ) : null}
      </main>
    </div>
  );
}
