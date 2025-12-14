import { useEffect } from 'react';
import { useAppStore, ElementTypes } from '../stores/appStore';

/**
 * Hook to listen to BlueprintJS events and sync with React state
 */
export function useBlueprintEvents() {
    const blueprint = useAppStore((s) => s.blueprint);
    const selectElement = useAppStore((s) => s.selectElement);
    const deselectElement = useAppStore((s) => s.deselectElement);
    const setStatusMessage = useAppStore((s) => s.setStatusMessage);
    const setLoading = useAppStore((s) => s.setLoading);

    useEffect(() => {
        if (!blueprint?.model) return;

        const model = blueprint.model;
        const floorplan = model.floorplan;

        // Model events
        const handleLoading = () => {
            setLoading(true);
            setStatusMessage('Loading...');
        };

        const handleLoaded = () => {
            setLoading(false);
            setStatusMessage('Loaded');
            setTimeout(() => setStatusMessage(''), 2000);
        };

        const handleReset = () => {
            deselectElement();
            setStatusMessage('Project reset');
            setTimeout(() => setStatusMessage(''), 2000);
        };

        // Floorplan events
        const handleNewRoom = (evt) => {
            if (evt.room) {
                selectElement(evt.room, ElementTypes.ROOM);
            }
        };

        const handleRoomDeleted = () => {
            deselectElement();
        };

        const handleCornerDeleted = () => {
            deselectElement();
        };

        const handleWallDeleted = () => {
            deselectElement();
        };

        // Add model listeners
        model.addEventListener?.('EVENT_LOADING', handleLoading);
        model.addEventListener?.('EVENT_LOADED', handleLoaded);
        model.addEventListener?.('EVENT_RESET', handleReset);

        // Add floorplan listeners
        if (floorplan) {
            floorplan.addEventListener?.('EVENT_NEW_ROOMS_ADDED', handleNewRoom);
            floorplan.addEventListener?.('EVENT_ROOM_DELETED', handleRoomDeleted);
            floorplan.addEventListener?.('EVENT_CORNER_DELETED', handleCornerDeleted);
            floorplan.addEventListener?.('EVENT_WALL_DELETED', handleWallDeleted);
        }

        return () => {
            // Remove model listeners
            model.removeEventListener?.('EVENT_LOADING', handleLoading);
            model.removeEventListener?.('EVENT_LOADED', handleLoaded);
            model.removeEventListener?.('EVENT_RESET', handleReset);

            // Remove floorplan listeners
            if (floorplan) {
                floorplan.removeEventListener?.('EVENT_NEW_ROOMS_ADDED', handleNewRoom);
                floorplan.removeEventListener?.('EVENT_ROOM_DELETED', handleRoomDeleted);
                floorplan.removeEventListener?.('EVENT_CORNER_DELETED', handleCornerDeleted);
                floorplan.removeEventListener?.('EVENT_WALL_DELETED', handleWallDeleted);
            }
        };
    }, [blueprint, selectElement, deselectElement, setStatusMessage, setLoading]);
}

export default useBlueprintEvents;
