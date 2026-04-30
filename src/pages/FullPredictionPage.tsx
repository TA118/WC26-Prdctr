import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Group, ManualRankings, Team } from '../types';
import type { KnockoutResults } from '../components/KnockoutStage';
import { INITIAL_GROUPS } from '../data/groups';
import { getBestThirdPlaced, getThirdPlaceBoundaryTies, applyThirdPlaceManualRankings } from '../logic/thirdPlace';
import { GroupView } from '../components/GroupView';
import { BestThirdTable } from '../components/BestThirdTable';
import { KnockoutStage } from '../components/KnockoutStage';
import { ManualTiebreakModal } from '../components/ManualTiebreakModal';
import { computeTotalScore } from '../logic/predictionScoring';
import { GoldenBootModal } from '../components/GoldenBootModal';
import type { Player } from '../data/players';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const THIRD_TAB = '3rd';
const KO_TAB = 'ko';
const PRED_KEY = 'wc26_prediction';
const SIM_KEY = 'wc26_predictor';
const DEADLINE = new Date('2026-06-11T19:00:00Z');

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(() => target.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return diff;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return d > 0
    ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function deepCloneInitial(): Group[] {
  return JSON.parse(JSON.stringify(INITIAL_GROUPS));
}

function loadSimulatorData(): { groups: Group[]; knockoutResults: KnockoutResults; goldenBoot: string | null } | null {
  try {
    const raw = localStorage.getItem(SIM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.groups) return {
      groups: parsed.groups,
      knockoutResults: parsed.knockoutResults ?? {},
      goldenBoot: parsed.goldenBoot?.name ?? null,
    };
  } catch { /* ignore */ }
  return null;
}

export function FullPredictionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const raw = localStorage.getItem(PRED_KEY);
      if (raw) return JSON.parse(raw).groups ?? deepCloneInitial();
    } catch { /* ignore */ }
    return deepCloneInitial();
  });

  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const [activeTab, setActiveTab] = useState('A');
  const [allManualRankings, setAllManualRankings] = useState<Record<string, ManualRankings>>(() => {
    try {
      const raw = localStorage.getItem(PRED_KEY);
      if (raw) return JSON.parse(raw).allManualRankings ?? {};
    } catch { /* ignore */ }
    return {};
  });

  const [knockoutResults, setKnockoutResults] = useState<KnockoutResults>(() => {
    try {
      const raw = localStorage.getItem(PRED_KEY);
      if (raw) return JSON.parse(raw).knockoutResults ?? {};
    } catch { /* ignore */ }
    return {};
  });

  const [thirdPlaceRankings, setThirdPlaceRankings] = useState<ManualRankings>(() => {
    try {
      const raw = localStorage.getItem(PRED_KEY);
      if (raw) return JSON.parse(raw).thirdPlaceRankings ?? {};
    } catch { /* ignore */ }
    return {};
  });


  const [goldenBoot, setGoldenBoot] = useState<Player | null>(() => {
    try {
      const raw = localStorage.getItem(PRED_KEY);
      if (raw) return JSON.parse(raw).goldenBoot ?? null;
    } catch { /* ignore */ }
    return null;
  });

  const [predWinner, setPredWinner] = useState<Team | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showGoldenBootModal, setShowGoldenBootModal] = useState(false);
  const completionTriggered = useRef(false);

  const [simData] = useState(loadSimulatorData);

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
      setThirdPlaceRankings({});
    },
    []
  );

  const handleManualRankingsChange = useCallback(
    (groupId: string, rankings: ManualRankings) => {
      setAllManualRankings(prev => ({ ...prev, [groupId]: rankings }));
    },
    []
  );

  // Load from Supabase when user logs in (overrides localStorage if cloud data exists)
  useEffect(() => {
    if (!user) return;
    supabase
      .from('full_predictions')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.data) return;
        const d = data.data;
        if (d.groups) setGroups(d.groups);
        if (d.allManualRankings) setAllManualRankings(d.allManualRankings);
        if (d.knockoutResults) setKnockoutResults(d.knockoutResults);
        if (d.thirdPlaceRankings) setThirdPlaceRankings(d.thirdPlaceRankings);
        if (d.goldenBoot) setGoldenBoot(d.goldenBoot);
        if (d.predWinner) setPredWinner(d.predWinner);
      });
  }, [user]);

  // Auto-save with debounce — writes to localStorage and Supabase if logged in
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const t = setTimeout(() => {
      const payload = { groups, allManualRankings, knockoutResults, thirdPlaceRankings, goldenBoot, predWinner };
      try {
        localStorage.setItem(PRED_KEY, JSON.stringify(payload));
      } catch { /* ignore */ }
      if (user) {
        supabase.from('full_predictions').upsert({
          user_id: user.id,
          data: payload,
          updated_at: new Date().toISOString(),
        }).then(() => {});
      }
    }, 600);
    return () => clearTimeout(t);
  }, [groups, allManualRankings, knockoutResults, thirdPlaceRankings, goldenBoot, user]);

  const handleFinalWinner = useCallback((team: Team | null) => {
    setPredWinner(team);
  }, []);

  const handleGoldenBootSelect = useCallback((player: Player) => {
    setGoldenBoot(player);
    setShowGoldenBootModal(false);
  }, []);

  const totalPredicted = groups.reduce(
    (sum, g) => sum + g.matches.filter(m => m.homeScore !== null && m.awayScore !== null).length,
    0
  );
  const koPredicted = Object.values(knockoutResults).filter(r => r.home !== null && r.away !== null).length;

  useEffect(() => {
    if (koPredicted === 32 && predWinner && !completionTriggered.current) {
      completionTriggered.current = true;
      if (!goldenBoot) setShowWinnerModal(true);
    }
  }, [koPredicted, predWinner, goldenBoot]);

  const msLeft = useCountdown(DEADLINE);
  const isPastDeadline = msLeft <= 0;
  const standingsGroups = isPastDeadline && simData ? simData.groups : groups;

  const bestThird = useMemo(() => getBestThirdPlaced(standingsGroups), [standingsGroups]);
  const sortedThirds = useMemo(
    () => applyThirdPlaceManualRankings(bestThird, thirdPlaceRankings),
    [bestThird, thirdPlaceRankings],
  );
  const qualifyingThirdIds = useMemo(
    () => new Set(sortedThirds.slice(0, 8).map(t => t.team.id)),
    [sortedThirds],
  );
  const thirdPlaceUnresolvedTies = useMemo(() => {
    if (totalPredicted !== 72) return [];
    return getThirdPlaceBoundaryTies(bestThird).filter(
      g => !g.every(id => thirdPlaceRankings[id] !== undefined)
    );
  }, [bestThird, thirdPlaceRankings, totalPredicted]);

  const totalScore = useMemo(() => {
    if (!simData) return null;
    return computeTotalScore(
      groups, knockoutResults, simData.groups, simData.knockoutResults,
      goldenBoot?.name ?? null, simData.goldenBoot,
    );
  }, [groups, knockoutResults, simData, goldenBoot]);

  const current = groups.find(g => g.id === activeTab);

  return (
    <div className="app">
      <button className="home-nav-btn" onClick={() => navigate('/prediction/full')}>← Back</button>
      <header>
        <h1>🎯 Full World Cup 2026 Prediction</h1>
        <p className="subtitle">
          {activeTab === KO_TAB
            ? `Knockout Stage · ${koPredicted} / 32 predicted`
            : `Group Stage · ${totalPredicted} / 72 predicted`}
        </p>
        {totalScore !== null && (
          <div className="header-score">
            <span className="header-score-value">{totalScore}</span>
            <span className="header-score-label"> pts</span>
          </div>
        )}
      </header>

      {isPastDeadline ? (
        <div className="deadline-banner deadline-banner--locked">
          🔒 Predictions locked — tournament started
        </div>
      ) : (
        <div className="deadline-banner deadline-banner--open">
          <span className="deadline-label">Predictions close in</span>
          <span className="deadline-clock">{formatCountdown(msLeft)}</span>
        </div>
      )}

      <nav className="group-tabs">
        {groups.map((g) => {
          const predicted = g.matches.filter(m => m.homeScore !== null && m.awayScore !== null).length;
          return (
            <button
              key={g.id}
              className={`tab-btn ${g.id === activeTab ? 'active' : ''} ${predicted === 6 ? 'complete' : ''}`}
              onClick={() => setActiveTab(g.id)}
            >
              {g.id}
              {predicted > 0 && predicted < 6 && <span className="tab-dot" />}
              {predicted === 6 && <span className="tab-check">✓</span>}
            </button>
          );
        })}

        <div className="tab-divider" />

        <button
          className={`tab-btn tab-btn--third ${activeTab === THIRD_TAB ? 'active' : ''} ${totalPredicted === 72 ? 'complete' : ''}`}
          onClick={() => setActiveTab(THIRD_TAB)}
        >
          3rd
          {totalPredicted === 72 && <span className="tab-check">✓</span>}
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
            locked={totalPredicted < 72 || isPastDeadline}
            actualGroups={isPastDeadline ? simData?.groups : undefined}
            actualKnockoutResults={isPastDeadline ? simData?.knockoutResults : undefined}
            onFinalWinner={handleFinalWinner}
          />
        ) : activeTab === THIRD_TAB ? (
          <section>
            <h2>3rd Places</h2>
            <BestThirdTable teams={sortedThirds} groups={groups} />
            <p className="qualify-note">Top 8 teams qualify ↑</p>
            {thirdPlaceUnresolvedTies.length > 0 && (
              <ManualTiebreakModal
                tiedGroups={thirdPlaceUnresolvedTies}
                teams={bestThird.map(t => t.team)}
                onConfirm={setThirdPlaceRankings}
                onDismiss={() => {}}
              />
            )}
          </section>
        ) : current ? (
          <GroupView
            key={current.id}
            group={current}
            manualRankings={allManualRankings[current.id] ?? {}}
            qualifyingThirdIds={qualifyingThirdIds}
            locked={isPastDeadline}
            actualGroup={simData?.groups.find(g => g.id === current.id)}
            useActualForStandings={isPastDeadline && !!simData}
            onScoreChange={(matchId, hs, as_) => handleScoreChange(current.id, matchId, hs, as_)}
            onManualRankingsChange={r => handleManualRankingsChange(current.id, r)}
          />
        ) : null}
      </main>

      {showWinnerModal && predWinner && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon">🏆⚽</div>
            <h2 className="modal-title">Your Prediction</h2>
            <p className="modal-body">
              You predicted that{' '}
              <strong>{predWinner.flag} {predWinner.name}</strong>{' '}
              will win the 2026 WORLD CUP! 🏆⚽
            </p>
            <button className="modal-ok-btn" onClick={() => { setShowWinnerModal(false); setShowGoldenBootModal(true); }}>
              OK
            </button>
          </div>
        </div>
      )}

      {showGoldenBootModal && (
        <GoldenBootModal onSelect={handleGoldenBootSelect} />
      )}
    </div>
  );
}
