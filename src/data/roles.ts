import type { Role, RoleComposition } from '../types/game';

export const TROUBLE_BREWING_ROLES: Role[] = [
  // Townsfolk (13)
  {
    id: 'washerwoman',
    name: 'Washerwoman',
    type: 'townsfolk',
    team: 'good',
    ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
    firstNight: 2,
    otherNights: 0,
  },
  {
    id: 'librarian',
    name: 'Librarian',
    type: 'townsfolk',
    team: 'good',
    ability: 'You start knowing that 1 of 2 players is a particular Outsider (or that zero are in play).',
    firstNight: 3,
    otherNights: 0,
  },
  {
    id: 'investigator',
    name: 'Investigator',
    type: 'townsfolk',
    team: 'good',
    ability: 'You start knowing that 1 of 2 players is a particular Minion.',
    firstNight: 4,
    otherNights: 0,
  },
  {
    id: 'chef',
    name: 'Chef',
    type: 'townsfolk',
    team: 'good',
    ability: 'You start knowing how many pairs of evil players there are.',
    firstNight: 5,
    otherNights: 0,
  },
  {
    id: 'empath',
    name: 'Empath',
    type: 'townsfolk',
    team: 'good',
    ability: 'Each night, you learn how many of your 2 alive neighbours are evil.',
    firstNight: 6,
    otherNights: 5,
  },
  {
    id: 'fortune_teller',
    name: 'Fortune Teller',
    type: 'townsfolk',
    team: 'good',
    ability: 'Each night, choose 2 players: you learn if either is the Demon. There is a good player that registers as the Demon to you.',
    firstNight: 7,
    otherNights: 6,
  },
  {
    id: 'undertaker',
    name: 'Undertaker',
    type: 'townsfolk',
    team: 'good',
    ability: 'Each night*, you learn which character died by execution today.',
    firstNight: 0,
    otherNights: 7,
  },
  {
    id: 'monk',
    name: 'Monk',
    type: 'townsfolk',
    team: 'good',
    ability: 'Each night*, choose a player (not yourself): they are safe from the Demon tonight.',
    firstNight: 0,
    otherNights: 2,
  },
  {
    id: 'ravenkeeper',
    name: 'Ravenkeeper',
    type: 'townsfolk',
    team: 'good',
    ability: 'If you die at night, you are woken to choose a player: you learn their character.',
    firstNight: 0,
    otherNights: 4,
  },
  {
    id: 'virgin',
    name: 'Virgin',
    type: 'townsfolk',
    team: 'good',
    ability: 'The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately.',
    firstNight: 0,
    otherNights: 0,
  },
  {
    id: 'slayer',
    name: 'Slayer',
    type: 'townsfolk',
    team: 'good',
    ability: 'Once per game, during the day, publicly choose a player: if they are the Demon, they die.',
    firstNight: 0,
    otherNights: 0,
  },
  {
    id: 'soldier',
    name: 'Soldier',
    type: 'townsfolk',
    team: 'good',
    ability: 'You are safe from the Demon.',
    firstNight: 0,
    otherNights: 0,
  },
  {
    id: 'mayor',
    name: 'Mayor',
    type: 'townsfolk',
    team: 'good',
    ability: 'If only 3 players live & no execution occurs, your team wins. If you would die at night, another player might die instead.',
    firstNight: 0,
    otherNights: 0,
  },
  // Outsiders (4)
  {
    id: 'butler',
    name: 'Butler',
    type: 'outsider',
    team: 'good',
    ability: 'Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too.',
    firstNight: 8,
    otherNights: 8,
  },
  {
    id: 'drunk',
    name: 'Drunk',
    type: 'outsider',
    team: 'good',
    ability: 'You do not know you are the Drunk. You think you are a Townsfolk character, but you are not.',
    firstNight: 0,
    otherNights: 0,
  },
  {
    id: 'recluse',
    name: 'Recluse',
    type: 'outsider',
    team: 'good',
    ability: 'You might register as evil & as a Minion or Demon, even if dead.',
    firstNight: 0,
    otherNights: 0,
  },
  {
    id: 'saint',
    name: 'Saint',
    type: 'outsider',
    team: 'good',
    ability: 'If you die by execution, your team loses.',
    firstNight: 0,
    otherNights: 0,
  },
  // Minions (4)
  {
    id: 'poisoner',
    name: 'Poisoner',
    type: 'minion',
    team: 'evil',
    ability: 'Each night, choose a player: they are poisoned tonight and tomorrow day.',
    firstNight: 1,
    otherNights: 1,
  },
  {
    id: 'spy',
    name: 'Spy',
    type: 'minion',
    team: 'evil',
    ability: 'Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead.',
    firstNight: 9,
    otherNights: 9,
  },
  {
    id: 'scarlet_woman',
    name: 'Scarlet Woman',
    type: 'minion',
    team: 'evil',
    ability: 'If there are 5 or more players alive & the Demon dies, you become the Demon.',
    firstNight: 0,
    otherNights: 0,
  },
  {
    id: 'baron',
    name: 'Baron',
    type: 'minion',
    team: 'evil',
    ability: 'There are extra Outsiders in play. (+2 Outsiders)',
    firstNight: 0,
    otherNights: 0,
  },
  // Demons (1)
  {
    id: 'imp',
    name: 'Imp',
    type: 'demon',
    team: 'evil',
    ability: 'Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.',
    firstNight: 0,
    otherNights: 3,
  },
];

export const ROLE_COMPOSITIONS: Record<number, RoleComposition> = {
  5:  { townsfolk: 3, outsiders: 0, minions: 1, demons: 1 },
  6:  { townsfolk: 3, outsiders: 1, minions: 1, demons: 1 },
  7:  { townsfolk: 5, outsiders: 0, minions: 1, demons: 1 },
  8:  { townsfolk: 5, outsiders: 1, minions: 1, demons: 1 },
  9:  { townsfolk: 5, outsiders: 2, minions: 1, demons: 1 },
  10: { townsfolk: 7, outsiders: 0, minions: 2, demons: 1 },
  11: { townsfolk: 7, outsiders: 1, minions: 2, demons: 1 },
  12: { townsfolk: 7, outsiders: 2, minions: 2, demons: 1 },
  13: { townsfolk: 9, outsiders: 0, minions: 3, demons: 1 },
  14: { townsfolk: 9, outsiders: 1, minions: 3, demons: 1 },
  15: { townsfolk: 9, outsiders: 2, minions: 3, demons: 1 },
};

export function getComposition(playerCount: number, hasBaronInPlay: boolean): RoleComposition | null {
  const base = ROLE_COMPOSITIONS[playerCount];
  if (!base) return null;
  if (!hasBaronInPlay) return base;
  // Baron adds 2 outsiders, removes 2 townsfolk
  return {
    ...base,
    townsfolk: base.townsfolk - 2,
    outsiders: base.outsiders + 2,
  };
}

export function getRoleById(roleId: string, customRoles: Role[] = []): Role | undefined {
  return TROUBLE_BREWING_ROLES.find(r => r.id === roleId) ?? customRoles.find(r => r.id === roleId);
}

export function getRolesForScript(scriptId: string, customRoles: Role[] = []): Role[] {
  if (scriptId === 'trouble_brewing') return TROUBLE_BREWING_ROLES;
  return customRoles;
}
