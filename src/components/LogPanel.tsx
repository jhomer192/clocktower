import type { LogEntry } from '../types/game';

interface LogPanelProps {
  log: LogEntry[];
  onRemoveLastLog: () => void;
}

export function LogPanel({ log, onRemoveLastLog }: LogPanelProps) {
  // Group by phase
  const grouped: { phase: string; entries: LogEntry[] }[] = [];
  for (const entry of log) {
    const last = grouped[grouped.length - 1];
    if (last && last.phase === entry.phase) {
      last.entries.push(entry);
    } else {
      grouped.push({ phase: entry.phase, entries: [entry] });
    }
  }

  return (
    <div className="p-4 pb-32 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-fg-bright">Game Log</h2>
        {log.length > 0 && (
          <button
            onClick={onRemoveLastLog}
            className="text-xs px-3 py-1.5 rounded bg-surface2 text-fg-dim hover:text-fg"
          >
            Undo Last
          </button>
        )}
      </div>

      {log.length === 0 ? (
        <div className="bg-surface rounded-xl p-6 text-center text-fg-dim">
          No events logged yet. Start the game to begin tracking.
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group, gi) => (
            <div key={gi} className="bg-surface rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-surface2 text-xs font-semibold text-fg-dim uppercase tracking-wide">
                {group.phase}
              </div>
              <div className="divide-y divide-border/50">
                {group.entries.map(entry => (
                  <div key={entry.id} className="px-4 py-2.5 text-sm text-fg">
                    <span className="text-fg-dim text-xs mr-2">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {entry.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
