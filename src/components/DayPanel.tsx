import { useState, useEffect, useRef, useCallback } from 'react';
import type { Player, Nomination, Role } from '../types/game';
import { getRoleById } from '../data/roles';

interface DayPanelProps {
  players: Player[];
  dayNumber: number;
  nominations: Nomination[];
  timerDuration: number;
  customRoles: Role[];
  onUpdatePlayer: (id: string, changes: Partial<Player>) => void;
  onAddNomination: (nom: Nomination) => void;
  onUpdateNomination: (index: number, changes: Partial<Nomination>) => void;
  onAddLogEntry: (phase: string, text: string) => void;
  onAdvanceToNextNight: () => void;
  onUpdate: (changes: { timerDuration: number }) => void;
  onSaveSnapshot: () => void;
  onEndGame: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DayPanel({
  players,
  dayNumber,
  nominations,
  timerDuration,
  customRoles,
  onUpdatePlayer,
  onAddNomination,
  onUpdateNomination,
  onAddLogEntry,
  onAdvanceToNextNight,
  onUpdate,
  onSaveSnapshot,
  onEndGame,
}: DayPanelProps) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [nominating, setNominating] = useState(false);
  const [nominator, setNominator] = useState('');
  const [nominee, setNominee] = useState('');
  const [votingIndex, setVotingIndex] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const dayLabel = `Day ${dayNumber}`;
  const alivePlayers = players.filter(p => p.alive);
  const aliveCount = alivePlayers.length;
  const executionThreshold = Math.floor(aliveCount / 2) + 1;

  // Timer
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, timeLeft]);

  const resetTimer = useCallback(() => {
    setTimerRunning(false);
    setTimeLeft(timerDuration);
  }, [timerDuration]);

  const handleNominate = () => {
    if (!nominator || !nominee) return;
    const nom: Nomination = {
      nominatorId: nominator,
      nomineeId: nominee,
      votes: [],
      executed: false,
    };
    onAddNomination(nom);
    const nPlayer = players.find(p => p.id === nominator);
    const ePlayer = players.find(p => p.id === nominee);
    onAddLogEntry(dayLabel, `${nPlayer?.name} nominated ${ePlayer?.name}`);
    setNominator('');
    setNominee('');
    setNominating(false);
    setVotingIndex(nominations.length); // open voting on new nomination
  };

  const toggleVote = (nomIdx: number, playerId: string) => {
    const nom = nominations[nomIdx];
    if (!nom) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    // Dead player with used ghost vote can't vote
    if (!player.alive && player.ghostVoteUsed) return;

    const hasVoted = nom.votes.includes(playerId);
    const newVotes = hasVoted
      ? nom.votes.filter(v => v !== playerId)
      : [...nom.votes, playerId];

    // If dead and voting, mark ghost vote used
    if (!player.alive && !hasVoted) {
      onUpdatePlayer(playerId, { ghostVoteUsed: true });
    } else if (!player.alive && hasVoted) {
      // Undo ghost vote
      onUpdatePlayer(playerId, { ghostVoteUsed: false });
    }

    onUpdateNomination(nomIdx, { votes: newVotes });
  };

  const handleExecute = (nomIdx: number) => {
    const nom = nominations[nomIdx];
    const player = players.find(p => p.id === nom.nomineeId);
    if (!player) return;

    // Save snapshot before execution (for undo)
    onSaveSnapshot();

    // Check for Saint
    const role = getRoleById(player.role || '', customRoles);

    // Mark as pending execution - they stay alive for voting today, die at night
    onUpdatePlayer(player.id, { pendingExecution: true });
    onUpdateNomination(nomIdx, { executed: true });
    onAddLogEntry(dayLabel, `${player.name} was executed (${nom.votes.length} votes) -- dies at dusk`);

    if (role?.id === 'saint') {
      onAddLogEntry(dayLabel, `${player.name} was the Saint! Good team loses!`);
    }

    setVotingIndex(null);
  };

  const handleSlayerAbility = (slayerPlayer: Player) => {
    // Slayer can target anyone alive
    const target = prompt(`${slayerPlayer.name} (Slayer) chooses a player. Enter their name:`);
    if (!target) return;
    const targetPlayer = players.find(p => p.name.toLowerCase() === target.toLowerCase() && p.alive);
    if (!targetPlayer) {
      onAddLogEntry(dayLabel, `${slayerPlayer.name} used Slayer ability — target not found`);
      return;
    }
    const targetRole = getRoleById(targetPlayer.role || '', customRoles);
    if (targetRole?.type === 'demon' && !slayerPlayer.poisoned) {
      onUpdatePlayer(targetPlayer.id, { alive: false });
      onAddLogEntry(dayLabel, `${slayerPlayer.name} (Slayer) shot ${targetPlayer.name} — they were the Demon and died!`);
    } else {
      onAddLogEntry(dayLabel, `${slayerPlayer.name} (Slayer) shot ${targetPlayer.name} — nothing happens`);
    }
  };

  const handleNoExecution = () => {
    onAddLogEntry(dayLabel, 'No execution today');
    // Check for Mayor win condition
    const mayor = players.find(p => p.alive && p.role === 'mayor' && !p.poisoned);
    if (mayor && aliveCount === 3) {
      onAddLogEntry(dayLabel, `${mayor.name} (Mayor) — only 3 alive and no execution. Good team wins!`);
    }
    onAdvanceToNextNight();
  };

  const handleProceedToNight = () => {
    onAdvanceToNextNight();
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <h2 className="text-xl font-bold text-fg-bright">Day {dayNumber}</h2>

      {/* Discussion Timer */}
      <div className="bg-surface rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-fg-dim">Discussion Timer</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdate({ timerDuration: Math.max(60, timerDuration - 60) })}
              className="w-8 h-8 rounded bg-surface2 text-fg-dim hover:text-fg text-sm"
            >
              -
            </button>
            <span className="text-xs text-fg-dim w-12 text-center">{timerDuration / 60}m</span>
            <button
              onClick={() => onUpdate({ timerDuration: timerDuration + 60 })}
              className="w-8 h-8 rounded bg-surface2 text-fg-dim hover:text-fg text-sm"
            >
              +
            </button>
          </div>
        </div>
        <div className={`text-4xl font-mono font-bold text-center mb-3 ${
          timeLeft <= 30 ? 'text-red' : timeLeft <= 60 ? 'text-yellow' : 'text-fg-bright'
        }`}>
          {formatTime(timeLeft)}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className={`flex-1 py-3 rounded-lg font-semibold text-bg transition-colors ${
              timerRunning ? 'bg-yellow' : 'bg-green'
            }`}
          >
            {timerRunning ? 'Pause' : timeLeft === 0 ? 'Done' : 'Start'}
          </button>
          <button
            onClick={resetTimer}
            className="px-4 py-3 rounded-lg bg-surface2 text-fg-dim hover:text-fg"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Slayer ability */}
      {alivePlayers.filter(p => {
        const r = getRoleById(p.role || '', customRoles);
        return r?.id === 'slayer';
      }).map(p => (
        <button
          key={p.id}
          onClick={() => handleSlayerAbility(p)}
          className="w-full py-3 bg-purple-dim border border-purple/30 rounded-xl text-purple font-semibold active:scale-[0.98] transition-transform"
        >
          {p.name} — Use Slayer Ability
        </button>
      ))}

      {/* Nominations */}
      <div className="bg-surface rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-fg-dim">
            Nominations ({nominations.length}) — Need {executionThreshold} votes to execute
          </span>
        </div>

        {/* Existing nominations */}
        <div className="space-y-3 mb-3">
          {nominations.map((nom, idx) => {
            const nominatorP = players.find(p => p.id === nom.nominatorId);
            const nomineeP = players.find(p => p.id === nom.nomineeId);
            const isVoting = votingIndex === idx;
            const passed = nom.votes.length >= executionThreshold;

            return (
              <div key={idx} className={`rounded-lg border p-3 ${
                nom.executed ? 'bg-red-dim border-red/30' : passed ? 'bg-yellow-dim border-yellow/30' : 'bg-bg border-border'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-fg-bright text-sm font-medium">{nominatorP?.name}</span>
                    <span className="text-fg-dim text-sm"> → </span>
                    <span className="text-fg-bright text-sm font-medium">{nomineeP?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${passed ? 'text-yellow' : 'text-fg-dim'}`}>
                      {nom.votes.length}/{executionThreshold}
                    </span>
                    {nom.votes.length > 0 && (() => {
                      const deadVotes = nom.votes.filter(vid => !players.find(p => p.id === vid)?.alive).length;
                      return deadVotes > 0 ? (
                        <span className="text-[10px] text-fg-dim">({deadVotes} 👻)</span>
                      ) : null;
                    })()}
                    {!nom.executed && (
                      <button
                        onClick={() => setVotingIndex(isVoting ? null : idx)}
                        className="text-xs px-2 py-1 rounded bg-surface2 text-fg-dim hover:text-fg"
                      >
                        {isVoting ? 'Close' : 'Votes'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Voting panel */}
                {isVoting && !nom.executed && (
                  <div className="border-t border-border/50 pt-2 mt-2">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {players.map(p => {
                        const voted = nom.votes.includes(p.id);
                        const canVote = p.alive || (!p.alive && !p.ghostVoteUsed);
                        return (
                          <button
                            key={p.id}
                            onClick={() => canVote && toggleVote(idx, p.id)}
                            disabled={!canVote && !voted}
                            className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                              voted
                                ? 'bg-accent text-bg'
                                : !canVote
                                ? 'bg-surface2 text-fg-dim opacity-30'
                                : 'bg-surface2 text-fg hover:bg-accent-dim'
                            } ${!p.alive ? 'italic' : ''}`}
                          >
                            {p.name}{!p.alive ? ' 👻' : ''}{voted ? ' ✓' : ''}{voted && !p.alive ? ' (dead)' : ''}
                          </button>
                        );
                      })}
                    </div>
                    {passed && (
                      <button
                        onClick={() => handleExecute(idx)}
                        className="w-full py-2.5 bg-red text-bg font-semibold rounded-lg active:scale-[0.98] transition-transform"
                      >
                        Execute {nomineeP?.name}
                      </button>
                    )}
                  </div>
                )}

                {nom.executed && (
                  <div className="text-red text-sm font-semibold">Executed</div>
                )}
              </div>
            );
          })}
        </div>

        {/* New nomination */}
        {nominating ? (
          <div className="border-t border-border pt-3 space-y-2">
            {(() => {
              // Players who have already nominated today can't nominate again
              const alreadyNominated = new Set(nominations.map(n => n.nominatorId));
              // Players who have already been nominated today can't be nominated again
              const alreadyNominee = new Set(nominations.map(n => n.nomineeId));
              const canNominate = alivePlayers.filter(p => !alreadyNominated.has(p.id));
              const canBeNominated = alivePlayers.filter(p => !alreadyNominee.has(p.id) && p.id !== nominator);
              return (
                <>
                  <select
                    value={nominator}
                    onChange={e => setNominator(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-3 text-fg-bright focus:border-accent focus:outline-none"
                  >
                    <option value="">Who is nominating?</option>
                    {canNominate.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={nominee}
                    onChange={e => setNominee(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-3 text-fg-bright focus:border-accent focus:outline-none"
                  >
                    <option value="">Who is being nominated?</option>
                    {canBeNominated.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </>
              );
            })()}
            <div className="flex gap-2">
              <button
                onClick={handleNominate}
                disabled={!nominator || !nominee}
                className="flex-1 py-3 bg-accent text-bg font-semibold rounded-lg disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                Nominate
              </button>
              <button
                onClick={() => { setNominating(false); setNominator(''); setNominee(''); }}
                className="px-4 py-3 bg-surface2 text-fg-dim rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setNominating(true)}
            className="w-full py-3 bg-surface2 text-fg hover:bg-accent-dim rounded-lg font-medium transition-colors"
          >
            + New Nomination
          </button>
        )}
      </div>

      {/* Storyteller Notes - auto-computed info for night */}
      {(() => {
        const notes: { role: string; icon: string; text: string; color: string }[] = [];

        // Get all role IDs in play
        const rolesInPlay = new Map<string, Player>();
        for (const p of players) {
          if (p.role && p.alive) rolesInPlay.set(p.role, p);
        }

        // All voters across all nominations today
        const allVoters = new Set<string>();
        for (const nom of nominations) {
          for (const vid of nom.votes) allVoters.add(vid);
        }

        // All nominators today
        const allNominators = new Set(nominations.map(n => n.nominatorId));

        // Find the demon
        const demonPlayer = players.find(p => {
          if (!p.role || !p.alive) return false;
          const r = getRoleById(p.role, customRoles);
          return r?.type === 'demon';
        });

        // Flowergirl (S&V) - did the Demon vote today?
        if (rolesInPlay.has('flowergirl') && demonPlayer) {
          const demonVoted = allVoters.has(demonPlayer.id);
          const fg = rolesInPlay.get('flowergirl')!;
          const poisoned = fg.poisoned || fg.drunkPoisoned;
          notes.push({
            role: 'Flowergirl',
            icon: '\uD83C\uDF38',
            text: poisoned
              ? `Tell ${fg.name}: ${demonVoted ? 'No' : 'Yes'} (give false info -- poisoned)`
              : `Tell ${fg.name}: the Demon ${demonVoted ? 'did' : 'did not'} vote today`,
            color: poisoned ? 'text-orange' : 'text-accent',
          });
        }

        // Town Crier (S&V) - did a Minion nominate today?
        if (rolesInPlay.has('town_crier')) {
          const minionNominated = players.some(p => {
            if (!p.role) return false;
            const r = getRoleById(p.role, customRoles);
            return r?.type === 'minion' && allNominators.has(p.id);
          });
          const tc = rolesInPlay.get('town_crier')!;
          const poisoned = tc.poisoned || tc.drunkPoisoned;
          notes.push({
            role: 'Town Crier',
            icon: '\uD83D\uDCE2',
            text: poisoned
              ? `Tell ${tc.name}: ${minionNominated ? 'No' : 'Yes'} (give false info -- poisoned)`
              : `Tell ${tc.name}: a Minion ${minionNominated ? 'did' : 'did not'} nominate today`,
            color: poisoned ? 'text-orange' : 'text-accent',
          });
        }

        // Empath (TB) - how many alive neighbors are evil?
        if (rolesInPlay.has('empath')) {
          const emp = rolesInPlay.get('empath')!;
          const empIdx = players.findIndex(p => p.id === emp.id);
          const alivePlayers = players.filter(p => p.alive);
          const empAliveIdx = alivePlayers.findIndex(p => p.id === emp.id);
          if (empAliveIdx >= 0 && alivePlayers.length > 1) {
            const leftNeighbor = alivePlayers[(empAliveIdx - 1 + alivePlayers.length) % alivePlayers.length];
            const rightNeighbor = alivePlayers[(empAliveIdx + 1) % alivePlayers.length];
            let evilCount = 0;
            for (const n of [leftNeighbor, rightNeighbor]) {
              if (n && n.id !== emp.id) {
                const r = getRoleById(n.role || '', customRoles);
                if (r?.team === 'evil') evilCount++;
              }
            }
            const poisoned = emp.poisoned || emp.drunkPoisoned;
            notes.push({
              role: 'Empath',
              icon: '\uD83D\uDC9C',
              text: poisoned
                ? `Tell ${emp.name}: ${evilCount === 0 ? '1' : '0'} (give false info -- poisoned)`
                : `Tell ${emp.name}: ${evilCount} of your alive neighbors ${evilCount === 1 ? 'is' : 'are'} evil`,
              color: poisoned ? 'text-orange' : 'text-accent',
            });
          }
        }

        // Oracle (S&V) - how many dead players are evil?
        if (rolesInPlay.has('oracle')) {
          const orc = rolesInPlay.get('oracle')!;
          const deadEvil = players.filter(p => !p.alive && p.role && getRoleById(p.role, customRoles)?.team === 'evil').length;
          const poisoned = orc.poisoned || orc.drunkPoisoned;
          notes.push({
            role: 'Oracle',
            icon: '\uD83D\uDD2E',
            text: poisoned
              ? `Tell ${orc.name}: ${deadEvil === 0 ? '1' : deadEvil - 1} (give false info -- poisoned)`
              : `Tell ${orc.name}: ${deadEvil} dead player${deadEvil !== 1 ? 's are' : ' is'} evil`,
            color: poisoned ? 'text-orange' : 'text-accent',
          });
        }

        // Pending execution reminder
        const pendingPlayers = players.filter(p => p.pendingExecution);
        if (pendingPlayers.length > 0) {
          notes.push({
            role: 'Execution',
            icon: '\u2694\uFE0F',
            text: `${pendingPlayers.map(p => p.name).join(', ')} will die at dusk`,
            color: 'text-red',
          });
        }

        if (notes.length === 0) return null;

        return (
          <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Storyteller Notes</h3>
            {notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-sm flex-shrink-0">{note.icon}</span>
                <div className="text-sm">
                  <span className="font-semibold text-fg-bright">{note.role}: </span>
                  <span className={note.color}>{note.text}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* End of day */}
      <div className="flex gap-2">
        <button
          onClick={handleNoExecution}
          className="flex-1 py-4 bg-surface2 text-fg font-semibold rounded-xl hover:bg-surface active:scale-[0.98] transition"
        >
          No Execution
        </button>
        <button
          onClick={handleProceedToNight}
          className="flex-1 py-4 bg-accent text-bg font-bold rounded-xl active:scale-[0.98] transition-transform"
        >
          → Night {dayNumber + 1}
        </button>
      </div>

      {/* End Game */}
      <div className="mt-4 pt-4 border-t border-border">
        <button
          onClick={() => {
            if (!confirm('End this game? Players will keep their names but roles and statuses will be cleared.')) return;
            const alive = players.filter(p => p.alive);
            const dead = players.filter(p => !p.alive);
            const ghostVotesUsed = dead.filter(p => p.ghostVoteUsed).length;
            const summary = [
              `Game ended on Day ${dayNumber}`,
              `Alive: ${alive.map(p => p.name).join(', ') || 'none'}`,
              `Dead: ${dead.map(p => p.name).join(', ') || 'none'}`,
              `Ghost votes used: ${ghostVotesUsed}/${dead.length}`,
            ].join('\n');
            onAddLogEntry('END', summary);
            onEndGame();
          }}
          className="w-full py-3 bg-red/20 text-red font-semibold rounded-xl hover:bg-red/30 active:scale-[0.98] transition"
        >
          End Game
        </button>
      </div>
    </div>
  );
}
