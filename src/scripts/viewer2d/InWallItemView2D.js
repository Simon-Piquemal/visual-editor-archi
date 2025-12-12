import { Graphics, Point } from 'pixi.js';
import { Vector2, Vector3 } from 'three';
import { Dimensioning } from '../core/dimensioning.js';
import { EVENT_UPDATED, EVENT_ITEM_REMOVED } from '../core/events.js';
import { TYPE_DOOR } from '../parametrics/ParametricFactory.js';

export class InWallItemView2D extends Graphics {
    constructor(floorplan, wall, item) {
        super();
        this.__floorplan = floorplan;
        this.__wall = wall;
        this.__item = item;

        this.__isDragging = false;
        this.__dragData = null;

        this.interactive = true;
        this.buttonMode = true;
        this.cursor = 'grab';

        this.__itemUpdatedEvent = this.__draw.bind(this);
        this.__itemRemovedEvent = this.__onRemoved.bind(this);

        this.__item.addEventListener(EVENT_UPDATED, this.__itemUpdatedEvent);
        this.__item.addEventListener(EVENT_ITEM_REMOVED, this.__itemRemovedEvent);

        // Setup drag events
        this.on('pointerdown', this.__onDragStart.bind(this));
        this.on('pointerup', this.__onDragEnd.bind(this));
        this.on('pointerupoutside', this.__onDragEnd.bind(this));
        this.on('pointermove', this.__onDragMove.bind(this));

        this.__draw();
    }

    __draw() {
        this.clear();

        let wallDirection = this.__wall.wallDirectionNormalized();
        let wallAngle = Math.atan2(wallDirection.y, wallDirection.x);
        let wallNormal = wallDirection.clone().rotateAround(new Vector2(), Math.PI * 0.5);

        let pos = new Vector2(this.__item.position.x, this.__item.position.z);
        let width = this.__item.halfSize.x;
        let depth = this.__item.halfSize.z;

        let right = wallDirection.clone().multiplyScalar(width);
        let left = wallDirection.clone().multiplyScalar(-width);

        // Expand the opening slightly beyond wall thickness
        let expandedUp = wallNormal.clone().multiplyScalar(depth * 1.5);
        let expandedDown = expandedUp.clone().multiplyScalar(-1);

        let a = pos.clone().add(right.clone().add(expandedUp));
        let b = pos.clone().add(right.clone().add(expandedDown));
        let c = pos.clone().add(left.clone().add(expandedDown));
        let d = pos.clone().add(left.clone().add(expandedUp));

        let points = [
            new Point(Dimensioning.cmToPixel(a.x), Dimensioning.cmToPixel(a.y)),
            new Point(Dimensioning.cmToPixel(b.x), Dimensioning.cmToPixel(b.y)),
            new Point(Dimensioning.cmToPixel(c.x), Dimensioning.cmToPixel(c.y)),
            new Point(Dimensioning.cmToPixel(d.x), Dimensioning.cmToPixel(d.y)),
        ];

        // Door opening in wall - white fill (covers the wall)
        this.lineStyle(0);
        this.beginFill(0xFFFFFF, 1.0);
        this.drawPolygon(points);
        this.endFill();

        // Door frame lines (jambs) - dark gray
        this.lineStyle(2.5, 0x374151, 1.0);
        this.moveTo(points[0].x, points[0].y);
        this.lineTo(points[1].x, points[1].y);
        this.moveTo(points[2].x, points[2].y);
        this.lineTo(points[3].x, points[3].y);

        // Check if it's a door (has swing arc) or window
        let isDoor = this.__item.baseParametricType &&
                     this.__item.baseParametricType.description === TYPE_DOOR;

        // Calculate door/window dimensions
        let itemWidth = width * 2;
        let itemWidthPx = Dimensioning.cmToPixel(itemWidth);

        // Hinge position (left side)
        let hingePos = pos.clone().add(left);
        let hingePx = new Point(
            Dimensioning.cmToPixel(hingePos.x),
            Dimensioning.cmToPixel(hingePos.y)
        );

        if (isDoor) {
            // Door open position (perpendicular to wall - 90deg swing)
            let doorOpenPos = hingePos.clone().add(wallNormal.clone().multiplyScalar(itemWidth));
            let doorOpenPx = new Point(
                Dimensioning.cmToPixel(doorOpenPos.x),
                Dimensioning.cmToPixel(doorOpenPos.y)
            );

            // Draw the door panel in open position (thick purple line)
            this.lineStyle(3, 0x6366F1, 1.0);
            this.moveTo(hingePx.x, hingePx.y);
            this.lineTo(doorOpenPx.x, doorOpenPx.y);

            // Draw the swing arc (90 degree arc)
            let startAngle = wallAngle;
            let endAngle = wallAngle + Math.PI * 0.5;

            this.lineStyle(1.5, 0x6366F1, 0.6);
            this.arc(hingePx.x, hingePx.y, itemWidthPx, startAngle, endAngle, false);

            // Draw small hinge indicator dot
            this.lineStyle(0);
            this.beginFill(0x6366F1, 1.0);
            this.drawCircle(hingePx.x, hingePx.y, 4);
            this.endFill();

            // Inner white dot on hinge
            this.beginFill(0xFFFFFF, 1.0);
            this.drawCircle(hingePx.x, hingePx.y, 2);
            this.endFill();

            // Check if this is an entry door (first door or marked as entry)
            // Draw entry arrow pointing from outside to inside
            this.__drawEntryArrow(pos, wallNormal, itemWidth, wallDirection);
        } else {
            // Window - draw cross pattern
            let centerPx = new Point(
                Dimensioning.cmToPixel(pos.x),
                Dimensioning.cmToPixel(pos.y)
            );

            // Window frame
            this.lineStyle(2, 0x6366F1, 1.0);

            // Horizontal line
            let leftPx = new Point(Dimensioning.cmToPixel(pos.x + left.x), Dimensioning.cmToPixel(pos.y + left.y));
            let rightPx = new Point(Dimensioning.cmToPixel(pos.x + right.x), Dimensioning.cmToPixel(pos.y + right.y));
            this.moveTo(leftPx.x, leftPx.y);
            this.lineTo(rightPx.x, rightPx.y);

            // Vertical line (window pane divider)
            let upOffset = wallNormal.clone().multiplyScalar(depth * 0.8);
            let downOffset = wallNormal.clone().multiplyScalar(-depth * 0.8);
            this.moveTo(
                Dimensioning.cmToPixel(pos.x + upOffset.x),
                Dimensioning.cmToPixel(pos.y + upOffset.y)
            );
            this.lineTo(
                Dimensioning.cmToPixel(pos.x + downOffset.x),
                Dimensioning.cmToPixel(pos.y + downOffset.y)
            );
        }

        // Highlight when dragging
        if (this.__isDragging) {
            this.lineStyle(2, 0x6366F1, 0.3);
            this.beginFill(0x6366F1, 0.1);
            this.drawPolygon(points);
            this.endFill();
        }
    }

    __drawEntryArrow(pos, wallNormal, doorWidth, wallDirection) {
        // Determine direction based on wall side (front = interior, back = exterior typically)
        // Arrow points from exterior to interior (into the room)
        let inwardDir = wallNormal.clone();

        // If wall side is 'back', flip the direction
        if (this.__item.wallSide === 'back') {
            inwardDir.multiplyScalar(-1);
        }

        // Arrow pointing from outside to inside
        let arrowStart = pos.clone().add(inwardDir.clone().multiplyScalar(-doorWidth * 0.8));
        let arrowEnd = pos.clone().add(inwardDir.clone().multiplyScalar(doorWidth * 0.5));

        let arrowStartPx = new Point(
            Dimensioning.cmToPixel(arrowStart.x),
            Dimensioning.cmToPixel(arrowStart.y)
        );
        let arrowEndPx = new Point(
            Dimensioning.cmToPixel(arrowEnd.x),
            Dimensioning.cmToPixel(arrowEnd.y)
        );

        // Arrow line - thicker and more visible
        this.lineStyle(3, 0x10B981, 0.9); // Green color for entry
        this.moveTo(arrowStartPx.x, arrowStartPx.y);
        this.lineTo(arrowEndPx.x, arrowEndPx.y);

        // Arrow head
        let arrowHeadSize = Dimensioning.cmToPixel(doorWidth * 0.3);
        let arrowAngle = Math.atan2(inwardDir.y, inwardDir.x);

        let headAngle1 = arrowAngle + Math.PI * 0.8;
        let headAngle2 = arrowAngle - Math.PI * 0.8;

        let head1 = new Point(
            arrowEndPx.x + Math.cos(headAngle1) * arrowHeadSize,
            arrowEndPx.y + Math.sin(headAngle1) * arrowHeadSize
        );
        let head2 = new Point(
            arrowEndPx.x + Math.cos(headAngle2) * arrowHeadSize,
            arrowEndPx.y + Math.sin(headAngle2) * arrowHeadSize
        );

        this.lineStyle(0);
        this.beginFill(0x10B981, 0.9);
        this.moveTo(arrowEndPx.x, arrowEndPx.y);
        this.lineTo(head1.x, head1.y);
        this.lineTo(head2.x, head2.y);
        this.lineTo(arrowEndPx.x, arrowEndPx.y);
        this.endFill();
    }

    __onDragStart(event) {
        this.__isDragging = true;
        this.__dragData = event.data;
        this.cursor = 'grabbing';
        this.alpha = 0.8;
        event.stopPropagation();
        this.__draw();
    }

    __onDragEnd(event) {
        if (this.__isDragging) {
            this.__isDragging = false;
            this.__dragData = null;
            this.cursor = 'grab';
            this.alpha = 1.0;

            // Trigger a floorplan update to refresh all wall views
            // This will recreate in-wall item views on their new walls
            this.__floorplan.update();
            this.__draw();
        }
    }

    updateWall(newWall) {
        this.__wall = newWall;
        this.__draw();
    }

    __findClosestWall(cmX, cmY) {
        let walls = this.__floorplan.walls;
        let closestWall = null;
        let closestDistance = Infinity;
        let closestProjection = 0;
        let closestEdge = null;

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

            // Clamp projection to wall bounds
            let margin = this.__item.halfSize.x + 5;
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

        return { wall: closestWall, distance: closestDistance, projection: closestProjection, edge: closestEdge };
    }

    __onDragMove(event) {
        if (this.__isDragging && this.__dragData) {
            let newPosition = this.__dragData.getLocalPosition(this.parent);

            // Convert to cm
            let cmX = Dimensioning.pixelToCm(newPosition.x);
            let cmY = Dimensioning.pixelToCm(newPosition.y);

            // Find the closest wall to the drag position
            let closest = this.__findClosestWall(cmX, cmY);

            // Only switch walls if close enough (within 100cm / ~1m)
            let snapThreshold = 100;

            if (closest.wall && closest.distance < snapThreshold && closest.edge) {
                let targetWall = closest.wall;
                let wallStart = targetWall.start.location;
                let wallEnd = targetWall.end.location;
                let wallVec = wallEnd.clone().sub(wallStart);
                let wallDir = wallVec.normalize();

                // Calculate new position on target wall
                let newPos = wallStart.clone().add(wallDir.clone().multiplyScalar(closest.projection));

                // Update the wall reference if changed
                if (targetWall !== this.__wall) {
                    this.__wall = targetWall;
                }

                // Snap to the closest wall
                let point3D = new Vector3(newPos.x, this.__item.position.y, newPos.y);
                this.__item.snapToWall(point3D, targetWall, closest.edge);

                this.__draw();
            }

            event.stopPropagation();
        }
    }

    __onRemoved() {
        this.remove();
    }

    remove() {
        this.__item.removeEventListener(EVENT_UPDATED, this.__itemUpdatedEvent);
        this.__item.removeEventListener(EVENT_ITEM_REMOVED, this.__itemRemovedEvent);
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    get item() {
        return this.__item;
    }

    get wall() {
        return this.__wall;
    }
}
