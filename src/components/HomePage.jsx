import { Link } from 'react-router-dom';
import logo from '../assets/lukes_nfl_trivia_logo.png';

export default function HomePage() {
  return (
    <div className="home-page">
      <img
        src={logo}
        alt="Luke's NFL Trivia Games"
        className="home-page-logo"
      />
      <h1 className="home-page-title">Luke's NFL Trivia Games</h1>
      <div className="home-page-games">
        <Link to="/luck-of-the-draw" className="home-page-game-link">
          Luck of the Draw
        </Link>
      </div>
    </div>
  );
}
