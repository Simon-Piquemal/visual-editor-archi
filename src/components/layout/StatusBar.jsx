import React from 'react';
import { useAppStore, ViewModes, ToolModes } from '../../stores/appStore';
import { useConfigStore } from '../../stores/configStore';

export function StatusBar() {
    const currentView = useAppStore((s) => s.currentView);
    const toolMode = useAppStore((s) => s.toolMode);
    const statusMessage = useAppStore((s) => s.statusMessage);
    const selectedElement = useAppStore((s) => s.selectedElement);
    const selectedElementType = useAppStore((s) => s.selectedElementType);
    const gridVisible = useAppStore((s) => s.gridVisible);
    const snapToGrid = useAppStore((s) => s.snapToGrid);

    const getToolModeLabel = () => {
        switch (toolMode) {
            case ToolModes.MOVE: return 'Move';
            case ToolModes.DRAW: return 'Draw';
            case ToolModes.TRANSFORM: return 'Transform';
            default: return '';
        }
    };

    const getSelectionLabel = () => {
        if (!selectedElement) return 'None';
        switch (selectedElementType) {
            case 'corner': return `Corner ${selectedElement.id || ''}`;
            case 'wall': return `Wall ${selectedElement.id || ''}`;
            case 'room': return `Room ${selectedElement.name || selectedElement.id || ''}`;
            case 'item': return selectedElement.metadata?.itemName || 'Item';
            default: return 'Element';
        }
    };

    return (
        <footer className="h-status bg-surface border-t border-border flex items-center justify-between px-4 text-xs text-text-secondary">
            <div className="flex items-center gap-4">
                <span>
                    View: <span className="text-text">{currentView === ViewModes.VIEW_2D ? '2D' : '3D'}</span>
                </span>
                {currentView === ViewModes.VIEW_2D && (
                    <span>
                        Mode: <span className="text-text">{getToolModeLabel()}</span>
                    </span>
                )}
                <span>
                    Selection: <span className="text-text">{getSelectionLabel()}</span>
                </span>
            </div>

            <div className="flex items-center gap-4">
                {currentView === ViewModes.VIEW_2D && (
                    <>
                        <span>
                            Grid: <span className={gridVisible ? 'text-success' : 'text-text-muted'}>{gridVisible ? 'On' : 'Off'}</span>
                        </span>
                        <span>
                            Snap: <span className={snapToGrid ? 'text-success' : 'text-text-muted'}>{snapToGrid ? 'On' : 'Off'}</span>
                        </span>
                    </>
                )}
                {statusMessage && (
                    <span className="text-primary">{statusMessage}</span>
                )}
            </div>
        </footer>
    );
}

export default StatusBar;
