import { useState } from 'react';
import type { Role, RoleType } from '../types/game';

interface CustomRolesPanelProps {
  customRoles: Role[];
  onAddCustomRole: (role: Role) => void;
  onRemoveCustomRole: (id: string) => void;
}

const CUSTOM_ROLES_STORAGE = 'clocktower-custom-rolesets';

export function CustomRolesPanel({ customRoles, onAddCustomRole, onRemoveCustomRole }: CustomRolesPanelProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<RoleType>('townsfolk');
  const [ability, setAbility] = useState('');
  const [firstNight, setFirstNight] = useState(0);
  const [otherNights, setOtherNights] = useState(0);

  const handleAdd = () => {
    if (!name.trim() || !ability.trim()) return;
    const id = name.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substring(2, 6);
    const role: Role = {
      id,
      name: name.trim(),
      type,
      team: type === 'minion' || type === 'demon' ? 'evil' : 'good',
      ability: ability.trim(),
      firstNight,
      otherNights,
      custom: true,
    };
    onAddCustomRole(role);
    setName('');
    setAbility('');
    setFirstNight(0);
    setOtherNights(0);
  };

  // Save/load custom rolesets
  const saveRoleset = () => {
    const setName = prompt('Name this roleset:');
    if (!setName) return;
    const saved = JSON.parse(localStorage.getItem(CUSTOM_ROLES_STORAGE) || '{}');
    saved[setName] = customRoles;
    localStorage.setItem(CUSTOM_ROLES_STORAGE, JSON.stringify(saved));
  };

  const loadRoleset = () => {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_ROLES_STORAGE) || '{}');
    const names = Object.keys(saved);
    if (names.length === 0) {
      alert('No saved rolesets found.');
      return;
    }
    const choice = prompt(`Available rolesets:\n${names.join('\n')}\n\nEnter name to load:`);
    if (!choice || !saved[choice]) return;
    for (const role of saved[choice] as Role[]) {
      onAddCustomRole(role);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-fg-bright">Custom Roles</h3>
        <div className="flex gap-2">
          <button onClick={saveRoleset} className="text-xs px-2 py-1 bg-surface2 rounded text-fg-dim hover:text-fg">
            Save Set
          </button>
          <button onClick={loadRoleset} className="text-xs px-2 py-1 bg-surface2 rounded text-fg-dim hover:text-fg">
            Load Set
          </button>
        </div>
      </div>

      {/* Add custom role form */}
      <div className="bg-surface rounded-xl p-4 space-y-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Role name..."
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-fg-bright focus:border-accent focus:outline-none"
        />
        <select
          value={type}
          onChange={e => setType(e.target.value as RoleType)}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-fg-bright focus:border-accent focus:outline-none"
        >
          <option value="townsfolk">Townsfolk</option>
          <option value="outsider">Outsider</option>
          <option value="minion">Minion</option>
          <option value="demon">Demon</option>
        </select>
        <textarea
          value={ability}
          onChange={e => setAbility(e.target.value)}
          placeholder="Ability text..."
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-fg-bright focus:border-accent focus:outline-none resize-none"
          rows={2}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-fg-dim block mb-1">First Night Order (0=none)</label>
            <input
              type="number"
              min={0}
              value={firstNight}
              onChange={e => setFirstNight(Number(e.target.value))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-fg-bright focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-fg-dim block mb-1">Other Nights Order (0=none)</label>
            <input
              type="number"
              min={0}
              value={otherNights}
              onChange={e => setOtherNights(Number(e.target.value))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-fg-bright focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!name.trim() || !ability.trim()}
          className="w-full py-2.5 bg-accent text-bg font-semibold rounded-lg disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          Add Custom Role
        </button>
      </div>

      {/* List of custom roles */}
      {customRoles.length > 0 && (
        <div className="space-y-1.5">
          {customRoles.map(role => (
            <div key={role.id} className="flex items-center gap-2 bg-surface rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-fg-bright">{role.name}</div>
                <div className="text-xs text-fg-dim">{role.type} — {role.ability}</div>
              </div>
              <button
                onClick={() => onRemoveCustomRole(role.id)}
                className="text-red text-lg px-2 hover:bg-red-dim rounded shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
