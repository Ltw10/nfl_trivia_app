import { useState } from 'react';
import {
  DEFAULT_YEAR_MIN,
  DEFAULT_YEAR_MAX,
  POSITION_GROUPS,
  SINGLE_PLAYER_POSITIONS_EASY,
  SINGLE_PLAYER_POSITIONS_MEDIUM,
  SINGLE_PLAYER_YEAR_MIN_EASY,
  SINGLE_PLAYER_YEAR_MIN_MEDIUM,
  SINGLE_PLAYER_TIMER_SECONDS,
  TIMER_OPTIONS,
} from '../utils/constants';
import nflLogo from '../assets/National_Football_League_logo.svg.png';

const DEFAULT_POSITION_GROUPS = ['QB', 'RB', 'WR', 'TE'];

export default function GameSetup({ onStartGame, onViewLeaderboard, onBackToHome }) {
  const [setupMode, setSetupMode] = useState('quick');
  const [quickFirstName, setQuickFirstName] = useState('');
  const [quickLastName, setQuickLastName] = useState('');
  const [quickDifficulty, setQuickDifficulty] = useState('easy');
  const [players, setPlayers] = useState(['']);
  const [winCondition, setWinCondition] = useState('targetScore');
  const [targetScore, setTargetScore] = useState(10);
  const [numRounds, setNumRounds] = useState(10);
  const [selectedPositionGroups, setSelectedPositionGroups] = useState(DEFAULT_POSITION_GROUPS);
  const [minYear, setMinYear] = useState(DEFAULT_YEAR_MIN);
  const [timerSeconds, setTimerSeconds] = useState(null);
  const [tooltipPositionId, setTooltipPositionId] = useState(null);
  const [showGameModeTooltip, setShowGameModeTooltip] = useState(false);

  const addPlayer = () => setPlayers([...players, '']);

  const updatePlayer = (index, name) => {
    const updated = [...players];
    updated[index] = name;
    setPlayers(updated);
  };

  const togglePositionGroup = (id) => {
    setSelectedPositionGroups((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const startGame = () => {
    if (setupMode === 'quick') {
      const first = quickFirstName.trim();
      const last = quickLastName.trim();
      const fullName = `${first} ${last}`.trim();
      if (!fullName) return;
      onStartGame({
        singlePlayer: true,
        difficulty: quickDifficulty,
        players: [fullName],
        winCondition: 'numRounds',
        numRounds: 10,
        positionGroups:
          quickDifficulty === 'medium' ? SINGLE_PLAYER_POSITIONS_MEDIUM : SINGLE_PLAYER_POSITIONS_EASY,
        minYear: quickDifficulty === 'medium' ? SINGLE_PLAYER_YEAR_MIN_MEDIUM : SINGLE_PLAYER_YEAR_MIN_EASY,
        maxYear: DEFAULT_YEAR_MAX,
        timerSeconds: SINGLE_PLAYER_TIMER_SECONDS,
      });
      return;
    }
    const names = players.map((p) => p.trim()).filter(Boolean);
    if (names.length === 0) return;
    if (selectedPositionGroups.length === 0) return;
    onStartGame({
      players: names,
      winCondition,
      targetScore: Math.max(1, targetScore),
      numRounds: Math.max(1, numRounds),
      positionGroups: selectedPositionGroups,
      minYear: Math.min(Math.max(minYear, DEFAULT_YEAR_MIN), DEFAULT_YEAR_MAX),
      maxYear: DEFAULT_YEAR_MAX,
      timerSeconds: timerSeconds ?? null,
    });
  };

  return (
    <div className="game-setup-wrapper">
      <header className="game-setup-header">
        {onBackToHome && (
          <button
            type="button"
            className="game-setup-home-link"
            onClick={onBackToHome}
          >
            Home
          </button>
        )}
        {onViewLeaderboard && (
          <button
            type="button"
            className="game-setup-leaderboard-link"
            onClick={onViewLeaderboard}
          >
            View single player leaderboard
          </button>
        )}
      </header>
      <div className="game-setup">
        <img
          src={nflLogo}
          alt="NFL"
          className="game-setup-nfl-logo"
        />
        <h1>Luck of the Draw</h1>

        <div className="setup-mode-toggle">
        <span className="setup-mode-label-wrap">
          <span className="setup-mode-label">Game mode</span>
          <span
            className="position-group-info-wrap"
            onMouseEnter={() => setShowGameModeTooltip(true)}
            onMouseLeave={() => setShowGameModeTooltip(false)}
          >
            <span className="position-group-info-icon" aria-label="Single player scores are saved to the leaderboard.">i</span>
            {showGameModeTooltip && (
              <span className="position-group-tooltip" role="tooltip">
                Single player scores are saved to the leaderboard.
              </span>
            )}
          </span>
        </span>
        <div className="setup-mode-options">
          <label className={`setup-mode-option ${setupMode === 'quick' ? 'setup-mode-option-selected' : ''}`}>
            <input
              type="radio"
              name="setupMode"
              value="quick"
              checked={setupMode === 'quick'}
              onChange={() => setSetupMode('quick')}
            />
            <span>Single player</span>
          </label>
          <label className={`setup-mode-option ${setupMode === 'full' ? 'setup-mode-option-selected' : ''}`}>
            <input
              type="radio"
              name="setupMode"
              value="full"
              checked={setupMode === 'full'}
              onChange={() => setSetupMode('full')}
            />
            <span>Full setup</span>
          </label>
        </div>
      </div>

      {setupMode === 'quick' && (
        <div className="quick-setup">
          <div className="quick-name-fields">
            <label>
              First name
              <input
                type="text"
                value={quickFirstName}
                onChange={(e) => setQuickFirstName(e.target.value)}
                placeholder="First name"
                aria-label="First name"
              />
            </label>
            <label>
              Last name
              <input
                type="text"
                value={quickLastName}
                onChange={(e) => setQuickLastName(e.target.value)}
                placeholder="Last name"
                aria-label="Last name"
              />
            </label>
          </div>
          <div className="quick-difficulty">
            <span className="quick-difficulty-label">Difficulty</span>
            <div className="quick-difficulty-options">
              <label className="win-condition-option">
                <input
                  type="radio"
                  name="quickDifficulty"
                  value="easy"
                  checked={quickDifficulty === 'easy'}
                  onChange={() => setQuickDifficulty('easy')}
                />
                <span>Easy (QB, RB, WR)</span>
              </label>
              <label className="win-condition-option">
                <input
                  type="radio"
                  name="quickDifficulty"
                  value="medium"
                  checked={quickDifficulty === 'medium'}
                  onChange={() => setQuickDifficulty('medium')}
                />
                <span>Medium (+ TE, DEF)</span>
              </label>
            </div>
            <p className="quick-difficulty-seasons">
              Seasons: {quickDifficulty === 'easy' ? SINGLE_PLAYER_YEAR_MIN_EASY : SINGLE_PLAYER_YEAR_MIN_MEDIUM}–{DEFAULT_YEAR_MAX}
            </p>
          </div>
          <p className="quick-hint">10 rounds, 30 seconds per guess. Your score will be saved to the leaderboard.</p>
          <button type="button" onClick={startGame} disabled={!(`${quickFirstName.trim()} ${quickLastName.trim()}`.trim())}>
            Start game
          </button>
        </div>
      )}

      {setupMode === 'full' && (
        <>
      <div className="player-setup">
        <h2>Players</h2>
        {players.map((player, i) => (
          <input
            key={i}
            value={player}
            onChange={(e) => updatePlayer(i, e.target.value)}
            placeholder={`Player ${i + 1}`}
            type="text"
            aria-label={`Player ${i + 1}`}
          />
        ))}
        <button type="button" className="add-player" onClick={addPlayer}>
          + Add Player
        </button>
      </div>

      <div className="game-settings">
        <div className="win-condition">
          <span className="win-condition-label">Win condition</span>
          <div className="win-condition-options">
            <label className="win-condition-option">
              <input
                type="radio"
                name="winCondition"
                value="targetScore"
                checked={winCondition === 'targetScore'}
                onChange={() => setWinCondition('targetScore')}
              />
              <span>Target score</span>
            </label>
            <label className="win-condition-option">
              <input
                type="radio"
                name="winCondition"
                value="numRounds"
                checked={winCondition === 'numRounds'}
                onChange={() => setWinCondition('numRounds')}
              />
              <span>Turns per player</span>
            </label>
          </div>
        </div>
        {winCondition === 'targetScore' && (
          <label>
            Target score
            <input
              type="number"
              value={targetScore}
              onChange={(e) => setTargetScore(parseInt(e.target.value, 10) || 1)}
              min={1}
              max={99}
            />
          </label>
        )}
        {winCondition === 'numRounds' && (
          <label className="turns-per-player-label">
            Turns per player
            <input
              type="number"
              value={numRounds}
              onChange={(e) => setNumRounds(parseInt(e.target.value, 10) || 1)}
              min={1}
              max={99}
              aria-describedby="turns-per-player-hint"
            />
            <span id="turns-per-player-hint" className="input-hint">
              Each player gets this many turns. Most points after everyone has gone wins.
            </span>
          </label>
        )}
        <div className="timer-setting">
          <span className="win-condition-label">Timer per guess</span>
          <div className="win-condition-options">
            <label className="win-condition-option">
              <input
                type="radio"
                name="timerSeconds"
                checked={timerSeconds === null}
                onChange={() => setTimerSeconds(null)}
              />
              <span>No timer</span>
            </label>
            {TIMER_OPTIONS.map((sec) => (
              <label key={sec} className="win-condition-option">
                <input
                  type="radio"
                  name="timerSeconds"
                  checked={timerSeconds === sec}
                  onChange={() => setTimerSeconds(sec)}
                />
                <span>{sec}s</span>
              </label>
            ))}
          </div>
        </div>
        <div className="position-groups">
          <span className="position-groups-label">Position groups (pick at least one)</span>
          <div className="position-groups-options">
            {POSITION_GROUPS.map(({ id, label, title }) => (
              <label
                key={id}
                className="position-group-checkbox"
              >
                <input
                  type="checkbox"
                  checked={selectedPositionGroups.includes(id)}
                  onChange={() => togglePositionGroup(id)}
                />
                <span>{label}</span>
                {title && (
                  <span
                    className="position-group-info-wrap"
                    onMouseEnter={() => setTooltipPositionId(id)}
                    onMouseLeave={() => setTooltipPositionId(null)}
                  >
                    <span className="position-group-info-icon" aria-label={title}>i</span>
                    {tooltipPositionId === id && (
                      <span className="position-group-tooltip" role="tooltip">{title}</span>
                    )}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
        <label>
          Earliest season (year season started)
          <input
            type="number"
            value={minYear}
            onChange={(e) => setMinYear(parseInt(e.target.value, 10) || DEFAULT_YEAR_MIN)}
            min={DEFAULT_YEAR_MIN}
            max={DEFAULT_YEAR_MAX}
            title="e.g. 2024 = 2024 NFL season (2024–25)"
          />
          <span className="input-hint">
            Spins use seasons from this year through {DEFAULT_YEAR_MAX}. Season year is when the season started (e.g. 2024 = 2024–25 season).
          </span>
        </label>
      </div>

      <button type="button" onClick={startGame}>
        Start Game
      </button>
        </>
      )}
      </div>
    </div>
  );
}
