import React, { useState } from 'react';
import { useViewerStore } from '../../scripts/viewer3d-r3f/store';
import { Panel, Button } from '../ui';

const defaultTextures = {
    floors: [
        { id: 'wood-light', name: 'Light Wood', color: '#d4a574' },
        { id: 'wood-dark', name: 'Dark Wood', color: '#6b4423' },
        { id: 'tile-white', name: 'White Tile', color: '#f0f0f0' },
        { id: 'tile-gray', name: 'Gray Tile', color: '#808080' },
        { id: 'carpet-beige', name: 'Beige Carpet', color: '#c4b499' },
        { id: 'concrete', name: 'Concrete', color: '#a0a0a0' },
    ],
    walls: [
        { id: 'paint-white', name: 'White Paint', color: '#ffffff' },
        { id: 'paint-cream', name: 'Cream', color: '#f5f5dc' },
        { id: 'paint-gray', name: 'Gray', color: '#d0d0d0' },
        { id: 'brick-red', name: 'Red Brick', color: '#8b4513' },
        { id: 'brick-white', name: 'White Brick', color: '#e8e8e8' },
        { id: 'stone', name: 'Stone', color: '#a9a9a9' },
    ],
};

export function TextureSelector() {
    const selectedItem = useViewerStore((s) => s.selectedItem);
    const [activeTab, setActiveTab] = useState('floors');

    const textures = defaultTextures[activeTab];

    const handleSelectTexture = (textureId) => {
        // This would apply texture to selected room/wall
        console.log('Selected texture:', textureId);
    };

    return (
        <Panel title="Textures" collapsible defaultCollapsed={true}>
            <div className="space-y-3">
                {/* Tab switcher */}
                <div className="flex bg-background rounded-lg p-0.5">
                    <Button
                        size="sm"
                        variant={activeTab === 'floors' ? 'primary' : 'ghost'}
                        onClick={() => setActiveTab('floors')}
                        className="flex-1"
                    >
                        Floors
                    </Button>
                    <Button
                        size="sm"
                        variant={activeTab === 'walls' ? 'primary' : 'ghost'}
                        onClick={() => setActiveTab('walls')}
                        className="flex-1"
                    >
                        Walls
                    </Button>
                </div>

                {/* Texture grid */}
                <div className="grid grid-cols-3 gap-2">
                    {textures.map((texture) => (
                        <button
                            key={texture.id}
                            onClick={() => handleSelectTexture(texture.id)}
                            className="
                                aspect-square rounded-md border border-border
                                hover:border-primary hover:scale-105
                                transition-all duration-150
                                flex flex-col items-center justify-center gap-1
                                p-1
                            "
                            title={texture.name}
                        >
                            <div
                                className="w-8 h-8 rounded border border-border"
                                style={{ backgroundColor: texture.color }}
                            />
                            <span className="text-[10px] text-text-secondary truncate w-full text-center">
                                {texture.name}
                            </span>
                        </button>
                    ))}
                </div>

                <p className="text-xs text-text-muted">
                    Select a room or wall first, then click a texture to apply.
                </p>
            </div>
        </Panel>
    );
}

export default TextureSelector;
