import { Link } from 'react-router-dom';
import logo from '../assets/lukes_nfl_trivia_logo.png';
import { SHOW_DAILY_CHALLENGE } from '../utils/featureFlags';

export default function HomePage() {
  return (
    <div className="home-page">
      <img
        src={logo}
        alt="Sports Trivia"
        className="home-page-logo"
      />
      <h1 className="home-page-title">Sports Trivia</h1>
      <div className="home-page-games">
        <Link to="/luck-of-the-draw" className="home-page-game-link">
          NFL Luck of the Draw
        </Link>
        {SHOW_DAILY_CHALLENGE && (
          <Link to="/daily" className="home-page-game-link">
            Daily Challenge
          </Link>
        )}
      </div>
    </div>
  );
}
