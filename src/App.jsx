import React from 'react';
import { useAppStore, ViewModes } from './stores/appStore';
import { useBlueprint, useBlueprintEvents } from './hooks';
import { Toolbar, Sidebar, StatusBar } from './components/layout';

export function App() {
    const currentView = useAppStore((s) => s.currentView);

    const { isReady } = useBlueprint({
        viewer2dId: 'viewer-2d',
        viewer3dId: 'viewer-3d',
    });

    // Listen to blueprint events
    useBlueprintEvents();

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <Toolbar />

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Viewer area */}
                <main className="flex-1 relative bg-background">
                    {/* Loading overlay */}
                    {!isReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                            <span className="text-text-secondary">Initializing viewers...</span>
                        </div>
                    )}

                    {/* 2D Viewer - BlueprintJS will mount PIXI here */}
                    <div
                        id="viewer-2d"
                        className={`absolute inset-0 ${
                            currentView === ViewModes.VIEW_2D ? 'visible' : 'invisible'
                        }`}
                    />

                    {/* 3D Viewer - BlueprintJS will mount R3F here */}
                    <div
                        id="viewer-3d"
                        className={`absolute inset-0 ${
                            currentView === ViewModes.VIEW_3D ? 'visible' : 'invisible'
                        }`}
                    />
                </main>

                {/* Sidebar */}
                <Sidebar />
            </div>

            {/* Status Bar */}
            <StatusBar />
        </div>
    );
}

export default App;
