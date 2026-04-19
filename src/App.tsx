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
          {state.setupComplete && store.canUndo && (
            <button
              onClick={store.undoLastAction}
              className="text-xs px-2 py-1.5 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors font-medium"
            >
              Undo
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
            />
            <div className="px-4 pb-24">
              <CustomRolesPanel
                customRoles={state.customRoles}
                onAddCustomRole={store.addCustomRole}
                onRemoveCustomRole={store.removeCustomRole}
              />
            </div>
          </div>
        )}

        {state.currentTab === 'night' && state.setupComplete && (
          <NightPanel
            players={state.players}
            isFirstNight={state.isFirstNight}
            dayNumber={state.dayNumber}
            customRoles={state.customRoles}
            onUpdatePlayer={store.updatePlayer}
            onAddLogEntry={store.addLogEntry}
            onStartDay={store.startDay}
          />
        )}

        {state.currentTab === 'day' && state.setupComplete && (
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
          />
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
