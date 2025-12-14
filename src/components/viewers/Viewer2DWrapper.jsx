import React, { useRef, useEffect } from 'react';
import { useAppStore, ElementTypes } from '../../stores/appStore';

/**
 * React wrapper for the PIXI.js-based Viewer2D
 * This doesn't rewrite Viewer2D, just wraps it as a React component
 */
export function Viewer2DWrapper({ blueprint, className = '' }) {
    const containerRef = useRef(null);
    const selectElement = useAppStore((s) => s.selectElement);
    const setStatusMessage = useAppStore((s) => s.setStatusMessage);

    useEffect(() => {
        if (!blueprint?.floorplanner || !containerRef.current) return;

        const floorplanner = blueprint.floorplanner;

        // Set up event listeners
        const handleCornerSelect = (evt) => {
            if (evt.item) {
                selectElement(evt.item, ElementTypes.CORNER);
            }
        };

        const handleWallSelect = (evt) => {
            if (evt.item) {
                selectElement(evt.item, ElementTypes.WALL);
            }
        };

        const handleRoomSelect = (evt) => {
            if (evt.item) {
                selectElement(evt.item, ElementTypes.ROOM);
            }
        };

        const handleModeChange = (evt) => {
            setStatusMessage(`Mode: ${evt.mode}`);
            setTimeout(() => setStatusMessage(''), 2000);
        };

        // Add listeners
        floorplanner.addEventListener?.('EVENT_CORNER_2D_CLICKED', handleCornerSelect);
        floorplanner.addEventListener?.('EVENT_WALL_2D_CLICKED', handleWallSelect);
        floorplanner.addEventListener?.('EVENT_ROOM_2D_CLICKED', handleRoomSelect);
        floorplanner.addEventListener?.('EVENT_MODE_CHANGED', handleModeChange);

        return () => {
            // Remove listeners
            floorplanner.removeEventListener?.('EVENT_CORNER_2D_CLICKED', handleCornerSelect);
            floorplanner.removeEventListener?.('EVENT_WALL_2D_CLICKED', handleWallSelect);
            floorplanner.removeEventListener?.('EVENT_ROOM_2D_CLICKED', handleRoomSelect);
            floorplanner.removeEventListener?.('EVENT_MODE_CHANGED', handleModeChange);
        };
    }, [blueprint, selectElement, setStatusMessage]);

    return (
        <div
            ref={containerRef}
            id="viewer-2d"
            className={`w-full h-full ${className}`}
        />
    );
}

export default Viewer2DWrapper;
