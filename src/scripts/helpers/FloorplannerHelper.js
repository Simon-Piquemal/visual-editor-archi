import { WALL_OFFSET_THICKNESS, WALL_STANDARD_HEIGHT } from "../core/constants";
import { Dimensioning } from "../core/dimensioning";
import { EVENT_CORNER_2D_CLICKED, EVENT_NOTHING_2D_SELECTED, EVENT_WALL_2D_CLICKED, EVENT_ROOM_2D_CLICKED } from "../core/events";
import { InWallFloorItem } from "../items/in_wall_floor_item";
import { Vector3 } from "three";

export class FloorPlannerHelper {
    constructor(floorplan, floorplanner, model) {
        this.__floorplan = floorplan;
        this.__floorplanner = floorplanner;
        this.__model = model;

        this.__wallThickness = Dimensioning.cmToMeasureRaw(WALL_OFFSET_THICKNESS);
        this.__cornerElevation = Dimensioning.cmToMeasureRaw(WALL_STANDARD_HEIGHT);
        this.__roomName = 'A New Room';

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
            wall: wall.id,
        };

        let item = new InWallFloorItem(itemMetaData, this.__model);
        this.__model.addItem(item);
        item.snapToWall(wallCenterPoint, wall, wallEdge);

        return true;
    }

    addWindowToSelectedWall() {
        if (!this.__selectedWall) {
            return false;
        }

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
            wall: wall.id,
        };

        let item = new InWallFloorItem(itemMetaData, this.__model);
        this.__model.addItem(item);
        item.snapToWall(wallCenterPoint, wall, wallEdge);

        return true;
    }
}