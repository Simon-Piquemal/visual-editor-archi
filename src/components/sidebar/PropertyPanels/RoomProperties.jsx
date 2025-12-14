import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../stores/appStore';
import { useConfigStore } from '../../../stores/configStore';
import { Panel, PanelSection, Input, Select, ColorPicker } from '../../ui';

const roomTypes = [
    { value: 'living', label: 'Living Room' },
    { value: 'bedroom', label: 'Bedroom' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'bathroom', label: 'Bathroom' },
    { value: 'office', label: 'Office' },
    { value: 'dining', label: 'Dining Room' },
    { value: 'hallway', label: 'Hallway' },
    { value: 'storage', label: 'Storage' },
    { value: 'garage', label: 'Garage' },
    { value: 'other', label: 'Other' },
];

export function RoomProperties({ room }) {
    const blueprint = useAppStore((s) => s.blueprint);
    const formatDimension = useConfigStore((s) => s.formatDimension);

    const [name, setName] = useState(room?.name || '');
    const [roomType, setRoomType] = useState(room?.roomType || 'other');
    const [floorColor, setFloorColor] = useState(room?.floorColor || '#d4a574');

    useEffect(() => {
        if (room) {
            setName(room.name || '');
            setRoomType(room.roomType || 'other');
            setFloorColor(room.floorColor || '#d4a574');
        }
    }, [room]);

    const handleNameChange = (value) => {
        setName(value);
        if (room) {
            room.name = value;
            room.dispatchEvent?.({ type: 'EVENT_ROOM_UPDATED' });
        }
    };

    const handleTypeChange = (value) => {
        setRoomType(value);
        if (room) {
            room.roomType = value;
            room.dispatchEvent?.({ type: 'EVENT_ROOM_UPDATED' });
        }
    };

    const handleColorChange = (value) => {
        setFloorColor(value);
        if (room) {
            room.floorColor = value;
            room.dispatchEvent?.({ type: 'EVENT_ROOM_UPDATED' });
            blueprint?.model?.floorplan?.update();
        }
    };

    // Calculate area
    const area = room?.area || 0;
    const areaM2 = (area / 10000).toFixed(2); // cm² to m²

    // Get perimeter
    const perimeter = room?.perimeter || 0;

    return (
        <Panel title="Room Properties">
            <div className="space-y-4">
                <PanelSection title="Identity">
                    <div className="space-y-2">
                        <Input
                            label="Name"
                            value={name}
                            onChange={handleNameChange}
                            placeholder="Room name"
                        />
                        <Select
                            label="Type"
                            value={roomType}
                            onChange={handleTypeChange}
                            options={roomTypes}
                        />
                    </div>
                </PanelSection>

                <PanelSection title="Dimensions">
                    <div className="text-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Area</span>
                            <span className="text-text font-medium">{areaM2} m²</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Perimeter</span>
                            <span className="text-text">{formatDimension(perimeter)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Corners</span>
                            <span className="text-text">{room?.corners?.length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Walls</span>
                            <span className="text-text">{room?.walls?.length || 0}</span>
                        </div>
                    </div>
                </PanelSection>

                <PanelSection title="Appearance">
                    <ColorPicker
                        label="Floor Color"
                        value={floorColor}
                        onChange={handleColorChange}
                    />
                </PanelSection>

                <PanelSection title="Info">
                    <div className="text-sm text-text-secondary">
                        <p>ID: <span className="text-text">{room?.uuid || 'N/A'}</span></p>
                    </div>
                </PanelSection>
            </div>
        </Panel>
    );
}

export default RoomProperties;
