import { useEffect, useRef, useState } from 'react';
import Scoreboard from './Scoreboard';
import WheelSlot from './WheelSlot';
import PlayerInput from './PlayerInput';
import { useGameState } from '../hooks/useGameState';
import { getTeamList, getPositionGroupsForWheel, fetchPlayersForRound } from '../services/gameLogic';
import { TEAM_NAMES, getTeamLogoUrl } from '../utils/constants';
import { matchesAnyAnswer } from '../utils/validators';
import defaultUserImg from '../assets/default_user.webp';

export default function GameBoard({ gameState, onGameStateChange, onExitGame }) {
  const { spin, submitAnswer } = useGameState(gameState, onGameStateChange);
  const teamsLoaded = useRef(false);
  const spinRetryCount = useRef(0);
  const MAX_SPIN_RETRIES = 15;
  const [pendingWheel, setPendingWheel] = useState({ team: null, position: null, year: null });
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const timerIntervalRef = useRef(null);
  const submitAnswerRef = useRef(submitAnswer);
  submitAnswerRef.current = submitAnswer;

  // Load teams once for the wheel
  useEffect(() => {
    if (!gameState || teamsLoaded.current || gameState.teamsForWheel?.length) return;
    teamsLoaded.current = true;
    getTeamList().then((teams) => {
      if (teams?.length) {
        onGameStateChange({ ...gameState, teamsForWheel: teams });
      }
    });
  }, [gameState, onGameStateChange]);

  const teams = gameState?.teamsForWheel || [];
  const positions = getPositionGroupsForWheel(gameState?.positionGroups);
  const minYear = gameState?.minYear ?? 2000;
  const maxYear = gameState?.maxYear ?? new Date().getFullYear();
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  ).map(String);
  const phase = gameState?.phase || 'spinning';
  const wheelResult = gameState?.wheelResult;
  const currentPlayer = gameState?.players?.[gameState.currentPlayerIndex];
  const lastRound = gameState?.lastRound;
  const winner = (() => {
    if (!gameState?.players?.length) return null;
    if (gameState.winCondition === 'numRounds') {
      if ((gameState.round ?? 0) < (gameState.numRounds ?? 10)) return null;
      const maxScore = Math.max(...gameState.players.map((p) => p.score));
      return gameState.players.find((p) => p.score === maxScore) ?? null;
    }
    return gameState.players.find((p) => p.score >= (gameState?.targetScore ?? 10)) ?? null;
  })();
  const isLastRoundReview = winner && lastRound && !gameState?.showFinalScore;
  const timerSeconds = gameState?.timerSeconds ?? null;

  // Timer: start when user can type (answering phase), count down, auto-submit incorrect on 0
  useEffect(() => {
    if (phase !== 'answering' || !wheelResult || !timerSeconds) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimeRemaining(null);
      return;
    }
    setTimeRemaining(timerSeconds);
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev == null || prev <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          submitAnswerRef.current('', false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [phase, wheelResult?.team, wheelResult?.position, wheelResult?.year, timerSeconds]);

  const handleWheelComplete = (key) => (value) => {
    setPendingWheel((prev) => {
      const next = { ...prev, [key]: value };
      const done = next.team != null && next.position != null && next.year != null;
      if (done) {
        setIsWheelSpinning(false);
        fetchPlayersForRound(next.team, next.position, parseInt(next.year, 10)).then((correctAnswers) => {
          const answers = correctAnswers || [];
          if (answers.length === 0) {
            spinRetryCount.current += 1;
            if (spinRetryCount.current >= MAX_SPIN_RETRIES) {
              spinRetryCount.current = 0;
              onGameStateChange({ ...gameState, phase: 'spinning' });
              return;
            }
            setPendingWheel({ team: null, position: null, year: null });
            setIsWheelSpinning(true);
            return;
          }
          spinRetryCount.current = 0;
          console.log('[Luck of the Draw] Correct answers (by depth chart):', answers.map((p) => ({ depth_rank: p.depth_rank, name: p.name })));
          const example = answers[Math.floor(Math.random() * answers.length)].name;
          onGameStateChange({
            ...gameState,
            phase: 'answering',
            wheelResult: next,
            correctAnswers: answers,
            correctAnswerExample: example,
          });
        });
      }
      return next;
    });
  };

  const handleSpinClick = () => {
    spinRetryCount.current = 0;
    setPendingWheel({ team: null, position: null, year: null });
    setIsWheelSpinning(true);
    onGameStateChange({ ...gameState, phase: 'spinning_wheels', lastRound: null });
  };

  const handleSubmitAnswer = (userAnswer) => {
    const names = (gameState.correctAnswers || []).map((p) => (typeof p === 'string' ? p : p.name));
    const correct = matchesAnyAnswer(userAnswer, names);
    submitAnswer(userAnswer, correct);
  };

  const teamName = wheelResult?.team ? (TEAM_NAMES[wheelResult.team] || wheelResult.team) : '';
  const showWheels = (phase === 'spinning' && !lastRound) || phase === 'spinning_wheels';
  const showAnswerView = (phase === 'answering' && wheelResult) || (phase === 'spinning' && lastRound && wheelResult);

  const handleExitClick = () => setShowExitConfirm(true);
  const handleExitConfirmCancel = () => setShowExitConfirm(false);
  const handleExitConfirmExit = () => {
    setShowExitConfirm(false);
    onExitGame?.();
  };

  return (
    <div className="game-board">
      {showExitConfirm && (
        <div className="exit-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="exit-confirm-title">
          <div className="exit-confirm-modal">
            <h2 id="exit-confirm-title">Exit game?</h2>
            <p>Are you sure you want to exit? Your progress will be lost.</p>
            <div className="exit-confirm-actions">
              <button type="button" className="exit-confirm-cancel" onClick={handleExitConfirmCancel}>
                Cancel
              </button>
              <button type="button" className="exit-confirm-exit" onClick={handleExitConfirmExit}>
                Exit game
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="game-board-header">
        <div className="game-board-header-left">
          <span className="turn-indicator">Round { (gameState?.round ?? 0) + 1 }</span>
          <Scoreboard
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            targetScore={gameState.targetScore}
            winCondition={gameState.winCondition}
            numRounds={gameState.numRounds}
            round={gameState.round}
          />
        </div>
        <button type="button" className="exit-button" onClick={handleExitClick}>
          Exit game
        </button>
      </div>

      {showWheels && (
        <>
          <h2>Spin the wheel</h2>
          {teams.length > 0 ? (
            <>
              <div className="wheel-row">
                <WheelSlot
                  items={teams}
                  onComplete={handleWheelComplete('team')}
                  isSpinning={isWheelSpinning}
                  displayValue={phase === 'spinning' ? wheelResult?.team : undefined}
                  getLogoUrl={getTeamLogoUrl}
                />
                <WheelSlot
                  items={positions}
                  onComplete={handleWheelComplete('position')}
                  isSpinning={isWheelSpinning}
                  displayValue={phase === 'spinning' ? wheelResult?.position : undefined}
                />
                <WheelSlot
                  items={years}
                  onComplete={handleWheelComplete('year')}
                  isSpinning={isWheelSpinning}
                  displayValue={phase === 'spinning' ? wheelResult?.year != null ? String(wheelResult.year) : undefined : undefined}
                />
              </div>
              <button
                type="button"
                className="spin-button"
                onClick={handleSpinClick}
                disabled={isWheelSpinning}
              >
                Spin
              </button>
            </>
          ) : (
            <p className="wheel-loading">Loading teams…</p>
          )}
        </>
      )}

      {showAnswerView && (
        <>
          <h2>
            {phase === 'answering'
              ? `${currentPlayer?.name}'s turn (Turn ${Math.floor((gameState?.round ?? 0) / (gameState?.players?.length || 1)) + 1})`
              : 'Next round'}
          </h2>
          {phase === 'answering' && timerSeconds != null && (
            <div className="answer-timer" aria-live="polite" aria-atomic="true">
              Time: {timeRemaining != null ? timeRemaining : timerSeconds}s
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
          {phase === 'answering' ? (
            <div className="player-input-wrapper">
              <PlayerInput onSubmit={handleSubmitAnswer} />
            </div>
          ) : isLastRoundReview ? (
            <button
              type="button"
              className="spin-button continue-button"
              onClick={() => onGameStateChange({ ...gameState, showFinalScore: true })}
            >
              Continue
            </button>
          ) : (
            <button type="button" className="spin-button" onClick={handleSpinClick}>
              Spin
            </button>
          )}
        </>
      )}

      {lastRound && (
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
      )}
    </div>
  );
}
