import React from 'react';
import { useAppStore, ToolModes } from '../../stores/appStore';
import { Panel, Button } from '../ui';
import {
    HomeIcon,
    Square3Stack3DIcon,
    WindowIcon,
    ArchiveBoxIcon,
} from '@heroicons/react/24/outline';

const presetShapes = [
    { id: 'rectangle', name: 'Rectangle', icon: Square3Stack3DIcon },
    { id: 'l-shape', name: 'L-Shape', icon: HomeIcon },
];

export function AddElementsPanel() {
    const blueprint = useAppStore((s) => s.blueprint);
    const setToolMode = useAppStore((s) => s.setToolMode);

    const handleAddPresetRoom = (shapeId) => {
        if (!blueprint?.floorplanningHelper) return;

        switch (shapeId) {
            case 'rectangle':
                // Add a default rectangle room
                blueprint.floorplanningHelper.addRectangularRoom(0, 0, 400, 300);
                break;
            case 'l-shape':
                // Add an L-shaped room
                blueprint.floorplanningHelper.addLShapedRoom(0, 0, 400, 300, 200, 150);
                break;
        }
    };

    const handleStartDrawing = () => {
        setToolMode(ToolModes.DRAW);
    };

    return (
        <Panel title="Add Elements" collapsible defaultCollapsed={true}>
            <div className="space-y-3">
                {/* Preset Rooms */}
                <div className="space-y-2">
                    <span className="text-xs text-text-secondary uppercase tracking-wide">
                        Quick Rooms
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                        {presetShapes.map((shape) => (
                            <Button
                                key={shape.id}
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAddPresetRoom(shape.id)}
                                className="flex-col py-3"
                            >
                                <shape.icon className="w-5 h-5 mb-1" />
                                <span className="text-xs">{shape.name}</span>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Draw Mode */}
                <div className="space-y-2">
                    <span className="text-xs text-text-secondary uppercase tracking-wide">
                        Custom
                    </span>
                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleStartDrawing}
                        className="w-full"
                    >
                        <WindowIcon className="w-4 h-4" />
                        Draw Walls
                    </Button>
                </div>
            </div>
        </Panel>
    );
}

export default AddElementsPanel;
