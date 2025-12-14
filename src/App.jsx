import React, { useCallback } from 'react';
import { useAppStore, ViewModes } from './stores/appStore';
import { useBlueprint, useBlueprintEvents } from './hooks';
import { Toolbar, Sidebar, StatusBar } from './components/layout';

export function App() {
    const currentView = useAppStore((s) => s.currentView);
    const blueprint = useAppStore((s) => s.blueprint);

    const { isReady } = useBlueprint({
        viewer2dId: 'viewer-2d',
        viewer3dId: 'viewer-3d',
    });

    // Listen to blueprint events
    useBlueprintEvents();

    // Handle drag over to allow drop
    const handleDragOver = useCallback((e) => {
        if (e.dataTransfer.types.includes('application/x-floorplan-item')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    }, []);

    // Handle drop of door/window items
    const handleDrop = useCallback((e) => {
        e.preventDefault();

        const itemType = e.dataTransfer.getData('application/x-floorplan-item');
        if (!itemType || !blueprint?.floorplanningHelper || !blueprint?.floorplanner) {
            return;
        }

        // Get drop position relative to the viewer container
        const viewer2dEl = document.getElementById('viewer-2d');
        if (!viewer2dEl) return;

        const rect = viewer2dEl.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Convert screen coordinates to world coordinates in cm using the floorplanner's method
        const floorplanner = blueprint.floorplanner;

        if (!floorplanner.screenToCm) {
            console.error('[handleDrop] floorplanner.screenToCm not available');
            return;
        }

        // Use the floorplanner's screenToCm method which handles both viewport transform and pixel/cm conversion
        const worldCm = floorplanner.screenToCm(screenX, screenY);

        console.log('[handleDrop] screenPos:', screenX.toFixed(0), screenY.toFixed(0),
            '| worldCm:', worldCm.x.toFixed(0), worldCm.y.toFixed(0));

        // Add the item at the drop position (in cm)
        const helper = blueprint.floorplanningHelper;
        let success = false;

        if (itemType === 'door') {
            success = helper.addDoorAtPosition(worldCm.x, worldCm.y, 7);
        } else if (itemType === 'window') {
            success = helper.addWindowAtPosition(worldCm.x, worldCm.y);
        }

        if (!success) {
            console.log('Could not add item - no wall nearby');
        }
    }, [blueprint]);

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
                        className={`absolute inset-0 ${currentView === ViewModes.VIEW_2D ? 'visible' : 'invisible'
                            }`}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    />

                    {/* 3D Viewer - BlueprintJS will mount R3F here */}
                    <div
                        id="viewer-3d"
                        className={`absolute inset-0 ${currentView === ViewModes.VIEW_3D ? 'visible' : 'invisible'
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
