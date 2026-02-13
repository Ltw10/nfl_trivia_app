export default function WinnerScreen({ winner, players, onPlayAgain }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="winner-screen">
      <h1>Winner</h1>
      <p className="winner-name">{winner.name}</p>
      <ul className="final-scores">
        {sorted.map((p) => (
          <li key={p.name}>
            <span>{p.name}</span>
            <span>{p.score}</span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
