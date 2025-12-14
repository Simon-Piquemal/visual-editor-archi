import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const ViewModes = {
    VIEW_2D: '2d',
    VIEW_3D: '3d',
};

export const ToolModes = {
    MOVE: 'move',
    DRAW: 'draw',
    TRANSFORM: 'transform',
};

export const ElementTypes = {
    NONE: 'none',
    CORNER: 'corner',
    WALL: 'wall',
    ROOM: 'room',
    ITEM: 'item',
};

export const useAppStore = create(
    subscribeWithSelector((set, get) => ({
        // Blueprint instance
        blueprint: null,
        setBlueprint: (blueprint) => set({ blueprint }),

        // Current view (2D or 3D)
        currentView: ViewModes.VIEW_2D,
        setCurrentView: (view) => {
            const { blueprint } = get();
            if (blueprint) {
                blueprint.view_now = view === ViewModes.VIEW_2D ? 3 : 2; // Inverted because switchView toggles
                blueprint.switchView();
            }
            set({ currentView: view });
        },
        toggleView: () => {
            const { currentView, setCurrentView } = get();
            setCurrentView(currentView === ViewModes.VIEW_2D ? ViewModes.VIEW_3D : ViewModes.VIEW_2D);
        },

        // Tool mode (for 2D view)
        toolMode: ToolModes.MOVE,
        setToolMode: (mode) => {
            const { blueprint } = get();
            if (blueprint) {
                switch (mode) {
                    case ToolModes.DRAW:
                        blueprint.setViewer2DModeToDraw();
                        break;
                    case ToolModes.MOVE:
                        blueprint.setViewer2DModeToMove();
                        break;
                    case ToolModes.TRANSFORM:
                        blueprint.switchViewer2DToTransform();
                        break;
                }
            }
            set({ toolMode: mode });
        },

        // Selected element
        selectedElement: null,
        selectedElementType: ElementTypes.NONE,
        selectElement: (element, type) => set({
            selectedElement: element,
            selectedElementType: type,
        }),
        deselectElement: () => set({
            selectedElement: null,
            selectedElementType: ElementTypes.NONE,
        }),

        // Sidebar panel state
        activeSidebarPanel: 'properties', // 'properties', 'add-elements', 'grid', 'background'
        setActiveSidebarPanel: (panel) => set({ activeSidebarPanel: panel }),

        // UI state
        sidebarCollapsed: false,
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

        // Grid options
        gridVisible: true,
        gridSize: 50,
        snapToGrid: true,
        setGridVisible: (visible) => set({ gridVisible: visible }),
        setGridSize: (size) => set({ gridSize: size }),
        setSnapToGrid: (snap) => set({ snapToGrid: snap }),

        // Status message
        statusMessage: '',
        setStatusMessage: (message) => set({ statusMessage: message }),

        // Loading state
        isLoading: false,
        setLoading: (loading) => set({ isLoading: loading }),
    }))
);
