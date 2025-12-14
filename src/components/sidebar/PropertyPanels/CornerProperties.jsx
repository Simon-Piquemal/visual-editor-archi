import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../stores/appStore';
import { useConfigStore } from '../../../stores/configStore';
import { Panel, PanelSection, NumberInput, Button } from '../../ui';
import { TrashIcon } from '@heroicons/react/24/outline';

export function CornerProperties({ corner }) {
    const blueprint = useAppStore((s) => s.blueprint);
    const deselectElement = useAppStore((s) => s.deselectElement);
    const formatDimension = useConfigStore((s) => s.formatDimension);

    const [x, setX] = useState(corner?.x || 0);
    const [y, setY] = useState(corner?.y || 0);
    const [elevation, setElevation] = useState(corner?.elevation || 0);

    useEffect(() => {
        if (corner) {
            setX(corner.x || 0);
            setY(corner.y || 0);
            setElevation(corner.elevation || 0);
        }
    }, [corner]);

    const handlePositionChange = (axis, value) => {
        if (!corner) return;
        if (axis === 'x') {
            setX(value);
            corner.x = value;
        } else {
            setY(value);
            corner.y = value;
        }
        corner.dispatchEvent?.({ type: 'EVENT_CORNER_MOVED' });
        blueprint?.model?.floorplan?.update();
    };

    const handleElevationChange = (value) => {
        if (!corner) return;
        setElevation(value);
        corner.elevation = value;
        corner.dispatchEvent?.({ type: 'EVENT_CORNER_MOVED' });
        blueprint?.model?.floorplan?.update();
    };

    const handleDelete = () => {
        if (!corner || !blueprint?.floorplanningHelper) return;
        if (confirm('Delete this corner? This will also delete connected walls.')) {
            blueprint.floorplanningHelper.removeCorner(corner);
            deselectElement();
        }
    };

    const connectedWalls = corner?.wallStarts?.length + corner?.wallEnds?.length || 0;

    return (
        <Panel title="Corner Properties">
            <div className="space-y-4">
                <PanelSection title="Position">
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput
                            label="X"
                            value={Math.round(x)}
                            onChange={(v) => handlePositionChange('x', v)}
                            suffix="cm"
                        />
                        <NumberInput
                            label="Y"
                            value={Math.round(y)}
                            onChange={(v) => handlePositionChange('y', v)}
                            suffix="cm"
                        />
                    </div>
                </PanelSection>

                <PanelSection title="Elevation">
                    <NumberInput
                        label="Height"
                        value={Math.round(elevation)}
                        onChange={handleElevationChange}
                        min={0}
                        max={1000}
                        suffix="cm"
                    />
                </PanelSection>

                <PanelSection title="Info">
                    <div className="text-sm text-text-secondary space-y-1">
                        <p>ID: <span className="text-text">{corner?.id || 'N/A'}</span></p>
                        <p>Connected walls: <span className="text-text">{connectedWalls}</span></p>
                    </div>
                </PanelSection>

                <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    className="w-full"
                >
                    <TrashIcon className="w-4 h-4" />
                    Delete Corner
                </Button>
            </div>
        </Panel>
    );
}

export default CornerProperties;
