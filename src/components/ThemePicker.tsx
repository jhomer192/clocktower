import { useState, useEffect } from 'react';

const THEMES = [
  { id: 'tokyo-night', label: 'Tokyo Night', color: '#7aa2f7' },
  { id: 'miami', label: 'Miami', color: '#ff6ac1' },
  { id: 'matcha', label: 'Matcha', color: '#7ec87e' },
  { id: 'gruvbox', label: 'Gruvbox', color: '#fabd2f' },
] as const;

const STORAGE_KEY = 'clocktower-theme';

export function ThemePicker() {
  const [current, setCurrent] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'tokyo-night';
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', current);
    localStorage.setItem(STORAGE_KEY, current);
  }, [current]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface2 transition-colors"
        aria-label="Change theme"
      >
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: THEMES.find(t => t.id === current)?.color }}
        />
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-bg-raised border border-border rounded-lg shadow-lg overflow-hidden min-w-[160px]">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => { setCurrent(theme.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors text-left ${
                  current === theme.id ? 'bg-surface' : ''
                }`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.color }} />
                <span className="text-sm text-fg-bright">{theme.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
