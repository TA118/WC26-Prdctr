import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Group, ManualRankings } from './types';
import type { KnockoutResults } from './components/KnockoutStage';
import { INITIAL_GROUPS } from './data/groups';
import { getBestThirdPlaced } from './logic/thirdPlace';
import { GroupView } from './components/GroupView';
import { BestThirdTable } from './components/BestThirdTable';
import { KnockoutStage } from './components/KnockoutStage';
import './index.css';

const THIRD_TAB = '3rd';
const KO_TAB = 'ko';
const STORAGE_KEY = 'wc26_predictor';

function deepCloneInitial(): Group[] {
  return JSON.parse(JSON.stringify(INITIAL_GROUPS));
}

export default function App() {
  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw).groups ?? deepCloneInitial();
    } catch { /* ignore */ }
    return deepCloneInitial();
  });
  // Always-current ref so handleScoreChange can read latest groups without a stale closure
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const [activeTab, setActiveTab] = useState('A');
  const [allManualRankings, setAllManualRankings] = useState<Record<string, ManualRankings>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw).allManualRankings ?? {};
    } catch { /* ignore */ }
    return {};
  });
  const [knockoutResults, setKnockoutResults] = useState<KnockoutResults>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw).knockoutResults ?? {};
    } catch { /* ignore */ }
    return {};
  });
  const [saveLabel, setSaveLabel] = useState<'save' | 'saved'>('save');

  // Restore indicator — show "Restored" briefly on first load if data existed
  const [restored] = useState(() => !!localStorage.getItem(STORAGE_KEY));
  const [showRestored, setShowRestored] = useState(restored);
  useEffect(() => {
    if (!showRestored) return;
    const t = setTimeout(() => setShowRestored(false), 2500);
    return () => clearTimeout(t);
  }, [showRestored]);

  const handleScoreChange = useCallback(
    (groupId: string, matchId: string, homeScore: number | null, awayScore: number | null) => {
      const existing = groupsRef.current
        .find(g => g.id === groupId)?.matches.find(m => m.id === matchId);
      if (existing?.homeScore === homeScore && existing?.awayScore === awayScore) return;
      setGroups(prev => prev.map(g =>
        g.id !== groupId ? g : {
          ...g,
          matches: g.matches.map(m => m.id === matchId ? { ...m, homeScore, awayScore } : m),
        }
      ));
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

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups, allManualRankings, knockoutResults }));
      setSaveLabel('saved');
      setTimeout(() => setSaveLabel('save'), 2000);
    } catch { /* ignore */ }
  }, [groups, allManualRankings, knockoutResults]);

  const handleReset = useCallback(() => {
    if (!confirm('Reset all scores and results? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    setGroups(deepCloneInitial());
    setAllManualRankings({});
    setKnockoutResults({});
  }, []);

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
        <div className="header-actions">
          {showRestored && <span className="action-note">Progress restored</span>}
          <button className="action-btn action-btn--save" onClick={handleSave}>
            {saveLabel === 'saved' ? '✓ Saved' : 'Save'}
          </button>
          <button className="action-btn action-btn--reset" onClick={handleReset}>
            Reset
          </button>
        </div>
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
          className={`tab-btn tab-btn--third ${activeTab === THIRD_TAB ? 'active' : ''} ${totalPlayed === 72 ? 'complete' : ''}`}
          onClick={() => setActiveTab(THIRD_TAB)}
        >
          3rd
          {totalPlayed === 72 && <span className="tab-check">✓</span>}
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
          <KnockoutStage
            groups={groups}
            knockoutResults={knockoutResults}
            onKnockoutResultsChange={setKnockoutResults}
            locked={totalPlayed < 72}
          />
        ) : activeTab === THIRD_TAB ? (
          <section>
            <h2>3rd Places</h2>
            <BestThirdTable teams={bestThird} groups={groups} />
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
