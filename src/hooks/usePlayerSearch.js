import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Autocomplete search for any player in the DB whose name matches the query.
 * Does not filter by round (team/position/year) so users can get hints for any player.
 */
export function usePlayerSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nfl_trivia_app_players')
        .select('name')
        .ilike('name', `%${q}%`)
        .limit(50);
      if (!error && data) {
        const names = [...new Set(data.map((p) => p.name))].slice(0, 15);
        setSuggestions(names);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  return { query, setQuery, suggestions, setSuggestions, loading, search };
}
