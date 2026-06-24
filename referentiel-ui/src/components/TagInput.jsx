import { useState, useEffect, useRef } from 'react';
import { X, Tag, Plus } from 'lucide-react';
import api from '../api/axios';

const TAG_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#6B9B2D', '#14b8a6', '#3b82f6',
  '#2D4A5C', '#64748b',
];

const TagInput = ({ value = [], onChange, readOnly = false }) => {
  const [inputVal, setInputVal] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showPalette, setShowPalette] = useState(false);
  const [newColor, setNewColor] = useState(TAG_PALETTE[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowPalette(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const searchTags = async (q) => {
    if (!q.trim()) { setSuggestions([]); return; }
    try {
      const res = await api.get(`/tags/search?q=${encodeURIComponent(q)}`);
      // Filter out already selected tags
      const filtered = res.data.filter(t => !value.some(v => v.id === t.id));
      setSuggestions(filtered);
      setShowDropdown(true);
    } catch { setSuggestions([]); }
  };

  const handleInput = (e) => {
    setInputVal(e.target.value);
    searchTags(e.target.value);
  };

  const addTag = (tag) => {
    if (!value.some(t => t.id === tag.id)) {
      onChange([...value, tag]);
    }
    setInputVal('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const createTag = async () => {
    const name = inputVal.trim();
    if (!name) return;
    try {
      const res = await api.post('/tags', { name, color: newColor });
      addTag(res.data);
    } catch {
      // Tag might already exist — try to find it
      const res = await api.get(`/tags/search?q=${encodeURIComponent(name)}`);
      const existing = res.data.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (existing) addTag(existing);
    }
    setShowPalette(false);
  };

  const removeTag = (tagId) => {
    onChange(value.filter(t => t.id !== tagId));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (inputVal.trim()) {
        setShowPalette(true);
      }
    }
    if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      removeTag(value[value.length - 1].id);
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setShowPalette(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex flex-wrap gap-1.5 min-h-[42px] p-2 border border-slate-300 rounded-lg bg-white focus-within:ring-2 focus-within:border-primary-500 cursor-text"
        style={{ '--tw-ring-color': '#2D4A5C' }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing tags */}
        {value.map(tag => (
          <span
            key={tag.id}
            className="tag-badge"
            style={{
              background: tag.color ? `${tag.color}22` : '#f1f5f9',
              color: tag.color || '#64748b',
              borderColor: tag.color ? `${tag.color}44` : '#e2e8f0',
            }}
          >
            <Tag style={{ width: 10, height: 10 }} />
            {tag.name}
            {!readOnly && (
              <button
                className="tag-remove-btn"
                onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
                style={{ color: tag.color || '#64748b' }}
              >
                ×
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        {!readOnly && (
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => inputVal && setShowDropdown(true)}
            placeholder={value.length === 0 ? 'Ajouter des étiquettes...' : ''}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-slate-700 placeholder-slate-400"
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
          {suggestions.map(tag => (
            <button
              key={tag.id}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm"
              onClick={() => addTag(tag)}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: tag.color || '#64748b' }}
              />
              <span className="font-medium text-slate-700">{tag.name}</span>
            </button>
          ))}
          {inputVal.trim() && (
            <button
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm border-t border-slate-100"
              onClick={() => { setShowDropdown(false); setShowPalette(true); }}
            >
              <Plus style={{ width: 14, height: 14, color: '#6B9B2D' }} />
              <span style={{ color: '#6B9B2D' }} className="font-semibold">
                Créer « {inputVal.trim()} »
              </span>
            </button>
          )}
        </div>
      )}

      {/* Color picker palette for new tag */}
      {showPalette && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4 w-72">
          <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
            Choisir une couleur pour « {inputVal} »
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {TAG_PALETTE.map(color => (
              <button
                key={color}
                className="w-7 h-7 rounded-full transition-all hover:scale-110"
                style={{
                  background: color,
                  boxShadow: newColor === color ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'none'
                }}
                onClick={() => setNewColor(color)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => { setShowPalette(false); setInputVal(''); }}
            >
              Annuler
            </button>
            <button
              className="flex-1 px-3 py-1.5 text-sm font-semibold text-white rounded-lg transition-colors"
              style={{ background: newColor }}
              onClick={createTag}
            >
              Créer le tag
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagInput;
