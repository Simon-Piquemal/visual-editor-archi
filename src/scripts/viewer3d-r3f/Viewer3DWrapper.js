/**
 * Wrapper class that provides the same API as the old Viewer3D
 * but uses React Three Fiber internally.
 *
 * This allows drop-in replacement in existing code.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Viewer3D } from './Viewer3D';
import { useViewerStore } from './store';

export class Viewer3DWrapper {
    constructor(model, elementId, options = {}) {
        this.model = model;
        this.elementId = elementId;
        this.options = options;
        this.floorplan = model.floorplan;

        this.__enabled = false;
        this.__root = null;
        this.__container = null;
        this.__eventListeners = new Map();

        // Get or create container
        this.__container = document.getElementById(elementId);
        if (!this.__container) {
            console.error(`Container #${elementId} not found`);
            return;
        }

        // Mount React app
        this.__mount();
    }

    __mount() {
        this.__root = createRoot(this.__container);
        this.__render();
    }

    __render() {
        this.__root.render(
            React.createElement(Viewer3D, {
                model: this.model,
                options: this.options,
                onItemSelected: (item, itemModel) => {
                    this.__dispatchEvent('EVENT_ITEM_SELECTED', { item, itemModel });
                },
                onWallClicked: (evt) => {
                    this.__dispatchEvent('EVENT_WALL_CLICKED', evt);
                },
                onRoomClicked: (evt) => {
                    this.__dispatchEvent('EVENT_ROOM_CLICKED', evt);
                },
            })
        );
    }

    __dispatchEvent(type, data) {
        const listeners = this.__eventListeners.get(type) || [];
        listeners.forEach(listener => {
            try {
                listener({ type, ...data });
            } catch (e) {
                console.error(`Error in event listener for ${type}:`, e);
            }
        });
    }

    // Public API - matches old Viewer3D

    get enabled() {
        return this.__enabled;
    }

    set enabled(flag) {
        this.__enabled = flag;
        useViewerStore.getState().setEnabled(flag);
    }

    get needsUpdate() {
        return useViewerStore.getState().needsUpdate;
    }

    set needsUpdate(flag) {
        useViewerStore.getState().setNeedsUpdate(flag);
    }

    get physicalRoomItems() {
        return useViewerStore.getState().physicalItems;
    }

    get camera() {
        // Note: Camera is managed by R3F, this is for compatibility
        return null;
    }

    get controls() {
        // Note: Controls are managed by R3F, this is for compatibility
        return null;
    }

    addEventListener(type, listener) {
        if (!this.__eventListeners.has(type)) {
            this.__eventListeners.set(type, []);
        }
        this.__eventListeners.get(type).push(listener);
    }

    removeEventListener(type, listener) {
        const listeners = this.__eventListeners.get(type);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    addRoomplanListener(type, listener) {
        this.addEventListener(type, listener);
    }

    removeRoomplanListener(type, listener) {
        this.removeEventListener(type, listener);
    }

    dispatchEvent(evt) {
        this.__dispatchEvent(evt.type, evt);
    }

    forceRender() {
        useViewerStore.getState().setNeedsUpdate(true);
    }

    pauseTheRendering(flag) {
        useViewerStore.getState().setNeedsUpdate(flag);
    }

    updateWindowSize() {
        // R3F handles this automatically
        useViewerStore.getState().setNeedsUpdate(true);
    }

    exportSceneAsGTLF() {
        // TODO: Implement GLTF export with R3F
        console.warn('GLTF export not yet implemented in R3F version');
    }

    destroy() {
        if (this.__root) {
            this.__root.unmount();
            this.__root = null;
        }
        this.__eventListeners.clear();
    }
}

// Also export as default and as Viewer3D for drop-in replacement
export { Viewer3DWrapper as Viewer3D };
export default Viewer3DWrapper;
