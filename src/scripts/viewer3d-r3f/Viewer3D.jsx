import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useViewerStore } from './store';
import { Skybox } from './Skybox';
import { Floor3D } from './Floor3D';
import { Edge3D } from './Edge3D';
import { Walls3DWithJunctions } from './Walls3DWithJunctions';
import { Physical3DItem } from './Physical3DItem';
import { BoundaryView3D } from './BoundaryView3D';
import { useDragControls } from './useDragControls';
import { Configuration, viewBounds } from '../core/configuration.js';
import { EVENT_NEW_ROOMS_ADDED, EVENT_LOADED, EVENT_NEW_ITEM } from '../core/events.js';

// Lighting setup component
function Lighting() {
    return (
        <>
            {/* Hemisphere light for soft ambient illumination */}
            <hemisphereLight
                color={0xffffff}
                groundColor={0xe0e0e0}
                intensity={0.8}
                position={[0, 5000, 0]}
            />

            {/* Main directional light (sun) */}
            <directionalLight
                color={0xffffff}
                intensity={1.0}
                position={[2000, 4000, 2000]}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-near={100}
                shadow-camera-far={10000}
                shadow-camera-left={-3000}
                shadow-camera-right={3000}
                shadow-camera-top={3000}
                shadow-camera-bottom={-3000}
                shadow-bias={-0.0001}
                shadow-normalBias={0.02}
            />

            {/* Fill light from opposite side */}
            <directionalLight
                color={0xffffff}
                intensity={0.4}
                position={[-2000, 2000, -1000]}
            />

            {/* Soft ambient for shadow areas */}
            <ambientLight color={0xffffff} intensity={0.3} />
        </>
    );
}

// Scene content that uses R3F hooks
function SceneContent({ model, options, onItemSelected, onWallClicked, onRoomClicked }) {
    const controlsRef = useRef();
    const physicalItemsRef = useRef([]);
    const { camera, scene } = useThree();

    const [rooms, setRooms] = useState([]);
    const [wallEdges, setWallEdges] = useState([]);
    const [walls, setWalls] = useState([]); // For junction-aware rendering
    const [roomItems, setRoomItems] = useState([]);

    const selectedItem = useViewerStore((state) => state.selectedItem);
    const setNeedsUpdate = useViewerStore((state) => state.setNeedsUpdate);
    const selectItem = useViewerStore((state) => state.selectItem);
    const deselectItem = useViewerStore((state) => state.deselectItem);

    // Get floorplan data
    const floorplan = model?.floorplan;

    // Setup drag controls
    const { selected, isDragging } = useDragControls({
        draggableItems: physicalItemsRef.current,
        wallPlanes: floorplan?.wallPlanesForIntersection || [],
        floorPlanes: floorplan?.floorPlanesForIntersection || [],
        enabled: true,
        onItemSelected: (item) => {
            if (controlsRef.current) {
                controlsRef.current.enabled = false;
            }
            onItemSelected?.(item);
        },
        onItemMoveFinish: () => {
            if (controlsRef.current) {
                controlsRef.current.enabled = true;
            }
        },
        onWallClicked: (evt) => {
            const edge = evt.item;
            if (edge) {
                const y = Math.max(edge.wall.startElevation, edge.wall.endElevation) * 0.5;
                const center2d = edge.interiorCenter();
                const center = new THREE.Vector3(center2d.x, y, center2d.y);
                const distance = edge.interiorDistance() * 1.5;

                camera.position.copy(center.clone().add(evt.normal.clone().multiplyScalar(distance)));
                if (controlsRef.current) {
                    controlsRef.current.target.copy(center);
                }
            }
            onWallClicked?.(evt);
        },
        onRoomClicked: (evt) => {
            const room = evt.item;
            if (room) {
                const y = room.corners[0]?.elevation || 250;
                const center2d = room.areaCenter;
                const center = new THREE.Vector3(center2d.x, 0, center2d.y);
                const distance = y * 3.0;
                const normal = room.normal || new THREE.Vector3(0, 1, 0);

                camera.position.copy(center.clone().add(normal.clone().multiplyScalar(distance)));
                if (controlsRef.current) {
                    controlsRef.current.target.copy(center);
                }
            }
            onRoomClicked?.(evt);
        },
        onDeselect: () => {
            if (controlsRef.current) {
                controlsRef.current.enabled = true;
            }
        },
    });

    // Load rooms and walls when floorplan changes
    useEffect(() => {
        if (!floorplan) return;

        const handleNewRooms = () => {
            setRooms(floorplan.getRooms() || []);
            setWallEdges(floorplan.wallEdges() || []);
            setWalls([...(floorplan.walls || [])]); // Copy array to trigger React update

            // Update camera position
            const dimensions = floorplan.getDimensions();
            const center = floorplan.getDimensions(true);

            if (floorplan.corners?.length && controlsRef.current) {
                controlsRef.current.target.copy(center);
                camera.position.set(
                    dimensions.x * 1.5,
                    dimensions.length() * 0.5,
                    dimensions.z * 1.5
                );
            }
        };

        // Initial load
        handleNewRooms();

        // Listen for changes
        floorplan.addEventListener?.(EVENT_NEW_ROOMS_ADDED, handleNewRooms);

        return () => {
            floorplan.removeEventListener?.(EVENT_NEW_ROOMS_ADDED, handleNewRooms);
        };
    }, [floorplan, camera]);

    // Load room items when model changes
    useEffect(() => {
        if (!model) return;

        const handleLoaded = () => {
            setRoomItems(model.roomItems || []);
        };

        const handleNewItem = (evt) => {
            if (evt.item) {
                setRoomItems(prev => [...prev, evt.item]);
            }
        };

        // Initial load
        handleLoaded();

        // Listen for changes
        model.addEventListener?.(EVENT_LOADED, handleLoaded);
        model.addEventListener?.(EVENT_NEW_ITEM, handleNewItem);

        return () => {
            model.removeEventListener?.(EVENT_LOADED, handleLoaded);
            model.removeEventListener?.(EVENT_NEW_ITEM, handleNewItem);
        };
    }, [model]);

    // Update needs render on controls change
    const handleControlsChange = useCallback(() => {
        setNeedsUpdate(true);
    }, [setNeedsUpdate]);

    return (
        <>
            {/* Controls */}
            <OrbitControls
                ref={controlsRef}
                enableDamping
                dampingFactor={0.08}
                maxPolarAngle={Math.PI * 0.85}
                maxDistance={Configuration.getNumericValue(viewBounds)}
                minDistance={100}
                screenSpacePanning
                rotateSpeed={0.8}
                zoomSpeed={1.2}
                onChange={handleControlsChange}
            />

            {/* Lighting */}
            <Lighting />

            {/* Skybox and grid */}
            <Skybox />

            {/* Floors */}
            {rooms.map((room, index) => (
                <Floor3D
                    key={room.uuid || index}
                    room={room}
                    occludedRoofs={options.occludedRoofs}
                />
            ))}

            {/* Walls - Use junction-aware rendering or legacy Edge3D */}
            {options.useJunctions ? (
                <Walls3DWithJunctions
                    walls={walls}
                    occludedWalls={options.occludedWalls}
                />
            ) : (
                wallEdges.map((edge, index) => (
                    <Edge3D
                        key={edge.uuid || index}
                        edge={edge}
                        occludedWalls={options.occludedWalls}
                    />
                ))
            )}

            {/* Room items (furniture, etc.) */}
            {roomItems.map((item, index) => (
                <Physical3DItem
                    key={item.uuid || index}
                    itemModel={item}
                    onSelect={(physicalItem) => {
                        physicalItemsRef.current.push(physicalItem);
                        onItemSelected?.(physicalItem, item);
                    }}
                />
            ))}

            {/* Fog */}
            <fog attach="fog" args={[0xf5f5f5, 1000, 15000]} />
        </>
    );
}

// Main Viewer3D component
export function Viewer3D({
    model,
    options = {},
    onItemSelected,
    onWallClicked,
    onRoomClicked,
    style,
    className,
}) {
    const containerRef = useRef();
    const setModel = useViewerStore((state) => state.setModel);
    const setEnabled = useViewerStore((state) => state.setEnabled);

    const mergedOptions = useMemo(() => ({
        occludedRoofs: false,
        occludedWalls: false,
        resize: true,
        spin: true,
        spinSpeed: 0.00002,
        clickPan: true,
        canMoveFixedItems: false,
        gridVisibility: true,
        useJunctions: true, // Enable junction-aware wall rendering
        ...options,
    }), [options]);

    // Set model in store
    useEffect(() => {
        setModel(model);
        setEnabled(true);

        return () => {
            setEnabled(false);
        };
    }, [model, setModel, setEnabled]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                ...style,
            }}
            className={className}
        >
            <Canvas
                shadows
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance',
                    outputColorSpace: THREE.SRGBColorSpace,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.2,
                }}
                camera={{
                    fov: 45,
                    near: 10,
                    far: 100000,
                    position: [0, 600, 1500],
                }}
                onCreated={({ gl }) => {
                    gl.setClearColor(0xf8f8f8, 1);
                    gl.shadowMap.enabled = true;
                    gl.shadowMap.type = THREE.PCFSoftShadowMap;
                }}
            >
                <SceneContent
                    model={model}
                    options={mergedOptions}
                    onItemSelected={onItemSelected}
                    onWallClicked={onWallClicked}
                    onRoomClicked={onRoomClicked}
                />
            </Canvas>
        </div>
    );
}

export default Viewer3D;
