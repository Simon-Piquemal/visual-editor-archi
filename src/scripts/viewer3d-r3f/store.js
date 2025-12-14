import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useViewerStore = create(
    subscribeWithSelector((set, get) => ({
        // Scene state
        enabled: false,
        needsUpdate: false,

        // Model references (set from outside React)
        model: null,
        floorplan: null,

        // Selection state
        selectedItem: null,
        hoveredItem: null,
        isTransforming: false, // True when dragging with TransformControls

        // Room data
        rooms: [],
        wallEdges: [],
        roomItems: [],
        physicalItems: [],

        // Camera state
        cameraPosition: [0, 600, 1500],
        controlsTarget: [0, 0, 0],

        // Options
        options: {
            occludedRoofs: false,
            occludedWalls: false,
            resize: true,
            spin: true,
            spinSpeed: 0.00002,
            clickPan: true,
            canMoveFixedItems: false,
            gridVisibility: true,
        },

        // Grid settings
        gridSize: 5000,
        gridSpacing: 50,

        // Actions
        setEnabled: (enabled) => set({ enabled }),
        setNeedsUpdate: (needsUpdate) => set({ needsUpdate }),

        setModel: (model) => set({ model, floorplan: model?.floorplan }),

        selectItem: (item) => {
            const prev = get().selectedItem;
            if (prev && prev !== item) {
                prev.selected = false;
            }
            if (item) {
                item.selected = true;
            }
            set({ selectedItem: item, needsUpdate: true });
        },

        deselectItem: () => {
            const prev = get().selectedItem;
            if (prev) {
                prev.selected = false;
            }
            set({ selectedItem: null, needsUpdate: true });
        },

        setHoveredItem: (item) => set({ hoveredItem: item }),
        setIsTransforming: (isTransforming) => set({ isTransforming }),

        // Room management
        setRooms: (rooms) => set({ rooms }),
        setWallEdges: (wallEdges) => set({ wallEdges }),
        setRoomItems: (roomItems) => set({ roomItems }),
        addPhysicalItem: (item) => set((state) => ({
            physicalItems: [...state.physicalItems, item]
        })),
        removePhysicalItem: (item) => set((state) => ({
            physicalItems: state.physicalItems.filter(i => i !== item)
        })),
        clearPhysicalItems: () => set({ physicalItems: [] }),

        // Camera
        setCameraPosition: (position) => set({ cameraPosition: position }),
        setControlsTarget: (target) => set({ controlsTarget: target }),

        focusOn: (center, distance, normal) => {
            const position = [
                center[0] + normal[0] * distance,
                center[1] + normal[1] * distance,
                center[2] + normal[2] * distance,
            ];
            set({ cameraPosition: position, controlsTarget: center, needsUpdate: true });
        },

        // Options
        setOptions: (options) => set((state) => ({
            options: { ...state.options, ...options }
        })),

        setGridSize: (gridSize) => set({ gridSize }),
        setGridSpacing: (gridSpacing) => set({ gridSpacing }),

        // Reset
        reset: () => set({
            selectedItem: null,
            hoveredItem: null,
            rooms: [],
            wallEdges: [],
            roomItems: [],
            physicalItems: [],
        }),
    }))
);

// Event types for compatibility
export const ViewerEvents = {
    ITEM_SELECTED: 'ITEM_SELECTED',
    ITEM_DESELECTED: 'ITEM_DESELECTED',
    ITEM_MOVE: 'ITEM_MOVE',
    ITEM_MOVE_FINISH: 'ITEM_MOVE_FINISH',
    WALL_CLICKED: 'WALL_CLICKED',
    ROOM_CLICKED: 'ROOM_CLICKED',
};
