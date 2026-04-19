export type RoleType = 'townsfolk' | 'outsider' | 'minion' | 'demon';
export type Team = 'good' | 'evil';
export type Phase = 'setup' | 'night' | 'day';
export type Tab = 'setup' | 'game' | 'players' | 'log';

export interface Role {
  id: string;
  name: string;
  type: RoleType;
  team: Team;
  ability: string;
  firstNight?: number;    // order in first night (0 = not active)
  otherNights?: number;   // order in other nights (0 = not active)
  custom?: boolean;
}

export interface Player {
  id: string;
  name: string;
  role?: string;        // role id
  coverRole?: string;   // for Drunk: the role they think they are
  alive: boolean;
  ghostVoteUsed: boolean;
  poisoned: boolean;
  protected: boolean;
  drunkPoisoned: boolean; // drunk = permanently "poisoned"
  effects: string[];    // free-text effects
}

export interface NightAction {
  roleId: string;
  playerId: string;
  description: string;
  result?: string;
}

export interface Nomination {
  nominatorId: string;
  nomineeId: string;
  votes: string[];       // player ids who voted
  executed: boolean;
}

export interface LogEntry {
  id: string;
  phase: string;        // "Night 1", "Day 1", etc.
  timestamp: number;
  text: string;
}

export interface GameState {
  players: Player[];
  scriptId: string;
  customRoles: Role[];
  phase: Phase;
  dayNumber: number;
  isFirstNight: boolean;
  nightActions: NightAction[];
  nominations: Nomination[];
  log: LogEntry[];
  timerDuration: number; // seconds
  currentTab: Tab;
  setupComplete: boolean;
}

export interface RoleComposition {
  townsfolk: number;
  outsiders: number;
  minions: number;
  demons: number;
}
