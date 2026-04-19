import type { Tab } from '../types/game';

interface TabBarProps {
  current: Tab;
  onChange: (tab: Tab) => void;
  setupComplete: boolean;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'setup', label: 'Setup', icon: '⚙' },
  { id: 'game', label: 'Game', icon: '▶' },
  { id: 'players', label: 'Players', icon: '👥' },
  { id: 'log', label: 'Log', icon: '📜' },
];

export function TabBar({ current, onChange, setupComplete }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-bg-raised border-t border-border safe-bottom">
      <div className="flex">
        {TABS.map(tab => {
          const disabled = !setupComplete && tab.id !== 'setup';
          return (
            <button
              key={tab.id}
              onClick={() => !disabled && onChange(tab.id)}
              disabled={disabled}
              className={`flex-1 flex flex-col items-center py-2.5 px-1 transition-colors min-h-[56px] ${
                current === tab.id
                  ? 'text-accent'
                  : disabled
                  ? 'text-fg-dim opacity-40'
                  : 'text-fg-dim hover:text-fg'
              }`}
            >
              <span className="text-lg leading-none mb-0.5">{tab.icon}</span>
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
