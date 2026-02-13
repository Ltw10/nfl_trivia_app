export default function Scoreboard({ players, currentPlayerIndex, targetScore, winCondition, numRounds, round }) {
  const isRounds = winCondition === 'numRounds';
  return (
    <div className="scoreboard">
      {players.map((p, i) => (
        <div
          key={p.name + p.order}
          className={`player-chip ${i === currentPlayerIndex ? 'current' : ''}`}
        >
          <span>{p.name}</span>
          <span className="score">
            {isRounds ? p.score : `${p.score}/${targetScore}`}
          </span>
        </div>
      ))}
      {isRounds && (
        <span className="scoreboard-rounds" title="Rounds completed (each round = every player gets one turn)">
          Round {round ?? 0}/{numRounds ?? 10}
        </span>
      )}
    </div>
  );
}
