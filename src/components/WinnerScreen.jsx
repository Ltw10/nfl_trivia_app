export default function WinnerScreen({ winner, players, singlePlayer, onPlayAgain, onViewLeaderboard }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const totalRounds = 10;

  return (
    <div className="winner-screen">
      <h1>{singlePlayer ? 'Game over' : 'Winner'}</h1>
      <p className="winner-name">{winner.name}</p>
      {singlePlayer && (
        <p className="winner-score-summary">
          {winner.score}/{totalRounds}
        </p>
      )}
      <ul className="final-scores">
        {sorted.map((p) => (
          <li key={p.name}>
            <span>{p.name}</span>
            <span>{singlePlayer ? `${p.score}/${totalRounds}` : p.score}</span>
          </li>
        ))}
      </ul>
      <div className="winner-actions">
        {singlePlayer && onViewLeaderboard && (
          <button type="button" className="winner-leaderboard" onClick={onViewLeaderboard}>
            View leaderboard
          </button>
        )}
        <button type="button" onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}
