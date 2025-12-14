/**
 * Wall3D Component with proper junction handling using CSG
 * Creates clean wall intersections and supports door/window cutouts
 */
import React, { useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import * as THREE from 'three';
import { useViewerStore } from './store';
import {
    pointToKey,
    findJunctions,
    calculateJunctionIntersections,
} from './utils/wallJunctions';

const WALL_THICKNESS = 10; // Default wall thickness in cm

/**
 * Convert Point2D to local wall space
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
function createWallGeometry({
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

    // Apply junction corrections
    if (startJunctionData) {
        if (startJunctionData.left) {
            p_start_L = worldToLocal(startJunctionData.left, wallStart, rotation);
        }
        if (startJunctionData.right) {
            p_start_R = worldToLocal(startJunctionData.right, wallStart, rotation);
        }
    }

    if (endJunctionData) {
        if (endJunctionData.right) {
            p_end_L = worldToLocal(endJunctionData.right, wallEnd, rotation);
            p_end_L.x = length + p_end_L.x; // Offset from end
        }
        if (endJunctionData.left) {
            p_end_R = worldToLocal(endJunctionData.left, wallEnd, rotation);
            p_end_R.x = length + p_end_R.x;
        }
    }

    // Build polygon points
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
            materialIndex = 2; // sides
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
function createCutoutGeometry(item, wallTransform) {
    const pos = item.position;
    const halfSize = item.halfSize;

    // Create box geometry for the cutout
    const width = halfSize.x * 2;
    const height = halfSize.y * 2;
    const depth = halfSize.z * 2 + 10; // Extra depth to ensure clean cut

    const geometry = new THREE.BoxGeometry(width, height, depth);

    return { geometry, position: pos };
}

/**
 * Wall3D Component
 */
export function Wall3D({ wall, floorplan, materials }) {
    const groupRef = useRef();
    const { scene } = useThree();

    // Get all walls for junction calculation
    const junctionData = useMemo(() => {
        if (!floorplan || !floorplan.walls) return new Map();

        const walls = floorplan.walls.map((w) => ({
            id: w.id || w.uuid,
            start: { x: w.start.x, y: w.start.y },
            end: { x: w.end.x, y: w.end.y },
            thickness: w.thickness || WALL_THICKNESS,
        }));

        const junctions = findJunctions(walls);
        const data = new Map();

        for (const [key, junction] of junctions.entries()) {
            const { wallIntersections } = calculateJunctionIntersections(junction);
            data.set(key, wallIntersections);
        }

        return data;
    }, [floorplan]);

    // Create wall geometry with junctions
    const { geometry, wallItems, position, rotation } = useMemo(() => {
        const start = wall.start;
        const end = wall.end;
        const wallId = wall.id || wall.uuid;

        if (!start || !end) return { geometry: null };

        // Calculate wall properties
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const rot = Math.atan2(dy, dx);
        const height = wall.height || 250;
        const thickness = wall.thickness || WALL_THICKNESS;

        // Get junction data for this wall
        const startKey = pointToKey(start);
        const endKey = pointToKey(end);

        let startJunctionData = null;
        let endJunctionData = null;

        const startJunction = junctionData.get(startKey);
        const endJunction = junctionData.get(endKey);

        if (startJunction) {
            startJunctionData = startJunction.get(wallId);
        }
        if (endJunction) {
            endJunctionData = endJunction.get(wallId);
        }

        // Create geometry
        const geom = createWallGeometry({
            length,
            height,
            thickness,
            startJunctionData,
            endJunctionData,
            wallStart: start,
            wallEnd: end,
            rotation: rot,
        });

        // Get wall items (doors, windows)
        const items = wall.inWallItems || [];

        return {
            geometry: geom,
            wallItems: items,
            position: [start.x, 0, start.y],
            rotation: [0, -rot, 0],
        };
    }, [wall, junctionData]);

    // Materials
    const wallMaterials = useMemo(() => {
        const frontMat = materials?.front || new THREE.MeshStandardMaterial({
            color: '#ffffff',
            side: THREE.FrontSide,
        });
        const backMat = materials?.back || new THREE.MeshStandardMaterial({
            color: '#f0f0f0',
            side: THREE.FrontSide,
        });
        const sideMat = materials?.side || new THREE.MeshStandardMaterial({
            color: '#e0e0e0',
            side: THREE.DoubleSide,
        });

        return [frontMat, backMat, sideMat];
    }, [materials]);

    if (!geometry) return null;

    // If there are wall items (doors/windows), use CSG for cutouts
    if (wallItems && wallItems.length > 0) {
        return (
            <group ref={groupRef} position={position} rotation={rotation}>
                <mesh castShadow receiveShadow>
                    <Geometry useGroups>
                        <Base geometry={geometry} material={wallMaterials} />
                        {wallItems.map((item, index) => {
                            const { geometry: cutoutGeom, position: itemPos } = createCutoutGeometry(item, null);
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
 * Walls3D Component - Renders all walls with proper junctions
 */
export function Walls3D({ floorplan, materials }) {
    if (!floorplan || !floorplan.walls) return null;

    return (
        <group name="walls">
            {floorplan.walls.map((wall) => (
                <Wall3D
                    key={wall.id || wall.uuid}
                    wall={wall}
                    floorplan={floorplan}
                    materials={materials}
                />
            ))}
        </group>
    );
}

export default Wall3D;
