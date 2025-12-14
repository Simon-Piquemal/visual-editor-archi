import React from 'react';
import { useAppStore, ElementTypes } from '../../stores/appStore';
import { Panel, PanelSection } from '../ui';
import { AddElementsPanel } from './AddElementsPanel';
import { GridOptionsPanel } from './GridOptionsPanel';
import { BackgroundImagePanel } from './BackgroundImagePanel';
import { CornerProperties } from './PropertyPanels/CornerProperties';
import { WallProperties } from './PropertyPanels/WallProperties';
import { RoomProperties } from './PropertyPanels/RoomProperties';

export function Panel2D() {
    const selectedElement = useAppStore((s) => s.selectedElement);
    const selectedElementType = useAppStore((s) => s.selectedElementType);

    const renderPropertiesPanel = () => {
        if (!selectedElement) {
            return (
                <Panel title="Properties">
                    <p className="text-sm text-text-secondary">
                        Select an element to view its properties.
                    </p>
                </Panel>
            );
        }

        switch (selectedElementType) {
            case ElementTypes.CORNER:
                return <CornerProperties corner={selectedElement} />;
            case ElementTypes.WALL:
                return <WallProperties wall={selectedElement} />;
            case ElementTypes.ROOM:
                return <RoomProperties room={selectedElement} />;
            default:
                return (
                    <Panel title="Properties">
                        <p className="text-sm text-text-secondary">
                            Unknown element type selected.
                        </p>
                    </Panel>
                );
        }
    };

    return (
        <div className="space-y-3">
            {renderPropertiesPanel()}
            <AddElementsPanel />
            <GridOptionsPanel />
            <BackgroundImagePanel />
        </div>
    );
}

export default Panel2D;
