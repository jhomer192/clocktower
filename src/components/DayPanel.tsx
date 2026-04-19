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

    onUpdatePlayer(player.id, { alive: false });
    onUpdateNomination(nomIdx, { executed: true });
    onAddLogEntry(dayLabel, `${player.name} was executed (${nom.votes.length} votes)`);

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
                            {p.name}{!p.alive ? ' 👻' : ''}{voted ? ' ✓' : ''}
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
            <select
              value={nominator}
              onChange={e => setNominator(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-3 text-fg-bright focus:border-accent focus:outline-none"
            >
              <option value="">Who is nominating?</option>
              {alivePlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={nominee}
              onChange={e => setNominee(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-3 text-fg-bright focus:border-accent focus:outline-none"
            >
              <option value="">Who is being nominated?</option>
              {alivePlayers.filter(p => p.id !== nominator).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
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
    </div>
  );
}
