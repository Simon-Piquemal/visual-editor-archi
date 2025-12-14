import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useViewerStore } from './store';
import { ItemStatistics3D } from './ItemStatistics3D';
import { EVENT_UPDATED } from '../core/events';

function BoxHelper({ size, visible, selected }) {
    const geometry = useMemo(() => {
        return new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z));
    }, [size]);

    return (
        <lineSegments geometry={geometry} visible={visible}>
            <lineBasicMaterial
                color={0x00ff00}
                linewidth={3}
                transparent
                depthTest={false}
                opacity={selected ? 1.0 : 0.0}
            />
        </lineSegments>
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

export function Physical3DItem({ itemModel, onSelect, onDeselect }) {
    const meshRef = useRef();
    const [loadedScene, setLoadedScene] = useState(null);
    const [size, setSize] = useState(new THREE.Vector3(1, 1, 1));
    const [center, setCenter] = useState(new THREE.Vector3());
    // Force update counter to trigger re-render when item transforms change
    const [updateCount, setUpdateCount] = useState(0);

    const selectedItem = useViewerStore((state) => state.selectedItem);
    const selectItem = useViewerStore((state) => state.selectItem);

    const isSelected = selectedItem === meshRef.current;

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

    return (
        <group
            ref={meshRef}
            position={position}
            onClick={handleClick}
            name={`Physical_${itemModel.__metadata?.itemName || 'item'}`}
        >
            {/* Invisible collision box */}
            <mesh visible={false}>
                <boxGeometry args={[size.x || 1, size.y || 1, size.z || 1]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Selection box helper */}
            <BoxHelper size={size} visible={isSelected} selected={isSelected} />

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
