import React, { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FloorMaterial3D } from '../materials/FloorMaterial3D.js';

export function BoundaryView3D({ boundary }) {
    const { scene } = useThree();

    const { geometry, material } = useMemo(() => {
        if (!boundary || !boundary.points || boundary.points.length < 3 || !boundary.isValid) {
            return { geometry: null, material: null };
        }

        const points = boundary.points.map(corner => new THREE.Vector2(corner.x, corner.y));
        const floorSize = new THREE.Vector2(boundary.width, boundary.height);

        const shape = new THREE.Shape(points);
        const geom = new THREE.ShapeGeometry(shape);

        // Update UVs
        const uvAttribute = geom.getAttribute('uv');
        const positionAttribute = geom.getAttribute('position');

        for (let i = 0; i < uvAttribute.count; i++) {
            const x = positionAttribute.getX(i);
            const y = positionAttribute.getY(i);
            uvAttribute.setXY(i, x / floorSize.x, y / floorSize.y);
        }

        geom.computeVertexNormals();
        uvAttribute.needsUpdate = true;

        // Create material
        const mat = new FloorMaterial3D(
            { color: boundary.style?.color || '#CCCCCC', side: THREE.DoubleSide },
            boundary.style || {},
            scene
        );
        mat.dimensions = floorSize;

        return { geometry: geom, material: mat };
    }, [boundary, scene]);

    if (!geometry || !material) return null;

    return (
        <mesh
            geometry={geometry}
            material={material}
            rotation={[Math.PI * 0.5, 0, 0]}
            position={[0, -0.5, 0]}
            name={`BoundaryView3D-${boundary?.id || 'unknown'}`}
        />
    );
}

export default BoundaryView3D;
