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
        const dropX = e.clientX - rect.left;
        const dropY = e.clientY - rect.top;

        // Convert screen coordinates to world coordinates using the floorplanner
        const floorplanner = blueprint.floorplanner;
        const viewportContainer = floorplanner.viewportContainer;

        if (!viewportContainer) return;

        // Convert to world coordinates (taking into account pan and zoom)
        const worldX = (dropX - viewportContainer.x) / viewportContainer.scale.x;
        const worldY = (dropY - viewportContainer.y) / viewportContainer.scale.y;

        // Add the item at the drop position
        const helper = blueprint.floorplanningHelper;
        let success = false;

        if (itemType === 'door') {
            success = helper.addDoorAtPosition(worldX, worldY, 7);
        } else if (itemType === 'window') {
            success = helper.addWindowAtPosition(worldX, worldY);
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
