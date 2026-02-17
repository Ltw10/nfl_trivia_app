import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import LuckOfTheDrawGame from './components/LuckOfTheDrawGame';
import DailyLuckOfTheDraw from './components/DailyLuckOfTheDraw';
import tabLogo from './assets/lukes_nfl_trivia_logo.png';

export default function App() {
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

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={
          <div className="app">
            <HomePage />
          </div>
        } />
        <Route path="/luck-of-the-draw" element={<LuckOfTheDrawGame />} />
        <Route path="/daily" element={<DailyLuckOfTheDraw />} />
      </Routes>
    </HashRouter>
  );
}
