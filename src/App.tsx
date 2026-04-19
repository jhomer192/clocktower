import { useGameStore } from './hooks/useGameStore';
import { ThemePicker } from './components/ThemePicker';
import { TabBar } from './components/TabBar';
import { SetupPanel } from './components/SetupPanel';
import { NightPanel } from './components/NightPanel';
import { DayPanel } from './components/DayPanel';
import { PlayersPanel } from './components/PlayersPanel';
import { LogPanel } from './components/LogPanel';
import { CustomRolesPanel } from './components/CustomRolesPanel';

function App() {
  const store = useGameStore();
  const { state } = store;

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
    </div>
  );
}

export default App;
