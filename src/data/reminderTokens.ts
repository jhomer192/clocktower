// Reminder tokens used by the Storyteller to track role effects on the grimoire.
// In the physical game these are paper tokens placed next to a player's role.
// Stored in `Player.effects` (free-text array) so they display as pills.

export interface TokenInfo {
  /** token text shown on the player */
  label: string;
  /** role id this token belongs to (for grouping / coloring) */
  roleId: string;
  /** short description of what the token means */
  hint?: string;
}

// Per-role tokens. Keys are role ids, values are lists of possible tokens.
// Based on the official Blood on the Clocktower script tool.
export const ROLE_TOKENS: Record<string, TokenInfo[]> = {
  // ===== Trouble Brewing =====
  washerwoman: [
    { label: 'Townsfolk', roleId: 'washerwoman', hint: 'the true Townsfolk the washerwoman learned' },
    { label: 'Wrong', roleId: 'washerwoman', hint: 'the decoy player shown' },
  ],
  librarian: [
    { label: 'Outsider', roleId: 'librarian', hint: 'the true Outsider' },
    { label: 'Wrong', roleId: 'librarian', hint: 'the decoy player shown' },
  ],
  investigator: [
    { label: 'Minion', roleId: 'investigator', hint: 'the true Minion' },
    { label: 'Wrong', roleId: 'investigator', hint: 'the decoy player shown' },
  ],
  fortune_teller: [
    { label: 'Red Herring', roleId: 'fortune_teller', hint: 'registers as Demon to the Fortune Teller' },
  ],
  monk: [
    { label: 'Safe', roleId: 'monk', hint: 'protected from the Demon tonight' },
  ],
  butler: [
    { label: 'Master', roleId: 'butler', hint: 'butler can only vote if master votes' },
  ],
  poisoner: [
    { label: 'Poisoned', roleId: 'poisoner', hint: 'abilities give wrong info; actions fail' },
  ],
  imp: [
    { label: 'Dead', roleId: 'imp', hint: 'killed by the Imp' },
  ],
  scarlet_woman: [
    { label: 'Demon', roleId: 'scarlet_woman', hint: 'became the Demon via Scarlet Woman' },
  ],

  // ===== Sects & Violets =====
  snake_charmer: [
    { label: 'Poisoned', roleId: 'snake_charmer', hint: 'failed snake-charm poisoned the charmer' },
  ],
  witch: [
    { label: 'Cursed', roleId: 'witch', hint: 'dies if nominated tomorrow' },
  ],
  cerenovus: [
    { label: 'Mad', roleId: 'cerenovus', hint: 'must act mad about a character tomorrow' },
  ],
  pit_hag: [
    { label: 'Transformed', roleId: 'pit_hag', hint: 'pit-hag changed this player' },
  ],
  fang_gu: [
    { label: 'Dead', roleId: 'fang_gu', hint: 'killed by the Fang Gu' },
    { label: 'Is Demon', roleId: 'fang_gu', hint: 'outsider flipped to Fang Gu' },
  ],
  no_dashii: [
    { label: 'Poisoned', roleId: 'no_dashii', hint: 'townsfolk neighbor of No Dashii' },
    { label: 'Dead', roleId: 'no_dashii' },
  ],
  vigormortis: [
    { label: 'Has Ability', roleId: 'vigormortis', hint: 'dead minion keeps their ability' },
    { label: 'Poisoned', roleId: 'vigormortis', hint: 'townsfolk poisoned by minion neighbor' },
    { label: 'Dead', roleId: 'vigormortis' },
  ],
  vortox: [
    { label: 'Dead', roleId: 'vortox' },
  ],
  evil_twin: [
    { label: 'Twin', roleId: 'evil_twin', hint: 'opposing twin to the Evil Twin' },
  ],
  philosopher: [
    { label: 'Drunk', roleId: 'philosopher', hint: 'character the philosopher copied is drunk' },
  ],
  sweetheart: [
    { label: 'Drunk', roleId: 'sweetheart', hint: 'drunk from Sweetheart\'s death' },
  ],
  mutant: [
    { label: 'Mad', roleId: 'mutant', hint: 'must not break madness or face execution' },
  ],

  // ===== Bad Moon Rising =====
  grandmother: [
    { label: 'Grandchild', roleId: 'grandmother', hint: 'the known good player; both die together' },
  ],
  sailor: [
    { label: 'Drunk', roleId: 'sailor', hint: 'drunk until dusk from the sailor' },
  ],
  innkeeper: [
    { label: 'Safe', roleId: 'innkeeper', hint: 'can\'t die tonight' },
    { label: 'Drunk', roleId: 'innkeeper', hint: 'the other innkeeper target is drunk until dusk' },
  ],
  exorcist: [
    { label: 'Exorcised', roleId: 'exorcist', hint: 'the demon chosen; does not wake tonight' },
  ],
  courtier: [
    { label: 'Drunk 3', roleId: 'courtier', hint: 'drunk for 3 days/nights - decrement each night' },
    { label: 'Drunk 2', roleId: 'courtier' },
    { label: 'Drunk 1', roleId: 'courtier' },
  ],
  gambler: [
    { label: 'Dead', roleId: 'gambler', hint: 'gambler guessed wrong' },
  ],
  professor: [
    { label: 'Alive', roleId: 'professor', hint: 'resurrected by the professor' },
  ],
  fool: [
    { label: 'Used Ability', roleId: 'fool', hint: 'survived death once; next death is real' },
  ],
  goon: [
    { label: 'Drunk', roleId: 'goon', hint: 'the player who chose the goon is drunk until dusk' },
  ],
  godfather: [
    { label: 'Dead', roleId: 'godfather', hint: 'killed by the godfather' },
  ],
  devils_advocate: [
    { label: 'Safe', roleId: 'devils_advocate', hint: 'survives execution tomorrow' },
  ],
  assassin: [
    { label: 'Dead', roleId: 'assassin', hint: 'assassin kill (bypasses protection)' },
  ],
  zombuul: [
    { label: 'Dead', roleId: 'zombuul' },
    { label: 'Used Ability', roleId: 'zombuul', hint: 'first-death revival already consumed' },
  ],
  pukka: [
    { label: 'Poisoned', roleId: 'pukka', hint: 'will die next night; displaces previous poison' },
    { label: 'Dead', roleId: 'pukka' },
  ],
  shabaloth: [
    { label: 'Dead', roleId: 'shabaloth' },
    { label: 'Regurgitated', roleId: 'shabaloth', hint: 'may return from the dead' },
  ],
  po: [
    { label: 'Dead', roleId: 'po' },
    { label: '3 Attacks', roleId: 'po', hint: 'po chose nobody last night; 3 kills tonight' },
  ],
};

// Generic "scratch" tokens any storyteller might want, regardless of role.
export const GENERIC_TOKENS: string[] = [
  'Poisoned',
  'Drunk',
  'Safe',
  'Dead',
  'Mad',
  'Cursed',
  'Used Ability',
  'Target',
];

/** Get tokens for a specific role (empty array if none defined). */
export function getTokensForRole(roleId: string): TokenInfo[] {
  return ROLE_TOKENS[roleId] ?? [];
}

/** Get every token string known across every role, plus generics, deduped. */
export function getAllKnownTokens(): string[] {
  const set = new Set<string>(GENERIC_TOKENS);
  for (const arr of Object.values(ROLE_TOKENS)) {
    for (const t of arr) set.add(t.label);
  }
  return Array.from(set).sort();
}
