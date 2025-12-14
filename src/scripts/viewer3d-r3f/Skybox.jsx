import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewerStore } from './store';

// Shader for sky gradient
const skyVertexShader = `
    varying vec3 vWorldPosition;
    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const skyFragmentShader = `
    uniform vec3 bottomColor;
    uniform vec3 topColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
        float h = normalize(vWorldPosition + offset).y;
        float blend = max(pow(max(h, 0.0), exponent), 0.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, blend), 1.0);
    }
`;

// Shader for ground gradient
const groundVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const groundFragmentShader = `
    uniform vec3 centerColor;
    uniform vec3 edgeColor;
    uniform float radius;
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
        float dist = length(vPosition.xy);
        float blend = smoothstep(0.0, radius, dist);
        vec3 color = mix(centerColor, edgeColor, blend);
        gl_FragColor = vec4(color, 1.0);
    }
`;

function SkyDome({ gridSize }) {
    const uniforms = useMemo(() => ({
        topColor: { value: new THREE.Color(0xffffff) },
        bottomColor: { value: new THREE.Color(0xf5f5f5) },
        offset: { value: 500 },
        exponent: { value: 0.3 }
    }), []);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, gridSize, 0]} renderOrder={-1000}>
            <planeGeometry args={[gridSize * 4, gridSize * 4]} />
            <shaderMaterial
                vertexShader={skyVertexShader}
                fragmentShader={skyFragmentShader}
                uniforms={uniforms}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </mesh>
    );
}

function GridLines({ gridSize, spacing }) {
    const geometry = useMemo(() => {
        const divisions = Math.round(gridSize / spacing);
        const halfSize = gridSize / 2;

        const positions = [];
        const colors = [];

        const mainLineColor = new THREE.Color(0xd0d0d0);
        const subLineColor = new THREE.Color(0xe8e8e8);
        const accentColor = new THREE.Color(0x6366f1);

        for (let i = 0; i <= divisions; i++) {
            const pos = -halfSize + (i / divisions) * gridSize;
            const isCenter = Math.abs(pos) < spacing * 0.5;
            const isMajor = i % 5 === 0;

            const distFromCenter = Math.abs(pos) / halfSize;
            const fade = Math.max(0, 1 - distFromCenter * 0.3);

            let color;
            if (isCenter) {
                color = accentColor.clone();
            } else if (isMajor) {
                color = mainLineColor.clone();
            } else {
                color = subLineColor.clone();
            }

            color.multiplyScalar(fade * 0.8 + 0.2);

            // Horizontal line (along X)
            positions.push(-halfSize, 0, pos);
            positions.push(halfSize, 0, pos);
            colors.push(color.r, color.g, color.b);
            colors.push(color.r, color.g, color.b);

            // Vertical line (along Z)
            positions.push(pos, 0, -halfSize);
            positions.push(pos, 0, halfSize);
            colors.push(color.r, color.g, color.b);
            colors.push(color.r, color.g, color.b);
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        return geom;
    }, [gridSize, spacing]);

    return (
        <lineSegments geometry={geometry} position={[0, -0.5, 0]}>
            <lineBasicMaterial vertexColors transparent opacity={0.6} depthWrite={false} />
        </lineSegments>
    );
}

function GroundPlane({ gridSize }) {
    const uniforms = useMemo(() => ({
        centerColor: { value: new THREE.Color(0xfafafa) },
        edgeColor: { value: new THREE.Color(0xf0f0f0) },
        radius: { value: (gridSize / 2) * 0.8 }
    }), [gridSize]);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
            <planeGeometry args={[gridSize, gridSize]} />
            <shaderMaterial
                vertexShader={groundVertexShader}
                fragmentShader={groundFragmentShader}
                uniforms={uniforms}
                side={THREE.FrontSide}
                depthWrite
            />
        </mesh>
    );
}

export function Skybox() {
    const gridSize = useViewerStore((state) => state.gridSize);
    const gridSpacing = useViewerStore((state) => state.gridSpacing);

    return (
        <group name="Skybox">
            {/* SkyDome and GroundPlane removed - causing visual artifacts */}
            <GridLines gridSize={gridSize} spacing={gridSpacing} />
        </group>
    );
}

export default Skybox;
