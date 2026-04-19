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
  // pendingActions type kept for reference but derived from the sets below
  const [pendingPoisons, setPendingPoisons] = useState<Set<string>>(new Set());
  const [pendingProtects, setPendingProtects] = useState<Set<string>>(new Set());
  const [pendingKills, setPendingKills] = useState<Set<string>>(new Set());

  const nightLabel = isFirstNight ? 'Night 1 (First Night)' : `Night ${dayNumber}`;

  // Build ordered list of night steps
  const steps = useMemo(() => {
    const result: NightStep[] = [];
    for (const player of players) {
      if (!player.role || !player.alive) continue;

      // If player is the Drunk, use their cover role for night order
      // but mark them so the Storyteller knows to give false info
      if (player.role === 'drunk' && player.coverRole) {
        const coverRole = getRoleById(player.coverRole, customRoles);
        if (coverRole) {
          const order = isFirstNight ? (coverRole.firstNight || 0) : (coverRole.otherNights || 0);
          if (order > 0) {
            // Create a modified role entry that shows the cover role name but flags as Drunk
            const drunkRole: Role = {
              ...coverRole,
              name: `${coverRole.name} (DRUNK - give false info)`,
            };
            result.push({ order, role: drunkRole, player });
          }
        }
        continue;
      }

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
    if (!player) return;
    setPendingPoisons(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleProtectToggle = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    setPendingProtects(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleKill = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    setPendingKills(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const finalizeNight = () => {
    // Apply all pending actions
    for (const id of pendingPoisons) {
      const p = players.find(pl => pl.id === id);
      if (p) {
        onUpdatePlayer(id, { poisoned: true });
        onAddLogEntry(nightLabel, `${p.name} was poisoned`);
      }
    }
    for (const id of pendingProtects) {
      const p = players.find(pl => pl.id === id);
      if (p) {
        onUpdatePlayer(id, { protected: true });
        onAddLogEntry(nightLabel, `${p.name} was protected by Monk`);
      }
    }
    for (const id of pendingKills) {
      const p = players.find(pl => pl.id === id);
      if (!p) continue;
      if (pendingProtects.has(id)) {
        onAddLogEntry(nightLabel, `${p.name} was attacked but protected by the Monk`);
        continue;
      }
      const role = getRoleById(p.role || '', customRoles);
      if (role?.id === 'soldier' && !pendingPoisons.has(id) && !p.poisoned) {
        onAddLogEntry(nightLabel, `${p.name} (Soldier) was attacked but is safe from the Demon`);
        continue;
      }
      onUpdatePlayer(id, { alive: false });
      onAddLogEntry(nightLabel, `${p.name} was killed by the Demon`);
    }
    // Log night summary with all role actions
    const summaryLines: string[] = [];
    for (const step of steps) {
      const key = stepKey(step);
      if (completedSteps.has(key)) {
        const note = actionNotes[key];
        summaryLines.push(`${step.player.name} (${step.role.name})${note ? `: ${note}` : ''}`);
      }
    }
    if (summaryLines.length > 0) {
      onAddLogEntry(nightLabel, `Night summary:\n${summaryLines.join('\n')}`);
    }

    // Log who is alive going into day
    const aliveAfterNight = players.filter(p => p.alive && !pendingKills.has(p.id)).length
      + players.filter(p => pendingKills.has(p.id) && (pendingProtects.has(p.id) || (getRoleById(p.role || '', customRoles)?.id === 'soldier' && !pendingPoisons.has(p.id) && !p.poisoned))).length;
    onAddLogEntry(nightLabel, `${aliveAfterNight} players alive going into Day ${dayNumber}`);

    // Clear pending
    setPendingPoisons(new Set());
    setPendingProtects(new Set());
    setPendingKills(new Set());
    setCompletedSteps(new Set());
    setActiveStep(null);
    setActionNotes({});
    onStartDay();
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
    finalizeNight();
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
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    actionNotes[key] === `Master: ${p.name}` ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        );

      // === ALL DEMONS: kill picker ===
      case 'fang_gu':
      case 'no_dashii':
      case 'vigormortis':
      case 'vortox':
      case 'zombuul':
      case 'pukka':
      case 'shabaloth':
      case 'po':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose a player to kill:</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    handleKill(p.id);
                    setActionNotes(prev => ({ ...prev, [key]: `Killed ${p.name}` }));
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pendingKills.has(p.id) ? 'bg-red text-bg' : 'bg-surface2 text-fg hover:bg-red-dim'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {step.role.id === 'po' && (
              <div className="text-xs text-fg-dim mt-1 italic">Po: if you chose no-one last night, choose up to 3 tonight</div>
            )}
            {step.role.id === 'fang_gu' && (
              <div className="text-xs text-fg-dim mt-1 italic">Fang Gu: if first Outsider killed, they become Fang Gu and you die</div>
            )}
          </div>
        );

      // === WITCH (S&V): curse a player ===
      case 'witch':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose a player to curse (if nominated tomorrow, they die):</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => (
                <button
                  key={p.id}
                  onClick={() => setActionNotes(prev => ({ ...prev, [key]: `Cursed ${p.name}` }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    actionNotes[key] === `Cursed ${p.name}` ? 'bg-purple-600 text-white' : 'bg-surface2 text-fg hover:bg-purple-600/20'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        );

      // === INFO ROLES: pick players + show what to tell them ===
      case 'washerwoman': {
        // Show 2 players, one is a particular Townsfolk
        const townsfolk = players.filter(p => p.role && getRoleById(p.role, customRoles)?.type === 'townsfolk');
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Pick 2 players to show (1 must be a Townsfolk):</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => {
                const selected = (actionNotes[key] || '').includes(p.name);
                return (
                  <button key={p.id} onClick={() => {
                    const current = actionNotes[key] || '';
                    const names = current.split(', ').filter(Boolean);
                    if (selected) {
                      setActionNotes(prev => ({ ...prev, [key]: names.filter(n => n !== p.name).join(', ') }));
                    } else if (names.length < 2) {
                      setActionNotes(prev => ({ ...prev, [key]: [...names, p.name].join(', ') }));
                    }
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                  }`}>{p.name}{townsfolk.some(t => t.id === p.id) ? ' (TF)' : ''}</button>
                );
              })}
            </div>
            {actionNotes[key] && <div className="text-xs text-accent">Tell them: one of [{actionNotes[key]}] is the [Townsfolk role]</div>}
          </div>
        );
      }

      case 'librarian': {
        const outsiders = players.filter(p => p.role && getRoleById(p.role, customRoles)?.type === 'outsider');
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Pick 2 players to show (1 must be an Outsider, or say zero):</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => {
                const selected = (actionNotes[key] || '').includes(p.name);
                return (
                  <button key={p.id} onClick={() => {
                    const names = (actionNotes[key] || '').split(', ').filter(Boolean);
                    if (selected) setActionNotes(prev => ({ ...prev, [key]: names.filter(n => n !== p.name).join(', ') }));
                    else if (names.length < 2) setActionNotes(prev => ({ ...prev, [key]: [...names, p.name].join(', ') }));
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected ? 'bg-cyan-600 text-bg' : 'bg-surface2 text-fg hover:bg-cyan-600/20'
                  }`}>{p.name}{outsiders.some(t => t.id === p.id) ? ' (OS)' : ''}</button>
                );
              })}
            </div>
            {outsiders.length === 0 && <div className="text-xs text-cyan-400">No Outsiders in play -- tell them zero</div>}
            {actionNotes[key] && <div className="text-xs text-cyan-400">Tell them: one of [{actionNotes[key]}] is the [Outsider role]</div>}
          </div>
        );
      }

      case 'investigator': {
        const minions = players.filter(p => p.role && getRoleById(p.role, customRoles)?.type === 'minion');
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Pick 2 players to show (1 must be a Minion):</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => {
                const selected = (actionNotes[key] || '').includes(p.name);
                return (
                  <button key={p.id} onClick={() => {
                    const names = (actionNotes[key] || '').split(', ').filter(Boolean);
                    if (selected) setActionNotes(prev => ({ ...prev, [key]: names.filter(n => n !== p.name).join(', ') }));
                    else if (names.length < 2) setActionNotes(prev => ({ ...prev, [key]: [...names, p.name].join(', ') }));
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected ? 'bg-orange text-bg' : 'bg-surface2 text-fg hover:bg-orange-dim'
                  }`}>{p.name}{minions.some(t => t.id === p.id) ? ' (MN)' : ''}</button>
                );
              })}
            </div>
            {actionNotes[key] && <div className="text-xs text-orange">Tell them: one of [{actionNotes[key]}] is the [Minion role]</div>}
          </div>
        );
      }

      case 'fortune_teller':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">They pick 2 players. Is one the Demon?</div>
            <div className="flex flex-wrap gap-1.5">
              {players.map(p => {
                const selected = (actionNotes[key] || '').includes(p.name);
                const isDemon = getRoleById(p.role || '', customRoles)?.type === 'demon';
                return (
                  <button key={p.id} onClick={() => {
                    const names = (actionNotes[key] || '').split(', ').filter(Boolean);
                    if (selected) setActionNotes(prev => ({ ...prev, [key]: names.filter(n => n !== p.name).join(', ') }));
                    else if (names.length < 2) setActionNotes(prev => ({ ...prev, [key]: [...names, p.name].join(', ') }));
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                  }`}>{p.name}</button>
                );
              })}
            </div>
            {(() => {
              const names = (actionNotes[key] || '').split(', ').filter(Boolean);
              if (names.length === 2) {
                const hasDemon = names.some(n => {
                  const p = players.find(pl => pl.name === n);
                  return p && getRoleById(p.role || '', customRoles)?.type === 'demon';
                });
                const poisoned = step.player.poisoned || step.player.drunkPoisoned;
                return (
                  <div className={`text-xs ${poisoned ? 'text-orange' : 'text-accent'}`}>
                    Tell them: {poisoned ? (hasDemon ? 'No' : 'Yes') : (hasDemon ? 'Yes' : 'No')}
                    {poisoned ? ' (poisoned -- give false info)' : ''}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        );

      case 'empath': {
        const empIdx = players.findIndex(p => p.id === step.player.id);
        const alive = players.filter(p => p.alive);
        const empAlive = alive.findIndex(p => p.id === step.player.id);
        let evilCount = 0;
        if (empAlive >= 0 && alive.length > 1) {
          const left = alive[(empAlive - 1 + alive.length) % alive.length];
          const right = alive[(empAlive + 1) % alive.length];
          for (const n of [left, right]) {
            if (n && n.id !== step.player.id && getRoleById(n.role || '', customRoles)?.team === 'evil') evilCount++;
          }
        }
        const poisoned = step.player.poisoned || step.player.drunkPoisoned;
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">{step.role.ability}</div>
            <div className={`text-sm font-semibold ${poisoned ? 'text-orange' : 'text-accent'}`}>
              Tell them: {poisoned ? (evilCount === 0 ? '1' : '0') : evilCount}
              {poisoned ? ' (poisoned -- give false info)' : ''}
            </div>
          </div>
        );
      }

      // === INNKEEPER (BMR): protect 2 players, 1 is drunk ===
      case 'innkeeper':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose 2 players to protect (1 will be drunk until dusk):</div>
            <div className="flex flex-wrap gap-1.5">
              {alivePlayers.map(p => {
                const selected = (actionNotes[key] || '').includes(p.name);
                return (
                  <button key={p.id} onClick={() => {
                    const names = (actionNotes[key] || '').split(', ').filter(Boolean);
                    if (selected) setActionNotes(prev => ({ ...prev, [key]: names.filter(n => n !== p.name).join(', ') }));
                    else if (names.length < 2) {
                      setActionNotes(prev => ({ ...prev, [key]: [...names, p.name].join(', ') }));
                      handleProtectToggle(p.id);
                    }
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected ? 'bg-green text-bg' : 'bg-surface2 text-fg hover:bg-green-dim'
                  }`}>{p.name}</button>
                );
              })}
            </div>
          </div>
        );

      // === SAILOR (BMR): choose player, one of you is drunk ===
      case 'sailor':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose a player. Either you or they are drunk until dusk:</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => (
                <button key={p.id} onClick={() => setActionNotes(prev => ({ ...prev, [key]: `Chose ${p.name}` }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    actionNotes[key] === `Chose ${p.name}` ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                  }`}>{p.name}</button>
              ))}
            </div>
          </div>
        );

      // === EXORCIST (BMR): choose player (demon doesn't wake if chosen) ===
      case 'exorcist':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose a player (different from last night). If Demon, they learn who you are and don't wake:</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => (
                <button key={p.id} onClick={() => setActionNotes(prev => ({ ...prev, [key]: `Chose ${p.name}` }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    actionNotes[key] === `Chose ${p.name}` ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                  }`}>{p.name}</button>
              ))}
            </div>
          </div>
        );

      // === DREAMER (S&V): choose player, learn 1 good + 1 evil character ===
      case 'dreamer':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">They choose a player. Show them 1 good and 1 evil character (1 is correct):</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive && p.id !== step.player.id).map(p => {
                const role = getRoleById(p.role || '', customRoles);
                return (
                  <button key={p.id} onClick={() => setActionNotes(prev => ({ ...prev, [key]: `Chose ${p.name} (${role?.name || '?'})` }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (actionNotes[key] || '').includes(p.name) ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                    }`}>{p.name}</button>
                );
              })}
            </div>
            {actionNotes[key] && <div className="text-xs text-accent">Their actual role is noted. Show 1 good + 1 evil character.</div>}
          </div>
        );

      // === SNAKE CHARMER (S&V): choose player ===
      case 'snake_charmer':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose a player. If Demon, you swap characters. Otherwise you are poisoned:</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => {
                const isDemon = getRoleById(p.role || '', customRoles)?.type === 'demon';
                return (
                  <button key={p.id} onClick={() => setActionNotes(prev => ({ ...prev, [key]: `Chose ${p.name}${isDemon ? ' -- SWAP! They become Snake Charmer (poisoned), you become Demon' : ' -- poisoned'}` }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (actionNotes[key] || '').includes(p.name) ? (isDemon ? 'bg-red text-bg' : 'bg-orange text-bg') : 'bg-surface2 text-fg hover:bg-accent-dim'
                    }`}>{p.name}</button>
                );
              })}
            </div>
            {actionNotes[key] && <div className="text-xs text-fg-dim">{actionNotes[key]}</div>}
          </div>
        );

      default:
        // Generic: roles without special UI
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

      {/* Pending actions summary */}
      {(pendingPoisons.size > 0 || pendingProtects.size > 0 || pendingKills.size > 0) && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Pending (applied when night ends)</p>
          <div className="space-y-1 text-sm">
            {Array.from(pendingPoisons).map(id => {
              const p = players.find(pl => pl.id === id);
              return p ? <div key={`p-${id}`} className="text-purple-400">☠ {p.name} poisoned</div> : null;
            })}
            {Array.from(pendingProtects).map(id => {
              const p = players.find(pl => pl.id === id);
              return p ? <div key={`pr-${id}`} className="text-blue-400">🛡 {p.name} protected</div> : null;
            })}
            {Array.from(pendingKills).map(id => {
              const p = players.find(pl => pl.id === id);
              return p ? <div key={`k-${id}`} className="text-red-400">💀 {p.name} killed</div> : null;
            })}
          </div>
        </div>
      )}

      {/* Proceed to Day */}
      <button
        onClick={handleTransitionToDay}
        className="w-full py-4 bg-accent text-bg font-bold text-lg rounded-xl active:scale-[0.98] transition-transform"
      >
        End Night → Proceed to Day {dayNumber}
      </button>
    </div>
  );
}
