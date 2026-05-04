import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Group, ManualRankings, Team } from '../types';
import type { KnockoutResults } from '../components/KnockoutStage';
import { INITIAL_GROUPS } from '../data/groups';
import { GROUP_SCHEDULE } from '../data/groupSchedule';
import { getBestThirdPlaced, getThirdPlaceBoundaryTies, applyThirdPlaceManualRankings } from '../logic/thirdPlace';
import { GroupView } from '../components/GroupView';
import { BestThirdTable } from '../components/BestThirdTable';
import { KnockoutStage } from '../components/KnockoutStage';
import { ManualTiebreakModal } from '../components/ManualTiebreakModal';
import { PLAYERS, type Player } from '../data/players';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { syncAndFetchResults } from '../lib/actualResults';

const THIRD_TAB = '3rd';
const KO_TAB = 'ko';
const STORAGE_KEY = 'wc26_live_prediction';
const DEADLINE = new Date('2026-06-11T19:00:00Z');

const ALL_TEAMS: Team[] = INITIAL_GROUPS.flatMap(g => g.teams);

function deepCloneInitial(): Group[] {
  return JSON.parse(JSON.stringify(INITIAL_GROUPS));
}

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
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function filterTeams(query: string): Team[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_TEAMS;
  return [
    ...ALL_TEAMS.filter(t => t.name.toLowerCase().startsWith(q)),
    ...ALL_TEAMS.filter(t => !t.name.toLowerCase().startsWith(q) && t.name.toLowerCase().includes(q)),
  ];
}

function filterPlayers(query: string): Player[] {
  const q = query.trim().toLowerCase();
  if (!q) return PLAYERS;
  return [
    ...PLAYERS.filter(p => p.name.toLowerCase().startsWith(q)),
    ...PLAYERS.filter(p => !p.name.toLowerCase().startsWith(q) && p.name.toLowerCase().includes(q)),
    ...PLAYERS.filter(p => !p.name.toLowerCase().includes(q) && p.country.toLowerCase().includes(q)),
  ];
}

// ─── Welcome Modal ────────────────────────────────────────────────────────────

interface WelcomeModalProps {
  initialWinner: Team | null;
  initialScorer: Player | null;
  onSave: (winner: Team | null, scorer: Player | null) => void;
  onLater: () => void;
}

function WelcomeModal({ initialWinner, initialScorer, onSave, onLater }: WelcomeModalProps) {
  const [winner, setWinner] = useState<Team | null>(initialWinner);
  const [scorer, setScorer] = useState<Player | null>(initialScorer);
  const [winnerQuery, setWinnerQuery] = useState('');
  const [scorerQuery, setScorerQuery] = useState('');

  return (
    <div className="modal-overlay">
      <div className="modal-box live-welcome-modal">
        <div className="modal-icon">🏆</div>
        <h2 className="modal-title">Make Your Picks!</h2>
        <p className="modal-subtitle">Choose your predicted World Cup winner and top scorer before the tournament begins.</p>

        <div className="live-welcome-pickers">
          <div className="live-welcome-picker">
            <div className="live-welcome-picker-label">🏆 Tournament Winner</div>
            {winner && (
              <div className="live-welcome-selected">
                <span className="live-welcome-selected-icon">{winner.flag}</span>
                <span className="live-welcome-selected-name">{winner.name}</span>
              </div>
            )}
            <input
              className="player-search-input"
              type="text"
              placeholder="Search team…"
              value={winnerQuery}
              onChange={e => setWinnerQuery(e.target.value)}
            />
            <div className="player-list live-welcome-list">
              {filterTeams(winnerQuery).map(t => (
                <button
                  key={t.id}
                  className={`player-item${winner?.id === t.id ? ' player-item--selected' : ''}`}
                  onClick={() => setWinner(t)}
                >
                  <span className="player-flag">{t.flag}</span>
                  <span className="player-name">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="live-welcome-picker">
            <div className="live-welcome-picker-label">👟 Top Scorer</div>
            {scorer && (
              <div className="live-welcome-selected">
                <span className="live-welcome-selected-icon">{scorer.flag}</span>
                <span className="live-welcome-selected-name">{scorer.name}</span>
              </div>
            )}
            <input
              className="player-search-input"
              type="text"
              placeholder="Search player or country…"
              value={scorerQuery}
              onChange={e => setScorerQuery(e.target.value)}
            />
            <div className="player-list live-welcome-list">
              {filterPlayers(scorerQuery).map(p => (
                <button
                  key={p.name}
                  className={`player-item${scorer?.name === p.name ? ' player-item--selected' : ''}`}
                  onClick={() => setScorer(p)}
                >
                  <span className="player-flag">{p.flag}</span>
                  <span className="player-name">{p.name}</span>
                  <span className="player-country">{p.country}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="live-welcome-actions">
          <button className="modal-ok-btn" onClick={() => onSave(winner, scorer)}>
            ✅ Save my picks
          </button>
          <button className="modal-later-btn" onClick={onLater}>
            Choose later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Picker Modal (change a pick) ─────────────────────────────────────────────

interface PickerModalProps {
  target: 'winner' | 'scorer';
  onSelectWinner: (t: Team) => void;
  onSelectScorer: (p: Player) => void;
  onClose: () => void;
}

function PickerModal({ target, onSelectWinner, onSelectScorer, onClose }: PickerModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const isWinner = target === 'winner';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">{isWinner ? '🏆' : '👟'}</div>
        <h2 className="modal-title">{isWinner ? 'Tournament Winner' : 'Top Scorer'}</h2>
        <p className="modal-subtitle">
          {isWinner ? 'Which team will lift the trophy?' : 'Who will score the most goals?'}
        </p>
        <input
          ref={inputRef}
          className="player-search-input"
          type="text"
          placeholder={isWinner ? 'Search team…' : 'Search player or country…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="player-list">
          {isWinner
            ? filterTeams(query).map(t => (
                <button key={t.id} className="player-item" onClick={() => onSelectWinner(t)}>
                  <span className="player-flag">{t.flag}</span>
                  <span className="player-name">{t.name}</span>
                </button>
              ))
            : filterPlayers(query).map(p => (
                <button key={p.name} className="player-item" onClick={() => onSelectScorer(p)}>
                  <span className="player-flag">{p.flag}</span>
                  <span className="player-name">{p.name}</span>
                  <span className="player-country">{p.country}</span>
                </button>
              ))
          }
        </div>
        <button className="modal-later-btn" style={{ marginTop: '0.75rem' }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LivePredictionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const msLeft = useCountdown(DEADLINE);
  const isPastDeadline = msLeft <= 0;

  // ── Predictions state ──────────────────────────────────────────────────────
  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw).groups ?? deepCloneInitial();
    } catch { /* ignore */ }
    return deepCloneInitial();
  });
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
  const [thirdPlaceRankings, setThirdPlaceRankings] = useState<ManualRankings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw).thirdPlaceRankings ?? {};
    } catch { /* ignore */ }
    return {};
  });

  // ── Picks state ────────────────────────────────────────────────────────────
  const [predWinner, setPredWinner] = useState<Team | null>(null);
  const [goldenBoot, setGoldenBoot] = useState<Player | null>(null);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw).hasSeenWelcome ?? false) : false;
    } catch { return false; }
  });
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'winner' | 'scorer' | null>(null);

  // ── Actual results ─────────────────────────────────────────────────────────
  const [actualGroups, setActualGroups] = useState<Group[]>([]);

  useEffect(() => {
    syncAndFetchResults().then(({ actualGroups: ag }) => setActualGroups(ag));
  }, []);

  // ── Per-match locking (re-checks every 30 s) ───────────────────────────────
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const matchLocks = useMemo(() => {
    const locks: Record<string, boolean> = {};
    for (const [id, s] of Object.entries(GROUP_SCHEDULE)) {
      locks[id] = now >= new Date(s.kickoff).getTime();
    }
    return locks;
  }, [now]);

  // ── Load from localStorage + Supabase ─────────────────────────────────────
  const cloudLoaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.predWinner) setPredWinner(d.predWinner);
        if (d.goldenBoot) setGoldenBoot(d.goldenBoot);
        if (!d.hasSeenWelcome && !isPastDeadline) setShowWelcomeModal(true);
      } else if (!isPastDeadline) {
        setShowWelcomeModal(true);
      }
    } catch {
      if (!isPastDeadline) setShowWelcomeModal(true);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) { cloudLoaded.current = true; return; }
    cloudLoaded.current = false;
    supabase
      .from('live_predictions')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.data) {
          const d = data.data;
          if (d.groups) setGroups(d.groups);
          if (d.allManualRankings) setAllManualRankings(d.allManualRankings);
          if (d.knockoutResults) setKnockoutResults(d.knockoutResults);
          if (d.thirdPlaceRankings) setThirdPlaceRankings(d.thirdPlaceRankings);
          if (d.goldenBoot) setGoldenBoot(d.goldenBoot);
          if (d.predWinner) setPredWinner(d.predWinner);
        }
        cloudLoaded.current = true;
      });
  }, [user]);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const t = setTimeout(() => {
      if (!cloudLoaded.current) return;
      const payload = { groups, allManualRankings, knockoutResults, thirdPlaceRankings, goldenBoot, predWinner, hasSeenWelcome };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
      if (user) {
        supabase.from('live_predictions').upsert({
          user_id: user.id,
          data: payload,
          updated_at: new Date().toISOString(),
        }).then(() => {});
      }
    }, 600);
    return () => clearTimeout(t);
  }, [groups, allManualRankings, knockoutResults, thirdPlaceRankings, goldenBoot, predWinner, hasSeenWelcome, user]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleScoreChange = useCallback(
    (groupId: string, matchId: string, homeScore: number | null, awayScore: number | null) => {
      const existing = groupsRef.current.find(g => g.id === groupId)?.matches.find(m => m.id === matchId);
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

  function markWelcomeSeen() {
    setHasSeenWelcome(true);
  }

  function handleWelcomeSave(winner: Team | null, scorer: Player | null) {
    if (winner) setPredWinner(winner);
    if (scorer) setGoldenBoot(scorer);
    markWelcomeSeen();
    setShowWelcomeModal(false);
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const hasActualResults = actualGroups.some(g => g.matches.some(m => m.homeScore !== null));
  const standingsGroups = hasActualResults ? actualGroups : groups;

  const totalPredicted = groups.reduce(
    (sum, g) => sum + g.matches.filter(m => m.homeScore !== null && m.awayScore !== null).length,
    0
  );

  // KO stage unlocks only once the real group stage is fully complete per BSD API
  const actualGroupStageComplete = actualGroups.length > 0 &&
    actualGroups.every(g => g.matches.every(m => m.homeScore !== null && m.awayScore !== null));
  const koPredicted = Object.values(knockoutResults).filter(r => r.home !== null && r.away !== null).length;

  const bestThird = useMemo(() => getBestThirdPlaced(standingsGroups), [standingsGroups]);
  const sortedThirds = useMemo(
    () => applyThirdPlaceManualRankings(bestThird, thirdPlaceRankings),
    [bestThird, thirdPlaceRankings]
  );
  const qualifyingThirdIds = useMemo(
    () => new Set(sortedThirds.slice(0, 8).map(t => t.team.id)),
    [sortedThirds]
  );
  const thirdPlaceUnresolvedTies = useMemo(() => {
    if (totalPredicted !== 72) return [];
    return getThirdPlaceBoundaryTies(bestThird).filter(
      g => !g.every(id => thirdPlaceRankings[id] !== undefined)
    );
  }, [bestThird, thirdPlaceRankings, totalPredicted]);

  const current = groups.find(g => g.id === activeTab);

  return (
    <div className="app">
      <button className="home-nav-btn" onClick={() => navigate('/prediction/live')}>← Back</button>

      <header>
        <h1>📡 Live WC Predictions</h1>
        <p className="subtitle">
          {activeTab === KO_TAB
            ? `Knockout Stage · ${koPredicted} / 32 predicted`
            : `Group Stage · ${totalPredicted} / 72 predicted`}
        </p>
      </header>

      {/* Picks box — hidden on 3rd place tab */}
      {activeTab !== THIRD_TAB && (
        <div className="live-picks-box">
          {isPastDeadline ? (
            <div className="live-picks-locked">🔒 Picks locked - tournament started</div>
          ) : (
            <div className="live-picks-countdown">
              Picks close in
              <span className="live-picks-countdown-clock">{formatCountdown(msLeft)}</span>
            </div>
          )}

          <div className="live-picks-row">
            <button
              className={`live-pick-card${isPastDeadline ? ' live-pick-card--locked' : ''}`}
              onClick={() => !isPastDeadline && setPickerTarget('winner')}
            >
              <div className="live-pick-label">🏆 Predicted Winner</div>
              {predWinner ? (
                <div className="live-pick-value">
                  <span className="flag">{predWinner.flag}</span>
                  {predWinner.name}
                </div>
              ) : (
                <div className="live-pick-value live-pick-empty">Not chosen</div>
              )}
              {!isPastDeadline && <div className="live-pick-change">tap to change</div>}
            </button>

            <button
              className={`live-pick-card${isPastDeadline ? ' live-pick-card--locked' : ''}`}
              onClick={() => !isPastDeadline && setPickerTarget('scorer')}
            >
              <div className="live-pick-label">👟 Top Scorer</div>
              {goldenBoot ? (
                <div className="live-pick-value">
                  <span className="flag">{goldenBoot.flag}</span>
                  {goldenBoot.name}
                </div>
              ) : (
                <div className="live-pick-value live-pick-empty">Not chosen</div>
              )}
              {!isPastDeadline && <div className="live-pick-change">tap to change</div>}
            </button>
          </div>
        </div>
      )}

      {/* Group tabs */}
      <nav className="group-tabs">
        {groups.map(g => {
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

      {/* Main content */}
      <main>
        {activeTab === KO_TAB ? (
          <KnockoutStage
            groups={standingsGroups}
            knockoutResults={knockoutResults}
            onKnockoutResultsChange={setKnockoutResults}
            locked={!actualGroupStageComplete}
            actualGroups={hasActualResults ? actualGroups : undefined}
          />
        ) : activeTab === THIRD_TAB ? (
          <section>
            <h2>3rd Places</h2>
            <BestThirdTable teams={sortedThirds} groups={standingsGroups} />
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
            matchLocks={matchLocks}
            actualGroup={hasActualResults ? actualGroups.find(g => g.id === current.id) : undefined}
            useActualForStandings={hasActualResults}
            onScoreChange={(matchId, hs, as_) => handleScoreChange(current.id, matchId, hs, as_)}
            onManualRankingsChange={r => handleManualRankingsChange(current.id, r)}
          />
        ) : null}
      </main>

      {showWelcomeModal && (
        <WelcomeModal
          initialWinner={predWinner}
          initialScorer={goldenBoot}
          onSave={handleWelcomeSave}
          onLater={() => { markWelcomeSeen(); setShowWelcomeModal(false); }}
        />
      )}

      {pickerTarget && (
        <PickerModal
          target={pickerTarget}
          onSelectWinner={t => { setPredWinner(t); setPickerTarget(null); }}
          onSelectScorer={p => { setGoldenBoot(p); setPickerTarget(null); }}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}
