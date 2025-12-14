import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useViewerStore } from './store';
import { ItemStatistics3D } from './ItemStatistics3D';
import { EVENT_UPDATED } from '../core/events';

function SelectionBox({ size, visible, rotation }) {
    const geometry = useMemo(() => {
        // Add a small margin to make the box slightly larger than the object
        const margin = 4;
        return new THREE.EdgesGeometry(
            new THREE.BoxGeometry(
                (size.x || 1) + margin,
                (size.y || 1) + margin,
                (size.z || 1) + margin
            )
        );
    }, [size]);

    if (!visible) return null;

    // Apply the same rotation as the item
    const rotationArray = rotation ? [rotation.x, rotation.y, rotation.z] : [0, 0, 0];

    return (
        <lineSegments
            geometry={geometry}
            renderOrder={999}
            rotation={rotationArray}
        >
            <lineBasicMaterial
                color={0x00aaff}
                linewidth={2}
                transparent
                depthTest={false}
                opacity={1}
            />
        </lineSegments>
    );
}

/**
 * Big arrow handles for dragging items along walls
 */
function DragArrows({ visible, wallDirection, size }) {
    if (!visible) return null;

    // Arrow length based on item size
    const arrowLength = Math.max(size.x, size.z) * 0.8 + 40;
    const arrowSize = 15;

    // Calculate wall angle for arrow orientation
    const wallAngle = Math.atan2(wallDirection.z, wallDirection.x);

    return (
        <group rotation={[0, 0, 0]}>
            {/* Left arrow */}
            <group position={[-arrowLength * wallDirection.x, 0, -arrowLength * wallDirection.z]}>
                <mesh rotation={[Math.PI / 2, wallAngle + Math.PI, 0]}>
                    <coneGeometry args={[arrowSize, arrowSize * 2, 8]} />
                    <meshBasicMaterial color="#ff6600" transparent opacity={0.9} />
                </mesh>
                {/* Arrow shaft */}
                <mesh
                    position={[wallDirection.x * arrowSize, 0, wallDirection.z * arrowSize]}
                    rotation={[0, -wallAngle, Math.PI / 2]}
                >
                    <cylinderGeometry args={[arrowSize * 0.4, arrowSize * 0.4, arrowSize * 1.5, 8]} />
                    <meshBasicMaterial color="#ff6600" transparent opacity={0.9} />
                </mesh>
            </group>

            {/* Right arrow */}
            <group position={[arrowLength * wallDirection.x, 0, arrowLength * wallDirection.z]}>
                <mesh rotation={[Math.PI / 2, wallAngle, 0]}>
                    <coneGeometry args={[arrowSize, arrowSize * 2, 8]} />
                    <meshBasicMaterial color="#ff6600" transparent opacity={0.9} />
                </mesh>
                {/* Arrow shaft */}
                <mesh
                    position={[-wallDirection.x * arrowSize, 0, -wallDirection.z * arrowSize]}
                    rotation={[0, -wallAngle, Math.PI / 2]}
                >
                    <cylinderGeometry args={[arrowSize * 0.4, arrowSize * 0.4, arrowSize * 1.5, 8]} />
                    <meshBasicMaterial color="#ff6600" transparent opacity={0.9} />
                </mesh>
            </group>

            {/* Instruction text */}
            <Html position={[0, size.y * 0.7, 0]} center style={{ pointerEvents: 'none' }}>
                <div style={{
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                }}>
                    Cliquez et glissez pour déplacer
                </div>
            </Html>
        </group>
    );
}

function GLTFModel({ url, onLoaded, innerRotation, shadowVisible = true }) {
    const { scene } = useGLTF(url);
    const modelRef = useRef();

    useEffect(() => {
        if (scene) {
            // Clone the scene to avoid sharing issues
            const clonedScene = scene.clone(true);

            // Setup shadows and materials
            clonedScene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = shadowVisible;
                    child.receiveShadow = true;
                    if (child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach((material) => {
                            if (material.map) {
                                material.map.colorSpace = THREE.SRGBColorSpace;
                                material.map.anisotropy = 16;
                            }
                            if (material.opacity < 1.0 - 1e-6) {
                                material.transparent = true;
                                child.castShadow = false;
                            }
                        });
                    }
                }
            });

            onLoaded(clonedScene);
        }
    }, [scene, onLoaded, shadowVisible]);

    if (!scene) return null;

    return (
        <primitive
            ref={modelRef}
            object={scene.clone(true)}
            rotation={[innerRotation.x, innerRotation.y, innerRotation.z]}
            castShadow
            receiveShadow
        />
    );
}

function ParametricModel({ parametricClass, innerRotation }) {
    if (!parametricClass) return null;

    return (
        <mesh
            geometry={parametricClass.geometry}
            material={parametricClass.material}
            rotation={[innerRotation.x, innerRotation.y, innerRotation.z]}
            castShadow
            receiveShadow
        />
    );
}

export function Physical3DItem({ itemModel, onSelect, onDeselect, onMount }) {
    const meshRef = useRef();
    const [loadedScene, setLoadedScene] = useState(null);
    const [size, setSize] = useState(new THREE.Vector3(1, 1, 1));
    const [center, setCenter] = useState(new THREE.Vector3());
    // Force update counter to trigger re-render when item transforms change
    const [updateCount, setUpdateCount] = useState(0);

    const selectedItem = useViewerStore((state) => state.selectedItem);
    const selectItem = useViewerStore((state) => state.selectItem);
    const setNeedsUpdate = useViewerStore((state) => state.setNeedsUpdate);

    const isSelected = selectedItem === meshRef.current;

    // Notify parent when mesh is mounted so it can be added to draggable items
    useEffect(() => {
        if (meshRef.current) {
            onMount?.(meshRef.current);
        }
    }, [onMount]);

    // These memos now depend on updateCount to force recalculation
    const position = useMemo(() => {
        return [itemModel.position.x, itemModel.position.y, itemModel.position.z];
    }, [itemModel.position, updateCount]);

    const innerRotation = useMemo(() => {
        return itemModel.innerRotation || new THREE.Euler(0, 0, 0);
    }, [itemModel.innerRotation, updateCount]);

    const halfSize = useMemo(() => {
        return itemModel.halfSize || new THREE.Vector3(50, 50, 50);
    }, [itemModel.halfSize]);

    // Calculate actual size from halfSize for parametric items or from loaded scene
    const actualSize = useMemo(() => {
        if (itemModel.isParametric && halfSize) {
            return new THREE.Vector3(halfSize.x * 2, halfSize.y * 2, halfSize.z * 2);
        }
        return size;
    }, [itemModel.isParametric, halfSize, size]);

    const handleModelLoaded = useCallback((scene) => {
        setLoadedScene(scene);

        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(scene);
        const newSize = box.getSize(new THREE.Vector3());
        const newCenter = box.getCenter(new THREE.Vector3());

        setSize(newSize);
        setCenter(newCenter);
    }, []);

    const handleClick = useCallback((event) => {
        event.stopPropagation();
        if (meshRef.current) {
            selectItem(meshRef.current);
            onSelect?.(meshRef.current, itemModel);
        }
    }, [selectItem, onSelect, itemModel]);

    // Expose item model reference
    useEffect(() => {
        if (meshRef.current) {
            meshRef.current.itemModel = itemModel;
            meshRef.current.halfSize = halfSize;
        }
    }, [itemModel, halfSize]);

    // Listen to item model updates
    useEffect(() => {
        const handleUpdate = (evt) => {
            if (meshRef.current) {
                // Update position directly on the mesh for immediate visual feedback
                if (evt.property === 'position') {
                    meshRef.current.position.set(
                        itemModel.position.x,
                        itemModel.position.y,
                        itemModel.position.z
                    );
                }
                if (evt.property === 'visible') {
                    meshRef.current.visible = itemModel.visible;
                }
            }
            // Force re-render to update memoized values (position, rotation, etc.)
            if (evt.property === 'position' || evt.property === 'innerRotation') {
                setUpdateCount(c => c + 1);
            }
        };

        // Use the EVENT_UPDATED constant, not a string
        itemModel.addEventListener?.(EVENT_UPDATED, handleUpdate);
        return () => {
            itemModel.removeEventListener?.(EVENT_UPDATED, handleUpdate);
        };
    }, [itemModel]);

    const isParametric = itemModel.isParametric;
    const modelURL = itemModel.modelURL;

    // Check if this is a wall-attached item and get wall direction
    const isWallItem = itemModel.__currentWall != null;
    const wallDirection = useMemo(() => {
        const wall = itemModel.__currentWall;
        if (!wall) return new THREE.Vector3(1, 0, 0);

        const start = wall.start;
        const end = wall.end;
        return new THREE.Vector3(end.x - start.x, 0, end.y - start.y).normalize();
    }, [itemModel.__currentWall, updateCount]);

    return (
        <group
            ref={meshRef}
            position={position}
            onClick={handleClick}
            name={`Physical_${itemModel.__metadata?.itemName || 'item'}`}
        >
            {/* Invisible collision box for clicking - rotated to match item */}
            <mesh
                visible={false}
                rotation={[innerRotation.x, innerRotation.y, innerRotation.z]}
            >
                <boxGeometry args={[actualSize.x || 1, actualSize.y || 1, actualSize.z || 1]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Selection box helper - rotated to match item orientation */}
            <SelectionBox size={actualSize} visible={isSelected} rotation={innerRotation} />

            {/* Drag arrows - show when selected and is a wall item */}
            {isWallItem && (
                <DragArrows
                    visible={isSelected}
                    wallDirection={wallDirection}
                    size={actualSize}
                />
            )}

            {/* The actual model */}
            {isParametric ? (
                <ParametricModel
                    parametricClass={itemModel.parametricClass}
                    innerRotation={innerRotation}
                />
            ) : modelURL && modelURL !== 'undefined' ? (
                <React.Suspense fallback={null}>
                    <GLTFModel
                        url={modelURL}
                        onLoaded={handleModelLoaded}
                        innerRotation={innerRotation}
                    />
                </React.Suspense>
            ) : null}

            {/* Item statistics (dimension arrows) */}
            {loadedScene && (
                <ItemStatistics3D
                    physicalItem={meshRef}
                    itemModel={itemModel}
                    halfSize={halfSize}
                    size={size}
                    visible={isSelected}
                />
            )}
        </group>
    );
}

export default Physical3DItem;
