import { useState, useEffect, useRef } from 'react';
import HomePage from './components/HomePage';
import GameSetup from './components/GameSetup';
import GameBoard from './components/GameBoard';
import WinnerScreen from './components/WinnerScreen';
import Leaderboard from './components/Leaderboard';
import { saveLeaderboardEntry } from './services/leaderboardService';
import tabLogo from './assets/lukes_nfl_trivia_logo.png';

export default function App() {
  const [gameState, setGameState] = useState(null);
  const [setup, setSetup] = useState(null);
  const [view, setView] = useState('home');
  const savedRef = useRef(false);

  useEffect(() => {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = tabLogo;
  }, []);

  const handleStartGame = (config) => {
    setSetup(config);
    savedRef.current = false;
    setGameState({
      players: config.players.map((name, i) => ({ name, score: 0, order: i })),
      singlePlayer: config.singlePlayer ?? false,
      difficulty: config.difficulty ?? 'easy',
      winCondition: config.winCondition ?? 'targetScore',
      targetScore: config.targetScore ?? 10,
      numRounds: config.numRounds ?? 10,
      positionGroups: config.positionGroups ?? ['QB', 'RB', 'WR', 'TE'],
      minYear: config.minYear ?? 2000,
      maxYear: config.maxYear ?? new Date().getFullYear(),
      timerSeconds: config.timerSeconds ?? null,
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
    setView('setup');
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

  useEffect(() => {
    if (!gameState?.singlePlayer || !winner || savedRef.current) return;
    savedRef.current = true;
    const totalRounds = gameState.numRounds ?? 10;
    saveLeaderboardEntry({
      player_name: (winner.name || '').trim(),
      score: winner.score,
      total_rounds: totalRounds,
      rounds_played: totalRounds,
      difficulty: gameState.difficulty ?? 'easy',
    }).catch((err) => console.error('Leaderboard save failed:', err));
  }, [gameState?.singlePlayer, gameState?.numRounds, gameState?.difficulty, winner]);

  const handleViewLeaderboard = () => {
    setGameState(null);
    setSetup(null);
    setView('leaderboard');
  };

  if (view === 'home') {
    return (
      <div className="app">
        <HomePage onPlayLuckOfTheDraw={() => setView('setup')} />
      </div>
    );
  }

  if (view === 'leaderboard') {
    return (
      <div className="app">
        <Leaderboard onBack={() => setView('setup')} />
      </div>
    );
  }

  return (
    <div className="app">
      {!gameState && (
        <GameSetup
          onStartGame={handleStartGame}
          onViewLeaderboard={handleViewLeaderboard}
          onBackToHome={() => setView('home')}
        />
      )}
      {gameState && (!winner || !gameState.showFinalScore) && (
        <GameBoard
          gameState={gameState}
          onGameStateChange={handleGameStateChange}
          onExitGame={handleEndGame}
        />
      )}
      {gameState && winner && gameState.showFinalScore && (
        <WinnerScreen
          winner={winner}
          players={gameState.players}
          singlePlayer={gameState.singlePlayer}
          onPlayAgain={handleEndGame}
          onViewLeaderboard={handleViewLeaderboard}
        />
      )}
    </div>
  );
}
