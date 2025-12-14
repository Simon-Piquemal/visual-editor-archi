import React, { useState, useCallback } from 'react';
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
        { id: 'marble-white', name: 'White Marble', color: '#f8f8f8' },
        { id: 'parquet', name: 'Parquet', color: '#b8860b' },
        { id: 'slate', name: 'Slate', color: '#708090' },
    ],
    walls: [
        { id: 'paint-white', name: 'White Paint', color: '#ffffff' },
        { id: 'paint-cream', name: 'Cream', color: '#f5f5dc' },
        { id: 'paint-gray', name: 'Gray', color: '#d0d0d0' },
        { id: 'paint-blue', name: 'Blue', color: '#87ceeb' },
        { id: 'paint-green', name: 'Green', color: '#90ee90' },
        { id: 'paint-beige', name: 'Beige', color: '#f5deb3' },
        { id: 'brick-red', name: 'Red Brick', color: '#8b4513' },
        { id: 'brick-white', name: 'White Brick', color: '#e8e8e8' },
        { id: 'stone', name: 'Stone', color: '#a9a9a9' },
    ],
};

// Draggable texture item component
function DraggableTexture({ texture, type, onClick }) {
    const handleDragStart = useCallback((e) => {
        // Set drag data with texture info
        const dragData = JSON.stringify({
            type: type, // 'floor' or 'wall'
            textureId: texture.id,
            color: texture.color,
            name: texture.name,
        });
        e.dataTransfer.setData('application/x-texture', dragData);
        e.dataTransfer.effectAllowed = 'copy';
        
        // Create a colored drag image
        const dragEl = document.createElement('div');
        dragEl.style.width = '40px';
        dragEl.style.height = '40px';
        dragEl.style.backgroundColor = texture.color;
        dragEl.style.borderRadius = '4px';
        dragEl.style.border = '2px solid #6366f1';
        dragEl.style.position = 'absolute';
        dragEl.style.top = '-1000px';
        document.body.appendChild(dragEl);
        e.dataTransfer.setDragImage(dragEl, 20, 20);
        
        // Clean up after drag starts
        setTimeout(() => document.body.removeChild(dragEl), 0);
    }, [texture, type]);

    return (
        <button
            draggable
            onDragStart={handleDragStart}
            onClick={() => onClick(texture.id)}
            className="
                aspect-square rounded-md border border-border
                hover:border-primary hover:scale-105
                transition-all duration-150
                flex flex-col items-center justify-center gap-1
                p-1 cursor-grab active:cursor-grabbing
            "
            title={`${texture.name} - Drag to apply`}
        >
            <div
                className="w-8 h-8 rounded border border-border shadow-sm"
                style={{ backgroundColor: texture.color }}
            />
            <span className="text-[10px] text-text-secondary truncate w-full text-center">
                {texture.name}
            </span>
        </button>
    );
}

export function TextureSelector() {
    const [activeTab, setActiveTab] = useState('floors');

    const textures = defaultTextures[activeTab];
    const textureType = activeTab === 'floors' ? 'floor' : 'wall';

    const handleSelectTexture = (textureId) => {
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
                        <DraggableTexture
                            key={texture.id}
                            texture={texture}
                            type={textureType}
                            onClick={handleSelectTexture}
                        />
                    ))}
                </div>

                <p className="text-xs text-text-muted">
                    Drag a texture onto a wall or floor in the 3D view to apply it.
                </p>
            </div>
        </Panel>
    );
}

export default TextureSelector;
