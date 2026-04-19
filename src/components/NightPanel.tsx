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
        onUpdatePlayer(id, { poisoned: true, poisonedUntil: 'dusk' });
        onAddLogEntry(nightLabel, `${p.name} was poisoned (until dusk)`);
      }
    }
    for (const id of pendingProtects) {
      const p = players.find(pl => pl.id === id);
      if (p) {
        onUpdatePlayer(id, { protected: true, protectedBy: 'monk' });
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

    // Warn if no action was recorded for roles that need one
    const needsAction = ['poisoner', 'monk', 'imp', 'fang_gu', 'no_dashii', 'vigormortis', 'vortox',
      'zombuul', 'pukka', 'shabaloth', 'po', 'witch', 'devils_advocate', 'butler',
      'washerwoman', 'librarian', 'investigator', 'fortune_teller', 'dreamer',
      'snake_charmer', 'innkeeper', 'sailor', 'exorcist', 'seamstress'];
    if (!note && needsAction.includes(step.role.id)) {
      if (!confirm(`No action recorded for ${step.player.name} (${step.role.name}). Mark as done anyway?`)) return;
    }

    setCompletedSteps(prev => new Set([...prev, key]));

    let logText = `${step.player.name} (${step.role.name})`;
    if (note) logText += `: ${note}`;
    else logText += ': No action taken';
    onAddLogEntry(nightLabel, logText);
  };

  const handleTransitionToDay = () => {
    finalizeNight();
  };

  // Status badges for player buttons so ST can see state at a glance
  const playerBadges = (p: Player) => {
    const badges: string[] = [];
    if (!p.alive) badges.push('\u2620');
    if (p.poisoned) badges.push('\u2623');
    if (p.drunkPoisoned) badges.push('\uD83C\uDF7A');
    if (p.protected) badges.push('\uD83D\uDEE1');
    if (p.cursed) badges.push('\uD83E\uDDD9');
    if (p.pendingExecution) badges.push('\u2694');
    if (pendingKills.has(p.id)) badges.push('\uD83D\uDC80');
    if (pendingPoisons.has(p.id)) badges.push('\u2623');
    if (pendingProtects.has(p.id)) badges.push('\uD83D\uDEE1');
    return badges.length > 0 ? ` ${badges.join('')}` : '';
  };

  const getRoleActionUI = (step: NightStep) => {
    const key = stepKey(step);
    const alivePlayers = players.filter(p => p.alive && p.id !== step.player.id);

    switch (step.role.id) {
      case 'poisoner':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose a player to poison (not yourself):</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive && p.id !== step.player.id).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    handlePoisonToggle(p.id);
                    setActionNotes(prev => ({ ...prev, [key]: `Poisoned ${p.name}` }));
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pendingPoisons.has(p.id) ? 'bg-orange text-bg' : 'bg-surface2 text-fg hover:bg-orange-dim'
                  }`}
                >
                  {p.name}{playerBadges(p)}
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
                  onClick={() => {
                    // Clear previous curse, set new one
                    players.forEach(pl => { if (pl.cursed) onUpdatePlayer(pl.id, { cursed: false }); });
                    onUpdatePlayer(p.id, { cursed: true });
                    setActionNotes(prev => ({ ...prev, [key]: `Cursed ${p.name}` }));
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    p.cursed || actionNotes[key] === `Cursed ${p.name}` ? 'bg-purple-600 text-white' : 'bg-surface2 text-fg hover:bg-purple-600/20'
                  }`}
                >
                  {p.name} {p.cursed ? '\u2620' : ''}
                </button>
              ))}
            </div>
          </div>
        );

      // === DEVIL'S ADVOCATE (BMR): protect from execution ===
      case 'devils_advocate':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Choose a player (different from last night): if executed tomorrow, they don't die:</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    players.forEach(pl => { if (pl.devilProtected) onUpdatePlayer(pl.id, { devilProtected: false }); });
                    onUpdatePlayer(p.id, { devilProtected: true });
                    setActionNotes(prev => ({ ...prev, [key]: `Protected ${p.name} from execution` }));
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    p.devilProtected || actionNotes[key]?.includes(p.name) ? 'bg-orange text-bg' : 'bg-surface2 text-fg hover:bg-orange-dim'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        );

      // === ASSASSIN (BMR): once per game kill ===
      case 'assassin':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">
              {step.player.usedAbility
                ? 'Ability already used this game.'
                : 'Once per game: choose a player, they die (bypasses all protection).'}
            </div>
            {!step.player.usedAbility && (
              <div className="flex flex-wrap gap-1.5">
                {players.filter(p => p.alive && p.id !== step.player.id).map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      handleKill(p.id);
                      onUpdatePlayer(step.player.id, { usedAbility: true });
                      setActionNotes(prev => ({ ...prev, [key]: `Assassinated ${p.name} (bypasses protection)` }));
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-surface2 text-fg hover:bg-red-dim transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      // === COURTIER (BMR): once per game, drunk for 3 nights ===
      case 'courtier':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">
              {step.player.usedAbility
                ? 'Ability already used this game.'
                : 'Once per game: choose a character, they are drunk for 3 nights & 3 days.'}
            </div>
            {!step.player.usedAbility && (
              <div className="flex flex-wrap gap-1.5">
                {players.filter(p => p.alive).map(p => {
                  const r = getRoleById(p.role || '', customRoles);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onUpdatePlayer(p.id, { drunkPoisoned: true, drunkUntil: `night_${dayNumber + 3}` });
                        onUpdatePlayer(step.player.id, { usedAbility: true });
                        setActionNotes(prev => ({ ...prev, [key]: `Made ${p.name} (${r?.name}) drunk for 3 nights` }));
                      }}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-surface2 text-fg hover:bg-purple-600/20 transition-colors"
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      // === PROFESSOR (BMR): once per game, resurrect a townsfolk ===
      case 'professor':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">
              {step.player.usedAbility
                ? 'Ability already used this game.'
                : 'Once per game: choose a dead player. If Townsfolk, they are resurrected.'}
            </div>
            {!step.player.usedAbility && (
              <div className="flex flex-wrap gap-1.5">
                {players.filter(p => !p.alive).map(p => {
                  const r = getRoleById(p.role || '', customRoles);
                  const isTownsfolk = r?.type === 'townsfolk';
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (isTownsfolk) {
                          onUpdatePlayer(p.id, { alive: true });
                          onAddLogEntry(nightLabel, `${p.name} was resurrected by the Professor`);
                        }
                        onUpdatePlayer(step.player.id, { usedAbility: true });
                        setActionNotes(prev => ({ ...prev, [key]: `Chose ${p.name}${isTownsfolk ? ' -- resurrected!' : ' -- not Townsfolk, nothing happens'}` }));
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isTownsfolk ? 'bg-surface2 text-fg hover:bg-green-dim' : 'bg-surface2 text-fg hover:bg-surface'
                      }`}
                    >
                      {p.name} {isTownsfolk ? '(TF)' : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      // === GAMBLER (BMR): guess character or die ===
      case 'gambler':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">They choose a player and guess their character. Wrong guess = death.</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => {
                const r = getRoleById(p.role || '', customRoles);
                return (
                  <button
                    key={p.id}
                    onClick={() => setActionNotes(prev => ({ ...prev, [key]: `Guessed ${p.name} is ${r?.name || '?'}` }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (actionNotes[key] || '').includes(p.name) ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
            {actionNotes[key] && <div className="text-xs text-fg-dim">If they guessed wrong, they die. Record the guess above.</div>}
          </div>
        );

      // === GOSSIP (BMR): true statement kills ===
      case 'gossip':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Did their public statement today turn out to be true? If yes, choose who dies:</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    handleKill(p.id);
                    setActionNotes(prev => ({ ...prev, [key]: `Statement was true -- ${p.name} dies` }));
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pendingKills.has(p.id) ? 'bg-red text-bg' : 'bg-surface2 text-fg hover:bg-red-dim'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setActionNotes(prev => ({ ...prev, [key]: 'Statement was false -- no one dies' }))}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                actionNotes[key]?.includes('false') ? 'bg-green text-bg' : 'bg-surface2 text-fg-dim hover:text-fg'
              }`}
            >
              Statement was false
            </button>
          </div>
        );

      // === SEAMSTRESS (S&V): once per game, 2 players same alignment? ===
      case 'seamstress':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">
              {step.player.usedAbility
                ? 'Ability already used this game.'
                : 'Once per game: choose 2 players, learn if same alignment.'}
            </div>
            {!step.player.usedAbility && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {players.filter(p => p.alive && p.id !== step.player.id).map(p => {
                    const selected = (actionNotes[key] || '').includes(p.name);
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
                    const p1 = players.find(p => p.name === names[0]);
                    const p2 = players.find(p => p.name === names[1]);
                    if (p1 && p2) {
                      const t1 = getRoleById(p1.role || '', customRoles)?.team;
                      const t2 = getRoleById(p2.role || '', customRoles)?.team;
                      const same = t1 === t2;
                      const poisoned = step.player.poisoned || step.player.drunkPoisoned;
                      return (
                        <div className={`text-xs ${poisoned ? 'text-orange' : 'text-accent'}`}>
                          Tell them: {poisoned ? (same ? 'Different' : 'Same') : (same ? 'Same' : 'Different')} alignment
                          {poisoned ? ' (poisoned)' : ''}
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
              </>
            )}
          </div>
        );

      // === UNDERTAKER (TB): learn who died by execution ===
      case 'undertaker': {
        const executedToday = players.find(p => p.pendingExecution || (!p.alive && p.role));
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">You learn which character died by execution today.</div>
            {executedToday ? (
              <div className="text-sm text-accent font-semibold">
                Tell them: {getRoleById(executedToday.role || '', customRoles)?.name || 'Unknown'}
                {(step.player.poisoned || step.player.drunkPoisoned) ? ' (poisoned -- give false info!)' : ''}
              </div>
            ) : (
              <div className="text-xs text-fg-dim">No one was executed today.</div>
            )}
          </div>
        );
      }

      // === RAVENKEEPER (TB): if died tonight, learn a character ===
      case 'ravenkeeper':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">If you died tonight, choose a player to learn their character:</div>
            <div className="flex flex-wrap gap-1.5">
              {players.map(p => {
                const r = getRoleById(p.role || '', customRoles);
                return (
                  <button key={p.id} onClick={() => {
                    const poisoned = step.player.poisoned || step.player.drunkPoisoned;
                    setActionNotes(prev => ({ ...prev, [key]: `Chose ${p.name}: ${poisoned ? '[give false character]' : r?.name || '?'}` }));
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (actionNotes[key] || '').includes(p.name) ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                  }`}>{p.name}</button>
                );
              })}
            </div>
            {actionNotes[key] && <div className="text-xs text-accent">{actionNotes[key]}</div>}
          </div>
        );

      // === CHEF (TB): how many pairs of evil ===
      case 'chef': {
        const aliveSorted = players.filter(p => p.alive);
        let pairs = 0;
        for (let i = 0; i < aliveSorted.length; i++) {
          const curr = getRoleById(aliveSorted[i].role || '', customRoles);
          const next = getRoleById(aliveSorted[(i + 1) % aliveSorted.length].role || '', customRoles);
          if (curr?.team === 'evil' && next?.team === 'evil') pairs++;
        }
        const poisoned = step.player.poisoned || step.player.drunkPoisoned;
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">{step.role.ability}</div>
            <div className={`text-sm font-semibold ${poisoned ? 'text-orange' : 'text-accent'}`}>
              Tell them: {poisoned ? (pairs === 0 ? '1' : Math.max(0, pairs - 1)) : pairs} pair{pairs !== 1 ? 's' : ''}
              {poisoned ? ' (poisoned)' : ''}
            </div>
          </div>
        );
      }

      // === CLOCKMAKER (S&V): steps from demon to nearest minion ===
      case 'clockmaker': {
        const aliveSorted = players.filter(p => p.alive);
        const demonIdx = aliveSorted.findIndex(p => getRoleById(p.role || '', customRoles)?.type === 'demon');
        let minSteps = aliveSorted.length;
        if (demonIdx >= 0) {
          for (let i = 0; i < aliveSorted.length; i++) {
            if (getRoleById(aliveSorted[i].role || '', customRoles)?.type === 'minion') {
              const cw = (i - demonIdx + aliveSorted.length) % aliveSorted.length;
              const ccw = (demonIdx - i + aliveSorted.length) % aliveSorted.length;
              minSteps = Math.min(minSteps, cw, ccw);
            }
          }
        }
        const poisoned = step.player.poisoned || step.player.drunkPoisoned;
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">{step.role.ability}</div>
            <div className={`text-sm font-semibold ${poisoned ? 'text-orange' : 'text-accent'}`}>
              Tell them: {poisoned ? Math.max(1, minSteps + 1) : minSteps} step{minSteps !== 1 ? 's' : ''}
              {poisoned ? ' (poisoned)' : ''}
            </div>
          </div>
        );
      }

      // === GRANDMOTHER (BMR): know a good player ===
      case 'grandmother': {
        const goodPlayers = players.filter(p => p.alive && p.id !== step.player.id && getRoleById(p.role || '', customRoles)?.team === 'good');
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Pick a good player to reveal to the Grandmother (if Demon kills them, Grandmother dies too):</div>
            <div className="flex flex-wrap gap-1.5">
              {goodPlayers.map(p => {
                const r = getRoleById(p.role || '', customRoles);
                return (
                  <button key={p.id} onClick={() => setActionNotes(prev => ({ ...prev, [key]: `Told: ${p.name} is the ${r?.name}` }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (actionNotes[key] || '').includes(p.name) ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                    }`}>{p.name} ({r?.name})</button>
                );
              })}
            </div>
            {actionNotes[key] && <div className="text-xs text-accent">{actionNotes[key]}</div>}
          </div>
        );
      }

      // === CHAMBERMAID (BMR): how many of 2 players woke ===
      case 'chambermaid':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">They choose 2 alive players. Count how many woke tonight due to their ability:</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive && p.id !== step.player.id).map(p => {
                const selected = (actionNotes[key] || '').includes(p.name);
                const r = getRoleById(p.role || '', customRoles);
                const wakes = (r?.otherNights ?? 0) > 0;
                return (
                  <button key={p.id} onClick={() => {
                    const names = (actionNotes[key] || '').split(', ').filter(Boolean);
                    if (selected) setActionNotes(prev => ({ ...prev, [key]: names.filter(n => n !== p.name).join(', ') }));
                    else if (names.length < 2) setActionNotes(prev => ({ ...prev, [key]: [...names, p.name].join(', ') }));
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                  }`}>{p.name} {wakes ? '(wakes)' : ''}</button>
                );
              })}
            </div>
            {(() => {
              const names = (actionNotes[key] || '').split(', ').filter(Boolean);
              if (names.length === 2) {
                const count = names.filter(n => {
                  const p = players.find(pl => pl.name === n);
                  if (!p) return false;
                  const r = getRoleById(p.role || '', customRoles);
                  return (r?.otherNights ?? 0) > 0;
                }).length;
                const poisoned = step.player.poisoned || step.player.drunkPoisoned;
                return <div className={`text-xs ${poisoned ? 'text-orange' : 'text-accent'}`}>Tell them: {poisoned ? (count === 0 ? 1 : 0) : count}{poisoned ? ' (poisoned)' : ''}</div>;
              }
              return null;
            })()}
          </div>
        );

      // === LUNATIC (BMR): thinks they're demon, show them kills ===
      case 'lunatic':
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">The Lunatic thinks they are the Demon. Let them choose a "kill" (nothing happens):</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.alive).map(p => (
                <button key={p.id} onClick={() => setActionNotes(prev => ({ ...prev, [key]: `"Killed" ${p.name} (nothing happens)` }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (actionNotes[key] || '').includes(p.name) ? 'bg-red-dim text-red' : 'bg-surface2 text-fg hover:bg-red-dim'
                  }`}>{p.name}</button>
              ))}
            </div>
            {actionNotes[key] && <div className="text-xs text-fg-dim italic">{actionNotes[key]}</div>}
          </div>
        );

      // === INFO ROLES: pick players + show what to tell them ===
      case 'washerwoman': {
        const townsfolk = players.filter(p => p.role && getRoleById(p.role, customRoles)?.type === 'townsfolk' && p.id !== step.player.id);
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Pick 2 players to show (1 must be a Townsfolk). Not yourself.</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.id !== step.player.id).map(p => {
                const selected = (actionNotes[key] || '').includes(p.name);
                const role = getRoleById(p.role || '', customRoles);
                const isTF = role?.type === 'townsfolk';
                return (
                  <button key={p.id} onClick={() => {
                    const names = (actionNotes[key] || '').split(', ').filter(Boolean);
                    if (selected) setActionNotes(prev => ({ ...prev, [key]: names.filter(n => n !== p.name).join(', ') }));
                    else if (names.length < 2) setActionNotes(prev => ({ ...prev, [key]: [...names, p.name].join(', ') }));
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected ? 'bg-accent text-bg' : 'bg-surface2 text-fg hover:bg-accent-dim'
                  }`}>{p.name}{isTF ? ' (TF)' : ''}</button>
                );
              })}
            </div>
            {(() => {
              const names = (actionNotes[key] || '').split(', ').filter(Boolean);
              if (names.length === 2) {
                const tfPlayer = names.map(n => players.find(pl => pl.name === n)).find(pl => pl && getRoleById(pl.role || '', customRoles)?.type === 'townsfolk');
                const roleName = tfPlayer ? getRoleById(tfPlayer.role || '', customRoles)?.name : null;
                const poisoned = step.player.poisoned || step.player.drunkPoisoned;
                return <div className={`text-xs font-semibold ${poisoned ? 'text-orange' : 'text-accent'}`}>Tell them: one of [{names.join(', ')}] is the {poisoned ? '[give wrong role]' : (roleName || '[no TF selected]')}{poisoned ? ' (poisoned)' : ''}</div>;
              }
              return null;
            })()}
          </div>
        );
      }

      case 'librarian': {
        const outsiders = players.filter(p => p.role && getRoleById(p.role, customRoles)?.type === 'outsider' && p.id !== step.player.id);
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Pick 2 players to show (1 must be an Outsider). Not yourself.</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.id !== step.player.id).map(p => {
                const role = getRoleById(p.role || '', customRoles);
                const isOS = role?.type === 'outsider';
                const selected = (actionNotes[key] || '').includes(p.name);
                return (
                  <button key={p.id} onClick={() => {
                    const names = (actionNotes[key] || '').split(', ').filter(Boolean);
                    if (selected) setActionNotes(prev => ({ ...prev, [key]: names.filter(n => n !== p.name).join(', ') }));
                    else if (names.length < 2) setActionNotes(prev => ({ ...prev, [key]: [...names, p.name].join(', ') }));
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected ? 'bg-cyan-600 text-bg' : 'bg-surface2 text-fg hover:bg-cyan-600/20'
                  }`}>{p.name}{isOS ? ' (OS)' : ''}</button>
                );
              })}
            </div>
            {outsiders.length === 0 && <div className="text-xs text-cyan-400">No Outsiders in play -- tell them zero</div>}
            {(() => {
              const names = (actionNotes[key] || '').split(', ').filter(Boolean);
              if (names.length === 2) {
                const osPlayer = names.map(n => players.find(pl => pl.name === n)).find(pl => pl && getRoleById(pl.role || '', customRoles)?.type === 'outsider');
                const roleName = osPlayer ? getRoleById(osPlayer.role || '', customRoles)?.name : null;
                const poisoned = step.player.poisoned || step.player.drunkPoisoned;
                return <div className={`text-xs font-semibold ${poisoned ? 'text-orange' : 'text-cyan-400'}`}>Tell them: one of [{names.join(', ')}] is the {poisoned ? '[give wrong role]' : (roleName || '[no OS selected]')}{poisoned ? ' (poisoned)' : ''}</div>;
              }
              return null;
            })()}
          </div>
        );
      }

      case 'investigator': {
        return (
          <div className="space-y-2">
            <div className="text-xs text-fg-dim">Pick 2 players to show (1 must be a Minion). Not yourself.</div>
            <div className="flex flex-wrap gap-1.5">
              {players.filter(p => p.id !== step.player.id).map(p => {
                const role = getRoleById(p.role || '', customRoles);
                const isMN = role?.type === 'minion';
                const selected = (actionNotes[key] || '').includes(p.name);
                return (
                  <button key={p.id} onClick={() => {
                    const names = (actionNotes[key] || '').split(', ').filter(Boolean);
                    if (selected) setActionNotes(prev => ({ ...prev, [key]: names.filter(n => n !== p.name).join(', ') }));
                    else if (names.length < 2) setActionNotes(prev => ({ ...prev, [key]: [...names, p.name].join(', ') }));
                  }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected ? 'bg-orange text-bg' : 'bg-surface2 text-fg hover:bg-orange-dim'
                  }`}>{p.name}{isMN ? ' (MN)' : ''}</button>
                );
              })}
            </div>
            {(() => {
              const names = (actionNotes[key] || '').split(', ').filter(Boolean);
              if (names.length === 2) {
                const mnPlayer = names.map(n => players.find(pl => pl.name === n)).find(pl => pl && getRoleById(pl.role || '', customRoles)?.type === 'minion');
                const roleName = mnPlayer ? getRoleById(mnPlayer.role || '', customRoles)?.name : null;
                const poisoned = step.player.poisoned || step.player.drunkPoisoned;
                return <div className={`text-xs font-semibold ${poisoned ? 'text-orange' : 'text-orange'}`}>Tell them: one of [{names.join(', ')}] is the {poisoned ? '[give wrong role]' : (roleName || '[no MN selected]')}{poisoned ? ' (poisoned)' : ''}</div>;
              }
              return null;
            })()}
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
    <div className="p-4 pb-32 space-y-4">
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
