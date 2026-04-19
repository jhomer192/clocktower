import { useState, useRef } from 'react';
import type { Role, RoleType } from '../types/game';
import { ALL_SCRIPT_ROLES } from '../data/roles';

interface CustomRolesPanelProps {
  scriptId: string;
  customRoles: Role[];
  onAddCustomRole: (role: Role) => void;
  onRemoveCustomRole: (id: string) => void;
  onSetCustomRoles: (roles: Role[]) => void;
}

const RULESETS_STORAGE = 'clocktower-rulesets';

const TYPE_LABELS: Record<RoleType, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsider',
  minion: 'Minion',
  demon: 'Demon',
};

const TYPE_COLORS: Record<RoleType, string> = {
  townsfolk: 'text-emerald-400',
  outsider: 'text-cyan-400',
  minion: 'text-orange-400',
  demon: 'text-red-400',
};

interface SavedRuleset {
  name: string;
  roles: Role[];
  createdAt: string;
}

function loadSavedRulesets(): SavedRuleset[] {
  try {
    return JSON.parse(localStorage.getItem(RULESETS_STORAGE) || '[]');
  } catch { return []; }
}

function saveSavedRulesets(rulesets: SavedRuleset[]) {
  localStorage.setItem(RULESETS_STORAGE, JSON.stringify(rulesets));
}

export function CustomRolesPanel({ scriptId, customRoles, onAddCustomRole, onRemoveCustomRole, onSetCustomRoles }: CustomRolesPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRolePool, setShowRolePool] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<RoleType>('townsfolk');
  const [ability, setAbility] = useState('');
  const [firstNight, setFirstNight] = useState(0);
  const [otherNights, setOtherNights] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only show when script is custom
  if (scriptId !== 'custom') return null;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

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
    setShowAddForm(false);
  };

  // Toggle a role from the all-scripts pool
  const togglePoolRole = (role: Role) => {
    const exists = customRoles.find(r => r.id === role.id);
    if (exists) {
      onRemoveCustomRole(role.id);
    } else {
      onAddCustomRole(role);
    }
  };

  // Export as JSON file download
  const handleExport = () => {
    if (customRoles.length === 0) return;
    const data: SavedRuleset = {
      name: 'Custom Ruleset',
      roles: customRoles,
      createdAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clocktower-ruleset.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash('Exported!');
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (customRoles.length === 0) return;
    const data: SavedRuleset = {
      name: 'Custom Ruleset',
      roles: customRoles,
      createdAt: new Date().toISOString(),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      flash('Copied!');
    } catch {
      flash('Copy failed');
    }
  };

  // Import from JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        const roles = data.roles ?? data;
        if (!Array.isArray(roles) || roles.length === 0) {
          flash('Invalid file');
          return;
        }
        // Validate roles have required fields
        const valid = roles.every((r: Role) => r.id && r.name && r.type && r.ability);
        if (!valid) {
          flash('Invalid roles');
          return;
        }
        onSetCustomRoles(roles);
        flash(`Loaded ${roles.length} roles`);
      } catch {
        flash('Failed to parse');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save to local storage
  const handleSaveLocal = () => {
    if (customRoles.length === 0) return;
    const setName = prompt('Name this ruleset:');
    if (!setName) return;
    const saved = loadSavedRulesets();
    saved.push({ name: setName, roles: customRoles, createdAt: new Date().toISOString() });
    saveSavedRulesets(saved);
    flash(`Saved "${setName}"`);
  };

  // Load from local storage
  const handleLoadLocal = (idx: number) => {
    const saved = loadSavedRulesets();
    if (saved[idx]) {
      onSetCustomRoles(saved[idx].roles);
      flash(`Loaded "${saved[idx].name}"`);
    }
  };

  const handleDeleteLocal = (idx: number) => {
    const saved = loadSavedRulesets();
    saved.splice(idx, 1);
    saveSavedRulesets(saved);
    flash('Deleted');
  };

  const savedRulesets = loadSavedRulesets();
  const customRoleIds = new Set(customRoles.map(r => r.id));

  // Group all-scripts roles by type
  const poolByType = ALL_SCRIPT_ROLES.reduce((acc, role) => {
    acc[role.type] = acc[role.type] || [];
    acc[role.type].push(role);
    return acc;
  }, {} as Record<RoleType, Role[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-fg-bright">Custom Ruleset</h3>
        <span className="text-xs text-fg-dim">{customRoles.length} roles</span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowRolePool(!showRolePool)} className="text-xs px-3 py-1.5 bg-surface2 rounded-lg text-fg-dim hover:text-fg transition-colors">
          {showRolePool ? 'Hide Role Pool' : 'Pick from Scripts'}
        </button>
        <button onClick={() => setShowAddForm(!showAddForm)} className="text-xs px-3 py-1.5 bg-surface2 rounded-lg text-fg-dim hover:text-fg transition-colors">
          {showAddForm ? 'Cancel' : '+ Create Role'}
        </button>
        <button onClick={handleExport} disabled={customRoles.length === 0} className="text-xs px-3 py-1.5 bg-surface2 rounded-lg text-fg-dim hover:text-fg disabled:opacity-30 transition-colors">
          Export JSON
        </button>
        <button onClick={handleCopy} disabled={customRoles.length === 0} className="text-xs px-3 py-1.5 bg-surface2 rounded-lg text-fg-dim hover:text-fg disabled:opacity-30 transition-colors">
          Copy
        </button>
        <label className="text-xs px-3 py-1.5 bg-surface2 rounded-lg text-fg-dim hover:text-fg cursor-pointer transition-colors">
          Import JSON
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        <button onClick={handleSaveLocal} disabled={customRoles.length === 0} className="text-xs px-3 py-1.5 bg-surface2 rounded-lg text-fg-dim hover:text-fg disabled:opacity-30 transition-colors">
          Save Local
        </button>
      </div>

      {/* Saved rulesets */}
      {savedRulesets.length > 0 && (
        <div className="bg-surface rounded-xl p-3">
          <p className="text-xs font-bold text-fg-dim uppercase tracking-wider mb-2">Saved Rulesets</p>
          <div className="space-y-1.5">
            {savedRulesets.map((rs, i) => (
              <div key={i} className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2">
                <span className="text-sm text-fg-bright flex-1">{rs.name}</span>
                <span className="text-xs text-fg-dim">{rs.roles.length} roles</span>
                <button onClick={() => handleLoadLocal(i)} className="text-xs px-2 py-1 bg-accent-dim text-accent rounded hover:bg-accent/20">Load</button>
                <button onClick={() => handleDeleteLocal(i)} className="text-xs px-2 py-1 text-red hover:bg-red-dim rounded">Del</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role pool picker */}
      {showRolePool && (
        <div className="bg-surface rounded-xl p-4 space-y-3">
          <p className="text-xs text-fg-dim">Tap roles to add/remove from your custom set</p>
          {(['townsfolk', 'outsider', 'minion', 'demon'] as RoleType[]).map(roleType => (
            <div key={roleType}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${TYPE_COLORS[roleType]}`}>{TYPE_LABELS[roleType]}</p>
              <div className="flex flex-wrap gap-1.5">
                {(poolByType[roleType] || []).map(role => (
                  <button
                    key={role.id}
                    onClick={() => togglePoolRole(role)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      customRoleIds.has(role.id)
                        ? 'bg-accent text-bg'
                        : 'bg-surface2 text-fg-dim hover:text-fg'
                    }`}
                    title={role.ability}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add custom role form */}
      {showAddForm && (
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
              <input type="number" min={0} value={firstNight} onChange={e => setFirstNight(Number(e.target.value))} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-fg-bright focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-fg-dim block mb-1">Other Nights Order (0=none)</label>
              <input type="number" min={0} value={otherNights} onChange={e => setOtherNights(Number(e.target.value))} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-fg-bright focus:border-accent focus:outline-none" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={!name.trim() || !ability.trim()} className="w-full py-2.5 bg-accent text-bg font-semibold rounded-lg disabled:opacity-40 active:scale-[0.98] transition-transform">
            Add Custom Role
          </button>
        </div>
      )}

      {/* Current roles in set */}
      {customRoles.length > 0 && (
        <div className="space-y-1.5">
          {customRoles.map(role => (
            <div key={role.id} className="flex items-center gap-2 bg-surface rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-fg-bright">{role.name}</span>
                  <span className={`text-[10px] uppercase font-bold ${TYPE_COLORS[role.type]}`}>{role.type}</span>
                </div>
                <div className="text-xs text-fg-dim mt-0.5">{role.ability}</div>
              </div>
              <button onClick={() => onRemoveCustomRole(role.id)} className="text-red text-lg px-2 hover:bg-red-dim rounded shrink-0">
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {customRoles.length === 0 && !showRolePool && !showAddForm && (
        <div className="text-center py-8 text-fg-dim text-sm">
          Pick roles from existing scripts or create your own
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-accent text-bg px-4 py-2 rounded-lg font-medium text-sm shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
