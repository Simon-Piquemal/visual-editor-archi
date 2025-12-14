import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WallMaterial3D } from '../materials/WallMaterial3D.js';
import { Utils } from '../core/utils.js';

function WallMesh({ edge, scene, occludedWalls }) {
    const meshRef = useRef();
    const wall = edge.wall;

    const { geometry, material } = useMemo(() => {
        const interiorStart = edge.interiorStart();
        const interiorEnd = edge.interiorEnd();

        if (!interiorStart || !interiorEnd) return { geometry: null, material: null };

        const totalDistance = edge.interiorDistance();
        const height = Math.max(wall.startElevation, wall.endElevation);

        const toVec3 = (pos, h = 0) => new THREE.Vector3(pos.x, h, pos.y);

        const v1 = toVec3(interiorStart, -5);
        const v2 = toVec3(interiorEnd, -5);
        const v3 = toVec3(interiorEnd, edge.getEnd().elevation + 1);
        const v4 = toVec3(interiorStart, edge.getStart().elevation + 1);

        const transform = edge.interiorTransform;
        const invTransform = edge.invInteriorTransform;

        // Calculate normal
        const startToEnd = v2.clone().sub(v1);
        const topStartToBottomStart = v4.clone().sub(v1);
        const normal = startToEnd.cross(topStartToBottomStart).normalize();

        // Transform points
        const points = [v1.clone(), v2.clone(), v3.clone(), v4.clone()];
        points.forEach((p) => p.applyMatrix4(transform));

        const spoints = points.map(p => new THREE.Vector2(p.x, p.y));
        const shape = new THREE.Shape(spoints);

        // Add holes for wall items (doors, windows)
        if (wall.inWallItems) {
            wall.inWallItems.forEach((item) => {
                const pos = item.position.clone().applyMatrix4(transform);
                const halfSize = item.halfSize.clone();
                const min = halfSize.clone().negate().add(pos);
                const max = halfSize.clone().add(pos);
                const holePoints = [
                    new THREE.Vector2(min.x, min.y),
                    new THREE.Vector2(max.x, min.y),
                    new THREE.Vector2(max.x, max.y),
                    new THREE.Vector2(min.x, max.y)
                ];
                shape.holes.push(new THREE.Path(holePoints));
            });
        }

        const geom = new THREE.ShapeGeometry(shape);
        const vertices = geom.getAttribute('position');
        const normals = geom.getAttribute('normal');
        const uvs = geom.getAttribute('uv');

        // Fix vertex positions and UVs
        for (let i = 0; i < vertices.count; i++) {
            const vertex = new THREE.Vector3(vertices.getX(i), vertices.getY(i), vertices.getZ(i));
            vertex.applyMatrix4(invTransform);
            vertices.setX(i, vertex.x);
            vertices.setY(i, vertex.y);
            vertices.setZ(i, vertex.z);

            // Calculate UV
            const uvX = Utils.distance(
                new THREE.Vector2(v1.x, v1.z),
                new THREE.Vector2(vertex.x, vertex.z)
            ) / totalDistance;
            const uvY = vertex.y / height;
            uvs.setXY(i, uvX, uvY);
        }

        // Set normals
        for (let i = 0; i < normals.count; i++) {
            normals.setX(i, normal.x);
            normals.setY(i, normal.y);
            normals.setZ(i, normal.z);
        }

        geom.computeBoundingBox();
        geom.attributes.position.needsUpdate = true;
        geom.attributes.normal.needsUpdate = true;
        geom.attributes.uv.needsUpdate = true;

        // Create material
        const texturePack = edge.getTexture();
        const side = (wall.isLocked || occludedWalls) ? THREE.DoubleSide : THREE.FrontSide;
        const mat = new WallMaterial3D(
            { color: texturePack.color || '#FF0000', side, transparent: true, wireframe: false },
            texturePack,
            scene
        );
        mat.dimensions = new THREE.Vector2(totalDistance, height);

        return { geometry: geom, material: mat };
    }, [edge, wall, scene, occludedWalls]);

    if (!geometry || !material) return null;

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            receiveShadow
            castShadow
            name="wall"
        />
    );
}

function FillerMesh({ points, color, side = THREE.DoubleSide }) {
    const geometry = useMemo(() => {
        const geom = new THREE.BufferGeometry();
        const faces = [];

        faces.push(points[0], points[1], points[2]);
        faces.push(points[0], points[2], points[3]);

        geom.setFromPoints(faces);
        return geom;
    }, [points]);

    return (
        <mesh geometry={geometry} castShadow>
            <meshBasicMaterial color={color} side={side} />
        </mesh>
    );
}

function BottomFiller({ edge, color }) {
    const { geometry, rotation, positionY } = useMemo(() => {
        const toVec2 = (pos) => new THREE.Vector2(pos.x, pos.y);
        const points = [
            toVec2(edge.exteriorStart()),
            toVec2(edge.exteriorEnd()),
            toVec2(edge.interiorEnd()),
            toVec2(edge.interiorStart())
        ];
        const shape = new THREE.Shape(points);
        const geom = new THREE.ShapeGeometry(shape);
        return { geometry: geom, rotation: [Math.PI / 2, 0, 0], positionY: 0 };
    }, [edge]);

    return (
        <mesh geometry={geometry} rotation={rotation} position={[0, positionY, 0]} castShadow>
            <meshBasicMaterial color={color} side={THREE.BackSide} />
        </mesh>
    );
}

function TopFiller({ edge, color }) {
    const points = useMemo(() => {
        const toVec3 = (pos, h = 0) => new THREE.Vector3(pos.x, h, pos.y);
        return [
            toVec3(edge.exteriorStart(), edge.getStart().elevation),
            toVec3(edge.exteriorEnd(), edge.getEnd().elevation),
            toVec3(edge.interiorEnd(), edge.getEnd().elevation),
            toVec3(edge.interiorStart(), edge.getStart().elevation)
        ];
    }, [edge]);

    return <FillerMesh points={points} color={color} side={THREE.DoubleSide} />;
}

function SideFiller({ p1, p2, height, color }) {
    const points = useMemo(() => {
        const toVec3 = (pos, h = 0) => new THREE.Vector3(pos.x, h, pos.y);
        return [
            toVec3(p1),
            toVec3(p2),
            toVec3(p2, height),
            toVec3(p1, height)
        ];
    }, [p1, p2, height]);

    return <FillerMesh points={points} color={color} />;
}

export function Edge3D({ edge, occludedWalls = false }) {
    const { scene, camera } = useThree();
    const groupRef = useRef();
    const [visible, setVisible] = useState(true);

    const wall = edge.wall;
    const fillerColor = 0xC5C1B6;
    const sideColor = 0xC5C1B6;

    // Update visibility based on camera position
    useFrame(() => {
        if (wall.isLocked || occludedWalls) return;

        const start = edge.interiorStart();
        const end = edge.interiorEnd();
        if (!start || !end) return;

        const x = end.x - start.x;
        const y = end.y - start.y;
        const normal = new THREE.Vector3(-y, 0, x).normalize();

        const position = camera.position.clone();
        const focus = new THREE.Vector3((start.x + end.x) * 0.5, 0, (start.y + end.y) * 0.5);
        const direction = position.sub(focus).normalize();

        const dot = normal.dot(direction);
        const shouldBeVisible = dot >= 0;

        if (visible !== shouldBeVisible) {
            setVisible(shouldBeVisible);
        }
    });

    const extStartCorner = edge.getStart();
    const extEndCorner = edge.getEnd();

    if (!extStartCorner || !extEndCorner) return null;

    return (
        <group ref={groupRef} name={`Edge3D-${edge.uuid || 'unknown'}`} visible={visible}>
            <WallMesh edge={edge} scene={scene} occludedWalls={occludedWalls} />
            <BottomFiller edge={edge} color={fillerColor} />
            <TopFiller edge={edge} color={fillerColor} />
            <SideFiller
                p1={edge.interiorStart()}
                p2={edge.exteriorStart()}
                height={extStartCorner.elevation}
                color={sideColor}
            />
            <SideFiller
                p1={edge.interiorEnd()}
                p2={edge.exteriorEnd()}
                height={extEndCorner.elevation}
                color={sideColor}
            />
        </group>
    );
}

export default Edge3D;
