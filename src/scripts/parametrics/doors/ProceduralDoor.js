import {
    BufferGeometry,
    BoxGeometry,
    CylinderGeometry,
    SphereGeometry,
    Matrix4,
    Vector3,
    DoubleSide,
    Color,
    MeshStandardMaterial,
    MeshPhysicalMaterial,
    Group
} from "three";
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EventDispatcher } from "three";
import { EVENT_PARAMETRIC_GEOMETRY_UPATED } from "../../core/events";

// Door style types
export const DOOR_STYLES = {
    PLAIN: 'plain',
    PANELS: 'panels',
    MODERN: 'modern',
    GLASS: 'glass'
};

// Handle types
export const HANDLE_TYPES = {
    NONE: 'none',
    LEVER: 'lever',
    KNOB: 'knob',
    PULL: 'pull'
};

// Open direction
export const OPEN_DIRECTIONS = {
    INWARD: 'inward',
    OUTWARD: 'outward'
};

// Handle side (determines hinge position - opposite side)
export const HANDLE_SIDES = {
    LEFT: 'left',
    RIGHT: 'right'
};

/**
 * ProceduralDoor - A fully procedural door with multiple styles
 * Based on the standalone Three.js door demo
 */
export class ProceduralDoor extends EventDispatcher {
    constructor(parameters = {}) {
        super();

        // Default parameters (dimensions in centimeters for compatibility with existing system)
        const defaults = {
            // Dimensions (in cm)
            width: 100,           // Door width
            height: 210,          // Door height
            thickness: 4,         // Door thickness

            // Style
            style: DOOR_STYLES.PANELS,
            panelCount: 4,
            panelDepth: 1,        // cm

            // Handle
            handleType: HANDLE_TYPES.LEVER,
            handlePosition: 50,   // % from bottom
            handleSide: HANDLE_SIDES.RIGHT,

            // Colors
            doorColor: '#8B5A2B',
            handleColor: '#C0C0C0',

            // Frame
            showFrame: true,
            frameWidth: 8,        // cm
            frameColor: '#F5F5DC',

            // Animation
            openAngle: 0,         // degrees
            openDirection: OPEN_DIRECTIONS.OUTWARD
        };

        // Merge parameters with defaults
        this.__params = { ...defaults, ...parameters };

        // Convert colors to Color objects
        this.__doorColor = new Color(this.__params.doorColor);
        this.__handleColor = new Color(this.__params.handleColor);
        this.__frameColor = new Color(this.__params.frameColor);

        // Create materials
        this.__doorMaterial = new MeshStandardMaterial({
            color: this.__doorColor,
            roughness: 0.6,
            metalness: 0.1,
            side: DoubleSide
        });

        this.__handleMaterial = new MeshStandardMaterial({
            color: this.__handleColor,
            roughness: 0.3,
            metalness: 0.8,
            side: DoubleSide
        });

        this.__frameMaterial = new MeshStandardMaterial({
            color: this.__frameColor,
            roughness: 0.5,
            metalness: 0.1,
            side: DoubleSide
        });

        this.__glassMaterial = new MeshPhysicalMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0,
            transmission: 0.9,
            side: DoubleSide
        });

        // Material array for multi-material mesh
        this.__material = [
            this.__frameMaterial,    // 0 - frame
            this.__doorMaterial,     // 1 - door
            this.__handleMaterial,   // 2 - handle
            this.__glassMaterial     // 3 - glass
        ];

        // Generate initial geometry
        this.__geometry = this.__generateGeometry();
        this.__doorType = 7; // New type ID for procedural door
        this.__name = 'Procedural Door';
        this.needsUpdate = true;
    }

    /**
     * Main geometry generation method
     */
    __generateGeometry() {
        const geometries = [];
        const p = this.__params;

        // Convert to meters for Three.js (internal calculation), then back to cm
        const width = p.width;
        const height = p.height;
        const thickness = p.thickness;

        // Create door panel geometry
        const doorGeom = this.__createDoorPanel(width, height, thickness);
        geometries.push({ geom: doorGeom, materialIndex: 1 });

        // Add style elements
        if (p.style === DOOR_STYLES.PANELS) {
            const panels = this.__createPanels(width, height, thickness);
            panels.forEach(panel => geometries.push({ geom: panel, materialIndex: 1 }));
        } else if (p.style === DOOR_STYLES.MODERN) {
            const grooves = this.__createModernGrooves(width, height, thickness);
            grooves.forEach(groove => geometries.push({ geom: groove, materialIndex: 1 }));
        } else if (p.style === DOOR_STYLES.GLASS) {
            const glassElements = this.__createGlassPanel(width, height, thickness);
            glassElements.forEach(el => geometries.push(el));
        }

        // Add handle
        if (p.handleType !== HANDLE_TYPES.NONE) {
            const handles = this.__createHandle(width, height, thickness);
            handles.forEach(handle => geometries.push({ geom: handle, materialIndex: 2 }));
        }

        // Add frame
        if (p.showFrame) {
            const frame = this.__createFrame(width, height, thickness);
            frame.forEach(f => geometries.push({ geom: f, materialIndex: 0 }));
        }

        // Merge all geometries with material groups
        return this.__mergeGeometriesWithGroups(geometries);
    }

    /**
     * Create the main door panel
     */
    __createDoorPanel(width, height, thickness) {
        const geom = new BoxGeometry(width, height, thickness);
        // Door is centered at y=0 (center of door at origin, like ParametricBaseDoor)
        // No translation needed - BoxGeometry is already centered
        return geom;
    }

    /**
     * Create panel style decorations
     * Note: Door is centered at y=0, so positions range from -height/2 to +height/2
     */
    __createPanels(width, height, thickness) {
        const panels = [];
        const p = this.__params;
        const panelRows = Math.ceil(p.panelCount / 2);
        const panelCols = 2;
        const margin = 8; // cm
        const gap = 4;    // cm

        const panelWidth = (width - 2 * margin - gap) / panelCols;
        const panelHeight = (height - 2 * margin - (panelRows - 1) * gap) / panelRows;

        // Y offset to center door at y=0
        const yOffset = -height / 2;

        let panelIndex = 0;

        for (let row = 0; row < panelRows && panelIndex < p.panelCount; row++) {
            for (let col = 0; col < panelCols && panelIndex < p.panelCount; col++) {
                const panelGeom = new BoxGeometry(
                    panelWidth - 2,
                    panelHeight - 2,
                    p.panelDepth
                );

                const x = -width / 2 + margin + col * (panelWidth + gap) + panelWidth / 2;
                const y = yOffset + height - margin - row * (panelHeight + gap) - panelHeight / 2;
                const z = thickness / 2 + p.panelDepth / 2 - 1.5;

                panelGeom.translate(x, y, z);
                panels.push(panelGeom);
                panelIndex++;
            }
        }

        return panels;
    }

    /**
     * Create modern groove style
     * Note: Door is centered at y=0
     */
    __createModernGrooves(width, height, thickness) {
        const grooves = [];
        const grooveCount = 5;
        const grooveHeight = 1; // cm
        const spacing = height / (grooveCount + 1);

        // Y offset to center door at y=0
        const yOffset = -height / 2;

        for (let i = 1; i <= grooveCount; i++) {
            const grooveGeom = new BoxGeometry(width - 10, grooveHeight, 0.5);
            grooveGeom.translate(0, yOffset + i * spacing, thickness / 2 + 0.3);
            grooves.push(grooveGeom);
        }

        return grooves;
    }

    /**
     * Create glass panel style
     * Note: Door is centered at y=0
     */
    __createGlassPanel(width, height, thickness) {
        const elements = [];
        const glassWidth = width * 0.6;
        const glassHeight = height * 0.5;

        // Y offset to center door at y=0
        const yOffset = -height / 2;
        const glassY = yOffset + height * 0.6;

        // Glass panel
        const glassGeom = new BoxGeometry(glassWidth, glassHeight, thickness * 0.3);
        glassGeom.translate(0, glassY, 0);
        elements.push({ geom: glassGeom, materialIndex: 3 });

        // Glass frame elements
        const frameThickness = 2; // cm

        // Top frame
        const topFrameGeom = new BoxGeometry(glassWidth + frameThickness * 2, frameThickness, thickness);
        topFrameGeom.translate(0, glassY + glassHeight / 2 + frameThickness / 2, 0);
        elements.push({ geom: topFrameGeom, materialIndex: 1 });

        // Bottom frame
        const bottomFrameGeom = new BoxGeometry(glassWidth + frameThickness * 2, frameThickness, thickness);
        bottomFrameGeom.translate(0, glassY - glassHeight / 2 - frameThickness / 2, 0);
        elements.push({ geom: bottomFrameGeom, materialIndex: 1 });

        // Left frame
        const leftFrameGeom = new BoxGeometry(frameThickness, glassHeight, thickness);
        leftFrameGeom.translate(-glassWidth / 2 - frameThickness / 2, glassY, 0);
        elements.push({ geom: leftFrameGeom, materialIndex: 1 });

        // Right frame
        const rightFrameGeom = new BoxGeometry(frameThickness, glassHeight, thickness);
        rightFrameGeom.translate(glassWidth / 2 + frameThickness / 2, glassY, 0);
        elements.push({ geom: rightFrameGeom, materialIndex: 1 });

        return elements;
    }

    /**
     * Create door handle
     * Note: Door is centered at y=0
     */
    __createHandle(width, height, thickness) {
        const handles = [];
        const p = this.__params;

        // Y offset to center door at y=0
        const yOffset = -height / 2;
        const handleHeight = yOffset + height * (p.handlePosition / 100);

        // Handle X position
        const handleOffsetFromEdge = 8; // cm
        const handleX = p.handleSide === HANDLE_SIDES.RIGHT
            ? width / 2 - handleOffsetFromEdge
            : -width / 2 + handleOffsetFromEdge;

        const leverDir = p.handleSide === HANDLE_SIDES.RIGHT ? -1 : 1;

        // Create handles on both sides
        const sides = [
            { z: thickness / 2, zOffset: 1 },
            { z: -thickness / 2, zOffset: -1 }
        ];

        sides.forEach(side => {
            if (p.handleType === HANDLE_TYPES.LEVER) {
                // Rosette (base plate)
                const rosetteGeom = new CylinderGeometry(2.5, 2.5, 1.5, 32);
                rosetteGeom.rotateX(Math.PI / 2);
                rosetteGeom.translate(handleX, handleHeight, side.z + 0.8 * side.zOffset);
                handles.push(rosetteGeom);

                // Lever
                const leverGeom = new CylinderGeometry(1, 1, 12, 16);
                leverGeom.rotateZ(Math.PI / 2);
                leverGeom.translate(handleX + leverDir * 6, handleHeight, side.z + 2 * side.zOffset);
                handles.push(leverGeom);

                // Lever end
                const endGeom = new SphereGeometry(1.5, 16, 16);
                endGeom.translate(handleX + leverDir * 12, handleHeight, side.z + 2 * side.zOffset);
                handles.push(endGeom);

            } else if (p.handleType === HANDLE_TYPES.KNOB) {
                // Knob
                const knobGeom = new SphereGeometry(3.5, 32, 32);
                knobGeom.translate(handleX, handleHeight, side.z + 4 * side.zOffset);
                handles.push(knobGeom);

                // Stem
                const stemGeom = new CylinderGeometry(1.2, 1.5, 3, 16);
                stemGeom.rotateX(Math.PI / 2);
                stemGeom.translate(handleX, handleHeight, side.z + 1.5 * side.zOffset);
                handles.push(stemGeom);

            } else if (p.handleType === HANDLE_TYPES.PULL) {
                // Pull bar
                const barGeom = new CylinderGeometry(1.2, 1.2, 30, 16);
                barGeom.translate(handleX, handleHeight, side.z + 5 * side.zOffset);
                handles.push(barGeom);

                // Mounts
                const mountGeom1 = new CylinderGeometry(0.8, 0.8, 4, 16);
                mountGeom1.rotateX(Math.PI / 2);
                mountGeom1.translate(handleX, handleHeight + 12, side.z + 2.5 * side.zOffset);
                handles.push(mountGeom1);

                const mountGeom2 = new CylinderGeometry(0.8, 0.8, 4, 16);
                mountGeom2.rotateX(Math.PI / 2);
                mountGeom2.translate(handleX, handleHeight - 12, side.z + 2.5 * side.zOffset);
                handles.push(mountGeom2);
            }

            // Keyhole escutcheon
            const escutcheonGeom = new CylinderGeometry(1.5, 1.5, 0.8, 32);
            escutcheonGeom.rotateX(Math.PI / 2);
            escutcheonGeom.translate(handleX, handleHeight - 8, side.z + 0.5 * side.zOffset);
            handles.push(escutcheonGeom);
        });

        return handles;
    }

    /**
     * Create door frame
     * Note: Door is centered at y=0
     */
    __createFrame(width, height, thickness) {
        const frames = [];
        const p = this.__params;
        const fw = p.frameWidth;
        const frameDepth = thickness + 6;

        // Y offset to center door at y=0
        const yOffset = -height / 2;

        // Top frame
        const topGeom = new BoxGeometry(width + fw * 2, fw, frameDepth);
        topGeom.translate(0, yOffset + height + fw / 2, -1);
        frames.push(topGeom);

        // Left frame
        const leftGeom = new BoxGeometry(fw, height, frameDepth);
        leftGeom.translate(-width / 2 - fw / 2, 0, -1);  // y=0 is centered
        frames.push(leftGeom);

        // Right frame
        const rightGeom = new BoxGeometry(fw, height, frameDepth);
        rightGeom.translate(width / 2 + fw / 2, 0, -1);  // y=0 is centered
        frames.push(rightGeom);

        return frames;
    }

    /**
     * Merge geometries with material groups
     */
    __mergeGeometriesWithGroups(geometries) {
        // Group by material index
        const grouped = {};
        geometries.forEach(({ geom, materialIndex }) => {
            if (!grouped[materialIndex]) {
                grouped[materialIndex] = [];
            }
            grouped[materialIndex].push(geom);
        });

        // Merge each group
        const mergedGroups = [];
        Object.keys(grouped).forEach(matIndex => {
            const merged = mergeBufferGeometries(grouped[matIndex], false);
            if (merged) {
                mergedGroups.push({ geometry: merged, materialIndex: parseInt(matIndex) });
            }
        });

        // Combine all into single geometry with groups
        if (mergedGroups.length === 0) return new BufferGeometry();

        const allGeoms = mergedGroups.map(g => g.geometry);
        const finalGeometry = mergeBufferGeometries(allGeoms, true);

        // Compute normals
        finalGeometry.computeVertexNormals();
        finalGeometry.computeBoundingBox();

        return finalGeometry;
    }

    /**
     * Update geometry when parameters change
     */
    __updateGeometry() {
        const newGeometry = this.__generateGeometry();
        this.__geometry.dispose();
        this.__geometry = newGeometry;
        this.dispatchEvent({ type: EVENT_PARAMETRIC_GEOMETRY_UPATED, target: this });
    }

    // Getters and setters for all parameters

    get width() { return this.__params.width; }
    set width(value) {
        this.__params.width = Math.max(60, Math.min(180, value));
        this.__updateGeometry();
    }

    get height() { return this.__params.height; }
    set height(value) {
        this.__params.height = Math.max(180, Math.min(280, value));
        this.__updateGeometry();
    }

    get thickness() { return this.__params.thickness; }
    set thickness(value) {
        this.__params.thickness = Math.max(3, Math.min(8, value));
        this.__updateGeometry();
    }

    get style() { return this.__params.style; }
    set style(value) {
        if (Object.values(DOOR_STYLES).includes(value)) {
            this.__params.style = value;
            this.__updateGeometry();
        }
    }

    get panelCount() { return this.__params.panelCount; }
    set panelCount(value) {
        this.__params.panelCount = Math.max(1, Math.min(6, value));
        this.__updateGeometry();
    }

    get panelDepth() { return this.__params.panelDepth; }
    set panelDepth(value) {
        this.__params.panelDepth = Math.max(0.5, Math.min(2.5, value));
        this.__updateGeometry();
    }

    get handleType() { return this.__params.handleType; }
    set handleType(value) {
        if (Object.values(HANDLE_TYPES).includes(value)) {
            this.__params.handleType = value;
            this.__updateGeometry();
        }
    }

    get handlePosition() { return this.__params.handlePosition; }
    set handlePosition(value) {
        this.__params.handlePosition = Math.max(40, Math.min(60, value));
        this.__updateGeometry();
    }

    get handleSide() { return this.__params.handleSide; }
    set handleSide(value) {
        if (Object.values(HANDLE_SIDES).includes(value)) {
            this.__params.handleSide = value;
            this.__updateGeometry();
        }
    }

    get doorColor() { return `#${this.__doorColor.getHexString()}`; }
    set doorColor(value) {
        this.__doorColor.set(value);
        this.__doorMaterial.color = this.__doorColor;
        this.__doorMaterial.needsUpdate = true;
    }

    get handleColor() { return `#${this.__handleColor.getHexString()}`; }
    set handleColor(value) {
        this.__handleColor.set(value);
        this.__handleMaterial.color = this.__handleColor;
        this.__handleMaterial.needsUpdate = true;
    }

    get showFrame() { return this.__params.showFrame; }
    set showFrame(value) {
        this.__params.showFrame = value;
        this.__updateGeometry();
    }

    get frameWidth() { return this.__params.frameWidth; }
    set frameWidth(value) {
        this.__params.frameWidth = Math.max(4, Math.min(15, value));
        this.__updateGeometry();
    }

    get frameColor() { return `#${this.__frameColor.getHexString()}`; }
    set frameColor(value) {
        this.__frameColor.set(value);
        this.__frameMaterial.color = this.__frameColor;
        this.__frameMaterial.needsUpdate = true;
    }

    get openAngle() { return this.__params.openAngle; }
    set openAngle(value) {
        this.__params.openAngle = Math.max(0, Math.min(120, value));
        // Note: Animation would be handled by the parent item/scene
    }

    get openDirection() { return this.__params.openDirection; }
    set openDirection(value) {
        if (Object.values(OPEN_DIRECTIONS).includes(value)) {
            this.__params.openDirection = value;
        }
    }

    // Compatibility with existing system
    get frameHeight() { return this.__params.height; }
    set frameHeight(value) { this.height = value; }

    get frameThickness() { return this.__params.thickness; }
    set frameThickness(value) { this.thickness = value; }

    get doorType() { return this.__doorType; }
    get geometry() { return this.__geometry; }
    get material() { return this.__material; }
    get name() { return this.__name; }
    set name(value) { this.__name = value; }

    /**
     * Get metadata for serialization
     */
    get metadata() {
        return {
            type: this.__doorType,
            width: this.__params.width,
            height: this.__params.height,
            thickness: this.__params.thickness,
            style: this.__params.style,
            panelCount: this.__params.panelCount,
            panelDepth: this.__params.panelDepth,
            handleType: this.__params.handleType,
            handlePosition: this.__params.handlePosition,
            handleSide: this.__params.handleSide,
            doorColor: this.doorColor,
            handleColor: this.handleColor,
            showFrame: this.__params.showFrame,
            frameWidth: this.__params.frameWidth,
            frameColor: this.frameColor,
            openAngle: this.__params.openAngle,
            openDirection: this.__params.openDirection
        };
    }

    /**
     * Get parameter definitions for UI
     */
    get parameters() {
        return {
            width: { type: 'range', min: 60, max: 180, step: 5, label: 'Largeur (cm)' },
            height: { type: 'range', min: 180, max: 280, step: 5, label: 'Hauteur (cm)' },
            thickness: { type: 'range', min: 3, max: 8, step: 0.5, label: 'Epaisseur (cm)' },
            style: {
                type: 'choice',
                value: Object.values(DOOR_STYLES),
                label: 'Style'
            },
            panelCount: { type: 'range', min: 1, max: 6, step: 1, label: 'Panneaux' },
            panelDepth: { type: 'range', min: 0.5, max: 2.5, step: 0.1, label: 'Prof. panneaux (cm)' },
            handleType: {
                type: 'choice',
                value: Object.values(HANDLE_TYPES),
                label: 'Type poignee'
            },
            handlePosition: { type: 'range', min: 40, max: 60, step: 1, label: 'Position poignee (%)' },
            handleSide: {
                type: 'choice',
                value: Object.values(HANDLE_SIDES),
                label: 'Cote poignee'
            },
            doorColor: { type: 'color', label: 'Couleur porte' },
            handleColor: { type: 'color', label: 'Couleur poignee' },
            showFrame: { type: 'boolean', label: 'Afficher cadre' },
            frameWidth: { type: 'range', min: 4, max: 15, step: 1, label: 'Largeur cadre (cm)' },
            frameColor: { type: 'color', label: 'Couleur cadre' },
            openAngle: { type: 'range', min: 0, max: 120, step: 1, label: 'Ouverture (deg)' },
            openDirection: {
                type: 'choice',
                value: Object.values(OPEN_DIRECTIONS),
                label: 'Sens ouverture'
            }
        };
    }
}
