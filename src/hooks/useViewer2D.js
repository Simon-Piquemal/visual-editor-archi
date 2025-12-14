import { useCallback } from 'react';
import { useAppStore, ToolModes } from '../stores/appStore';

/**
 * Hook to control the 2D viewer
 */
export function useViewer2D() {
    const blueprint = useAppStore((s) => s.blueprint);
    const toolMode = useAppStore((s) => s.toolMode);
    const setToolMode = useAppStore((s) => s.setToolMode);
    const gridVisible = useAppStore((s) => s.gridVisible);
    const setGridVisible = useAppStore((s) => s.setGridVisible);
    const gridSize = useAppStore((s) => s.gridSize);
    const setGridSize = useAppStore((s) => s.setGridSize);
    const snapToGrid = useAppStore((s) => s.snapToGrid);
    const setSnapToGrid = useAppStore((s) => s.setSnapToGrid);

    const floorplanner = blueprint?.floorplanner;

    const switchToMove = useCallback(() => {
        setToolMode(ToolModes.MOVE);
    }, [setToolMode]);

    const switchToDraw = useCallback(() => {
        setToolMode(ToolModes.DRAW);
    }, [setToolMode]);

    const switchToTransform = useCallback(() => {
        setToolMode(ToolModes.TRANSFORM);
    }, [setToolMode]);

    const setGrid = useCallback((visible, size) => {
        setGridVisible(visible);
        if (size !== undefined) {
            setGridSize(size);
        }
        if (floorplanner) {
            floorplanner.setGridVisible?.(visible);
            if (size !== undefined) {
                floorplanner.setGridSpacing?.(size);
            }
        }
    }, [floorplanner, setGridVisible, setGridSize]);

    const setSnap = useCallback((enabled) => {
        setSnapToGrid(enabled);
        if (floorplanner) {
            floorplanner.setSnapToGrid?.(enabled);
        }
    }, [floorplanner, setSnapToGrid]);

    const zoomIn = useCallback(() => {
        if (floorplanner) {
            floorplanner.zoomIn?.();
        }
    }, [floorplanner]);

    const zoomOut = useCallback(() => {
        if (floorplanner) {
            floorplanner.zoomOut?.();
        }
    }, [floorplanner]);

    const resetZoom = useCallback(() => {
        if (floorplanner) {
            floorplanner.resetZoom?.();
        }
    }, [floorplanner]);

    const centerView = useCallback(() => {
        if (floorplanner) {
            floorplanner.centerView?.();
        }
    }, [floorplanner]);

    return {
        floorplanner,
        toolMode,
        switchToMove,
        switchToDraw,
        switchToTransform,
        gridVisible,
        gridSize,
        snapToGrid,
        setGrid,
        setSnap,
        zoomIn,
        zoomOut,
        resetZoom,
        centerView,
    };
}

export default useViewer2D;
