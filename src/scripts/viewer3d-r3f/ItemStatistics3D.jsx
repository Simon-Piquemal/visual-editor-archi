import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Dimensioning } from '../core/dimensioning';

function StatisticArrow({
    direction,
    length,
    color = 0x888888,
    headLength = 2,
    headWidth = 3,
    position = [0, 0, 0],
    visible = true,
    showLabel = true,
    labelBgColor = '#000000',
    labelTextColor = '#FFFFFF'
}) {
    const groupRef = useRef();

    const label = useMemo(() => {
        return Dimensioning.cmToMeasure(length);
    }, [length]);

    const labelPosition = useMemo(() => {
        return direction.clone().multiplyScalar(length * 0.5);
    }, [direction, length]);

    if (!visible || length <= 0) return null;

    return (
        <group ref={groupRef} position={position}>
            {/* Forward arrow */}
            <arrowHelper
                args={[direction, new THREE.Vector3(0, 0, 0), length, color, headLength, headWidth]}
            />
            {/* Reverse arrow */}
            <arrowHelper
                args={[
                    direction.clone().negate(),
                    direction.clone().multiplyScalar(length),
                    length,
                    color,
                    headLength,
                    headWidth
                ]}
            />
            {/* Label */}
            {showLabel && (
                <Html
                    position={[labelPosition.x, labelPosition.y, labelPosition.z]}
                    center
                    style={{
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}
                >
                    <div
                        style={{
                            background: labelBgColor,
                            color: labelTextColor,
                            padding: '2px 6px',
                            borderRadius: '2px',
                            fontSize: '11px',
                            fontFamily: 'Arial, sans-serif',
                            whiteSpace: 'nowrap',
                            border: `1px solid ${labelTextColor}`,
                        }}
                    >
                        {label}
                    </div>
                </Html>
            )}
        </group>
    );
}

function DimensionArrows({ halfSize, visible, colors }) {
    const widthPos = useMemo(() => [0, halfSize.y * 1.15, 0], [halfSize]);
    const heightPos = useMemo(() => [halfSize.x * 1.15, 0, 0], [halfSize]);
    const depthPos = useMemo(() => [0, 0, halfSize.z * 1.15], [halfSize]);

    if (!visible) return null;

    return (
        <group name="DimensionArrows">
            {/* Width arrow (X axis) */}
            <StatisticArrow
                direction={new THREE.Vector3(1, 0, 0)}
                length={halfSize.x * 2}
                color={colors.dimension}
                position={widthPos}
                visible={visible}
                labelBgColor="#0F0F0F"
                labelTextColor="#F0F0F0"
            />
            {/* Height arrow (Y axis) */}
            <StatisticArrow
                direction={new THREE.Vector3(0, 1, 0)}
                length={halfSize.y * 2}
                color={colors.dimension}
                position={heightPos}
                visible={visible}
                labelBgColor="#0F0F0F"
                labelTextColor="#F0F0F0"
            />
            {/* Depth arrow (Z axis) */}
            <StatisticArrow
                direction={new THREE.Vector3(0, 0, -1)}
                length={halfSize.z * 2}
                color={colors.dimension}
                position={depthPos}
                visible={visible}
                labelBgColor="#0F0F0F"
                labelTextColor="#F0F0F0"
            />
        </group>
    );
}

function DistanceArrow({ direction, halfSize, model, visible, color }) {
    const { scene } = useThree();
    const [distance, setDistance] = useState(0);
    const raycaster = useMemo(() => new THREE.Raycaster(), []);

    useFrame(() => {
        if (!visible || !model) return;

        const floorplan = model.floorplan;
        if (!floorplan) return;

        const intersectObjects = [
            ...(floorplan.floorPlanesForIntersection || []),
            ...(floorplan.wallPlanesForIntersection || []),
            ...(floorplan.roofPlanesForIntersection || []),
        ];

        const origin = direction.clone().multiply(halfSize);
        raycaster.set(origin, direction.clone().normalize());

        const intersections = raycaster.intersectObjects(intersectObjects, true);
        if (intersections.length > 0) {
            setDistance(intersections[0].distance);
        } else {
            setDistance(0);
        }
    });

    if (!visible || distance <= 0) return null;

    const position = direction.clone().multiply(halfSize);

    return (
        <StatisticArrow
            direction={direction}
            length={distance}
            color={color}
            position={[position.x, position.y, position.z]}
            visible={visible}
            labelBgColor="#780994"
            labelTextColor="#ffffff"
        />
    );
}

function DistanceArrows({ halfSize, model, visible, colors }) {
    const directions = useMemo(() => [
        new THREE.Vector3(0, 1, 0),   // up
        new THREE.Vector3(0, -1, 0),  // down
        new THREE.Vector3(0, 0, 1),   // front
        new THREE.Vector3(0, 0, -1),  // back
        new THREE.Vector3(-1, 0, 0),  // left
        new THREE.Vector3(1, 0, 0),   // right
    ], []);

    if (!visible) return null;

    return (
        <group name="DistanceArrows">
            {directions.map((dir, index) => (
                <DistanceArrow
                    key={index}
                    direction={dir}
                    halfSize={halfSize}
                    model={model}
                    visible={visible}
                    color={colors.distance}
                />
            ))}
        </group>
    );
}

export function ItemStatistics3D({
    physicalItem,
    itemModel,
    halfSize,
    size,
    visible = false,
    options = {}
}) {
    const colors = useMemo(() => ({
        dimension: options.dimensionColor || 0x888888,
        distance: options.distanceColor || 0x888888,
    }), [options]);

    const computedHalfSize = useMemo(() => {
        if (halfSize) {
            return new THREE.Vector3(
                halfSize.x || size.x / 2,
                halfSize.y || size.y / 2,
                halfSize.z || size.z / 2
            );
        }
        return new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);
    }, [halfSize, size]);

    const model = itemModel?.model;

    return (
        <group name="ItemStatistics3D" visible={visible}>
            <DimensionArrows
                halfSize={computedHalfSize}
                visible={visible}
                colors={colors}
            />
            <DistanceArrows
                halfSize={computedHalfSize}
                model={model}
                visible={visible}
                colors={colors}
            />
        </group>
    );
}

export default ItemStatistics3D;
