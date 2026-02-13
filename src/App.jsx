import { useState } from 'react';
import GameSetup from './components/GameSetup';
import GameBoard from './components/GameBoard';
import WinnerScreen from './components/WinnerScreen';

export default function App() {
  const [gameState, setGameState] = useState(null);
  const [setup, setSetup] = useState(null);

  const handleStartGame = (config) => {
    setSetup(config);
    setGameState({
      players: config.players.map((name, i) => ({ name, score: 0, order: i })),
      winCondition: config.winCondition ?? 'targetScore',
      targetScore: config.targetScore ?? 10,
      numRounds: config.numRounds ?? 10,
      positionGroups: config.positionGroups ?? ['QB', 'RB', 'WR', 'TE'],
      minYear: config.minYear ?? 2000,
      maxYear: config.maxYear ?? new Date().getFullYear(),
      currentPlayerIndex: 0,
      round: 0,
      phase: 'spinning',
      wheelResult: null,
      sessionId: null,
    });
  };

  const handleGameStateChange = (nextState) => {
    setGameState(nextState);
  };

  const handleEndGame = () => {
    setGameState(null);
    setSetup(null);
  };

  const winner = (() => {
    if (!gameState?.players?.length) return null;
    if (gameState.winCondition === 'numRounds') {
      if ((gameState.round ?? 0) < (gameState.numRounds ?? 10)) return null;
      const maxScore = Math.max(...gameState.players.map((p) => p.score));
      return gameState.players.find((p) => p.score === maxScore) ?? null;
    }
    return gameState.players.find((p) => p.score >= (gameState?.targetScore ?? 10)) ?? null;
  })();

  return (
    <div className="app">
      {!gameState && <GameSetup onStartGame={handleStartGame} />}
      {gameState && !winner && (
        <GameBoard
          gameState={gameState}
          onGameStateChange={handleGameStateChange}
          onExitGame={handleEndGame}
        />
      )}
      {gameState && winner && (
        <WinnerScreen
          winner={winner}
          players={gameState.players}
          onPlayAgain={handleEndGame}
        />
      )}
    </div>
  );
}
