/**
 * Example usage of the React Three Fiber Viewer3D
 *
 * This file shows how to integrate the new R3F-based 3D viewer
 * into your existing application.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Viewer3D, useViewerStore } from './index';

// Example: Basic usage
function BasicViewer({ model }) {
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <Viewer3D
                model={model}
                onItemSelected={(item, itemModel) => {
                    console.log('Item selected:', itemModel);
                }}
                onWallClicked={(evt) => {
                    console.log('Wall clicked:', evt.item);
                }}
                onRoomClicked={(evt) => {
                    console.log('Room clicked:', evt.item);
                }}
            />
        </div>
    );
}

// Example: With custom options
function CustomViewer({ model }) {
    return (
        <Viewer3D
            model={model}
            options={{
                occludedRoofs: false,
                occludedWalls: false,
                gridVisibility: true,
            }}
            style={{ width: '800px', height: '600px' }}
        />
    );
}

// Example: Using the store directly
function ViewerWithControls({ model }) {
    const selectedItem = useViewerStore((state) => state.selectedItem);
    const deselectItem = useViewerStore((state) => state.deselectItem);
    const setGridSize = useViewerStore((state) => state.setGridSize);

    return (
        <div>
            <div style={{ padding: '10px', background: '#f0f0f0' }}>
                <button onClick={deselectItem}>Deselect</button>
                <button onClick={() => setGridSize(10000)}>Large Grid</button>
                <button onClick={() => setGridSize(5000)}>Normal Grid</button>
                {selectedItem && (
                    <span>Selected: {selectedItem.itemModel?.name || 'Unknown'}</span>
                )}
            </div>
            <div style={{ width: '100%', height: 'calc(100vh - 50px)' }}>
                <Viewer3D model={model} />
            </div>
        </div>
    );
}

// Example: Mount function for non-React apps
export function mountViewer3D(containerId, model, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container #${containerId} not found`);
        return null;
    }

    const root = createRoot(container);
    root.render(
        <Viewer3D
            model={model}
            options={options}
            onItemSelected={options.onItemSelected}
            onWallClicked={options.onWallClicked}
            onRoomClicked={options.onRoomClicked}
        />
    );

    return {
        unmount: () => root.unmount(),
        getStore: () => useViewerStore.getState(),
    };
}

/**
 * Migration guide from old Viewer3D to new R3F Viewer3D:
 *
 * OLD (Class-based):
 * ```js
 * const viewer = new Viewer3D(model, 'viewer-container', options);
 * viewer.enabled = true;
 * viewer.addRoomplanListener(EVENT_ITEM_SELECTED, handler);
 * ```
 *
 * NEW (React):
 * ```jsx
 * <Viewer3D
 *   model={model}
 *   options={options}
 *   onItemSelected={handler}
 * />
 * ```
 *
 * Or with the mount function for non-React apps:
 * ```js
 * const viewer = mountViewer3D('viewer-container', model, {
 *   onItemSelected: handler,
 *   ...options
 * });
 * ```
 *
 * Store usage (replaces events):
 * ```js
 * import { useViewerStore } from './viewer3d-r3f';
 *
 * // In React component:
 * const selectedItem = useViewerStore((state) => state.selectedItem);
 *
 * // Outside React:
 * const state = useViewerStore.getState();
 * useViewerStore.subscribe((state) => console.log(state.selectedItem));
 * ```
 */

export { BasicViewer, CustomViewer, ViewerWithControls };
