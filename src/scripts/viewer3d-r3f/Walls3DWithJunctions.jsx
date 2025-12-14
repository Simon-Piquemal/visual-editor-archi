/**
 * Walls3DWithJunctions Component
 * Renders all walls with proper junction handling using CSG
 * Creates clean wall intersections and supports door/window cutouts
 */
import React, { useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import * as THREE from 'three';
import {
    pointToKey,
    findJunctions,
    calculateJunctionIntersections,
} from './utils/wallJunctions';

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
 */
function createCutoutGeometry(item) {
    const pos = item.position;
    const halfSize = item.halfSize;

    // Create box geometry for the cutout
    const width = halfSize.x * 2;
    const height = halfSize.y * 2;
    const depth = halfSize.z * 2 + 20; // Extra depth to ensure clean cut

    const geometry = new THREE.BoxGeometry(width, height, depth);

    return { geometry, position: pos };
}

/**
 * Single Wall with Junction Support
 */
function WallWithJunction({ wall, junctionData, scene, occludedWalls }) {
    const groupRef = useRef();
    const meshRef = useRef();
    const { camera } = useThree();
    const [opacity, setOpacity] = useState(1);

    // Wall properties
    const start = wall.start;
    const end = wall.end;
    const wallId = wall.id || wall.uuid;

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
    }, [wall, start, end, wallId, junctionData]);

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
    // Opacity controlled by camera position
    const wallMaterials = useMemo(() => {
        const frontMat = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.0,
            transparent: true,
        });
        const backMat = new THREE.MeshStandardMaterial({
            color: '#f0f0f0',
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.0,
            transparent: true,
        });
        const sideMat = new THREE.MeshStandardMaterial({
            color: '#e0e0e0',
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.0,
            transparent: true,
        });

        return [frontMat, backMat, sideMat];
    }, []);

    // Update material opacity when state changes
    useFrame(() => {
        wallMaterials.forEach(mat => {
            if (mat.opacity !== opacity) {
                mat.opacity = opacity;
                mat.needsUpdate = true;
            }
        });
    });

    if (!geometry) return null;

    // If there are wall items (doors/windows), use CSG for cutouts
    if (wallItems && wallItems.length > 0) {
        return (
            <group ref={groupRef} position={position} rotation={rotation}>
                <mesh castShadow receiveShadow>
                    <Geometry useGroups>
                        <Base geometry={geometry} material={wallMaterials} />
                        {wallItems.map((item, index) => {
                            const { geometry: cutoutGeom, position: itemPos } = createCutoutGeometry(item);
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
                geometry={geometry}
                material={wallMaterials}
                castShadow
                receiveShadow
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
        <mesh geometry={geometry} castShadow receiveShadow>
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
