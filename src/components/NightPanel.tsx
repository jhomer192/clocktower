import { useState, useMemo } from 'react';
import type { Player, Role } from '../types/game';
import { getRoleById } from '../data/roles';

interface NightPanelProps {
  players: Player[];
  isFirstNight: boolean;
  dayNumber: number;
  customRoles: Role[];
  onUpdatePlayer: (id: string, changes: Partial<Player>) => void;
  onAddLogEntry: (phase: string, text: string) => void;
  onStartDay: () => void;
}

interface NightStep {
  order: number;
  role: Role;
  player: Player;
}

export function NightPanel({
  players,
  isFirstNight,
  dayNumber,
  customRoles,
  onUpdatePlayer,
  onAddLogEntry,
  onStartDay,
}: NightPanelProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});

  const nightLabel = isFirstNight ? 'Night 1 (First Night)' : `Night ${dayNumber}`;

  // Build ordered list of night steps
  const steps = useMemo(() => {
    const result: NightStep[] = [];
    for (const player of players) {
      if (!player.role || !player.alive) continue;
      const role = getRoleById(player.role, customRoles);
      if (!role) continue;

      const order = isFirstNight ? (role.firstNight || 0) : (role.otherNights || 0);
      if (order > 0) {
        result.push({ order, role, player });
      }
    }

    // Special: Ravenkeeper triggers if they died this night
    // We'll show it in the list with a note

    result.sort((a, b) => a.order - b.order);
    return result;
  }, [players, isFirstNight, customRoles]);

  const stepKey = (step: NightStep) => `${step.role.id}-${step.player.id}`;

  const handlePoisonToggle = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      onUpdatePlayer(playerId, { poisoned: !player.poisoned });
      const action = player.poisoned ? 'un-poisoned' : 'poisoned';
      onAddLogEntry(nightLabel, `${player.name} was ${action}`);
    }
  };

  const handleProtectToggle = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      onUpdatePlayer(playerId, { protected: !player.protected });
      const action = player.protected ? 'unprotected' : 'protected by Monk';
      onAddLogEntry(nightLabel, `${player.name} was ${action}`);
    }
  };

  const handleKill = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      // Check if protected or Soldier
      if (player.protected) {
        onAddLogEntry(nightLabel, `${player.name} was attacked but protected by the Monk`);
        return;
      }
      const role = getRoleById(player.role || '', customRoles);
      if (role?.id === 'soldier' && !player.poisoned) {
        onAddLogEntry(nightLabel, `${player.name} (Soldier) was attacked but is safe from the Demon`);
        return;
      }
      onUpdatePlayer(playerId, { alive: false });
      onAddLogEntry(nightLabel, `${player.name} was killed by the Demon`);
    }
  };

  const handleCompleteStep = (step: NightStep) => {
    const key = stepKey(step);
    const note = actionNotes[key] || '';
    setCompletedSteps(prev => new Set([...prev, key]));

    let logText = `${step.player.name} (${step.role.name})`;
    if (note) logText += `: ${note}`;
    onAddLogEntry(nightLabel, logText);
  };

  const handleTransitionToDay = () => {
    setCompletedSteps(new Set());
    setActiveStep(null);
    setActionNotes({});
    onStartDay();
  };

  const getRoleActionUI = (step: NightStep) => {
    const key = stepKey(step);
    const alivePlayers = players.filter(p => p.alive && p.id !== step.player.id);

    switch (step.role.id) {
      case 'poisoner':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose a player to poison:</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    handlePoisonToggle(p.id);
                    setActionNotes(prev => ({ ...prev, [key]: `Poisoned ${p.name}` }));
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    p.poisoned ? 'bg-orange text-bg' : 'bg-surface2 text-fg hover:bg-orange-dim'
                  }`}
                >
                  {p.name} {p.poisoned ? '☠' : ''}
                </button>
              ))}
            </div>
          </div>
        );

      case 'monk':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose a player to protect (not yourself):</div>
            <div className="flex flex-wrap gap-1.5">
              {alivePlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    handleProtectToggle(p.id);
                    setActionNotes(prev => ({ ...prev, [key]: `Protected ${p.name}` }));
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    p.protected ? 'bg-green text-bg' : 'bg-surface2 text-fg hover:bg-green-dim'
                  }`}
                >
                  {p.name} {p.protected ? '🛡' : ''}
                </button>
              ))}
            </div>
          </div>
        );

      case 'imp':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose a player to kill:</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (p.id === step.player.id) {
                      // Imp starpass
                      onUpdatePlayer(p.id, { alive: false });
                      onAddLogEntry(nightLabel, `${p.name} (Imp) killed themselves — a Minion becomes the Imp`);
                      setActionNotes(prev => ({ ...prev, [key]: `Killed self (starpass)` }));
                    } else {
                      handleKill(p.id);
                      setActionNotes(prev => ({ ...prev, [key]: `Killed ${p.name}` }));
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    p.id === step.player.id
                      ? 'bg-surface2 text-red hover:bg-red-dim border border-red/30'
                      : 'bg-surface2 text-fg hover:bg-red-dim'
                  }`}
                >
                  {p.name} {p.id === step.player.id ? '(self)' : ''}
                </button>
              ))}
            </div>
          </div>
        );

      case 'butler':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose their master (they can only vote when their master votes):</div>
            <div className="flex flex-wrap gap-1.5">
              {alivePlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActionNotes(prev => ({ ...prev, [key]: `Master: ${p.name}` }));
                  }}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-surface2 text-fg hover:bg-accent-dim transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        // Generic: info roles, Fortune Teller, etc.
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">{step.role.ability}</div>
            <textarea
              value={actionNotes[key] || ''}
              onChange={e => setActionNotes(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder="Record what info you gave / what happened..."
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-fg-bright focus:border-accent focus:outline-none resize-none"
              rows={2}
            />
          </div>
        );
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-fg-bright">{nightLabel}</h2>
        <span className="text-sm text-fg-dim">
          {completedSteps.size}/{steps.length} done
        </span>
      </div>

      {steps.length === 0 ? (
        <div className="bg-surface rounded-xl p-6 text-center text-fg-dim">
          No night actions to resolve. Proceed to day.
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map((step, idx) => {
            const key = stepKey(step);
            const completed = completedSteps.has(key);
            const isActive = activeStep === key;

            return (
              <div
                key={key}
                className={`rounded-xl overflow-hidden border transition-colors ${
                  completed
                    ? 'bg-green-dim border-green/20'
                    : isActive
                    ? 'bg-surface border-accent/40'
                    : 'bg-surface border-border'
                }`}
              >
                <button
                  onClick={() => setActiveStep(isActive ? null : key)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <span className="text-fg-dim text-xs w-5 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg-bright text-sm">{step.player.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        step.role.team === 'evil' ? 'bg-red-dim text-red' : 'bg-accent-dim text-accent'
                      }`}>
                        {step.role.name}
                      </span>
                      {step.player.poisoned && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-orange-dim text-orange">Poisoned</span>
                      )}
                    </div>
                    {completed && actionNotes[key] && (
                      <div className="text-xs text-green mt-1">{actionNotes[key]}</div>
                    )}
                  </div>
                  <span className="text-fg-dim text-sm">{completed ? '✓' : isActive ? '▼' : '▸'}</span>
                </button>

                {isActive && !completed && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3">
                    {getRoleActionUI(step)}
                    <button
                      onClick={() => handleCompleteStep(step)}
                      className="mt-3 w-full py-2.5 bg-green text-bg font-semibold rounded-lg active:scale-[0.98] transition-transform"
                    >
                      Mark Done
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Proceed to Day */}
      <button
        onClick={handleTransitionToDay}
        className="w-full py-4 bg-accent text-bg font-bold text-lg rounded-xl active:scale-[0.98] transition-transform"
      >
        Proceed to Day {dayNumber} →
      </button>
    </div>
  );
}
