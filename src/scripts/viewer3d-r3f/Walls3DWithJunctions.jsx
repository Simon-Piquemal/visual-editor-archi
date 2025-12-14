/**
 * Walls3DWithJunctions Component
 * Renders all walls with proper junction handling using CSG
 * Creates clean wall intersections and supports door/window cutouts
 */
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import * as THREE from 'three';
import {
    pointToKey,
    findJunctions,
    calculateJunctionIntersections,
} from './utils/wallJunctions';
import { EVENT_NEW_ITEM, EVENT_ITEM_REMOVED } from '../core/events';

const DEFAULT_WALL_THICKNESS = 10;

/**
 * Convert world point to local wall space
 */
function worldToLocal(worldPoint, wallStart, rotation) {
    const dx = worldPoint.x - wallStart.x;
    const dy = worldPoint.y - wallStart.y;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
        x: dx * cos + dy * sin,
        z: -dx * sin + dy * cos,
    };
}

/**
 * Create wall geometry with junction-aware corners
 */
function createJunctionWallGeometry({
    length,
    height,
    thickness,
    startJunctionData,
    endJunctionData,
    wallStart,
    wallEnd,
    rotation,
}) {
    const halfT = thickness / 2;

    // Default corners (no junction)
    let p_start_L = { x: 0, z: halfT };
    let p_start_R = { x: 0, z: -halfT };
    let p_end_L = { x: length, z: halfT };
    let p_end_R = { x: length, z: -halfT };

    // Apply junction corrections at start
    if (startJunctionData) {
        if (startJunctionData.left) {
            const local = worldToLocal(startJunctionData.left, wallStart, rotation);
            p_start_L = { x: local.x, z: local.z };
        }
        if (startJunctionData.right) {
            const local = worldToLocal(startJunctionData.right, wallStart, rotation);
            p_start_R = { x: local.x, z: local.z };
        }
    }

    // Apply junction corrections at end
    if (endJunctionData) {
        if (endJunctionData.right) {
            const local = worldToLocal(endJunctionData.right, wallEnd, rotation);
            p_end_L = { x: length + local.x, z: local.z };
        }
        if (endJunctionData.left) {
            const local = worldToLocal(endJunctionData.left, wallEnd, rotation);
            p_end_R = { x: length + local.x, z: local.z };
        }
    }

    // Build polygon points (clockwise for correct normals)
    const polyPoints = [
        p_start_R,
        p_end_R,
        p_end_L,
        p_start_L,
    ];

    // Create shape (in XZ plane)
    const shapePoints = polyPoints.map((p) => new THREE.Vector2(p.x, -p.z));
    const shape = new THREE.Shape(shapePoints);

    // Extrude settings
    const extrudeSettings = {
        depth: height,
        bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Rotate to stand upright (extrude along Y axis)
    geometry.rotateX(-Math.PI / 2);

    // Assign material groups based on face normals
    assignMaterialGroups(geometry);

    return geometry;
}

/**
 * Assign material indices to geometry groups based on face normals
 * 0 = front (+Z), 1 = back (-Z), 2 = sides
 */
function assignMaterialGroups(geometry) {
    const positions = geometry.getAttribute('position');
    const indices = geometry.getIndex();

    geometry.clearGroups();

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const faceNormal = new THREE.Vector3();

    const isIndexed = indices !== null;
    const numTriangles = isIndexed ? indices.count / 3 : positions.count / 3;

    let currentGroup = null;

    for (let i = 0; i < numTriangles; i++) {
        const triStart = i * 3;

        const idxA = isIndexed ? indices.getX(triStart) : triStart;
        const idxB = isIndexed ? indices.getX(triStart + 1) : triStart + 1;
        const idxC = isIndexed ? indices.getX(triStart + 2) : triStart + 2;

        vA.fromBufferAttribute(positions, idxA);
        vB.fromBufferAttribute(positions, idxB);
        vC.fromBufferAttribute(positions, idxC);

        ab.subVectors(vB, vA);
        ac.subVectors(vC, vA);
        faceNormal.crossVectors(ab, ac).normalize();

        const absX = Math.abs(faceNormal.x);
        const absY = Math.abs(faceNormal.y);
        const absZ = Math.abs(faceNormal.z);

        let materialIndex;
        if (absZ > absX && absZ > absY) {
            materialIndex = faceNormal.z > 0 ? 0 : 1; // front/back
        } else {
            materialIndex = 2; // sides (top/bottom/ends)
        }

        if (currentGroup === null || currentGroup.materialIndex !== materialIndex) {
            if (currentGroup !== null) {
                geometry.addGroup(currentGroup.start, currentGroup.count, currentGroup.materialIndex);
            }
            currentGroup = { start: triStart, count: 3, materialIndex };
        } else {
            currentGroup.count += 3;
        }
    }

    if (currentGroup !== null) {
        geometry.addGroup(currentGroup.start, currentGroup.count, currentGroup.materialIndex);
    }
}

/**
 * Create cutout geometry for a wall item (door/window)
 * 
 * Strategy: Project the item position onto the wall centerline,
 * then calculate how far along the wall it is.
 * 
 * Wall local coordinate system:
 * - X: 0 to length (along wall centerline)
 * - Y: 0 to height (vertical)
 * - Z: perpendicular to wall (0 = center)
 */
function createCutoutGeometry(item, wall, wallStart, wallEnd, wallThickness) {
    const pos = item.position;
    const halfSize = item.halfSize;

    // Create box geometry for the cutout
    const width = halfSize.x * 2 + 4;
    const height = halfSize.y * 2 + 4;
    const depth = wallThickness * 3;

    const geometry = new THREE.BoxGeometry(width, height, depth);

    // Wall centerline in 2D plan coordinates
    // wallStart.x, wallStart.y = start corner (plan coords where Y is 3D Z)
    // wallEnd.x, wallEnd.y = end corner
    const wallVec = {
        x: wallEnd.x - wallStart.x,
        y: wallEnd.y - wallStart.y
    };
    const wallLength = Math.sqrt(wallVec.x * wallVec.x + wallVec.y * wallVec.y);

    // Normalize wall direction
    const wallDir = {
        x: wallVec.x / wallLength,
        y: wallVec.y / wallLength
    };

    // Item position in 2D plan coordinates (pos.x -> plan X, pos.z -> plan Y)
    const itemPlan = { x: pos.x, y: pos.z };

    // Vector from wall start to item
    const startToItem = {
        x: itemPlan.x - wallStart.x,
        y: itemPlan.y - wallStart.y
    };

    // Project onto wall direction to get distance along wall (local X)
    const localX = startToItem.x * wallDir.x + startToItem.y * wallDir.y;

    // Perpendicular distance (local Z) - cross product gives signed distance
    const localZ = startToItem.x * (-wallDir.y) + startToItem.y * wallDir.x;

    console.log('[CUTOUT]', item.metadata?.itemName || 'item',
        '| pos3D:', pos.x.toFixed(0), pos.y.toFixed(0), pos.z.toFixed(0),
        '| wallStart:', wallStart.x.toFixed(0), wallStart.y.toFixed(0),
        '| wallEnd:', wallEnd.x.toFixed(0), wallEnd.y.toFixed(0),
        '| localX:', localX.toFixed(0), '| localZ:', localZ.toFixed(0),
        '| wallLen:', wallLength.toFixed(0));

    return {
        geometry,
        position: { x: localX, y: pos.y, z: localZ }
    };
}

/**
 * Single Wall with Junction Support
 */
function WallWithJunction({ wall, junctionData, scene, occludedWalls }) {
    const groupRef = useRef();
    const meshRef = useRef();
    const { camera } = useThree();
    const [opacity, setOpacity] = useState(1);
    // Track item count to force re-render when items are added/removed
    const [itemCount, setItemCount] = useState(wall.inWallItems?.length || 0);

    // Wall properties
    const start = wall.start;
    const end = wall.end;
    const wallId = wall.id || wall.uuid;

    // Listen for wall item changes
    useEffect(() => {
        const handleItemChange = () => {
            setItemCount(wall.inWallItems?.length || 0);
        };

        // EVENT_NEW_ITEM and EVENT_ITEM_REMOVED are dispatched by wall
        wall.addEventListener?.(EVENT_NEW_ITEM, handleItemChange);
        wall.addEventListener?.(EVENT_ITEM_REMOVED, handleItemChange);

        return () => {
            wall.removeEventListener?.(EVENT_NEW_ITEM, handleItemChange);
            wall.removeEventListener?.(EVENT_ITEM_REMOVED, handleItemChange);
        };
    }, [wall]);

    // Calculate wall geometry with junctions
    const { geometry, position, rotation, wallItems, normal } = useMemo(() => {
        if (!start || !end) return { geometry: null };

        // Calculate wall properties
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const rot = Math.atan2(dy, dx);
        const height = wall.height || wall.startElevation || 250;
        const thickness = wall.thickness || DEFAULT_WALL_THICKNESS;

        // Get junction data for this wall
        const startKey = pointToKey(start);
        const endKey = pointToKey(end);

        let startJunctionCorners = null;
        let endJunctionCorners = null;

        const startJunction = junctionData.get(startKey);
        const endJunction = junctionData.get(endKey);

        if (startJunction) {
            startJunctionCorners = startJunction.get(wallId);
        }
        if (endJunction) {
            endJunctionCorners = endJunction.get(wallId);
        }

        // Create geometry with junction corrections
        const geom = createJunctionWallGeometry({
            length,
            height,
            thickness,
            startJunctionData: startJunctionCorners,
            endJunctionData: endJunctionCorners,
            wallStart: start,
            wallEnd: end,
            rotation: rot,
        });

        // Wall normal for visibility/opacity culling
        // The normal should point towards the room (interior)
        // If wall has a frontEdge (room on front side), normal points to front (+Z local)
        // If wall only has backEdge, normal points to back (-Z local)
        let wallNormal;

        if (wall.frontEdge && !wall.backEdge) {
            // Room is on the front side - normal points outward from room
            wallNormal = new THREE.Vector3(-dy, 0, dx).normalize();
        } else if (wall.backEdge && !wall.frontEdge) {
            // Room is on the back side - normal points the other way
            wallNormal = new THREE.Vector3(dy, 0, -dx).normalize();
        } else {
            // Both sides have rooms (internal wall) or no room info - default
            wallNormal = new THREE.Vector3(-dy, 0, dx).normalize();
        }

        // Get wall items (doors, windows)
        const items = wall.inWallItems || [];

        return {
            geometry: geom,
            position: [start.x, 0, start.y],
            rotation: [0, -rot, 0],
            wallItems: items,
            normal: wallNormal,
        };
    }, [wall, start, end, wallId, junctionData, itemCount]);

    // Check if wall is internal (has rooms on both sides)
    // Internal walls should always be fully visible
    const isInternalWall = wall.frontEdge && wall.backEdge;

    // Update opacity based on camera position - make walls semi-transparent when looking from behind
    // BUT only for external walls (walls with room on one side only)
    useFrame(() => {
        if (!normal || !start || !end) return;

        // Internal walls (rooms on both sides) should always be fully visible
        // Also skip culling if wall is locked or occludedWalls is enabled
        if (isInternalWall || wall.isLocked || occludedWalls) {
            if (opacity !== 1) setOpacity(1);
            return;
        }

        const camPos = camera.position.clone();
        const wallCenter = new THREE.Vector3(
            (start.x + end.x) * 0.5,
            0,
            (start.y + end.y) * 0.5
        );
        const direction = camPos.sub(wallCenter).normalize();

        const dot = normal.dot(direction);

        // When looking from behind (dot < 0), make wall slightly transparent (95%)
        // When looking from front (dot >= 0), make wall fully opaque
        const targetOpacity = dot >= 0 ? 1 : 0.05;

        if (Math.abs(opacity - targetOpacity) > 0.01) {
            setOpacity(targetOpacity);
        }
    });

    // Materials - use DoubleSide so walls are visible from both sides
    // Recreate materials when opacity changes (needed for CSG which may clone materials)
    const wallMaterials = useMemo(() => {
        const frontMat = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.0,
            transparent: true,
            opacity: opacity,
        });
        const backMat = new THREE.MeshStandardMaterial({
            color: '#f0f0f0',
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.0,
            transparent: true,
            opacity: opacity,
        });
        const sideMat = new THREE.MeshStandardMaterial({
            color: '#e0e0e0',
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.0,
            transparent: true,
            opacity: opacity,
        });

        return [frontMat, backMat, sideMat];
    }, [opacity]);

    if (!geometry) return null;

    // Quantize opacity to avoid too many CSG rebuilds (only rebuild at 0.05 and 1.0)
    const quantizedOpacity = opacity < 0.5 ? 0.05 : 1.0;

    // If there are wall items (doors/windows), use CSG for cutouts
    if (wallItems && wallItems.length > 0) {
        const wallThickness = wall.thickness || DEFAULT_WALL_THICKNESS;

        return (
            <group ref={groupRef} position={position} rotation={rotation}>
                <mesh
                    ref={meshRef}
                    castShadow
                    receiveShadow
                    key={`wall-csg-${wallId}-${quantizedOpacity}`}
                    name="wall"
                    userData={{ wall, type: 'wall' }}
                >
                    <Geometry useGroups>
                        <Base geometry={geometry} material={wallMaterials} />
                        {wallItems.map((item, index) => {
                            const { geometry: cutoutGeom, position: itemPos } = createCutoutGeometry(
                                item,
                                wall,
                                start,
                                end,
                                wallThickness
                            );
                            return (
                                <Subtraction
                                    key={item.id || index}
                                    geometry={cutoutGeom}
                                    position={[itemPos.x, itemPos.y, itemPos.z]}
                                >
                                    <meshStandardMaterial color="#87CEEB" />
                                </Subtraction>
                            );
                        })}
                    </Geometry>
                </mesh>
            </group>
        );
    }

    // Simple wall without cutouts
    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            <mesh
                ref={meshRef}
                geometry={geometry}
                material={wallMaterials}
                castShadow
                receiveShadow
                name="wall"
                userData={{ wall, type: 'wall' }}
            />
        </group>
    );
}

/**
 * Junction Fill Component - fills the hole at 3+ wall junctions
 */
function JunctionFill({ points, height }) {
    const geometry = useMemo(() => {
        if (!points || points.length < 3) return null;

        // Create a shape from the polygon points
        // Points are in world XY coordinates, we need to convert to XZ for 3D
        // Shape uses 2D coordinates, then we rotate to make it horizontal
        const shape = new THREE.Shape();

        // Use x and y from the points (which correspond to world X and Z)
        shape.moveTo(points[0].x, -points[0].y);
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, -points[i].y);
        }
        shape.closePath();

        // Extrude the shape to match wall height
        const extrudeSettings = {
            depth: height,
            bevelEnabled: false,
        };
        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Rotate to stand upright - extrude goes up (Y axis)
        geom.rotateX(-Math.PI / 2);

        return geom;
    }, [points, height]);

    if (!geometry) return null;

    return (
        <mesh geometry={geometry} castShadow receiveShadow name="wall">
            <meshStandardMaterial
                color="#ffffff"
                side={THREE.DoubleSide}
                roughness={0.9}
                metalness={0.0}
            />
        </mesh>
    );
}

/**
 * Walls3DWithJunctions Component
 * Renders all walls with proper junction handling
 */
export function Walls3DWithJunctions({ walls = [], occludedWalls = false }) {
    const { scene } = useThree();

    // Calculate junction data for all walls, including fill polygons
    const { junctionData, fillPolygons } = useMemo(() => {
        if (!walls || walls.length === 0) return { junctionData: new Map(), fillPolygons: [] };

        // Convert wall objects to LiveWall format
        const liveWalls = walls.map((wall) => ({
            id: wall.id || wall.uuid,
            start: { x: wall.start?.x || wall.getStartX?.() || 0, y: wall.start?.y || wall.getStartY?.() || 0 },
            end: { x: wall.end?.x || wall.getEndX?.() || 0, y: wall.end?.y || wall.getEndY?.() || 0 },
            thickness: wall.thickness || 10,
        }));

        const junctions = findJunctions(liveWalls);
        const data = new Map();
        const fills = [];

        for (const [key, junction] of junctions.entries()) {
            const { wallIntersections, fillPolygon } = calculateJunctionIntersections(junction);
            data.set(key, wallIntersections);

            // Collect fill polygons for 3+ wall junctions
            if (fillPolygon && fillPolygon.length >= 3) {
                // Get the height from connected walls - find the actual wall object
                const connectedWallData = junction.connectedWalls[0];
                let height = 250; // Default height

                if (connectedWallData) {
                    const wallId = connectedWallData.wall?.id;
                    const wallObj = walls.find(w => (w.id || w.uuid) === wallId);
                    if (wallObj) {
                        height = wallObj.height || wallObj.startElevation || 250;
                    }
                }

                fills.push({
                    key,
                    points: fillPolygon,
                    height,
                });
            }
        }

        return { junctionData: data, fillPolygons: fills };
    }, [walls]);

    if (!walls || walls.length === 0) return null;

    return (
        <group name="walls-with-junctions">
            {/* Render walls */}
            {walls.map((wall) => (
                <WallWithJunction
                    key={wall.id || wall.uuid}
                    wall={wall}
                    junctionData={junctionData}
                    scene={scene}
                    occludedWalls={occludedWalls}
                />
            ))}

            {/* Render junction fills for 3+ wall intersections */}
            {fillPolygons.map((fill) => (
                <JunctionFill
                    key={`fill-${fill.key}`}
                    points={fill.points}
                    height={fill.height}
                />
            ))}
        </group>
    );
}

export default Walls3DWithJunctions;
