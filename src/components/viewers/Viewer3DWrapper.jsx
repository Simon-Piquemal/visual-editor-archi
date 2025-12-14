import React, { useEffect } from 'react';
import { useAppStore, ElementTypes } from '../../stores/appStore';
import { useViewerStore } from '../../scripts/viewer3d-r3f/store';

/**
 * React wrapper component for the 3D viewer
 * The actual Viewer3D is already React-based (R3F)
 */
export function Viewer3DWrapper({ blueprint, className = '' }) {
    const selectElement = useAppStore((s) => s.selectElement);
    const setStatusMessage = useAppStore((s) => s.setStatusMessage);

    useEffect(() => {
        if (!blueprint?.roomplanner) return;

        const roomplanner = blueprint.roomplanner;

        // Set up event listeners
        const handleItemSelect = (evt) => {
            if (evt.item) {
                selectElement(evt, ElementTypes.ITEM);
            }
        };

        const handleWallClick = (evt) => {
            if (evt.item) {
                setStatusMessage('Wall clicked - switch to 2D to edit');
                setTimeout(() => setStatusMessage(''), 2000);
            }
        };

        const handleRoomClick = (evt) => {
            if (evt.item) {
                setStatusMessage('Room clicked - switch to 2D to edit');
                setTimeout(() => setStatusMessage(''), 2000);
            }
        };

        // Add listeners
        roomplanner.addEventListener?.('EVENT_ITEM_SELECTED', handleItemSelect);
        roomplanner.addEventListener?.('EVENT_WALL_CLICKED', handleWallClick);
        roomplanner.addEventListener?.('EVENT_ROOM_CLICKED', handleRoomClick);

        return () => {
            // Remove listeners
            roomplanner.removeEventListener?.('EVENT_ITEM_SELECTED', handleItemSelect);
            roomplanner.removeEventListener?.('EVENT_WALL_CLICKED', handleWallClick);
            roomplanner.removeEventListener?.('EVENT_ROOM_CLICKED', handleRoomClick);
        };
    }, [blueprint, selectElement, setStatusMessage]);

    return (
        <div
            id="viewer-3d"
            className={`w-full h-full ${className}`}
        />
    );
}

export default Viewer3DWrapper;
