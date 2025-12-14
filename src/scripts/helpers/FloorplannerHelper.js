import { WALL_OFFSET_THICKNESS, WALL_STANDARD_HEIGHT } from "../core/constants";
import { Dimensioning } from "../core/dimensioning";
import { EVENT_CORNER_2D_CLICKED, EVENT_NOTHING_2D_SELECTED, EVENT_WALL_2D_CLICKED, EVENT_ROOM_2D_CLICKED } from "../core/events";
import { InWallFloorItem } from "../items/in_wall_floor_item";
import { InWallItem } from "../items/in_wall_item";
import { Vector2, Vector3 } from "three";

export class FloorPlannerHelper {
    constructor(floorplan, floorplanner, model) {
        this.__floorplan = floorplan;
        this.__floorplanner = floorplanner;
        this.__model = model;

        this.__wallThickness = Dimensioning.cmToMeasureRaw(WALL_OFFSET_THICKNESS);
        this.__cornerElevation = Dimensioning.cmToMeasureRaw(WALL_STANDARD_HEIGHT);
        this.__roomName = 'A New Room';

        // Track entry door (only one allowed)
        this.__entryDoor = null;

        /**
         * Store a reference to the model entities
         */
        this.__selectedWall = null;
        this.__selectedCorner = null;
        this.__selectedRoom = null;

        /**
         * Store a reference to the viewer3d visual entities
         */
        this.__selectedWallEntity = null;
        this.__selectedCornerEntity = null;
        this.__selectedRoomEntity = null;

        this.__nothingSelectedEvent = this.__resetSelections.bind(this);
        this.__cornerSelectedEvent = this.__cornerSelected.bind(this);
        this.__wallSelectedEvent = this.__wallSelected.bind(this);
        this.__roomSelectedEvent = this.__roomSelected.bind(this);

        this.__floorplanner.addFloorplanListener(EVENT_NOTHING_2D_SELECTED, this.__nothingSelectedEvent);
        this.__floorplanner.addFloorplanListener(EVENT_CORNER_2D_CLICKED, this.__cornerSelectedEvent);
        this.__floorplanner.addFloorplanListener(EVENT_WALL_2D_CLICKED, this.__wallSelectedEvent);
        this.__floorplanner.addFloorplanListener(EVENT_ROOM_2D_CLICKED, this.__roomSelectedEvent);
    }

    __resetSelections() {
        this.__selectedCorner = null;
        this.__selectedWall = null;
        this.__selectedRoom = null;
        this.__selectedCornerEntity = null;
        this.__selectedWallEntity = null;
        this.__selectedRoomEntity = null;
    }

    __cornerSelected(evt) {
        this.__resetSelections();
        this.__selectedCorner = evt.item;
        this.__selectedCornerEntity = evt.entity;
        this.__cornerElevation = Dimensioning.cmToMeasureRaw(this.__selectedCorner.elevation);
    }

    __wallSelected(evt) {
        this.__resetSelections();
        this.__selectedWall = evt.item;
        this.__selectedWallEntity = evt.entity;
        this.__wallThickness = Dimensioning.cmToMeasureRaw(evt.item.thickness);
    }

    __roomSelected(evt) {
        this.__resetSelections();
        this.__selectedRoom = evt.item;
        this.__selectedRoomEntity = evt.entity;
        this.__roomName = evt.item.name;
    }

    __nothingSelected() {
        this.__resetSelections();
    }

    deleteCurrentItem() {
        if (this.__selectedWall) {
            this.__selectedWall.remove();
            this.__resetSelections();
        }
        if (this.__selectedCorner) {
            this.__selectedCorner.remove();
            this.__resetSelections();
        }
    }

    set wallThickness(value) {
        if (this.__selectedWall) {
            let cms = Dimensioning.cmFromMeasureRaw(value);
            this.__selectedWall.thickness = cms;
            this.__wallThickness = value;
        }
    }
    get wallThickness() {
        return Dimensioning.cmToMeasureRaw(this.__wallThickness);
    }

    set cornerElevation(value) {
        if (this.__selectedCorner) {
            let cms = Dimensioning.cmFromMeasureRaw(value);
            this.__selectedCorner.elevation = cms;
            this.__cornerElevation = value;
        }
    }
    get cornerElevation() {
        return Dimensioning.cmToMeasureRaw(this.__cornerElevation);
    }

    set roomName(value) {
        if (this.__selectedRoom) {
            this.__selectedRoom.name = value;
            this.__roomName = value;
        }
    }
    get roomName() {
        return this.__roomName;
    }

    get selectedWall() {
        return this.__selectedWall;
    }

    addDoorToSelectedWall(doorType = 1) {
        if (!this.__selectedWall) {
            return false;
        }

        // Force floorplan update to ensure edges exist
        this.__floorplan.update();

        let wall = this.__selectedWall;
        let wallEdge = wall.frontEdge || wall.backEdge;

        if (!wallEdge) {
            return false;
        }

        // Calculate center position on the wall
        let wallCenter = wall.wallCenter();
        let wallCenterPoint = new Vector3(wallCenter.x, 100, wallCenter.y);

        let itemMetaData = {
            itemName: "Parametric Door",
            isParametric: true,
            baseParametricType: "DOOR",
            subParametricData: {
                type: doorType,
                frameColor: "#E7E7E7",
                doorColor: "#E7E7E7",
                doorHandleColor: '#F0F0F0',
                glassColor: '#87CEEB',
                frameWidth: 100,
                frameHeight: 210,
                frameSize: 5,
                frameThickness: 20,
                doorRatio: 0.5,
                openDirection: "RIGHT",
                handleType: "HANDLE_01"
            },
            itemType: 7,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            size: [100, 210, 20],
            fixed: false,
            resizable: false,
        };

        let item = new InWallFloorItem(this.__model, itemMetaData);
        this.__model.addItem(item);
        item.snapToWall(wallCenterPoint, wall, wallEdge);

        return true;
    }

    addWindowToSelectedWall() {
        if (!this.__selectedWall) {
            return false;
        }

        // Force floorplan update to ensure edges exist
        this.__floorplan.update();

        let wall = this.__selectedWall;
        let wallEdge = wall.frontEdge || wall.backEdge;

        if (!wallEdge) {
            return false;
        }

        // Calculate center position on the wall
        let wallCenter = wall.wallCenter();
        let wallCenterPoint = new Vector3(wallCenter.x, 120, wallCenter.y);

        let itemMetaData = {
            itemName: "Parametric Window",
            isParametric: true,
            baseParametricType: "WINDOW",
            subParametricData: {
                type: 1,
                frameColor: "#FFFFFF",
                glassColor: '#87CEEB',
                frameWidth: 120,
                frameHeight: 100,
                frameSize: 5,
                frameThickness: 10,
            },
            itemType: 7,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            size: [120, 100, 10],
            fixed: false,
            resizable: false,
        };

        let item = new InWallFloorItem(this.__model, itemMetaData);
        this.__model.addItem(item);
        item.snapToWall(wallCenterPoint, wall, wallEdge);

        return true;
    }

    /**
     * Find the closest wall to a given position in cm
     * @param {number} cmX - X position in cm
     * @param {number} cmY - Y position in cm (which is Z in 3D space)
     * @returns {Object|null} - Object with wall, edge, position and distance info
     */
    findClosestWall(cmX, cmY) {
        // Ensure floorplan is updated and edges exist
        this.__floorplan.update();

        let walls = this.__floorplan.walls;
        let closestWall = null;
        let closestDistance = Infinity;
        let closestProjection = 0;
        let closestEdge = null;

        console.log('[findClosestWall] Looking for wall near:', cmX.toFixed(0), cmY.toFixed(0), '| walls:', walls.length);

        let point = new Vector2(cmX, cmY);

        for (let wall of walls) {
            let wallStart = wall.start.location;
            let wallEnd = wall.end.location;
            let wallVec = wallEnd.clone().sub(wallStart);
            let wallLength = wallVec.length();
            let wallDir = wallVec.clone().normalize();

            // Project point onto wall line
            let pointVec = point.clone().sub(wallStart);
            let projection = pointVec.dot(wallDir);

            // Clamp projection to wall bounds with margin for item size
            let margin = 60; // 60cm margin for door/window
            let clampedProjection = Math.max(margin, Math.min(wallLength - margin, projection));

            // Calculate closest point on wall
            let closestPoint = wallStart.clone().add(wallDir.clone().multiplyScalar(clampedProjection));

            // Calculate distance to wall
            let distance = point.distanceTo(closestPoint);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestWall = wall;
                closestProjection = clampedProjection;

                // Determine which edge to use based on which side of the wall the point is
                let wallNormal = wallDir.clone().rotateAround(new Vector2(), Math.PI * 0.5);
                let toPoint = point.clone().sub(closestPoint);
                let side = toPoint.dot(wallNormal);

                // Choose front or back edge based on side
                closestEdge = side >= 0 ? wall.frontEdge : wall.backEdge;
                if (!closestEdge) {
                    closestEdge = wall.frontEdge || wall.backEdge;
                }
            }
        }

        if (!closestWall || !closestEdge) {
            console.log('[findClosestWall] No wall or edge found!');
            return null;
        }

        console.log('[findClosestWall] Found wall:', closestWall.id,
            '| start:', closestWall.start.location.x.toFixed(0), closestWall.start.location.y.toFixed(0),
            '| end:', closestWall.end.location.x.toFixed(0), closestWall.end.location.y.toFixed(0),
            '| dist:', closestDistance.toFixed(0));

        // Calculate the exact position on the wall
        let wallStart = closestWall.start.location;
        let wallEnd = closestWall.end.location;
        let wallDir = wallEnd.clone().sub(wallStart).normalize();
        let posOnWall = wallStart.clone().add(wallDir.clone().multiplyScalar(closestProjection));

        return {
            wall: closestWall,
            edge: closestEdge,
            position: posOnWall,
            distance: closestDistance
        };
    }

    /**
     * Add a door at a specific position (in cm)
     * @param {number} cmX - X position in cm
     * @param {number} cmY - Y position in cm
     * @param {number} doorType - Door type (1-6)
     * @returns {boolean} - Success
     */
    addDoorAtPosition(cmX, cmY, doorType = 1) {
        console.log('[addDoorAtPosition] Starting with cmX:', cmX, 'cmY:', cmY, 'doorType:', doorType);

        let closest = this.findClosestWall(cmX, cmY);

        if (!closest || closest.distance > 300) { // 300cm snap threshold (was 150)
            console.log('[addDoorAtPosition] No wall found or distance too far:', closest);
            return false;
        }

        console.log('[addDoorAtPosition] Found closest wall:', closest);
        console.log('[addDoorAtPosition] Wall:', closest.wall);
        console.log('[addDoorAtPosition] Edge:', closest.edge);
        console.log('[addDoorAtPosition] Edge normal:', closest.edge ? closest.edge.normal : 'NO EDGE');
        console.log('[addDoorAtPosition] Edge center:', closest.edge ? closest.edge.center : 'NO EDGE');

        let wall = closest.wall;
        let wallEdge = closest.edge;
        let pos = closest.position;

        // Door height and center position (door centered at y=0, so center Y = height/2)
        const doorHeight = 210;
        const doorWidth = 90;
        // Use wall thickness for the door frame depth
        const wallThickness = wall.thickness || 10;
        let wallCenterPoint = new Vector3(pos.x, doorHeight / 2, pos.y);

        console.log('[addDoorAtPosition] wallCenterPoint:', wallCenterPoint);
        console.log('[addDoorAtPosition] wallThickness:', wallThickness);

        // Use new ProceduralDoor (type 7) with panels style for internal doors
        let itemMetaData = {
            itemName: "Porte Interne",
            isParametric: true,
            baseParametricType: "DOOR",
            subParametricData: {
                type: 7, // ProceduralDoor
                width: doorWidth,
                height: doorHeight,
                thickness: wallThickness, // Match wall thickness
                style: 'panels',
                panelCount: 4,
                panelDepth: 1,
                handleType: 'lever',
                handlePosition: 50,
                handleSide: 'right',
                doorColor: '#FFFFFF', // White internal door
                handleColor: '#C0C0C0', // Silver handle
                showFrame: true,
                frameWidth: 8,
                frameColor: '#F5F5DC', // Beige frame
                openAngle: 0,
                openDirection: 'outward'
            },
            itemType: 7,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            size: [doorWidth, doorHeight, wallThickness], // Match wall thickness
            fixed: false,
            resizable: false,
            // Don't set wall here - snapToWall will handle the wall association
        };

        console.log('[addDoorAtPosition] Creating InWallFloorItem with metadata:', itemMetaData);
        let item = new InWallFloorItem(this.__model, itemMetaData);
        console.log('[addDoorAtPosition] Item created:', item);

        this.__model.addItem(item);
        console.log('[addDoorAtPosition] Item added to model');

        console.log('[addDoorAtPosition] Calling snapToWall with:', wallCenterPoint, wall, wallEdge);
        item.snapToWall(wallCenterPoint, wall, wallEdge);
        console.log('[addDoorAtPosition] snapToWall completed, item position:', item.position);

        return true;
    }

    /**
     * Add an entry door at a specific position (in cm)
     * Only one entry door is allowed - will replace existing one
     * @param {number} cmX - X position in cm
     * @param {number} cmY - Y position in cm
     * @returns {boolean} - Success
     */
    addEntryDoorAtPosition(cmX, cmY) {
        console.log('[addEntryDoorAtPosition] Starting with cmX:', cmX, 'cmY:', cmY);

        // Remove existing entry door if any
        if (this.__entryDoor) {
            console.log('[addEntryDoorAtPosition] Removing existing entry door');
            this.__model.removeItem(this.__entryDoor);
            this.__entryDoor = null;
        }

        let closest = this.findClosestWall(cmX, cmY);

        if (!closest || closest.distance > 300) {
            console.log('[addEntryDoorAtPosition] No wall found or distance too far:', closest);
            return false;
        }

        let wall = closest.wall;
        let wallEdge = closest.edge;
        let pos = closest.position;

        // Door height and center position (door centered at y=0, so center Y = height/2)
        const doorHeight = 215;
        let wallCenterPoint = new Vector3(pos.x, doorHeight / 2, pos.y);

        // Use new ProceduralDoor (type 7) with modern style for entry door
        let itemMetaData = {
            itemName: "Porte d'Entree",
            isParametric: true,
            baseParametricType: "DOOR",
            subParametricData: {
                type: 7, // ProceduralDoor
                width: 100,
                height: doorHeight,
                thickness: 5,
                style: 'modern', // Modern style for entry
                panelCount: 4,
                panelDepth: 1,
                handleType: 'lever',
                handlePosition: 50,
                handleSide: 'right',
                doorColor: '#5D4037', // Brown wood color
                handleColor: '#C0A060', // Brass handle
                showFrame: true,
                frameWidth: 10,
                frameColor: '#4A3728', // Darker wood frame
                openAngle: 0,
                openDirection: 'outward',
                isEntryDoor: true // Mark as entry door
            },
            itemType: 7,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            size: [100, 215, 5],
            fixed: false,
            resizable: false,
            isEntryDoor: true // Mark as entry door
        };

        let item = new InWallFloorItem(this.__model, itemMetaData);
        this.__model.addItem(item);
        item.snapToWall(wallCenterPoint, wall, wallEdge);

        // Store reference to entry door
        this.__entryDoor = item;

        console.log('[addEntryDoorAtPosition] Entry door added successfully');
        return true;
    }

    /**
     * Check if an entry door already exists
     * @returns {boolean}
     */
    hasEntryDoor() {
        return this.__entryDoor !== null;
    }

    /**
     * Get the entry door item
     * @returns {InWallFloorItem|null}
     */
    getEntryDoor() {
        return this.__entryDoor;
    }

    /**
     * Add a window at a specific position (in cm)
     * @param {number} cmX - X position in cm
     * @param {number} cmY - Y position in cm
     * @returns {boolean} - Success
     */
    addWindowAtPosition(cmX, cmY) {
        let closest = this.findClosestWall(cmX, cmY);

        if (!closest || closest.distance > 300) { // 300cm snap threshold
            return false;
        }

        let wall = closest.wall;
        let wallEdge = closest.edge;
        let pos = closest.position;

        // Window dimensions and position
        // Window is centered at y=0, so we need: centerY = bottomFromFloor + height/2
        // Standard window bottom is ~90cm from floor
        const windowWidth = 120;
        const windowHeight = 120;
        const windowBottomFromFloor = 100; // 1m from floor
        const windowCenterY = windowBottomFromFloor + windowHeight / 2; // 100 + 60 = 160cm
        // Use wall thickness for the window frame depth
        const wallThickness = wall.thickness || 10;
        console.log('[addWindowAtPosition] Window centerY:', windowCenterY);
        console.log('[addWindowAtPosition] wallThickness:', wallThickness);
        let wallCenterPoint = new Vector3(pos.x, windowCenterY, pos.y);

        // Use new ProceduralWindow (type 1) with double-casement style (standard French window)
        let itemMetaData = {
            itemName: "Fenetre",
            isParametric: true,
            baseParametricType: "WINDOW",
            subParametricData: {
                type: 1, // ProceduralWindow
                width: windowWidth,
                height: windowHeight,
                frameThickness: 5,
                frameDepth: wallThickness, // Match wall thickness
                windowType: 'double-casement', // Double battant standard
                gridCols: 1,
                gridRows: 2, // 2 carreaux par battant
                muntinWidth: 2,
                handleType: 'olive',
                frameColor: '#FFFFFF',
                handleColor: '#C0C0C0',
                glassColor: '#88CCFF',
                glassOpacity: 0.3,
                showOuterFrame: true,
                outerFrameWidth: 6,
                outerFrameColor: '#E8E8E8',
                openAmount: 0
            },
            itemType: 7,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            size: [windowWidth, windowHeight, wallThickness], // Match wall thickness
            fixed: false,
            resizable: false,
            // Don't set wall here - snapToWall will handle the wall association
        };

        console.log('[addWindowAtPosition] Creating window with metadata:', itemMetaData);
        console.log('[addWindowAtPosition] wallCenterPoint:', wallCenterPoint);
        // Use InWallItem (not InWallFloorItem) for windows - they're not bound to floor level
        let item = new InWallItem(this.__model, itemMetaData);
        this.__model.addItem(item);
        item.snapToWall(wallCenterPoint, wall, wallEdge);
        console.log('[addWindowAtPosition] Window positioned at:', item.position);

        return true;
    }

    get floorplan() {
        return this.__floorplan;
    }
}