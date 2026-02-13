import { useState } from 'react';
import { DEFAULT_YEAR_MIN, DEFAULT_YEAR_MAX, POSITION_GROUPS } from '../utils/constants';
import nflLogo from '../assets/nfl_logo.png';

const DEFAULT_POSITION_GROUPS = ['QB', 'RB', 'WR', 'TE'];

export default function GameSetup({ onStartGame }) {
  const [players, setPlayers] = useState(['']);
  const [winCondition, setWinCondition] = useState('targetScore');
  const [targetScore, setTargetScore] = useState(10);
  const [numRounds, setNumRounds] = useState(10);
  const [selectedPositionGroups, setSelectedPositionGroups] = useState(DEFAULT_POSITION_GROUPS);
  const [minYear, setMinYear] = useState(DEFAULT_YEAR_MIN);

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
    });
  };

  return (
    <div className="game-setup">
      <img
        src={nflLogo}
        alt="NFL"
        className="game-setup-nfl-logo"
      />
      <h1>Luck of the Draw Game</h1>

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
        <div className="position-groups">
          <span className="position-groups-label">Position groups (pick at least one)</span>
          <div className="position-groups-options">
            {POSITION_GROUPS.map(({ id, label }) => (
              <label key={id} className="position-group-checkbox">
                <input
                  type="checkbox"
                  checked={selectedPositionGroups.includes(id)}
                  onChange={() => togglePositionGroup(id)}
                />
                <span>{label}</span>
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
    </div>
  );
}
