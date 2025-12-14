import React from 'react';
import { useAppStore, ElementTypes } from '../../stores/appStore';
import { useViewerStore } from '../../scripts/viewer3d-r3f/store';
import { Panel, PanelSection, Toggle, Slider } from '../ui';
import { ItemProperties } from './PropertyPanels/ItemProperties';
import { TextureSelector } from './TextureSelector';

export function Panel3D() {
    const selectedElement = useAppStore((s) => s.selectedElement);
    const selectedElementType = useAppStore((s) => s.selectedElementType);

    const selectedItem = useViewerStore((s) => s.selectedItem);
    const occludedWalls = useViewerStore((s) => s.occludedWalls);
    const setOccludedWalls = useViewerStore((s) => s.setOccludedWalls);
    const occludedRoofs = useViewerStore((s) => s.occludedRoofs);
    const setOccludedRoofs = useViewerStore((s) => s.setOccludedRoofs);

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
        </div>
    );
}

export default Panel3D;
