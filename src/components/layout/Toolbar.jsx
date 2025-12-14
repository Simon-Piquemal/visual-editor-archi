import React from 'react';
import { useAppStore, ViewModes, ToolModes } from '../../stores/appStore';
import { Button, IconButton } from '../ui';
import {
    Square2StackIcon,
    CubeIcon,
    CursorArrowRaysIcon,
    PencilIcon,
    ArrowsPointingOutIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    DocumentPlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';

export function Toolbar() {
    const currentView = useAppStore((s) => s.currentView);
    const toggleView = useAppStore((s) => s.toggleView);
    const toolMode = useAppStore((s) => s.toolMode);
    const setToolMode = useAppStore((s) => s.setToolMode);
    const blueprint = useAppStore((s) => s.blueprint);

    const handleNew = () => {
        if (blueprint?.model) {
            if (confirm('Create a new project? Unsaved changes will be lost.')) {
                blueprint.model.reset();
            }
        }
    };

    const handleSave = () => {
        if (blueprint?.model) {
            const data = blueprint.model.exportSerialized();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'floorplan.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleLoad = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file && blueprint?.model) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        blueprint.model.loadSerialized(evt.target.result);
                    } catch (err) {
                        console.error('Error loading file:', err);
                        alert('Error loading file. Please check the format.');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    return (
        <header className="h-toolbar bg-surface border-b border-border flex items-center justify-between px-4">
            {/* Left: Logo + View switcher */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <CubeIcon className="w-6 h-6 text-primary" />
                    <span className="font-semibold text-text">Floor Planner</span>
                </div>

                <div className="h-6 w-px bg-border" />

                {/* View Switcher */}
                <div className="flex items-center bg-background rounded-lg p-0.5">
                    <Button
                        size="sm"
                        variant={currentView === ViewModes.VIEW_2D ? 'primary' : 'ghost'}
                        onClick={() => currentView !== ViewModes.VIEW_2D && toggleView()}
                        className="gap-1"
                    >
                        <Square2StackIcon className="w-4 h-4" />
                        2D
                    </Button>
                    <Button
                        size="sm"
                        variant={currentView === ViewModes.VIEW_3D ? 'primary' : 'ghost'}
                        onClick={() => currentView !== ViewModes.VIEW_3D && toggleView()}
                        className="gap-1"
                    >
                        <CubeIcon className="w-4 h-4" />
                        3D
                    </Button>
                </div>
            </div>

            {/* Center: Tool modes (2D only) */}
            {currentView === ViewModes.VIEW_2D && (
                <div className="flex items-center gap-1 bg-background rounded-lg p-0.5">
                    <Button
                        size="sm"
                        variant={toolMode === ToolModes.MOVE ? 'primary' : 'ghost'}
                        onClick={() => setToolMode(ToolModes.MOVE)}
                        title="Move mode (M)"
                    >
                        <CursorArrowRaysIcon className="w-4 h-4" />
                        Move
                    </Button>
                    <Button
                        size="sm"
                        variant={toolMode === ToolModes.DRAW ? 'primary' : 'ghost'}
                        onClick={() => setToolMode(ToolModes.DRAW)}
                        title="Draw mode (D)"
                    >
                        <PencilIcon className="w-4 h-4" />
                        Draw
                    </Button>
                    <Button
                        size="sm"
                        variant={toolMode === ToolModes.TRANSFORM ? 'primary' : 'ghost'}
                        onClick={() => setToolMode(ToolModes.TRANSFORM)}
                        title="Transform mode (T)"
                    >
                        <ArrowsPointingOutIcon className="w-4 h-4" />
                        Transform
                    </Button>
                </div>
            )}

            {/* Right: File actions */}
            <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={handleNew} title="New project">
                    <DocumentPlusIcon className="w-4 h-4" />
                    New
                </Button>
                <Button size="sm" variant="ghost" onClick={handleLoad} title="Load project">
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    Load
                </Button>
                <Button size="sm" variant="secondary" onClick={handleSave} title="Save project">
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Save
                </Button>
            </div>
        </header>
    );
}

export default Toolbar;
