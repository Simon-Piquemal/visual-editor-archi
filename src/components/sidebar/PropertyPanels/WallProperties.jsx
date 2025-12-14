import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../stores/appStore';
import { useConfigStore } from '../../../stores/configStore';
import { Panel, PanelSection, NumberInput, Button, Select } from '../../ui';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

export function WallProperties({ wall }) {
    const blueprint = useAppStore((s) => s.blueprint);
    const deselectElement = useAppStore((s) => s.deselectElement);
    const formatDimension = useConfigStore((s) => s.formatDimension);

    const [thickness, setThickness] = useState(wall?.thickness || 10);
    const [height, setHeight] = useState(wall?.height || 250);
    const [length, setLength] = useState(0);

    useEffect(() => {
        if (wall) {
            setThickness(wall.thickness || 10);
            setHeight(wall.height || 250);
            // Calculate length
            const dx = (wall.end?.x || 0) - (wall.start?.x || 0);
            const dy = (wall.end?.y || 0) - (wall.start?.y || 0);
            setLength(Math.sqrt(dx * dx + dy * dy));
        }
    }, [wall]);

    const handleThicknessChange = (value) => {
        if (!wall) return;
        setThickness(value);
        wall.thickness = value;
        wall.dispatchEvent?.({ type: 'EVENT_WALL_UPDATED' });
        blueprint?.model?.floorplan?.update();
    };

    const handleHeightChange = (value) => {
        if (!wall) return;
        setHeight(value);
        wall.height = value;
        wall.dispatchEvent?.({ type: 'EVENT_WALL_UPDATED' });
        blueprint?.model?.floorplan?.update();
    };

    const handleDelete = () => {
        if (!wall || !blueprint?.floorplanningHelper) return;
        if (confirm('Delete this wall?')) {
            blueprint.floorplanningHelper.removeWall(wall);
            deselectElement();
        }
    };

    const handleAddWindow = () => {
        if (!wall || !blueprint?.floorplanningHelper) return;
        // Add window at wall center
        const centerOffset = length / 2;
        blueprint.floorplanningHelper.addWindowToWall(wall, centerOffset, 100, 80);
    };

    const handleAddDoor = () => {
        if (!wall || !blueprint?.floorplanningHelper) return;
        // Add door at wall center
        const centerOffset = length / 2;
        blueprint.floorplanningHelper.addDoorToWall(wall, centerOffset, 80, 200);
    };

    return (
        <Panel title="Wall Properties">
            <div className="space-y-4">
                <PanelSection title="Dimensions">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">Length</span>
                            <span className="text-text">{formatDimension(length)}</span>
                        </div>
                        <NumberInput
                            label="Thickness"
                            value={Math.round(thickness)}
                            onChange={handleThicknessChange}
                            min={5}
                            max={50}
                            suffix="cm"
                        />
                        <NumberInput
                            label="Height"
                            value={Math.round(height)}
                            onChange={handleHeightChange}
                            min={100}
                            max={500}
                            suffix="cm"
                        />
                    </div>
                </PanelSection>

                <PanelSection title="Add Opening">
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleAddWindow}
                        >
                            <PlusIcon className="w-4 h-4" />
                            Window
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleAddDoor}
                        >
                            <PlusIcon className="w-4 h-4" />
                            Door
                        </Button>
                    </div>
                </PanelSection>

                <PanelSection title="Info">
                    <div className="text-sm text-text-secondary space-y-1">
                        <p>ID: <span className="text-text">{wall?.id || 'N/A'}</span></p>
                        <p>Openings: <span className="text-text">{wall?.items?.length || 0}</span></p>
                    </div>
                </PanelSection>

                <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    className="w-full"
                >
                    <TrashIcon className="w-4 h-4" />
                    Delete Wall
                </Button>
            </div>
        </Panel>
    );
}

export default WallProperties;
