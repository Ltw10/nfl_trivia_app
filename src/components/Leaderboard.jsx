import { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/leaderboardService';

export default function Leaderboard({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getLeaderboard(20, difficulty)
      .then(setEntries)
      .catch((e) => setError(e?.message || 'Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, [difficulty]);

  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="leaderboard-screen">
      <h1>Leaderboard</h1>
      <p className="leaderboard-subtitle">Best score per player (10-round games). Tiebreak: fewer tries, then earlier.</p>

      <div className="leaderboard-difficulty-switcher" role="tablist" aria-label="Leaderboard difficulty">
        <button
          type="button"
          role="tab"
          aria-selected={difficulty === 'easy'}
          className={difficulty === 'easy' ? 'leaderboard-difficulty-btn active' : 'leaderboard-difficulty-btn'}
          onClick={() => setDifficulty('easy')}
        >
          Easy
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={difficulty === 'medium'}
          className={difficulty === 'medium' ? 'leaderboard-difficulty-btn active' : 'leaderboard-difficulty-btn'}
          onClick={() => setDifficulty('medium')}
        >
          Medium
        </button>
      </div>

      {loading && <p className="leaderboard-loading">Loading…</p>}
      {error && <p className="leaderboard-error">{error}</p>}
      {!loading && !error && (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4}>No scores yet. Play a single-player game!</td>
                </tr>
              ) : (
                entries.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.player_name}</td>
                    <td>{row.score}/{row.total_rounds}</td>
                    <td>{formatDate(row.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" className="leaderboard-back" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
