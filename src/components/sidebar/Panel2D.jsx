import React from 'react';
import { useAppStore, ElementTypes } from '../../stores/appStore';
import { useViewerStore } from '../../scripts/viewer3d-r3f/store';
import { Panel, PanelSection, Toggle } from '../ui';
import { AddElementsPanel } from './AddElementsPanel';
import { GridOptionsPanel } from './GridOptionsPanel';
import { BackgroundImagePanel } from './BackgroundImagePanel';
import { CornerProperties } from './PropertyPanels/CornerProperties';
import { WallProperties } from './PropertyPanels/WallProperties';
import { RoomProperties } from './PropertyPanels/RoomProperties';
import { ItemProperties } from './PropertyPanels/ItemProperties';
import { TextureSelector } from './TextureSelector';

export function Panel2D() {
    const selectedElement = useAppStore((s) => s.selectedElement);
    const selectedElementType = useAppStore((s) => s.selectedElementType);

    const selectedItem = useViewerStore((s) => s.selectedItem);
    const occludedWalls = useViewerStore((s) => s.occludedWalls);
    const setOccludedWalls = useViewerStore((s) => s.setOccludedWalls);
    const occludedRoofs = useViewerStore((s) => s.occludedRoofs);
    const setOccludedRoofs = useViewerStore((s) => s.setOccludedRoofs);

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
            {/* Selected Item Properties */}
            {selectedItem ? (
                <ItemProperties item={selectedItem} />
            ) : (
                <Panel title="Item Properties">
                    <p className="text-sm text-text-secondary">
                        Click on an item in the 3D view to select it.
                    </p>
                </Panel>
            )}

            {/* View Options */}
            <Panel title="View Options" collapsible defaultCollapsed={false}>
                <div className="space-y-3">
                    <Toggle
                        label="Transparent walls"
                        checked={occludedWalls}
                        onChange={setOccludedWalls}
                    />
                    <Toggle
                        label="Transparent roofs"
                        checked={occludedRoofs}
                        onChange={setOccludedRoofs}
                    />
                </div>
            </Panel>

            {/* Texture Selection */}
            <TextureSelector />

            {renderPropertiesPanel()}
            <AddElementsPanel />
            <GridOptionsPanel />
            <BackgroundImagePanel />
        </div>
    );
}

export default Panel2D;
