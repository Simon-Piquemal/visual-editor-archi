import {
    BufferGeometry,
    BoxGeometry,
    CylinderGeometry,
    SphereGeometry,
    Vector3,
    DoubleSide,
    Color,
    MeshStandardMaterial,
    MeshPhysicalMaterial
} from "three";
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EventDispatcher } from "three";
import { EVENT_PARAMETRIC_GEOMETRY_UPATED } from "../../core/events";

// Window type
export const WINDOW_TYPES = {
    FIXED: 'fixed',
    CASEMENT: 'casement',
    DOUBLE_CASEMENT: 'double-casement',
    TILT: 'tilt',
    SLIDING: 'sliding',
    AWNING: 'awning'
};

// Handle types
export const WINDOW_HANDLE_TYPES = {
    NONE: 'none',
    OLIVE: 'olive',
    LEVER: 'lever',
    TILT_HANDLE: 'tilt-handle',
    SLIDING_HANDLE: 'sliding-handle'
};

/**
 * ProceduralWindow - A fully procedural window with multiple styles
 * Based on the standalone Three.js window demo
 * Geometry is centered at y=0 (like ParametricBaseDoor)
 */
export class ProceduralWindow extends EventDispatcher {
    constructor(parameters = {}) {
        super();

        // Default parameters (dimensions in centimeters)
        const defaults = {
            // Dimensions (in cm)
            width: 120,
            height: 140,
            frameThickness: 6,
            frameDepth: 7,

            // Type
            windowType: WINDOW_TYPES.CASEMENT,

            // Grid (muntins)
            gridCols: 1,
            gridRows: 1,
            muntinWidth: 2,

            // Handle
            handleType: WINDOW_HANDLE_TYPES.OLIVE,

            // Colors
            frameColor: '#FFFFFF',
            handleColor: '#C0C0C0',
            glassColor: '#88CCFF',
            glassOpacity: 0.3,

            // Outer frame (dormant)
            showOuterFrame: true,
            outerFrameWidth: 6,
            outerFrameColor: '#E8E8E8',

            // Animation
            openAmount: 0
        };

        // Merge parameters with defaults
        this.__params = { ...defaults, ...parameters };

        // Convert colors to Color objects
        this.__frameColor = new Color(this.__params.frameColor);
        this.__handleColor = new Color(this.__params.handleColor);
        this.__glassColor = new Color(this.__params.glassColor);
        this.__outerFrameColor = new Color(this.__params.outerFrameColor);

        // Create materials
        this.__frameMaterial = new MeshStandardMaterial({
            color: this.__frameColor,
            roughness: 0.4,
            metalness: 0.1,
            side: DoubleSide
        });

        this.__handleMaterial = new MeshStandardMaterial({
            color: this.__handleColor,
            roughness: 0.3,
            metalness: 0.8,
            side: DoubleSide
        });

        this.__glassMaterial = new MeshPhysicalMaterial({
            color: this.__glassColor,
            transparent: true,
            opacity: this.__params.glassOpacity,
            roughness: 0.05,
            metalness: 0,
            transmission: 0.9,
            side: DoubleSide
        });

        this.__outerFrameMaterial = new MeshStandardMaterial({
            color: this.__outerFrameColor,
            roughness: 0.5,
            metalness: 0.1,
            side: DoubleSide
        });

        // Material array for multi-material mesh
        this.__material = [
            this.__outerFrameMaterial,  // 0 - outer frame (dormant)
            this.__frameMaterial,       // 1 - sash frame
            this.__handleMaterial,      // 2 - handle
            this.__glassMaterial        // 3 - glass
        ];

        // Generate initial geometry
        this.__geometry = this.__generateGeometry();
        this.__windowType = 1; // Type ID for procedural window
        this.__name = 'Procedural Window';
        this.needsUpdate = true;
    }

    /**
     * Main geometry generation method
     * Note: Window is centered at y=0 (center at origin)
     */
    __generateGeometry() {
        const geometries = [];
        const p = this.__params;

        const width = p.width;
        const height = p.height;

        // Y offset to center window at y=0
        const yOffset = -height / 2;

        // Create outer frame (dormant)
        if (p.showOuterFrame) {
            const outerFrame = this.__createOuterFrame(width, height, yOffset);
            outerFrame.forEach(f => geometries.push({ geom: f, materialIndex: 0 }));
        }

        // Create sashes based on window type
        if (p.windowType === WINDOW_TYPES.DOUBLE_CASEMENT) {
            const sashWidth = width / 2;
            // Left sash
            const leftSash = this.__createSash(sashWidth, height, -sashWidth / 2, yOffset, true);
            leftSash.forEach(s => geometries.push(s));
            // Right sash
            const rightSash = this.__createSash(sashWidth, height, sashWidth / 2, yOffset, true);
            rightSash.forEach(s => geometries.push(s));
        } else if (p.windowType === WINDOW_TYPES.SLIDING) {
            const sashWidth = width / 2 + 2;
            // Back sash (fixed)
            const backSash = this.__createSash(sashWidth, height, -width / 4, yOffset, false, -1.5);
            backSash.forEach(s => geometries.push(s));
            // Front sash (sliding)
            const frontSash = this.__createSash(sashWidth, height, width / 4, yOffset, true, 1.5);
            frontSash.forEach(s => geometries.push(s));
        } else {
            // Single sash (fixed, casement, tilt, awning)
            const sash = this.__createSash(width, height, 0, yOffset, p.windowType !== WINDOW_TYPES.FIXED);
            sash.forEach(s => geometries.push(s));
        }

        // Merge all geometries with material groups
        return this.__mergeGeometriesWithGroups(geometries);
    }

    /**
     * Create outer frame (dormant)
     */
    __createOuterFrame(width, height, yOffset) {
        const frames = [];
        const fw = this.__params.outerFrameWidth;
        const fd = this.__params.frameDepth + 2;
        const centerY = yOffset + height / 2;

        // Top
        const topGeom = new BoxGeometry(width + fw * 2, fw, fd);
        topGeom.translate(0, yOffset + height + fw / 2, 0);
        frames.push(topGeom);

        // Bottom
        const bottomGeom = new BoxGeometry(width + fw * 2, fw, fd);
        bottomGeom.translate(0, yOffset - fw / 2, 0);
        frames.push(bottomGeom);

        // Left
        const leftGeom = new BoxGeometry(fw, height, fd);
        leftGeom.translate(-width / 2 - fw / 2, centerY, 0);
        frames.push(leftGeom);

        // Right
        const rightGeom = new BoxGeometry(fw, height, fd);
        rightGeom.translate(width / 2 + fw / 2, centerY, 0);
        frames.push(rightGeom);

        return frames;
    }

    /**
     * Create a window sash (frame + glass + muntins + handle)
     */
    __createSash(width, height, offsetX, offsetY, addHandle = true, zOffset = 0) {
        const elements = [];
        const ft = this.__params.frameThickness;
        const fd = this.__params.frameDepth;
        const centerY = offsetY + height / 2;

        // Frame pieces
        // Top
        const topGeom = new BoxGeometry(width, ft, fd);
        topGeom.translate(offsetX, offsetY + height - ft / 2, zOffset);
        elements.push({ geom: topGeom, materialIndex: 1 });

        // Bottom
        const bottomGeom = new BoxGeometry(width, ft, fd);
        bottomGeom.translate(offsetX, offsetY + ft / 2, zOffset);
        elements.push({ geom: bottomGeom, materialIndex: 1 });

        // Left
        const leftGeom = new BoxGeometry(ft, height - ft * 2, fd);
        leftGeom.translate(offsetX - width / 2 + ft / 2, centerY, zOffset);
        elements.push({ geom: leftGeom, materialIndex: 1 });

        // Right
        const rightGeom = new BoxGeometry(ft, height - ft * 2, fd);
        rightGeom.translate(offsetX + width / 2 - ft / 2, centerY, zOffset);
        elements.push({ geom: rightGeom, materialIndex: 1 });

        // Glass and muntins
        const glassElements = this.__createGlassWithMuntins(
            width - ft * 2,
            height - ft * 2,
            offsetX,
            centerY,
            zOffset
        );
        glassElements.forEach(el => elements.push(el));

        // Handle
        if (addHandle && this.__params.handleType !== WINDOW_HANDLE_TYPES.NONE) {
            const handleElements = this.__createHandle(width, height, offsetX, offsetY, zOffset);
            handleElements.forEach(h => elements.push({ geom: h, materialIndex: 2 }));
        }

        return elements;
    }

    /**
     * Create glass panes with muntins (petits bois)
     */
    __createGlassWithMuntins(glassWidth, glassHeight, offsetX, offsetY, zOffset) {
        const elements = [];
        const cols = this.__params.gridCols;
        const rows = this.__params.gridRows;
        const mw = this.__params.muntinWidth;

        const cellWidth = (glassWidth - mw * (cols - 1)) / cols;
        const cellHeight = (glassHeight - mw * (rows - 1)) / rows;

        // Create glass panes
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const glassGeom = new BoxGeometry(cellWidth, cellHeight, 0.6);

                const x = offsetX - glassWidth / 2 + cellWidth / 2 + col * (cellWidth + mw);
                const y = offsetY + glassHeight / 2 - cellHeight / 2 - row * (cellHeight + mw);

                glassGeom.translate(x, y, zOffset);
                elements.push({ geom: glassGeom, materialIndex: 3 });
            }
        }

        // Vertical muntins
        for (let col = 1; col < cols; col++) {
            const muntinGeom = new BoxGeometry(mw, glassHeight, this.__params.frameDepth * 0.6);
            const x = offsetX - glassWidth / 2 + col * cellWidth + (col - 0.5) * mw;
            muntinGeom.translate(x, offsetY, zOffset);
            elements.push({ geom: muntinGeom, materialIndex: 1 });
        }

        // Horizontal muntins
        for (let row = 1; row < rows; row++) {
            const muntinGeom = new BoxGeometry(glassWidth, mw, this.__params.frameDepth * 0.6);
            const y = offsetY + glassHeight / 2 - row * cellHeight - (row - 0.5) * mw;
            muntinGeom.translate(offsetX, y, zOffset);
            elements.push({ geom: muntinGeom, materialIndex: 1 });
        }

        return elements;
    }

    /**
     * Create window handle
     */
    __createHandle(sashWidth, sashHeight, offsetX, offsetY, zOffset) {
        const handles = [];
        const handleY = offsetY + sashHeight * 0.5;
        const handleX = offsetX + sashWidth / 2 - this.__params.frameThickness / 2;
        const fd = this.__params.frameDepth;

        // Both sides
        const sides = [
            { z: zOffset + fd / 2, zDir: 1 },
            { z: zOffset - fd / 2, zDir: -1 }
        ];

        sides.forEach(side => {
            if (this.__params.handleType === WINDOW_HANDLE_TYPES.OLIVE) {
                // Olive handle (crémone)
                // Base plate
                const plateGeom = new BoxGeometry(2.5, 8, 0.8);
                plateGeom.translate(handleX, handleY, side.z + 0.5 * side.zDir);
                handles.push(plateGeom);

                // Olive (egg shape)
                const oliveGeom = new SphereGeometry(1.8, 16, 12);
                oliveGeom.scale(0.7, 1, 0.7);
                oliveGeom.translate(handleX, handleY, side.z + 2.5 * side.zDir);
                handles.push(oliveGeom);

                // Stem
                const stemGeom = new CylinderGeometry(0.6, 0.6, 1.5, 12);
                stemGeom.rotateX(Math.PI / 2);
                stemGeom.translate(handleX, handleY, side.z + 1.2 * side.zDir);
                handles.push(stemGeom);

            } else if (this.__params.handleType === WINDOW_HANDLE_TYPES.LEVER) {
                // Lever handle
                const rosetteGeom = new CylinderGeometry(2, 2, 1, 24);
                rosetteGeom.rotateX(Math.PI / 2);
                rosetteGeom.translate(handleX, handleY, side.z + 0.6 * side.zDir);
                handles.push(rosetteGeom);

                const leverGeom = new CylinderGeometry(0.8, 0.8, 8, 12);
                leverGeom.translate(handleX, handleY - 4, side.z + 1.5 * side.zDir);
                handles.push(leverGeom);

                const endGeom = new SphereGeometry(1.2, 12, 12);
                endGeom.translate(handleX, handleY - 8, side.z + 1.5 * side.zDir);
                handles.push(endGeom);

            } else if (this.__params.handleType === WINDOW_HANDLE_TYPES.TILT_HANDLE) {
                // Tilt and turn handle
                const baseGeom = new BoxGeometry(2.5, 10, 1.2);
                baseGeom.translate(handleX, handleY, side.z + 0.7 * side.zDir);
                handles.push(baseGeom);

                const handleGeom = new BoxGeometry(1.8, 7, 1.5);
                handleGeom.translate(handleX, handleY + 6, side.z + 1.5 * side.zDir);
                handles.push(handleGeom);

            } else if (this.__params.handleType === WINDOW_HANDLE_TYPES.SLIDING_HANDLE) {
                // Sliding handle (recessed)
                const recessGeom = new BoxGeometry(3, 10, 1.5);
                recessGeom.translate(handleX - 1, handleY, side.z + 0.8 * side.zDir);
                handles.push(recessGeom);

                const gripGeom = new BoxGeometry(2.5, 6, 0.8);
                gripGeom.translate(handleX - 1, handleY, side.z + 1.8 * side.zDir);
                handles.push(gripGeom);
            }
        });

        return handles;
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
            const merged = mergeGeometries(grouped[matIndex], false);
            if (merged) {
                mergedGroups.push({ geometry: merged, materialIndex: parseInt(matIndex) });
            }
        });

        // Combine all into single geometry with groups
        if (mergedGroups.length === 0) return new BufferGeometry();

        const allGeoms = mergedGroups.map(g => g.geometry);
        const finalGeometry = mergeGeometries(allGeoms, true);

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

    // Getters and setters

    get width() { return this.__params.width; }
    set width(value) {
        this.__params.width = Math.max(40, Math.min(240, value));
        this.__updateGeometry();
    }

    get height() { return this.__params.height; }
    set height(value) {
        this.__params.height = Math.max(40, Math.min(240, value));
        this.__updateGeometry();
    }

    get frameThickness() { return this.__params.frameThickness; }
    set frameThickness(value) {
        this.__params.frameThickness = Math.max(3, Math.min(12, value));
        this.__updateGeometry();
    }

    get frameDepth() { return this.__params.frameDepth; }
    set frameDepth(value) {
        this.__params.frameDepth = Math.max(4, Math.min(12, value));
        this.__updateGeometry();
    }

    get windowType() { return this.__params.windowType; }
    set windowType(value) {
        if (Object.values(WINDOW_TYPES).includes(value)) {
            this.__params.windowType = value;
            this.__updateGeometry();
        }
    }

    get gridCols() { return this.__params.gridCols; }
    set gridCols(value) {
        this.__params.gridCols = Math.max(1, Math.min(4, value));
        this.__updateGeometry();
    }

    get gridRows() { return this.__params.gridRows; }
    set gridRows(value) {
        this.__params.gridRows = Math.max(1, Math.min(4, value));
        this.__updateGeometry();
    }

    get muntinWidth() { return this.__params.muntinWidth; }
    set muntinWidth(value) {
        this.__params.muntinWidth = Math.max(1, Math.min(4, value));
        this.__updateGeometry();
    }

    get handleType() { return this.__params.handleType; }
    set handleType(value) {
        if (Object.values(WINDOW_HANDLE_TYPES).includes(value)) {
            this.__params.handleType = value;
            this.__updateGeometry();
        }
    }

    get frameColor() { return `#${this.__frameColor.getHexString()}`; }
    set frameColor(value) {
        this.__frameColor.set(value);
        this.__frameMaterial.color = this.__frameColor;
        this.__frameMaterial.needsUpdate = true;
    }

    get handleColor() { return `#${this.__handleColor.getHexString()}`; }
    set handleColor(value) {
        this.__handleColor.set(value);
        this.__handleMaterial.color = this.__handleColor;
        this.__handleMaterial.needsUpdate = true;
    }

    get glassColor() { return `#${this.__glassColor.getHexString()}`; }
    set glassColor(value) {
        this.__glassColor.set(value);
        this.__glassMaterial.color = this.__glassColor;
        this.__glassMaterial.needsUpdate = true;
    }

    get glassOpacity() { return this.__params.glassOpacity; }
    set glassOpacity(value) {
        this.__params.glassOpacity = Math.max(0.1, Math.min(0.8, value));
        this.__glassMaterial.opacity = this.__params.glassOpacity;
        this.__glassMaterial.needsUpdate = true;
    }

    get showOuterFrame() { return this.__params.showOuterFrame; }
    set showOuterFrame(value) {
        this.__params.showOuterFrame = value;
        this.__updateGeometry();
    }

    get outerFrameWidth() { return this.__params.outerFrameWidth; }
    set outerFrameWidth(value) {
        this.__params.outerFrameWidth = Math.max(3, Math.min(12, value));
        this.__updateGeometry();
    }

    get outerFrameColor() { return `#${this.__outerFrameColor.getHexString()}`; }
    set outerFrameColor(value) {
        this.__outerFrameColor.set(value);
        this.__outerFrameMaterial.color = this.__outerFrameColor;
        this.__outerFrameMaterial.needsUpdate = true;
    }

    get openAmount() { return this.__params.openAmount; }
    set openAmount(value) {
        this.__params.openAmount = Math.max(0, Math.min(100, value));
        // Animation handled externally
    }

    // Compatibility with existing system
    get frameWidth() { return this.__params.width; }
    set frameWidth(value) { this.width = value; }

    get frameHeight() { return this.__params.height; }
    set frameHeight(value) { this.height = value; }

    get doorType() { return this.__windowType; } // For compatibility
    get geometry() { return this.__geometry; }
    get material() { return this.__material; }
    get name() { return this.__name; }
    set name(value) { this.__name = value; }

    /**
     * Get metadata for serialization
     */
    get metadata() {
        return {
            type: this.__windowType,
            width: this.__params.width,
            height: this.__params.height,
            frameThickness: this.__params.frameThickness,
            frameDepth: this.__params.frameDepth,
            windowType: this.__params.windowType,
            gridCols: this.__params.gridCols,
            gridRows: this.__params.gridRows,
            muntinWidth: this.__params.muntinWidth,
            handleType: this.__params.handleType,
            frameColor: this.frameColor,
            handleColor: this.handleColor,
            glassColor: this.glassColor,
            glassOpacity: this.__params.glassOpacity,
            showOuterFrame: this.__params.showOuterFrame,
            outerFrameWidth: this.__params.outerFrameWidth,
            outerFrameColor: this.outerFrameColor,
            openAmount: this.__params.openAmount
        };
    }

    /**
     * Get parameter definitions for UI
     */
    get parameters() {
        return {
            width: { type: 'range', min: 40, max: 240, step: 5, label: 'Largeur (cm)' },
            height: { type: 'range', min: 40, max: 240, step: 5, label: 'Hauteur (cm)' },
            frameThickness: { type: 'range', min: 3, max: 12, step: 0.5, label: 'Epaisseur cadre (cm)' },
            frameDepth: { type: 'range', min: 4, max: 12, step: 0.5, label: 'Profondeur cadre (cm)' },
            windowType: {
                type: 'choice',
                value: Object.values(WINDOW_TYPES),
                label: 'Type'
            },
            gridCols: { type: 'range', min: 1, max: 4, step: 1, label: 'Colonnes' },
            gridRows: { type: 'range', min: 1, max: 4, step: 1, label: 'Lignes' },
            muntinWidth: { type: 'range', min: 1, max: 4, step: 0.2, label: 'Petits bois (cm)' },
            handleType: {
                type: 'choice',
                value: Object.values(WINDOW_HANDLE_TYPES),
                label: 'Type poignee'
            },
            frameColor: { type: 'color', label: 'Couleur cadre' },
            handleColor: { type: 'color', label: 'Couleur poignee' },
            glassColor: { type: 'color', label: 'Teinte vitrage' },
            glassOpacity: { type: 'range', min: 0.1, max: 0.8, step: 0.05, label: 'Opacite vitrage' },
            showOuterFrame: { type: 'boolean', label: 'Afficher dormant' },
            outerFrameWidth: { type: 'range', min: 3, max: 12, step: 0.5, label: 'Largeur dormant (cm)' },
            outerFrameColor: { type: 'color', label: 'Couleur dormant' }
        };
    }
}
