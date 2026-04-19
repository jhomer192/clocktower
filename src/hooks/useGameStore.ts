import { useState, useCallback, useEffect } from 'react';
import type { GameState, Player, Nomination, NightAction, Tab, Role } from '../types/game';

const STORAGE_KEY = 'clocktower-game';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function defaultState(): GameState {
  return {
    players: [],
    scriptId: 'trouble_brewing',
    customRoles: [],
    phase: 'setup',
    dayNumber: 0,
    isFirstNight: true,
    nightActions: [],
    nominations: [],
    log: [],
    timerDuration: 300,
    currentTab: 'setup',
    setupComplete: false,
  };
}

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = { ...defaultState(), ...JSON.parse(saved) };
      // Migrate legacy 'night'/'day' tabs to unified 'game' tab
      if (parsed.currentTab === 'night' || parsed.currentTab === 'day') {
        parsed.currentTab = 'game';
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return defaultState();
}

function saveState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function useGameStore() {
  const [state, setState] = useState<GameState>(loadState);
  const [stateHistory, setStateHistory] = useState<GameState[]>([]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Save a snapshot before major actions (phase changes, executions, kills)
  const saveSnapshot = useCallback((label?: string) => {
    setState(prev => {
      setStateHistory(h => [...h.slice(-20), prev]); // keep last 20 snapshots
      return prev;
    });
    if (label) {
      // just for debugging
    }
  }, []);

  // Undo to last snapshot
  const undoLastAction = useCallback(() => {
    setStateHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setState(last);
      return prev.slice(0, -1);
    });
  }, []);

  const canUndo = stateHistory.length > 0;

  const update = useCallback((partial: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => {
    setState(prev => {
      const changes = typeof partial === 'function' ? partial(prev) : partial;
      return { ...prev, ...changes };
    });
  }, []);

  const addLogEntry = useCallback((phase: string, text: string) => {
    setState(prev => ({
      ...prev,
      log: [...prev.log, { id: generateId(), phase, timestamp: Date.now(), text }],
    }));
  }, []);

  const removeLastLog = useCallback(() => {
    setState(prev => ({
      ...prev,
      log: prev.log.slice(0, -1),
    }));
  }, []);

  const setTab = useCallback((tab: Tab) => {
    setState(prev => ({ ...prev, currentTab: tab }));
  }, []);

  const setScript = useCallback((scriptId: string) => {
    setState(prev => ({
      ...prev,
      scriptId,
      // Clear role assignments when switching scripts
      players: prev.players.map(p => ({ ...p, role: undefined, coverRole: undefined })),
    }));
  }, []);

  // Player management
  const addPlayer = useCallback((name: string) => {
    setState(prev => ({
      ...prev,
      players: [...prev.players, {
        id: generateId(),
        name,
        alive: true,
        ghostVoteUsed: false,
        poisoned: false,
        protected: false,
        drunkPoisoned: false,
        effects: [],
      }],
    }));
  }, []);

  const removePlayer = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== id),
    }));
  }, []);

  const reorderPlayers = useCallback((players: Player[]) => {
    setState(prev => ({ ...prev, players }));
  }, []);

  const updatePlayer = useCallback((id: string, changes: Partial<Player>) => {
    setState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === id ? { ...p, ...changes } : p),
    }));
  }, []);

  const assignRole = useCallback((playerId: string, roleId: string) => {
    setState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === playerId ? { ...p, role: roleId, coverRole: undefined } : p),
    }));
  }, []);

  const setCoverRole = useCallback((playerId: string, coverRoleId: string) => {
    setState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === playerId ? { ...p, coverRole: coverRoleId } : p),
    }));
  }, []);

  // Phase management
  const startGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      setupComplete: true,
      phase: 'night',
      dayNumber: 1,
      isFirstNight: true,
      currentTab: 'game',
    }));
  }, []);

  const startNight = useCallback(() => {
    saveSnapshot('startNight');
    setState(prev => {
      const newDayNumber = prev.phase === 'day' ? prev.dayNumber : prev.dayNumber;
      return {
        ...prev,
        phase: 'night',
        isFirstNight: false,
        nightActions: [],
        currentTab: 'game',
        dayNumber: newDayNumber,
        // Clear nightly statuses
        players: prev.players.map(p => ({ ...p, protected: false })),
      };
    });
  }, []);

  const startDay = useCallback(() => {
    saveSnapshot('startDay');
    setState(prev => ({
      ...prev,
      phase: 'day',
      nominations: [],
      currentTab: 'game',
    }));
  }, []);

  const advanceToNextNight = useCallback(() => {
    saveSnapshot('advanceToNextNight');
    setState(prev => ({
      ...prev,
      phase: 'night',
      dayNumber: prev.dayNumber + 1,
      isFirstNight: false,
      nightActions: [],
      nominations: [],
      currentTab: 'game',
      players: prev.players.map(p => ({ ...p, protected: false, poisoned: p.drunkPoisoned ? true : false })),
    }));
  }, []);

  // Night actions
  const addNightAction = useCallback((action: NightAction) => {
    setState(prev => ({
      ...prev,
      nightActions: [...prev.nightActions, action],
    }));
  }, []);

  // Nominations
  const addNomination = useCallback((nom: Nomination) => {
    setState(prev => ({
      ...prev,
      nominations: [...prev.nominations, nom],
    }));
  }, []);

  const updateNomination = useCallback((index: number, changes: Partial<Nomination>) => {
    setState(prev => ({
      ...prev,
      nominations: prev.nominations.map((n, i) => i === index ? { ...n, ...changes } : n),
    }));
  }, []);

  // Custom roles
  const addCustomRole = useCallback((role: Role) => {
    setState(prev => ({
      ...prev,
      customRoles: [...prev.customRoles, role],
    }));
  }, []);

  const removeCustomRole = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      customRoles: prev.customRoles.filter(r => r.id !== id),
    }));
  }, []);

  const setCustomRoles = useCallback((roles: Role[]) => {
    setState(prev => ({ ...prev, customRoles: roles }));
  }, []);

  // End game: keep player names, clear everything else so a new game can start
  const endGame = useCallback(() => {
    setState(prev => ({
      ...defaultState(),
      players: prev.players.map(p => ({
        id: p.id,
        name: p.name,
        alive: true,
        ghostVoteUsed: false,
        poisoned: false,
        protected: false,
        drunkPoisoned: false,
        effects: [],
      })),
      customRoles: prev.customRoles,
      log: prev.log, // keep the log history across games
    }));
    setStateHistory([]);
  }, []);

  // Reset: full wipe including players
  const resetGame = useCallback(() => {
    setState(defaultState());
    setStateHistory([]);
  }, []);

  return {
    state,
    update,
    addLogEntry,
    removeLastLog,
    setTab,
    setScript,
    addPlayer,
    removePlayer,
    reorderPlayers,
    updatePlayer,
    assignRole,
    setCoverRole,
    startGame,
    startNight,
    startDay,
    advanceToNextNight,
    addNightAction,
    addNomination,
    updateNomination,
    addCustomRole,
    removeCustomRole,
    setCustomRoles,
    endGame,
    resetGame,
    saveSnapshot,
    undoLastAction,
    canUndo,
  };
}
