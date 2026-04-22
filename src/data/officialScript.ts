/**
 * Import scripts exported by https://script.bloodontheclocktower.com/ and
 * every other BOTC tool that uses the standard JSON schema.
 *
 * The official format is an array whose entries are either:
 *   - a string: the id of an official role (e.g. "washerwoman", "fanggu")
 *   - an object: either the _meta header, or a homebrew role definition
 *
 * Their role IDs have no underscores ("fortuneteller", "fanggu", "pithag").
 * Our IDs use snake_case ("fortune_teller", "fang_gu", "pit_hag"). The
 * fuzzy match strips underscores and case so the two spellings align.
 *
 * Official homebrew role fields:
 *   id, name, team, ability, firstNight (number), otherNight (number, singular!),
 *   firstNightReminder, otherNightReminder, reminders, setup, image, edition
 *
 * Returns { roles, name, warnings }:
 *   roles    -- converted roles ready to drop into customRoles
 *   name     -- script name pulled from _meta (if present)
 *   warnings -- human-readable notes about anything we couldn't fully import
 */

import type { Role, RoleType, Team } from '../types/game';
import { ALL_SCRIPT_ROLES } from './roles';

interface OfficialMeta {
  id: '_meta';
  name?: string;
  author?: string;
}

interface OfficialHomebrewRole {
  id: string;
  name: string;
  team: string;                 // townsfolk | outsider | minion | demon | traveler | fabled
  ability: string;
  firstNight?: number;
  otherNight?: number;          // singular in official schema!
  otherNights?: number;         // some exporters use plural -- accept both
  firstNightReminder?: string;
  otherNightReminder?: string;
  setup?: boolean;
  image?: string;
  edition?: string;
}

type OfficialEntry = string | OfficialMeta | OfficialHomebrewRole;

export interface ImportedScript {
  roles: Role[];
  name: string | null;
  warnings: string[];
}

/** Normalize an id/name for fuzzy comparison: lowercase, no underscores/spaces. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[_\s-]/g, '');
}

const NORMALIZED_LOOKUP: Map<string, Role> = (() => {
  const m = new Map<string, Role>();
  for (const role of ALL_SCRIPT_ROLES) {
    m.set(normalize(role.id), role);
    m.set(normalize(role.name), role);
  }
  return m;
})();

function toRoleType(team: string): RoleType | null {
  const t = team.toLowerCase();
  if (t === 'townsfolk') return 'townsfolk';
  if (t === 'outsider') return 'outsider';
  if (t === 'minion') return 'minion';
  if (t === 'demon') return 'demon';
  return null;
}

function teamFromType(type: RoleType): Team {
  return type === 'minion' || type === 'demon' ? 'evil' : 'good';
}

/** True if the parsed value looks like the official script format. */
export function isOfficialScriptFormat(parsed: unknown): parsed is OfficialEntry[] {
  if (!Array.isArray(parsed)) return false;
  if (parsed.length === 0) return false;
  // Our native exports are { roles, name, createdAt } -- always object, not array.
  // Heuristic: at least one entry is a string, or at least one object has id "_meta",
  // or entries have a "team" field (our native uses "type").
  return parsed.some((entry) => {
    if (typeof entry === 'string') return true;
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const obj = entry as Record<string, unknown>;
      if (obj.id === '_meta') return true;
      // Official homebrew roles carry `team`; our native Role carries `type`.
      if ('team' in obj && !('type' in obj)) return true;
    }
    return false;
  });
}

/** Convert an official-format script JSON into our Role[] shape. */
export function importOfficialScript(entries: OfficialEntry[]): ImportedScript {
  const roles: Role[] = [];
  const warnings: string[] = [];
  let name: string | null = null;

  for (const entry of entries) {
    // String entry = reference to an official role by id.
    if (typeof entry === 'string') {
      const role = NORMALIZED_LOOKUP.get(normalize(entry));
      if (role) {
        roles.push(role);
      } else {
        warnings.push(`Unknown role id "${entry}" -- skipped (travelers and fabled are not supported).`);
      }
      continue;
    }

    if (!entry || typeof entry !== 'object') continue;

    // Meta header -- capture script name and move on.
    if ((entry as OfficialMeta).id === '_meta') {
      const meta = entry as OfficialMeta;
      name = meta.name ?? null;
      continue;
    }

    // Homebrew role definition.
    const h = entry as OfficialHomebrewRole;
    if (!h.id || !h.name || !h.ability) {
      warnings.push(`Dropping malformed role "${h.name ?? h.id ?? 'unnamed'}" (missing id / name / ability).`);
      continue;
    }
    const type = toRoleType(h.team);
    if (!type) {
      warnings.push(`Skipping "${h.name}" -- team "${h.team}" isn't supported (travelers and fabled roles don't fit our night order).`);
      continue;
    }
    roles.push({
      id: h.id,
      name: h.name,
      type,
      team: teamFromType(type),
      ability: h.ability,
      firstNight: h.firstNight ?? 0,
      otherNights: h.otherNights ?? h.otherNight ?? 0,
      custom: true,
    });
  }

  // De-duplicate by id (later entries win -- homebrew overrides official, matching BOTC tools).
  const seen = new Map<string, Role>();
  for (const r of roles) seen.set(r.id, r);
  return { roles: [...seen.values()], name, warnings };
}
