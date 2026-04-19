import { useState, useMemo } from 'react';
import type { Player, Role, RoleType } from '../types/game';
import { TROUBLE_BREWING_ROLES, getComposition, getRoleById } from '../data/roles';

interface SetupPanelProps {
  players: Player[];
  scriptId: string;
  customRoles: Role[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onReorderPlayers: (players: Player[]) => void;
  onAssignRole: (playerId: string, roleId: string) => void;
  onSetCoverRole: (playerId: string, coverRoleId: string) => void;
  onStartGame: () => void;
  onAddLogEntry: (phase: string, text: string) => void;
}

const TYPE_COLORS: Record<RoleType, string> = {
  townsfolk: 'text-accent',
  outsider: 'text-cyan',
  minion: 'text-orange',
  demon: 'text-red',
};

const TYPE_BG: Record<RoleType, string> = {
  townsfolk: 'bg-accent-dim',
  outsider: 'bg-[var(--cyan)]/15',
  minion: 'bg-orange-dim',
  demon: 'bg-red-dim',
};

export function SetupPanel({
  players,
  scriptId,
  customRoles,
  onAddPlayer,
  onRemovePlayer,
  onReorderPlayers,
  onAssignRole,
  onSetCoverRole,
  onStartGame,
  onAddLogEntry,
}: SetupPanelProps) {
  const [newName, setNewName] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const roles = scriptId === 'trouble_brewing' ? TROUBLE_BREWING_ROLES : customRoles;

  // Check if Baron is in play for composition adjustment
  const hasBaronInPlay = players.some(p => p.role === 'baron');
  const composition = getComposition(players.length, hasBaronInPlay);

  // Count assigned roles by type
  const assigned = useMemo(() => {
    const counts: Record<RoleType, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
    for (const p of players) {
      if (p.role) {
        const role = getRoleById(p.role, customRoles);
        if (role) {
          // Drunk counts as outsider even though player thinks they're townsfolk
          counts[role.type]++;
        }
      }
    }
    return counts;
  }, [players, customRoles]);

  // Get used role ids
  const usedRoles = new Set(players.map(p => p.role).filter(Boolean));

  const handleAddPlayer = () => {
    const name = newName.trim();
    if (name) {
      onAddPlayer(name);
      setNewName('');
    }
  };

  const movePlayer = (from: number, to: number) => {
    if (to < 0 || to >= players.length) return;
    const next = [...players];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorderPlayers(next);
  };

  const allAssigned = players.length >= 5 && players.every(p => p.role);
  const compositionValid = composition && (
    assigned.townsfolk === composition.townsfolk &&
    assigned.outsider === composition.outsiders &&
    assigned.minion === composition.minions &&
    assigned.demon === composition.demons
  );

  const canStart = allAssigned && compositionValid;

  // Check if any Drunk needs a cover role
  const drunksNeedingCover = players.filter(p => p.role === 'drunk' && !p.coverRole);

  const handleStart = () => {
    if (!canStart) return;
    if (drunksNeedingCover.length > 0) return; // Force cover role selection
    const roleNames = players.map(p => {
      const r = getRoleById(p.role!, customRoles);
      return `${p.name} = ${r?.name || '?'}`;
    }).join(', ');
    onAddLogEntry('Setup', `Game started with ${players.length} players: ${roleNames}`);
    onStartGame();
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      <h2 className="text-xl font-bold text-fg-bright">Game Setup</h2>

      {/* Script selection */}
      <div className="bg-surface rounded-xl p-4">
        <label className="block text-sm text-fg-dim mb-1">Script</label>
        <div className="text-fg-bright font-medium">Trouble Brewing</div>
        <div className="text-xs text-fg-dim mt-1">The base game - recommended for new players</div>
      </div>

      {/* Player entry */}
      <div className="bg-surface rounded-xl p-4">
        <label className="block text-sm text-fg-dim mb-2">Players ({players.length})</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
            placeholder="Enter player name..."
            className="flex-1 bg-bg px-3 py-3 rounded-lg text-fg-bright border border-border focus:border-accent focus:outline-none text-base"
          />
          <button
            onClick={handleAddPlayer}
            disabled={!newName.trim()}
            className="px-5 py-3 bg-accent text-bg font-semibold rounded-lg disabled:opacity-40 active:scale-95 transition-transform"
          >
            Add
          </button>
        </div>

        {/* Player list */}
        <div className="space-y-2">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center gap-2 bg-bg rounded-lg p-2 ${
                dragIndex === index ? 'opacity-50' : ''
              }`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) {
                  movePlayer(dragIndex, index);
                  setDragIndex(null);
                }
              }}
              onDragEnd={() => setDragIndex(null)}
            >
              {/* Seat number */}
              <span className="text-fg-dim text-xs w-5 text-center shrink-0">{index + 1}</span>

              {/* Reorder buttons */}
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => movePlayer(index, index - 1)}
                  disabled={index === 0}
                  className="text-fg-dim hover:text-fg disabled:opacity-20 text-xs leading-none p-0.5"
                >
                  ▲
                </button>
                <button
                  onClick={() => movePlayer(index, index + 1)}
                  disabled={index === players.length - 1}
                  className="text-fg-dim hover:text-fg disabled:opacity-20 text-xs leading-none p-0.5"
                >
                  ▼
                </button>
              </div>

              {/* Name */}
              <span className="text-fg-bright text-sm font-medium min-w-[60px]">{player.name}</span>

              {/* Role dropdown */}
              <select
                value={player.role || ''}
                onChange={e => onAssignRole(player.id, e.target.value)}
                className={`flex-1 bg-surface2 text-sm rounded px-2 py-2 border border-border focus:border-accent focus:outline-none min-w-0 ${
                  player.role ? TYPE_COLORS[getRoleById(player.role, customRoles)?.type || 'townsfolk'] : 'text-fg-dim'
                }`}
              >
                <option value="">Select role...</option>
                {(['townsfolk', 'outsider', 'minion', 'demon'] as RoleType[]).map(type => (
                  <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
                    {roles.filter(r => r.type === type).map(role => (
                      <option
                        key={role.id}
                        value={role.id}
                        disabled={usedRoles.has(role.id) && player.role !== role.id}
                      >
                        {role.name}{usedRoles.has(role.id) && player.role !== role.id ? ' (taken)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Remove */}
              <button
                onClick={() => onRemovePlayer(player.id)}
                className="text-red text-lg px-2 py-1 hover:bg-red-dim rounded shrink-0"
                aria-label={`Remove ${player.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {players.length > 0 && players.length < 5 && (
          <div className="text-xs text-yellow mt-2">Need at least 5 players (have {players.length})</div>
        )}
      </div>

      {/* Drunk cover role */}
      {drunksNeedingCover.map(player => (
        <div key={player.id} className="bg-purple-dim border border-purple/30 rounded-xl p-4">
          <div className="text-purple font-semibold mb-1">
            {player.name} is the Drunk
          </div>
          <div className="text-sm text-fg-dim mb-2">
            What Townsfolk role do they think they are?
          </div>
          <select
            value={player.coverRole || ''}
            onChange={e => onSetCoverRole(player.id, e.target.value)}
            className="w-full bg-surface text-fg-bright rounded-lg px-3 py-3 border border-border focus:border-accent focus:outline-none"
          >
            <option value="">Select cover role...</option>
            {roles.filter(r => r.type === 'townsfolk' && !usedRoles.has(r.id)).map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>
      ))}

      {/* Composition tracker */}
      {composition && players.length >= 5 && (
        <div className="bg-surface rounded-xl p-4">
          <div className="text-sm text-fg-dim mb-3">Role Composition ({players.length} players){hasBaronInPlay ? ' — Baron in play (+2 Outsiders)' : ''}</div>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['townsfolk', composition.townsfolk, assigned.townsfolk] as const,
              ['outsider', composition.outsiders, assigned.outsider] as const,
              ['minion', composition.minions, assigned.minion] as const,
              ['demon', composition.demons, assigned.demon] as const,
            ]).map(([type, needed, have]) => (
              <div
                key={type}
                className={`${TYPE_BG[type]} rounded-lg p-3 text-center`}
              >
                <div className={`text-xs uppercase tracking-wide ${TYPE_COLORS[type]} mb-1`}>
                  {type}
                </div>
                <div className={`text-lg font-bold ${have === needed ? 'text-green' : have > needed ? 'text-red' : TYPE_COLORS[type]}`}>
                  {have}/{needed}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role reference */}
      <details className="bg-surface rounded-xl">
        <summary className="p-4 text-fg-dim text-sm cursor-pointer hover:text-fg">
          Role Reference (Trouble Brewing)
        </summary>
        <div className="px-4 pb-4 space-y-3">
          {(['townsfolk', 'outsider', 'minion', 'demon'] as RoleType[]).map(type => (
            <div key={type}>
              <div className={`text-xs uppercase tracking-wide ${TYPE_COLORS[type]} mb-1`}>
                {type} ({roles.filter(r => r.type === type).length})
              </div>
              {roles.filter(r => r.type === type).map(role => (
                <div key={role.id} className="py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-fg-bright text-sm font-medium">{role.name}</span>
                  <span className="text-fg-dim text-xs ml-2">{role.ability}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={!canStart || drunksNeedingCover.length > 0}
        className="w-full py-4 bg-accent text-bg font-bold text-lg rounded-xl disabled:opacity-30 active:scale-[0.98] transition-transform"
      >
        {!compositionValid && players.length >= 5
          ? 'Fix Role Composition'
          : drunksNeedingCover.length > 0
          ? 'Set Drunk Cover Role'
          : players.length < 5
          ? `Need ${5 - players.length} More Players`
          : !allAssigned
          ? 'Assign All Roles'
          : 'Start Game → First Night'}
      </button>
    </div>
  );
}
