import { useCallback } from 'react';
import { fetchRandomPlayer, getPositionGroupsForWheel, getRandomYear } from '../services/gameLogic';
import { DEFAULT_YEAR_MIN, DEFAULT_YEAR_MAX } from '../utils/constants';

/**
 * Hook to advance game state: spin (pick team, position, year + fetch answer), submit answer, next turn.
 */
export function useGameState(gameState, onGameStateChange) {
  const positions = getPositionGroupsForWheel(gameState?.positionGroups);
  const yearMin = DEFAULT_YEAR_MIN;
  const yearMax = DEFAULT_YEAR_MAX;

  const spin = useCallback(async () => {
    if (!gameState || gameState.phase !== 'spinning') return;
    const teams = gameState.teamsForWheel || [];
    const team = teams[Math.floor(Math.random() * teams.length)] || 'ARI';
    const position = positions[Math.floor(Math.random() * positions.length)];
    const year = getRandomYear(yearMin, yearMax);
    const correctAnswer = await fetchRandomPlayer(team, position, year);
    onGameStateChange({
      ...gameState,
      phase: 'answering',
      wheelResult: { team, position, year },
      correctAnswer: correctAnswer || '',
    });
  }, [gameState, positions, yearMin, yearMax, onGameStateChange]);

  const submitAnswer = useCallback(
    (userAnswer, isCorrect) => {
      if (!gameState || gameState.phase !== 'answering') return;
      const players = [...gameState.players];
      const current = gameState.currentPlayerIndex;
      if (isCorrect) players[current].score += 1;
      const nextIndex = (current + 1) % players.length;
      const completedFullRound = nextIndex === 0;
      onGameStateChange({
        ...gameState,
        players,
        currentPlayerIndex: nextIndex,
        round: completedFullRound ? gameState.round + 1 : gameState.round,
        phase: 'spinning',
        correctAnswers: null,
        correctAnswerExample: null,
        lastRound: { userAnswer, correctAnswers: gameState.correctAnswers, isCorrect },
      });
    },
    [gameState, onGameStateChange]
  );
  return { spin, submitAnswer };
}
