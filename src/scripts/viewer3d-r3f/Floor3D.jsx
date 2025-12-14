import React, { useMemo, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FloorMaterial3D } from '../materials/FloorMaterial3D.js';

const FLOOR_THICKNESS = 15; // Floor thickness in cm

function FloorMesh({ room, scene }) {
    const meshRef = useRef();

    const { geometry, material } = useMemo(() => {
        const points = [];
        const min = new THREE.Vector2(Number.MAX_VALUE, Number.MAX_VALUE);

        room.interiorCorners.forEach((corner) => {
            min.x = Math.min(min.x, corner.x);
            min.y = Math.min(min.y, corner.y);
            points.push(new THREE.Vector2(corner.x, corner.y));
        });

        const floorSize = room.floorRectangleSize.clone();
        const shape = new THREE.Shape(points);

        // Use ExtrudeGeometry for thickness
        const extrudeSettings = {
            depth: FLOOR_THICKNESS,
            bevelEnabled: false,
        };
        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Create material
        const texturePack = room.getTexture();
        const mat = new FloorMaterial3D(
            { color: texturePack.color || '#CCCCCC', side: THREE.FrontSide, wireframe: false },
            texturePack,
            scene
        );
        mat.dimensions = floorSize;

        // Update UVs - compute after rotation
        geom.computeVertexNormals();

        const positionAttribute = geom.getAttribute('position');
        const uvAttribute = geom.getAttribute('uv');
        const box3 = new THREE.Box3();
        const vec3 = new THREE.Vector3();

        // Compute bounding box for UV calculation
        for (let i = 0; i < positionAttribute.count; i++) {
            vec3.fromBufferAttribute(positionAttribute, i);
            box3.expandByPoint(vec3);
        }

        for (let i = 0; i < uvAttribute.count; i++) {
            vec3.fromBufferAttribute(positionAttribute, i);
            uvAttribute.setXY(
                i,
                (vec3.x - box3.min.x) / floorSize.x,
                (vec3.y - box3.min.y) / floorSize.y
            );
        }

        uvAttribute.needsUpdate = true;

        return { geometry: geom, material: mat };
    }, [room, scene]);

    // Rotation: Math.PI * 0.5 on X axis (same as original floor3d.js line 151)
    // This rotates the XY plane to become the XZ plane (horizontal floor)
    // Extrusion goes from Z+ to become Y- (downward)
    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            rotation={[Math.PI * 0.5, 0, 0]}
            position={[0, 0, 0]}
            receiveShadow
            castShadow
            name="floor"
            userData={{ room, type: 'floor' }}
        />
    );
}

function RoofMesh({ room, occludedRoofs }) {
    const geometry = useMemo(() => {
        function getCornerForVertex(vertex2d, interiorCorners) {
            for (let i = 0; i < interiorCorners.length; i++) {
                const iCorner = interiorCorners[i];
                if (vertex2d.clone().sub(iCorner).length() < 1e-3) {
                    return i;
                }
            }
            return 0;
        }

        const spoints = [];
        room.interiorCorners.forEach((corner) => {
            spoints.push(new THREE.Vector2(corner.x, corner.y));
        });

        const shape = new THREE.Shape(spoints);
        const geom = new THREE.ShapeGeometry(shape);
        const vertices = geom.getAttribute('position');

        for (let i = 0; i < vertices.count; i++) {
            vertices.setZ(i, vertices.getY(i));
            const cornerIndex = getCornerForVertex(
                new THREE.Vector2(vertices.getX(i), vertices.getZ(i)),
                room.interiorCorners
            );
            const corner = room.corners[cornerIndex];
            vertices.setY(i, corner.elevation + 1.0);
        }

        geom.computeVertexNormals();
        return geom;
    }, [room]);

    const side = room.isLocked || occludedRoofs ? THREE.DoubleSide : THREE.FrontSide;

    return (
        <mesh geometry={geometry} castShadow receiveShadow name="roof">
            <meshStandardMaterial color={0xffffff} side={side} />
        </mesh>
    );
}

function RoomLight({ room }) {
    const position = useMemo(() => {
        return [room.areaCenter.x, 240, room.areaCenter.y];
    }, [room]);

    return (
        <pointLight
            position={position}
            color={0xffffff}
            intensity={400000}
            distance={1000}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0005}
        />
    );
}

export function Floor3D({ room, occludedRoofs = false }) {
    const { scene } = useThree();

    if (!room || !room.interiorCorners || room.interiorCorners.length < 3) {
        return null;
    }

    return (
        <group name={`Floor3D-${room.uuid || 'unknown'}`}>
            <RoomLight room={room} />
            <FloorMesh room={room} scene={scene} />
            <RoofMesh room={room} occludedRoofs={occludedRoofs} />
        </group>
    );
}

export default Floor3D;
