import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { Panel, Button, Slider, NumberInput } from '../ui';
import {
    PhotoIcon,
    TrashIcon,
    ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';

export function BackgroundImagePanel() {
    const blueprint = useAppStore((s) => s.blueprint);
    const [hasImage, setHasImage] = useState(false);
    const [scale, setScale] = useState(100);
    const [opacity, setOpacity] = useState(50);

    const handleLoadImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file && blueprint?.floorplanner) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    blueprint.floorplanner.setBackgroundImage(evt.target.result);
                    setHasImage(true);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const handleRemoveImage = () => {
        if (blueprint?.floorplanner) {
            blueprint.floorplanner.removeBackgroundImage();
            setHasImage(false);
        }
    };

    const handleScaleChange = (value) => {
        setScale(value);
        if (blueprint?.floorplanner) {
            blueprint.floorplanner.setBackgroundScale(value / 100);
        }
    };

    const handleOpacityChange = (value) => {
        setOpacity(value);
        if (blueprint?.floorplanner) {
            blueprint.floorplanner.setBackgroundOpacity(value / 100);
        }
    };

    return (
        <Panel title="Background Image" collapsible defaultCollapsed={true}>
            <div className="space-y-4">
                {!hasImage ? (
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={handleLoadImage}
                        className="w-full"
                    >
                        <PhotoIcon className="w-4 h-4" />
                        Load Image
                    </Button>
                ) : (
                    <>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleLoadImage}
                                className="flex-1"
                            >
                                <PhotoIcon className="w-4 h-4" />
                                Replace
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleRemoveImage}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </Button>
                        </div>

                        <Slider
                            label="Scale"
                            value={scale}
                            onChange={handleScaleChange}
                            min={10}
                            max={300}
                            step={5}
                            suffix="%"
                        />

                        <Slider
                            label="Opacity"
                            value={opacity}
                            onChange={handleOpacityChange}
                            min={0}
                            max={100}
                            step={5}
                            suffix="%"
                        />
                    </>
                )}

                <p className="text-xs text-text-muted">
                    Load a floor plan image to trace over.
                </p>
            </div>
        </Panel>
    );
}

export default BackgroundImagePanel;
