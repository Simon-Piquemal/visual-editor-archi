import { useRef, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewerStore } from './store';
import { Configuration, snapToGrid, snapTolerance } from '../core/configuration';

export function useDragControls({
    draggableItems = [],
    wallPlanes = [],
    floorPlanes = [],
    enabled = true,
    onItemSelected,
    onItemMoved,
    onItemMoveFinish,
    onWallClicked,
    onRoomClicked,
    onDeselect,
}) {
    const { camera, gl, scene } = useThree();
    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());
    const offset = useRef(new THREE.Vector3());
    const intersection = useRef(new THREE.Vector3());
    const plane = useRef(new THREE.Plane());
    const worldPosition = useRef(new THREE.Vector3());

    const selectedRef = useRef(null);
    const timestampRef = useRef(Date.now());
    const isDragging = useRef(false);
    const dragStartPos = useRef(new THREE.Vector2());
    const hasMoved = useRef(false);

    const selectItem = useViewerStore((state) => state.selectItem);
    const deselectItem = useViewerStore((state) => state.deselectItem);
    const setNeedsUpdate = useViewerStore((state) => state.setNeedsUpdate);

    const updateMouse = useCallback((event) => {
        const rect = gl.domElement.getBoundingClientRect();
        mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }, [gl]);

    const handlePointerDown = useCallback((event) => {
        if (!enabled) return;

        const time = Date.now();
        const deltaTime = time - timestampRef.current;
        timestampRef.current = time;

        updateMouse(event);
        raycaster.current.setFromCamera(mouse.current, camera);

        // Check wall and floor intersections
        const wallIntersections = raycaster.current.intersectObjects(wallPlanes, false);
        const floorIntersections = raycaster.current.intersectObjects(floorPlanes, false);

        // Double click detection for wall/room focus
        if (deltaTime < 300) {
            if (wallIntersections.length > 0) {
                onWallClicked?.({
                    item: wallIntersections[0].object.edge,
                    point: wallIntersections[0].point,
                    normal: wallIntersections[0].face.normal,
                });
                return;
            }
            if (floorIntersections.length > 0) {
                onRoomClicked?.({
                    item: floorIntersections[0].object.room,
                    point: floorIntersections[0].point,
                    normal: floorIntersections[0].face.normal,
                });
                return;
            }
        }

        // Check draggable items
        const visibleItems = draggableItems.filter(item => item?.visible !== false);
        const itemIntersections = raycaster.current.intersectObjects(visibleItems, false);

        if (itemIntersections.length > 0) {
            const minWallDistance = wallIntersections.length > 0 ? wallIntersections[0].distance : Infinity;
            const itemDistance = itemIntersections[0].distance;

            // Don't select if item is behind wall
            if (itemDistance - minWallDistance > 50) {
                deselectItem();
                onDeselect?.();
                return;
            }

            selectedRef.current = itemIntersections[0].object;
            isDragging.current = true;
            hasMoved.current = false;
            dragStartPos.current.set(event.clientX, event.clientY);

            // Setup drag plane
            plane.current.setFromNormalAndCoplanarPoint(
                camera.getWorldDirection(plane.current.normal),
                worldPosition.current.setFromMatrixPosition(selectedRef.current.matrixWorld)
            );

            // Calculate offset
            intersection.current.copy(itemIntersections[0].point);
            offset.current.copy(
                intersection.current.clone().sub(selectedRef.current.position)
            );

            selectItem(selectedRef.current);
            onItemSelected?.(selectedRef.current);

            gl.domElement.style.cursor = 'move';
            gl.domElement.setPointerCapture(event.pointerId);
        } else {
            deselectItem();
            onDeselect?.();
        }
    }, [
        enabled, camera, gl, draggableItems, wallPlanes, floorPlanes,
        updateMouse, selectItem, deselectItem, onItemSelected, onWallClicked, onRoomClicked, onDeselect
    ]);

    const handlePointerMove = useCallback((event) => {
        if (!enabled || !isDragging.current || !selectedRef.current) return;

        // Check if we've moved enough to start dragging (5 pixel threshold)
        if (!hasMoved.current) {
            const dx = event.clientX - dragStartPos.current.x;
            const dy = event.clientY - dragStartPos.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 5) return;
            hasMoved.current = true;
        }

        updateMouse(event);
        raycaster.current.setFromCamera(mouse.current, camera);

        const item = selectedRef.current;
        const itemModel = item.itemModel;

        if (!itemModel) return;

        // Get intersection planes from item
        let intersectionPlanes = itemModel.intersectionPlanes || [];
        const wallIntersectionPlanes = itemModel.intersectionPlanes_wall || [];
        intersectionPlanes = [...intersectionPlanes, ...wallIntersectionPlanes];

        if (intersectionPlanes.length === 0) {
            // Free movement
            if (raycaster.current.ray.intersectPlane(plane.current, intersection.current)) {
                const newPos = intersection.current.clone().sub(offset.current);
                itemModel.snapToPoint?.(newPos, null, null, item);
            }
        } else {
            // Constrained movement
            const planeIntersections = raycaster.current.intersectObjects(intersectionPlanes, false);

            if (planeIntersections.length > 0) {
                let point = planeIntersections[0].point.clone();

                // Apply grid snapping
                if (Configuration.getBooleanValue(snapToGrid)) {
                    const tolerance = Configuration.getNumericValue(snapTolerance);
                    point.x = Math.floor(point.x / tolerance) * tolerance;
                    point.y = Math.floor(point.y / tolerance) * tolerance;
                    point.z = Math.floor(point.z / tolerance) * tolerance;
                }

                const location = point.sub(offset.current);
                const normal = planeIntersections[0].face.normal;
                const intersectingPlane = planeIntersections[0].object;

                itemModel.snapToPoint?.(location, normal, intersectingPlane, item);
            }
        }

        setNeedsUpdate(true);
        onItemMoved?.(selectedRef.current);
    }, [enabled, camera, updateMouse, setNeedsUpdate, onItemMoved]);

    const handlePointerUp = useCallback((event) => {
        if (isDragging.current && selectedRef.current) {
            onItemMoveFinish?.(selectedRef.current);
        }

        isDragging.current = false;
        gl.domElement.style.cursor = 'auto';
        gl.domElement.releasePointerCapture(event.pointerId);
    }, [gl, onItemMoveFinish]);

    // Attach event listeners
    useEffect(() => {
        const domElement = gl.domElement;

        domElement.addEventListener('pointerdown', handlePointerDown);
        domElement.addEventListener('pointermove', handlePointerMove);
        domElement.addEventListener('pointerup', handlePointerUp);

        return () => {
            domElement.removeEventListener('pointerdown', handlePointerDown);
            domElement.removeEventListener('pointermove', handlePointerMove);
            domElement.removeEventListener('pointerup', handlePointerUp);
        };
    }, [gl, handlePointerDown, handlePointerMove, handlePointerUp]);

    return {
        selected: selectedRef.current,
        isDragging: isDragging.current,
    };
}

export default useDragControls;
