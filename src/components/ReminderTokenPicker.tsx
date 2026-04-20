import { useMemo, useState } from 'react';
import type { Player, Role } from '../types/game';
import { getRoleById, ALL_SCRIPT_ROLES } from '../data/roles';
import { GENERIC_TOKENS, ROLE_TOKENS, getTokensForRole } from '../data/reminderTokens';

interface Props {
  player: Player;
  customRoles: Role[];
  /** Roles currently in play (for suggesting relevant tokens). */
  players: Player[];
  onAddToken: (label: string) => void;
  onRemoveToken: (index: number) => void;
  onClose?: () => void;
}

/**
 * Picker UI for attaching reminder tokens to a player.
 * - Top: current tokens (click x to remove).
 * - Middle: tokens suggested by roles currently in play.
 * - Bottom: full token catalog + free-text input.
 */
export function ReminderTokenPicker({
  player,
  customRoles,
  players,
  onAddToken,
  onRemoveToken,
  onClose,
}: Props) {
  const [custom, setCustom] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Tokens grouped by the roles in play (most relevant to this game)
  const inPlayGrouped = useMemo(() => {
    const roleIdsInPlay = new Set(
      players.map(p => p.role).filter((x): x is string => !!x)
    );
    const groups: { role: Role; tokens: string[] }[] = [];
    for (const roleId of roleIdsInPlay) {
      const role = getRoleById(roleId, customRoles);
      if (!role) continue;
      const toks = getTokensForRole(roleId).map(t => t.label);
      if (toks.length === 0) continue;
      groups.push({ role, tokens: toks });
    }
    groups.sort((a, b) => a.role.name.localeCompare(b.role.name));
    return groups;
  }, [players, customRoles]);

  // Full catalog: every role that has any token, grouped by role name
  const allGrouped = useMemo(() => {
    const groups: { role: Role; tokens: string[] }[] = [];
    for (const role of ALL_SCRIPT_ROLES) {
      const toks = ROLE_TOKENS[role.id];
      if (!toks || toks.length === 0) continue;
      groups.push({ role, tokens: toks.map(t => t.label) });
    }
    groups.sort((a, b) => a.role.name.localeCompare(b.role.name));
    return groups;
  }, []);

  const addIf = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAddToken(trimmed);
  };

  return (
    <div className="bg-surface2 border border-border rounded-lg p-3 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="text-fg-bright font-semibold">Reminder tokens for {player.name}</div>
        {onClose && (
          <button onClick={onClose} className="text-fg-dim hover:text-fg text-xs px-2 py-0.5">
            Close
          </button>
        )}
      </div>

      {/* Current tokens */}
      <div>
        <div className="text-[11px] text-fg-dim uppercase tracking-wide mb-1">Attached</div>
        {player.effects.length === 0 ? (
          <div className="text-xs text-fg-dim italic">No tokens attached.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {player.effects.map((effect, i) => (
              <button
                key={i}
                onClick={() => onRemoveToken(i)}
                title="Click to remove"
                className="text-xs px-2 py-1 rounded-md bg-accent-dim text-accent hover:bg-red-dim hover:text-red transition-colors flex items-center gap-1"
              >
                {effect}
                <span className="text-[10px] opacity-70">×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Roles in play */}
      {inPlayGrouped.length > 0 && (
        <div>
          <div className="text-[11px] text-fg-dim uppercase tracking-wide mb-1">From roles in play</div>
          <div className="space-y-1.5">
            {inPlayGrouped.map(({ role, tokens }) => (
              <div key={role.id} className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[11px] text-fg-dim w-24 shrink-0">{role.name}:</span>
                <div className="flex flex-wrap gap-1">
                  {tokens.map(t => (
                    <button
                      key={t}
                      onClick={() => addIf(t)}
                      className="text-xs px-2 py-0.5 rounded bg-bg border border-border text-fg hover:border-accent hover:text-accent transition-colors"
                    >
                      +{t}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generic tokens */}
      <div>
        <div className="text-[11px] text-fg-dim uppercase tracking-wide mb-1">Generic</div>
        <div className="flex flex-wrap gap-1">
          {GENERIC_TOKENS.map(t => (
            <button
              key={t}
              onClick={() => addIf(t)}
              className="text-xs px-2 py-0.5 rounded bg-bg border border-border text-fg hover:border-accent hover:text-accent transition-colors"
            >
              +{t}
            </button>
          ))}
        </div>
      </div>

      {/* Full catalog (collapsed by default) */}
      <details open={showAll} onToggle={e => setShowAll((e.target as HTMLDetailsElement).open)}>
        <summary className="text-[11px] text-fg-dim uppercase tracking-wide cursor-pointer hover:text-fg">
          All roles ({allGrouped.length})
        </summary>
        <div className="mt-1 space-y-1 max-h-64 overflow-y-auto pr-1">
          {allGrouped.map(({ role, tokens }) => (
            <div key={role.id} className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[11px] text-fg-dim w-24 shrink-0">{role.name}:</span>
              <div className="flex flex-wrap gap-1">
                {tokens.map(t => (
                  <button
                    key={t}
                    onClick={() => addIf(t)}
                    className="text-xs px-2 py-0.5 rounded bg-bg border border-border text-fg hover:border-accent hover:text-accent transition-colors"
                  >
                    +{t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* Free-text */}
      <div className="flex gap-1.5">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              addIf(custom);
              setCustom('');
            }
          }}
          placeholder="Custom token..."
          className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs text-fg-bright focus:border-accent focus:outline-none"
        />
        <button
          onClick={() => {
            addIf(custom);
            setCustom('');
          }}
          className="text-xs px-3 py-1 rounded bg-accent-dim text-accent hover:bg-accent hover:text-bg transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
