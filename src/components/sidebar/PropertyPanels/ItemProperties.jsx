import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../stores/appStore';
import { useViewerStore } from '../../../scripts/viewer3d-r3f/store';
import { useConfigStore } from '../../../stores/configStore';
import { Panel, PanelSection, NumberInput, Button, Toggle } from '../../ui';
import { TrashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

export function ItemProperties({ item }) {
    const blueprint = useAppStore((s) => s.blueprint);
    const deselectItem = useViewerStore((s) => s.deselectItem);
    const formatDimension = useConfigStore((s) => s.formatDimension);

    const itemModel = item?.itemModel;

    const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
    const [rotation, setRotation] = useState(0);
    const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });
    const [locked, setLocked] = useState(false);

    useEffect(() => {
        if (itemModel) {
            setPosition({
                x: itemModel.position?.x || 0,
                y: itemModel.position?.y || 0,
                z: itemModel.position?.z || 0,
            });
            setRotation((itemModel.rotation?.y || 0) * (180 / Math.PI));
            setScale({
                x: itemModel.scale?.x || 1,
                y: itemModel.scale?.y || 1,
                z: itemModel.scale?.z || 1,
            });
            setLocked(itemModel.fixed || false);
        }
    }, [itemModel]);

    const handlePositionChange = (axis, value) => {
        if (!itemModel) return;
        const newPos = { ...position, [axis]: value };
        setPosition(newPos);
        itemModel.position = newPos;
        itemModel.dispatchEvent?.({ type: 'EVENT_ITEM_UPDATED' });
    };

    const handleRotationChange = (value) => {
        if (!itemModel) return;
        setRotation(value);
        if (itemModel.rotation) {
            itemModel.rotation.y = value * (Math.PI / 180);
        }
        itemModel.dispatchEvent?.({ type: 'EVENT_ITEM_UPDATED' });
    };

    const handleScaleChange = (axis, value) => {
        if (!itemModel) return;
        const newScale = { ...scale, [axis]: value };
        setScale(newScale);
        itemModel.scale = newScale;
        itemModel.dispatchEvent?.({ type: 'EVENT_ITEM_UPDATED' });
    };

    const handleLockedChange = (value) => {
        if (!itemModel) return;
        setLocked(value);
        itemModel.fixed = value;
    };

    const handleDelete = () => {
        if (!itemModel || !blueprint?.roomplanningHelper) return;
        if (confirm('Delete this item?')) {
            blueprint.roomplanningHelper.removeItem(itemModel);
            deselectItem();
        }
    };

    const handleDuplicate = () => {
        if (!itemModel || !blueprint?.roomplanningHelper) return;
        blueprint.roomplanningHelper.duplicateItem(itemModel);
    };

    const itemName = itemModel?.metadata?.itemName || 'Unknown Item';

    return (
        <Panel title="Item Properties">
            <div className="space-y-4">
                <PanelSection title="Item">
                    <p className="text-sm text-text font-medium">{itemName}</p>
                    <p className="text-xs text-text-secondary">{itemModel?.metadata?.modelUrl || 'No model'}</p>
                </PanelSection>

                <PanelSection title="Position">
                    <div className="grid grid-cols-3 gap-2">
                        <NumberInput
                            label="X"
                            value={Math.round(position.x)}
                            onChange={(v) => handlePositionChange('x', v)}
                        />
                        <NumberInput
                            label="Y"
                            value={Math.round(position.y)}
                            onChange={(v) => handlePositionChange('y', v)}
                        />
                        <NumberInput
                            label="Z"
                            value={Math.round(position.z)}
                            onChange={(v) => handlePositionChange('z', v)}
                        />
                    </div>
                </PanelSection>

                <PanelSection title="Rotation">
                    <NumberInput
                        label="Y Rotation"
                        value={Math.round(rotation)}
                        onChange={handleRotationChange}
                        min={-180}
                        max={180}
                        suffix="°"
                    />
                </PanelSection>

                <PanelSection title="Scale">
                    <div className="grid grid-cols-3 gap-2">
                        <NumberInput
                            label="X"
                            value={scale.x.toFixed(2)}
                            onChange={(v) => handleScaleChange('x', parseFloat(v))}
                            step={0.1}
                        />
                        <NumberInput
                            label="Y"
                            value={scale.y.toFixed(2)}
                            onChange={(v) => handleScaleChange('y', parseFloat(v))}
                            step={0.1}
                        />
                        <NumberInput
                            label="Z"
                            value={scale.z.toFixed(2)}
                            onChange={(v) => handleScaleChange('z', parseFloat(v))}
                            step={0.1}
                        />
                    </div>
                </PanelSection>

                <Toggle
                    label="Lock position"
                    checked={locked}
                    onChange={handleLockedChange}
                />

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDuplicate}
                    >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                        Duplicate
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={handleDelete}
                    >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                    </Button>
                </div>
            </div>
        </Panel>
    );
}

export default ItemProperties;
