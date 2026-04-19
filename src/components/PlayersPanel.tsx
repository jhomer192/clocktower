import { useState } from 'react';
import type { Player, Role, RoleType } from '../types/game';
import { getRoleById, TROUBLE_BREWING_ROLES } from '../data/roles';

interface PlayersPanelProps {
  players: Player[];
  customRoles: Role[];
  onUpdatePlayer: (id: string, changes: Partial<Player>) => void;
  onAddLogEntry: (phase: string, text: string) => void;
}

const TYPE_COLORS: Record<RoleType, string> = {
  townsfolk: 'text-accent',
  outsider: 'text-cyan',
  minion: 'text-orange',
  demon: 'text-red',
};

export function PlayersPanel({ players, customRoles, onUpdatePlayer, onAddLogEntry }: PlayersPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<{ playerId: string; changes: Partial<Player>; label: string }[]>([]);

  const applyChange = (id: string, changes: Partial<Player>, label: string) => {
    const player = players.find(p => p.id === id);
    if (!player) return;

    // Save undo state
    const reverseChanges: Partial<Player> = {};
    for (const key of Object.keys(changes) as (keyof Player)[]) {
      (reverseChanges as Record<string, unknown>)[key] = player[key];
    }
    setUndoStack(prev => [...prev, { playerId: id, changes: reverseChanges, label: `Undo: ${label}` }]);

    onUpdatePlayer(id, changes);
    onAddLogEntry('Status', label);
  };

  const handleUndo = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    onUpdatePlayer(last.playerId, last.changes);
    onAddLogEntry('Status', last.label);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const aliveCount = players.filter(p => p.alive).length;
  const deadCount = players.filter(p => !p.alive).length;

  return (
    <div className="p-4 pb-32 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-fg-bright">Players</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-green">{aliveCount} alive</span>
          <span className="text-sm text-red">{deadCount} dead</span>
          {undoStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="text-xs px-2 py-1 rounded bg-surface2 text-fg-dim hover:text-fg"
            >
              Undo
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {players.map((player, index) => {
          const role = getRoleById(player.role || '', customRoles);
          const expanded = expandedId === player.id;

          return (
            <div
              key={player.id}
              className={`rounded-xl overflow-hidden border transition-colors ${
                !player.alive
                  ? 'bg-surface/50 border-border/50 opacity-70'
                  : expanded
                  ? 'bg-surface border-accent/40'
                  : 'bg-surface border-border'
              }`}
            >
              {/* Main row */}
              <button
                onClick={() => setExpandedId(expanded ? null : player.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <span className="text-fg-dim text-xs w-5 shrink-0 text-center">{index + 1}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${player.alive ? 'text-fg-bright' : 'text-fg-dim line-through'}`}>
                      {player.name}
                    </span>
                    {role && (
                      <span className={`text-xs ${TYPE_COLORS[role.type]}`}>
                        {role.name}
                        {player.coverRole && ` (thinks: ${getRoleById(player.coverRole, customRoles)?.name})`}
                      </span>
                    )}
                  </div>

                  {/* Status badges */}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {!player.alive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-dim text-red">
                        Dead {player.ghostVoteUsed ? '(vote used)' : '(ghost vote)'}
                      </span>
                    )}
                    {player.poisoned && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-dim text-orange">Poisoned</span>
                    )}
                    {player.protected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-dim text-green">Protected</span>
                    )}
                    {player.drunkPoisoned && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-dim text-purple">Drunk</span>
                    )}
                    {player.effects.map((effect, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-fg-dim">{effect}</span>
                    ))}
                  </div>
                </div>

                <span className="text-fg-dim text-sm shrink-0">{expanded ? '▼' : '▸'}</span>
              </button>

              {/* Expanded details */}
              {expanded && (
                <div className="px-3 pb-3 border-t border-border/50 pt-3 space-y-2">
                  {role && (
                    <div className="text-xs text-fg-dim bg-bg rounded-lg p-2">
                      {role.ability}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => applyChange(player.id, { alive: !player.alive }, `${player.name} ${player.alive ? 'died' : 'revived'}`)}
                      className={`py-2.5 rounded-lg font-medium text-sm transition-colors ${
                        player.alive
                          ? 'bg-red-dim text-red hover:bg-red/20'
                          : 'bg-green-dim text-green hover:bg-green/20'
                      }`}
                    >
                      {player.alive ? 'Kill' : 'Revive'}
                    </button>
                    <button
                      onClick={() => applyChange(player.id, { poisoned: !player.poisoned }, `${player.name} ${player.poisoned ? 'un-poisoned' : 'poisoned'}`)}
                      className={`py-2.5 rounded-lg font-medium text-sm transition-colors ${
                        player.poisoned
                          ? 'bg-orange text-bg'
                          : 'bg-orange-dim text-orange hover:bg-orange/20'
                      }`}
                    >
                      {player.poisoned ? 'Un-poison' : 'Poison'}
                    </button>
                    <button
                      onClick={() => applyChange(player.id, { protected: !player.protected }, `${player.name} ${player.protected ? 'unprotected' : 'protected'}`)}
                      className={`py-2.5 rounded-lg font-medium text-sm transition-colors ${
                        player.protected
                          ? 'bg-green text-bg'
                          : 'bg-green-dim text-green hover:bg-green/20'
                      }`}
                    >
                      {player.protected ? 'Unprotect' : 'Protect'}
                    </button>
                    <button
                      onClick={() => applyChange(player.id, { drunkPoisoned: !player.drunkPoisoned, poisoned: !player.drunkPoisoned }, `${player.name} ${player.drunkPoisoned ? 'sobered up' : 'is drunk'}`)}
                      className={`py-2.5 rounded-lg font-medium text-sm transition-colors ${
                        player.drunkPoisoned
                          ? 'bg-purple text-bg'
                          : 'bg-purple-dim text-purple hover:bg-purple/20'
                      }`}
                    >
                      {player.drunkPoisoned ? 'Sober' : 'Drunk'}
                    </button>
                  </div>

                  {!player.alive && (
                    <button
                      onClick={() => applyChange(player.id, { ghostVoteUsed: !player.ghostVoteUsed }, `${player.name} ghost vote ${player.ghostVoteUsed ? 'restored' : 'used'}`)}
                      className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                        player.ghostVoteUsed
                          ? 'bg-surface2 text-fg-dim'
                          : 'bg-accent-dim text-accent'
                      }`}
                    >
                      {player.ghostVoteUsed ? 'Ghost Vote Used — Restore' : 'Ghost Vote Available — Mark Used'}
                    </button>
                  )}

                  {/* Role swap (for Imp starpass, Scarlet Woman, etc.) */}
                  <details className="text-xs">
                    <summary className="text-fg-dim cursor-pointer hover:text-fg py-1">Change Role</summary>
                    <select
                      value={player.role || ''}
                      onChange={e => {
                        const newRole = getRoleById(e.target.value, customRoles);
                        applyChange(player.id, { role: e.target.value }, `${player.name} role changed to ${newRole?.name || '?'}`);
                      }}
                      className="w-full mt-1 bg-bg border border-border rounded px-2 py-2 text-fg-bright focus:border-accent focus:outline-none"
                    >
                      <option value="">None</option>
                      {(['townsfolk', 'outsider', 'minion', 'demon'] as const).map(type => {
                        const allRoles = [...TROUBLE_BREWING_ROLES, ...customRoles];
                        const seen = new Set<string>();
                        const unique = allRoles.filter(r => {
                          if (r.type !== type || seen.has(r.id)) return false;
                          seen.add(r.id);
                          return true;
                        });
                        return (
                          <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
                            {unique.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
