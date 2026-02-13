import { useState, useRef, useEffect } from 'react';
import { usePlayerSearch } from '../hooks/usePlayerSearch';

export default function PlayerInput({ onSubmit }) {
  const { query, setQuery, suggestions, setSuggestions } = usePlayerSearch();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSuggestions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = (focusedIndex >= 0 && suggestions[focusedIndex] ? suggestions[focusedIndex] : query).trim();
    if (value) {
      onSubmit(value);
      setQuery('');
      setSuggestions([]);
      setFocusedIndex(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && suggestions[focusedIndex]) {
      e.preventDefault();
      onSubmit(suggestions[focusedIndex]);
      setQuery('');
      setSuggestions([]);
      setFocusedIndex(-1);
    }
  };

  return (
    <div className="player-input" ref={wrapperRef}>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFocusedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter player name..."
          autoComplete="off"
          aria-label="Player name"
        />
        <button type="submit">Submit</button>
      </form>
      {suggestions.length > 0 && (
        <ul className="suggestions-list" role="listbox">
          {suggestions.map((name, i) => (
            <li
              key={name + i}
              role="option"
              aria-selected={i === focusedIndex}
              className={`suggestion-item ${i === focusedIndex ? 'focused' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSubmit(name);
                setQuery('');
                setSuggestions([]);
              }}
              onMouseEnter={() => setFocusedIndex(i)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
