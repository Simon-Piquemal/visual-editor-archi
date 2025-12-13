import { ProceduralWindow } from "./ProceduralWindow";

export const WINDOW_TYPES = {
    1: ProceduralWindow  // Procedural window with multiple styles
};

/** Factory class to create window items. */
export class WindowFactory {
    /** Gets the class for the specified window type. */
    static getClass(windowType) {
        return WINDOW_TYPES[windowType];
    }
}
