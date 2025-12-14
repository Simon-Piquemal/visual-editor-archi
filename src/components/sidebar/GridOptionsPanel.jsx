import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { Panel, Toggle, Slider, NumberInput } from '../ui';

export function GridOptionsPanel() {
    const gridVisible = useAppStore((s) => s.gridVisible);
    const setGridVisible = useAppStore((s) => s.setGridVisible);
    const gridSize = useAppStore((s) => s.gridSize);
    const setGridSize = useAppStore((s) => s.setGridSize);
    const snapToGrid = useAppStore((s) => s.snapToGrid);
    const setSnapToGrid = useAppStore((s) => s.setSnapToGrid);
    const blueprint = useAppStore((s) => s.blueprint);

    const handleGridSizeChange = (size) => {
        setGridSize(size);
        if (blueprint?.floorplanner) {
            blueprint.floorplanner.setGridSpacing(size);
        }
    };

    const handleGridVisibleChange = (visible) => {
        setGridVisible(visible);
        if (blueprint?.floorplanner) {
            blueprint.floorplanner.setGridVisible(visible);
        }
    };

    const handleSnapChange = (snap) => {
        setSnapToGrid(snap);
        if (blueprint?.floorplanner) {
            blueprint.floorplanner.setSnapToGrid(snap);
        }
    };

    return (
        <Panel title="Grid Options" collapsible defaultCollapsed={true}>
            <div className="space-y-4">
                <Toggle
                    label="Show grid"
                    checked={gridVisible}
                    onChange={handleGridVisibleChange}
                />

                <Toggle
                    label="Snap to grid"
                    checked={snapToGrid}
                    onChange={handleSnapChange}
                />

                <div className="space-y-2">
                    <NumberInput
                        label="Grid size (cm)"
                        value={gridSize}
                        onChange={handleGridSizeChange}
                        min={10}
                        max={200}
                        step={10}
                        suffix="cm"
                    />
                    <Slider
                        value={gridSize}
                        onChange={handleGridSizeChange}
                        min={10}
                        max={200}
                        step={10}
                    />
                </div>
            </div>
        </Panel>
    );
}

export default GridOptionsPanel;
