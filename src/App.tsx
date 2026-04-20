import { useState } from 'react';
import { useGameStore } from './hooks/useGameStore';
import { ThemePicker } from './components/ThemePicker';
import { TabBar } from './components/TabBar';
import { SetupPanel } from './components/SetupPanel';
import { NightPanel } from './components/NightPanel';
import { DayPanel } from './components/DayPanel';
import { PlayersPanel } from './components/PlayersPanel';
import { LogPanel } from './components/LogPanel';
import { CustomRolesPanel } from './components/CustomRolesPanel';
import { createPortal } from 'react-dom';

const SYMBOL_KEY = [
  { icon: '\u2620\uFE0F', label: 'Dead' },
  { icon: '\u2623\uFE0F', label: 'Poisoned' },
  { icon: '\uD83C\uDF7A', label: 'Drunk' },
  { icon: '\uD83D\uDEE1\uFE0F', label: 'Protected (Monk/Innkeeper)' },
  { icon: '\uD83E\uDDD9', label: 'Witch Cursed (dies if nominated)' },
  { icon: '\u2694\uFE0F', label: 'Pending Execution (dies at dusk)' },
  { icon: '\uD83D\uDC80', label: 'Marked for Kill (pending night end)' },
  { icon: '\uD83D\uDC7B', label: 'Ghost Vote Available' },
];

const BADGE_KEY = [
  { color: 'bg-emerald-500', label: 'Alive' },
  { color: 'bg-red-500', label: 'Dead' },
  { color: 'bg-amber-500', label: 'Missed/Pending' },
  { color: 'bg-purple-500', label: 'Gift/Special Encounter' },
];

const COLOR_KEY = [
  { color: 'text-accent', label: 'Townsfolk' },
  { color: 'text-cyan', label: 'Outsider' },
  { color: 'text-orange', label: 'Minion' },
  { color: 'text-red', label: 'Demon' },
];

function App() {
  const store = useGameStore();
  const { state } = store;
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="min-h-full flex flex-col bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-raised/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-fg-bright tracking-tight">Clocktower ST</h1>
          {state.setupComplete && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface2 text-fg-dim">
              {state.phase === 'night' ? `Night ${state.dayNumber}` : `Day ${state.dayNumber}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state.setupComplete && (
            <button
              onClick={store.undoLastAction}
              disabled={!store.canUndo}
              className={`text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
                store.canUndo
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 active:scale-95'
                  : 'bg-surface2 text-fg-dim opacity-30 cursor-not-allowed'
              }`}
            >
              ↩ Undo
            </button>
          )}
          {state.setupComplete && (
            <button
              onClick={() => {
                if (confirm('Reset game? All progress will be lost.')) {
                  store.resetGame();
                }
              }}
              className="text-xs px-2 py-1.5 rounded bg-surface2 text-fg-dim hover:text-red transition-colors"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setShowInfo(true)}
            className="w-8 h-8 rounded-full bg-surface2 text-fg-dim hover:text-fg text-sm font-bold flex items-center justify-center transition-colors"
            title="Symbol key"
          >
            ?
          </button>
          <ThemePicker />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {state.currentTab === 'setup' && (
          <div>
            <SetupPanel
              players={state.players}
              scriptId={state.scriptId}
              customRoles={state.customRoles}
              onAddPlayer={store.addPlayer}
              onRemovePlayer={store.removePlayer}
              onReorderPlayers={store.reorderPlayers}
              onAssignRole={store.assignRole}
              onSetCoverRole={store.setCoverRole}
              onStartGame={store.startGame}
              onAddLogEntry={store.addLogEntry}
              onSetScript={store.setScript}
            />
            <div className="px-4 pb-24">
              <CustomRolesPanel
                scriptId={state.scriptId}
                customRoles={state.customRoles}
                onAddCustomRole={store.addCustomRole}
                onRemoveCustomRole={store.removeCustomRole}
                onSetCustomRoles={store.setCustomRoles}
              />
            </div>
          </div>
        )}

        {state.currentTab === 'game' && state.setupComplete && (
          <div>
            {/* Phase indicator -- sticky so you always know where you are */}
            <div className={`sticky top-[52px] z-10 px-4 py-2.5 border-b border-border ${
              state.phase === 'night'
                ? 'bg-indigo-950/90 backdrop-blur text-indigo-200'
                : 'bg-amber-950/80 backdrop-blur text-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{state.phase === 'night' ? '🌙' : '☀️'}</span>
                  <span className="text-sm font-bold">
                    {state.phase === 'night' ? `Night ${state.dayNumber}` : `Day ${state.dayNumber}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Timeline dots showing game progression */}
                  {Array.from({ length: state.dayNumber }, (_, i) => {
                    const dayNum = i + 1;
                    const isCurrentNight = state.phase === 'night' && dayNum === state.dayNumber;
                    const isCurrentDay = state.phase === 'day' && dayNum === state.dayNumber;
                    const isPast = dayNum < state.dayNumber;
                    return (
                      <div key={dayNum} className="flex items-center gap-0.5">
                        {/* Night dot */}
                        <div className={`w-2 h-2 rounded-full ${
                          isCurrentNight ? 'bg-indigo-400 ring-2 ring-indigo-400/30' :
                          isPast || isCurrentDay ? 'bg-indigo-400/50' : 'bg-indigo-900'
                        }`} title={`Night ${dayNum}`} />
                        {/* Day dot (only if we've reached this day) */}
                        {(isPast || isCurrentDay) && (
                          <div className={`w-2 h-2 rounded-full ${
                            isCurrentDay ? 'bg-amber-400 ring-2 ring-amber-400/30' :
                            isPast ? 'bg-amber-400/50' : 'bg-amber-900'
                          }`} title={`Day ${dayNum}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="text-[10px] mt-1 opacity-60">
                {state.phase === 'night'
                  ? (state.isFirstNight ? 'First night -- wake roles in order below' : 'Wake roles in order, record actions')
                  : `${state.players.filter(p => p.alive).length} alive -- discuss and nominate`
                }
              </div>
            </div>

            {state.phase === 'night' ? (
              <NightPanel
                players={state.players}
                isFirstNight={state.isFirstNight}
                dayNumber={state.dayNumber}
                scriptId={state.scriptId}
                customRoles={state.customRoles}
                onUpdatePlayer={store.updatePlayer}
                onAddLogEntry={store.addLogEntry}
                onStartDay={store.startDay}
              />
            ) : (
              <DayPanel
                players={state.players}
                dayNumber={state.dayNumber}
                nominations={state.nominations}
                timerDuration={state.timerDuration}
                customRoles={state.customRoles}
                onUpdatePlayer={store.updatePlayer}
                onAddNomination={store.addNomination}
                onUpdateNomination={store.updateNomination}
                onRemoveNomination={store.removeNomination}
                onAddLogEntry={store.addLogEntry}
                onAdvanceToNextNight={store.advanceToNextNight}
                onUpdate={store.update}
                onSaveSnapshot={store.saveSnapshot}
                onEndGame={store.endGame}
              />
            )}
          </div>
        )}

        {state.currentTab === 'players' && state.setupComplete && (
          <PlayersPanel
            players={state.players}
            customRoles={state.customRoles}
            onUpdatePlayer={store.updatePlayer}
            onAddLogEntry={store.addLogEntry}
          />
        )}

        {state.currentTab === 'log' && state.setupComplete && (
          <LogPanel
            log={state.log}
            onRemoveLastLog={store.removeLastLog}
          />
        )}
      </main>

      {/* Tab bar */}
      <TabBar
        current={state.currentTab}
        onChange={store.setTab}
        setupComplete={state.setupComplete}
      />

      {/* Info / Symbol Key modal */}
      {showInfo && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-bg-raised shadow-2xl border border-border max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-fg-bright">Symbol Key</h2>
              <button onClick={() => setShowInfo(false)} className="text-fg-dim hover:text-fg text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
              {/* Status Icons */}
              <div>
                <h3 className="text-xs font-bold text-fg-dim uppercase tracking-wider mb-2">Status Icons</h3>
                <div className="space-y-2">
                  {SYMBOL_KEY.map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-lg w-8 text-center">{s.icon}</span>
                      <span className="text-sm text-fg">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role Colors */}
              <div>
                <h3 className="text-xs font-bold text-fg-dim uppercase tracking-wider mb-2">Role Types</h3>
                <div className="space-y-2">
                  {COLOR_KEY.map(c => (
                    <div key={c.label} className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-8 text-center ${c.color}`}>{c.label.charAt(0)}</span>
                      <span className="text-sm text-fg">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Night Flow */}
              <div>
                <h3 className="text-xs font-bold text-fg-dim uppercase tracking-wider mb-2">Night Flow</h3>
                <div className="text-sm text-fg-dim space-y-1">
                  <p>1. Roles wake in order (lowest number first)</p>
                  <p>2. Pick targets / record info for each role</p>
                  <p>3. Click "Mark Done" to complete each step</p>
                  <p>4. Pending actions (poison, protect, kill) apply when you click "End Night"</p>
                  <p>5. Poisoner acts first, so their poison affects later roles that night</p>
                </div>
              </div>

              {/* Day Flow */}
              <div>
                <h3 className="text-xs font-bold text-fg-dim uppercase tracking-wider mb-2">Day Flow</h3>
                <div className="text-sm text-fg-dim space-y-1">
                  <p>1. Check Storyteller Notes for auto-computed info</p>
                  <p>2. Each player can nominate once per day</p>
                  <p>3. Each player can be nominated once per day</p>
                  <p>4. Executed players stay alive for voting that day (die at dusk)</p>
                  <p>5. Dead players get one ghost vote for the whole game</p>
                </div>
              </div>

              {/* Tips */}
              <div>
                <h3 className="text-xs font-bold text-fg-dim uppercase tracking-wider mb-2">Tips</h3>
                <div className="text-sm text-fg-dim space-y-1">
                  <p>Undo reverts the entire game state (including deaths, effects, phase)</p>
                  <p>Active Effects bar on the day view shows all current statuses</p>
                  <p>Storyteller Notes auto-compute info for Flowergirl, Town Crier, Empath, Oracle</p>
                  <p>Orange text means "give false info" (player is poisoned or drunk)</p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default App;
