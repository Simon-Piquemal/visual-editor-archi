import { WallItem } from './wall_item.js';
import { Matrix4, Vector2, Vector3 } from 'three';
import { Utils } from '../core/utils.js';
import { UP_VECTOR } from './item.js';
import { Plane } from 'three/build/three.module.js';
/** */
export class InWallItem extends WallItem {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__customIntersectionPlanes = this.__model.floorplan.wallPlanesForIntersection;
    }

    snapToPoint(point, normal, intersectingPlane, toWall, toFloor, toRoof) {
        this.snapToWall(point, intersectingPlane.wall, intersectingPlane.edge);
    }

    snapToWall(point, wall, wallEdge) {
        console.log('[InWallItem.snapToWall] Starting with point:', point, 'wall:', wall, 'wallEdge:', wallEdge);

        if (!wallEdge) {
            console.error('[InWallItem.snapToWall] ERROR: wallEdge is null!');
            return;
        }

        let normal = wallEdge.normal;
        console.log('[InWallItem.snapToWall] normal:', normal);

        if (!normal) {
            console.error('[InWallItem.snapToWall] ERROR: wallEdge.normal is null!');
            return;
        }

        // Preserve the original Y position (height) - this is important for windows!
        const originalY = point.y;
        console.log('[InWallItem.snapToWall] Original Y (height):', originalY);

        let plane = new Plane(normal);
        let normal2d = new Vector2(normal.x, normal.z);
        let angle = Utils.angle(UP_VECTOR, normal2d);
        let tempPoint = new Vector3();
        let matrix = new Matrix4();

        console.log('[InWallItem.snapToWall] wallEdge.center:', wallEdge.center);

        point = this.__fitToWallBounds(point, wallEdge);
        console.log('[InWallItem.snapToWall] After fitToWallBounds, point:', point);

        if (!wallEdge.center) {
            console.error('[InWallItem.snapToWall] ERROR: wallEdge.center is null!');
            // Try to calculate center from wall
            let wallCenter = wall.wallCenter();
            matrix.setPosition(new Vector3(wallCenter.x, originalY, wallCenter.y));
        } else {
            // Use wallEdge.center but preserve our Y position
            matrix.setPosition(new Vector3(wallEdge.center.x, originalY, wallEdge.center.z));
        }

        plane.applyMatrix4(matrix);
        plane.projectPoint(point, tempPoint);
        point = tempPoint.clone();

        // Restore the original Y position after projection
        point.y = originalY;

        point = point.clone().sub(normal.clone().multiplyScalar(wall.thickness * 0.5));
        // point = this.__fitToWallBounds(point, wallEdge);

        console.log('[InWallItem.snapToWall] Final point:', point, 'angle:', angle);

        this.rotation = new Vector3(0, angle, 0);
        this.innerRotation=new Vector3(0, angle, 0);
        this.position = point;
        this.__currentWallSnapPoint = point.clone();
        this.__currentWallNormal = normal.clone();
        this.__addToAWall(wall, wallEdge);

        console.log('[InWallItem.snapToWall] Complete. Item position:', this.position);
    }
}