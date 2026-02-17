import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PlayerInput from './PlayerInput';
import { TEAM_NAMES, getTeamLogoUrl } from '../utils/constants';
import { matchesAnyAnswer } from '../utils/validators';
import { getCandidate, getDateKeyEST } from '../utils/dailyPuzzle';
import { fetchPlayersForRound } from '../services/gameLogic';
import { getDailyLeaderboard, submitDailyScore } from '../services/dailyLeaderboardService';
import defaultUserImg from '../assets/default_user.webp';

const DAILY_TIMER_SECONDS = 30;
const NUM_ROUNDS = 10;
const MAX_RESOLVE_ATTEMPTS = 80;

/** Try candidates for this round until we get one with roster data. Same order for everyone (deterministic). */
async function resolveRound(playDate, roundIndex) {
  for (let attempt = 0; attempt < MAX_RESOLVE_ATTEMPTS; attempt++) {
    const candidate = getCandidate(playDate, roundIndex, attempt);
    const answers = await fetchPlayersForRound(candidate.team, candidate.position, candidate.year);
    if (answers?.length > 0) {
      return { team: candidate.team, position: candidate.position, year: candidate.year, correctAnswers: answers };
    }
  }
  throw new Error(`Could not find a round with data for round ${roundIndex + 1}`);
}

function DailyGameBoard({ playDate, playerName, onComplete }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [roundPhase, setRoundPhase] = useState('loading'); // 'loading' | 'answering' | 'feedback'
  const [resolvedRound, setResolvedRound] = useState(null); // { team, position, year, correctAnswers }
  const [lastRound, setLastRound] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(DAILY_TIMER_SECONDS);
  const timerRef = useRef(null);
  const submitRef = useRef(null);

  const correctAnswers = resolvedRound?.correctAnswers ?? [];
  const wheelResult = resolvedRound
    ? { team: resolvedRound.team, position: resolvedRound.position, year: resolvedRound.year }
    : null;

  const submitAnswer = useCallback((userAnswer, isCorrect) => {
    const names = (correctAnswers || []).map((p) => (typeof p === 'string' ? p : p.name));
    const correct = isCorrect ?? (userAnswer ? matchesAnyAnswer(userAnswer, names) : false);
    setScore((s) => s + (correct ? 1 : 0));
    setLastRound({
      userAnswer: userAnswer || '',
      correctAnswers,
      isCorrect: correct,
    });
    setRoundPhase('feedback');
  }, [correctAnswers]);

  submitRef.current = submitAnswer;

  // Resolve this round: try deterministic candidates until one has roster data
  useEffect(() => {
    if (!playDate || roundIndex < 0 || roundIndex >= NUM_ROUNDS) return;
    setRoundPhase('loading');
    setLastRound(null);
    setResolvedRound(null);
    let cancelled = false;
    resolveRound(playDate, roundIndex).then((resolved) => {
      if (!cancelled) {
        setResolvedRound(resolved);
        setRoundPhase('answering');
        setTimeRemaining(DAILY_TIMER_SECONDS);
      }
    }).catch((err) => {
      if (!cancelled) {
        console.error(err);
        setRoundPhase('error');
      }
    });
    return () => { cancelled = true; };
  }, [playDate, roundIndex]);

  // Timer
  useEffect(() => {
    if (roundPhase !== 'answering' || !wheelResult) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setTimeRemaining(DAILY_TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev == null || prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          submitRef.current?.('', false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [roundPhase, wheelResult?.team, wheelResult?.position, wheelResult?.year]);

  const handleSubmit = (userAnswer) => {
    if (roundPhase !== 'answering') return;
    const names = correctAnswers.map((p) => (typeof p === 'string' ? p : p.name));
    const correct = matchesAnyAnswer(userAnswer, names);
    submitAnswer(userAnswer, correct);
  };

  const handleNext = () => {
    if (roundIndex + 1 >= NUM_ROUNDS) {
      onComplete(score + (lastRound?.isCorrect ? 1 : 0));
      return;
    }
    setRoundIndex((i) => i + 1);
  };

  const teamName = wheelResult?.team ? (TEAM_NAMES[wheelResult.team] || wheelResult.team) : '';
  const showFeedback = roundPhase === 'feedback' && lastRound != null;

  if (roundPhase === 'error') {
    return (
      <div className="game-board">
        <p className="wheel-loading">Could not load this round. Please try again later.</p>
      </div>
    );
  }
  if (!resolvedRound) return null;

  return (
    <div className="game-board">
      <div className="game-board-header">
        <div className="game-board-header-left">
          <span className="turn-indicator">Round {roundIndex + 1} of {NUM_ROUNDS}</span>
          <span className="daily-score">Score: {score}</span>
        </div>
      </div>

      <h2>{playerName}&apos;s turn</h2>
      {roundPhase === 'answering' && (
        <div className="answer-timer" aria-live="polite" aria-atomic="true">
          Time: {timeRemaining}s
        </div>
      )}
      <div className="question-cards-row">
        <div className="question-card question-card-team">
          <div className="label">Team</div>
          {wheelResult.team && getTeamLogoUrl(wheelResult.team) ? (
            <>
              <img
                src={getTeamLogoUrl(wheelResult.team)}
                alt=""
                className="question-card-team-logo"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="value">{teamName}</div>
            </>
          ) : (
            <div className="value">{teamName}</div>
          )}
        </div>
        <div className="question-card">
          <div className="label">Position</div>
          <div className="value">{wheelResult.position}</div>
        </div>
        <div className="question-card">
          <div className="label">Season</div>
          <div className="value">
            {wheelResult.year}–{String(Number(wheelResult.year) + 1).slice(-2)}
          </div>
        </div>
      </div>

      {roundPhase === 'loading' && <p className="wheel-loading">Loading…</p>}
      {roundPhase === 'answering' && (
        <div className="player-input-wrapper">
          <PlayerInput onSubmit={handleSubmit} />
        </div>
      )}

      {showFeedback && (
        <>
            <div className="result-feedback">
              <div className={`result-feedback-message ${lastRound.isCorrect ? 'correct' : 'incorrect'}`}>
                {lastRound.isCorrect ? 'Correct' : 'Incorrect'}
              </div>
              <div className="result-feedback-answers">
                <span>Correct answers:</span>
                <ol className="result-feedback-list">
                  {(lastRound.correctAnswers || []).length > 0
                    ? [...(lastRound.correctAnswers || [])]
                        .sort((a, b) => {
                          const ra = typeof a === 'object' && a?.depth_rank != null ? a.depth_rank : 999;
                          const rb = typeof b === 'object' && b?.depth_rank != null ? b.depth_rank : 999;
                          return ra - rb;
                        })
                        .map((p, i) => {
                          const name = typeof p === 'string' ? p : p.name;
                          const espnId = typeof p === 'object' ? p.espn_id : null;
                          const headshotUrl = espnId ? `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png` : null;
                          const imgSrc = headshotUrl || defaultUserImg;
                          return (
                            <li key={i} className="result-feedback-list-item">
                              <span className="result-feedback-list-item-inner">
                                <img
                                  src={imgSrc}
                                  alt=""
                                  className="result-feedback-headshot"
                                  onError={(e) => {
                                    if (e.target.src !== defaultUserImg) {
                                      e.target.src = defaultUserImg;
                                      e.target.onerror = null;
                                    }
                                  }}
                                />
                                <span>{name}</span>
                              </span>
                            </li>
                          );
                        })
                    : <li>—</li>}
                </ol>
              </div>
            </div>
          <button type="button" className="spin-button continue-button" onClick={handleNext}>
            {roundIndex + 1 >= NUM_ROUNDS ? 'See results' : 'Next round'}
          </button>
        </>
      )}
    </div>
  );
}

export default function DailyLuckOfTheDraw() {
  const navigate = useNavigate();
  const [view, setView] = useState('name'); // 'name' | 'game' | 'results'
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playDate, setPlayDate] = useState(null); // date when game started (same day for all 10 rounds)
  const [finalScore, setFinalScore] = useState(0);
  const [dailyLeaderboard, setDailyLeaderboard] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showLeaderboardOnStart, setShowLeaderboardOnStart] = useState(false);
  const [leaderboardLoadingOnStart, setLeaderboardLoadingOnStart] = useState(false);
  const [leaderboardLoadError, setLeaderboardLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [startError, setStartError] = useState(null);
  const [startChecking, setStartChecking] = useState(false);
  const submittedRef = useRef(false);

  const handleStartDaily = () => {
    if (startChecking) return;
    const first = firstName.trim();
    const last = lastName.trim();
    const full = `${first} ${last}`.trim();
    if (!full) return;
    setStartError(null);
    setStartChecking(true);
    const todayEST = getDateKeyEST(new Date());
    getDailyLeaderboard(todayEST)
      .then((list) => {
        const alreadyPlayed = (list || []).some(
          (row) => row.player_name.trim().toLowerCase() === full.toLowerCase()
        );
        if (alreadyPlayed) {
          setStartError('This name has already played today\'s challenge. Each player can only play once per day.');
          setStartChecking(false);
          return;
        }
        setPlayerName(full);
        setPlayDate(new Date());
        setView('game');
        setStartChecking(false);
      })
      .catch((err) => {
        console.error('Daily leaderboard check failed:', err);
        setStartError(err?.message || 'Could not verify leaderboard. Try again.');
        setStartChecking(false);
      });
  };

  const handleGameComplete = (score) => {
    setFinalScore(score);
    setView('results');
  };

  useEffect(() => {
    if (view !== 'results' || submittedRef.current) return;
    submittedRef.current = true;
    const playDateEST = getDateKeyEST(playDate);
    setSubmitting(true);
    setSubmitError(null);
    submitDailyScore({ playDate: playDateEST, player_name: playerName, score: finalScore })
      .then(() => getDailyLeaderboard(playDateEST))
      .then((data) => setDailyLeaderboard(data))
      .catch((err) => {
        console.error('Daily leaderboard submit/fetch failed:', err);
        setSubmitError(err?.message || 'Could not save score or load leaderboard.');
        getDailyLeaderboard(playDateEST).then(setDailyLeaderboard).catch(() => {});
      })
      .finally(() => setSubmitting(false));
  }, [view, playerName, finalScore]);

  useEffect(() => {
    if (view === 'results' && !submitting && playDate) {
      getDailyLeaderboard(getDateKeyEST(playDate)).then(setDailyLeaderboard).catch(() => {});
    }
  }, [view, submitting, playDate]);

  // Fetch today's leaderboard when user toggles it on the start screen
  useEffect(() => {
    if (view === 'name' && showLeaderboardOnStart) {
      setLeaderboardLoadingOnStart(true);
      setLeaderboardLoadError(null);
      getDailyLeaderboard(getDateKeyEST(new Date()))
        .then((data) => {
          setDailyLeaderboard(data || []);
          setLeaderboardLoadError(null);
        })
        .catch((err) => {
          console.error('Daily leaderboard fetch failed:', err);
          setDailyLeaderboard([]);
          setLeaderboardLoadError(err?.message || 'Could not load leaderboard.');
        })
        .finally(() => setLeaderboardLoadingOnStart(false));
    }
  }, [view, showLeaderboardOnStart]);

  if (view === 'name') {
    return (
      <div className="app">
        <div className="game-setup-wrapper">
          <header className="game-setup-header">
            <button type="button" className="game-setup-home-link" onClick={() => navigate('/')}>
              Home
            </button>
            <button
              type="button"
              className="game-setup-leaderboard-link"
              onClick={() => {
                setShowLeaderboardOnStart((v) => !v);
                if (showLeaderboardOnStart) setLeaderboardLoadError(null);
              }}
            >
              {showLeaderboardOnStart ? 'Hide today\'s leaderboard' : 'View today\'s leaderboard'}
            </button>
          </header>
          <div className="game-setup daily-setup">
            <h1>Daily Luck of the Draw</h1>
            <p className="daily-setup-desc">
              Same 10 spins for everyone today. Easy settings: QB, RB, WR • 2010–present • 30s per round.
            </p>
            <div className="daily-name-fields">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setStartError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('daily-last')?.focus()}
              />
              <input
                id="daily-last"
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setStartError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleStartDaily()}
              />
            </div>
            {startError && (
              <p className="daily-leaderboard-error" role="alert">
                {startError}
              </p>
            )}
            <button
              type="button"
              className="spin-button"
              onClick={handleStartDaily}
              disabled={startChecking}
            >
              {startChecking ? 'Checking…' : 'Start daily game'}
            </button>
            {showLeaderboardOnStart && (
              <>
                <h2 className="daily-results-leaderboard-title">Today&apos;s leaderboard (ET)</h2>
                {leaderboardLoadError && (
                  <p className="daily-leaderboard-error" role="alert">
                    {leaderboardLoadError} Make sure the daily leaderboard migration has been applied.
                  </p>
                )}
                <ul className="daily-leaderboard-list">
                  {leaderboardLoadingOnStart ? (
                    <li>Loading…</li>
                  ) : dailyLeaderboard.length === 0 && !leaderboardLoadError ? (
                    <li>No scores yet for today.</li>
                  ) : (
                    dailyLeaderboard.map((row, i) => (
                      <li key={`${row.player_name}-${row.created_at}`}>
                        <span className="daily-leaderboard-rank">{i + 1}.</span>
                        <span className="daily-leaderboard-name">{row.player_name}</span>
                        <span className="daily-leaderboard-score">{row.score}/{NUM_ROUNDS}</span>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'game' && playDate) {
    return (
      <div className="app">
        <DailyGameBoard
          playDate={playDate}
          playerName={playerName}
          onComplete={handleGameComplete}
        />
      </div>
    );
  }

  // results (leaderboard for the EST day they played)
  return (
    <div className="app">
      <div className="winner-screen">
        <h1>Daily challenge complete</h1>
        <p className="winner-name">{playerName}</p>
        <p className="winner-score-summary">{finalScore}/{NUM_ROUNDS}</p>
        <h2 className="daily-results-leaderboard-title">Today&apos;s leaderboard (ET)</h2>
        {submitError && (
          <p className="daily-leaderboard-error" role="alert">
            {submitError} Run the Supabase migration for the daily leaderboard if you haven&apos;t yet.
          </p>
        )}
        {submitting ? (
          <p>Saving score…</p>
        ) : (
          <ul className="daily-leaderboard-list">
            {dailyLeaderboard.length === 0 ? (
              <li>No scores yet for today.</li>
            ) : (
              dailyLeaderboard.map((row, i) => (
                <li key={`${row.player_name}-${row.created_at}`}>
                  <span className="daily-leaderboard-rank">{i + 1}.</span>
                  <span className="daily-leaderboard-name">{row.player_name}</span>
                  <span className="daily-leaderboard-score">{row.score}/{NUM_ROUNDS}</span>
                </li>
              ))
            )}
          </ul>
        )}
        <div className="winner-actions">
          <button type="button" className="winner-back-to-menu" onClick={() => navigate('/')}>
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
