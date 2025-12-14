/**
 * Wall Junction Calculator
 * Calculates proper corner intersections where walls meet
 * Based on geometric line intersection algorithms
 */

/**
 * @typedef {Object} Point2D
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} LineEquation
 * @property {number} a
 * @property {number} b
 * @property {number} c
 */

/**
 * @typedef {Object} LiveWall
 * @property {string} id
 * @property {Point2D} start
 * @property {Point2D} end
 * @property {number} thickness
 */

/**
 * @typedef {Object} Junction
 * @property {Point2D} meetingPoint
 * @property {Array<{wall: LiveWall, endType: 'start' | 'end'}>} connectedWalls
 */

/**
 * Convert a point to a hash key for junction detection
 * @param {Point2D} p
 * @param {number} tolerance
 * @returns {string}
 */
export function pointToKey(p, tolerance = 1e-3) {
    const snap = 1 / tolerance;
    return `${Math.round(p.x * snap)},${Math.round(p.y * snap)}`;
}

/**
 * Get the outgoing vector from a wall endpoint
 * @param {LiveWall} wall
 * @param {'start' | 'end'} endType
 * @returns {Point2D}
 */
export function getOutgoingVector(wall, endType) {
    if (endType === 'start') {
        return { x: wall.end.x - wall.start.x, y: wall.end.y - wall.start.y };
    }
    return { x: wall.start.x - wall.end.x, y: wall.start.y - wall.end.y };
}

/**
 * Create a line equation from a point and direction vector
 * Line equation: ax + by + c = 0
 * @param {Point2D} p - Point on the line
 * @param {Point2D} v - Direction vector
 * @returns {LineEquation}
 */
export function createLineFromPointAndVector(p, v) {
    const a = -v.y;
    const b = v.x;
    const c = -(a * p.x + b * p.y);
    return { a, b, c };
}

/**
 * Find intersection of two lines
 * @param {LineEquation} l1
 * @param {LineEquation} l2
 * @returns {Point2D | null}
 */
export function intersectLines(l1, l2) {
    const det = l1.a * l2.b - l2.a * l1.b;
    if (Math.abs(det) < 1e-9) return null; // Parallel lines
    const x = (l1.b * l2.c - l2.b * l1.c) / det;
    const y = (l2.a * l1.c - l1.a * l2.c) / det;
    return { x, y };
}

/**
 * Find all junctions (meeting points) between walls
 * @param {LiveWall[]} walls
 * @returns {Map<string, Junction>}
 */
export function findJunctions(walls) {
    const junctions = new Map();

    walls.forEach((wall) => {
        const keyStart = pointToKey(wall.start);
        const keyEnd = pointToKey(wall.end);

        if (!junctions.has(keyStart)) {
            junctions.set(keyStart, { meetingPoint: wall.start, connectedWalls: [] });
        }
        junctions.get(keyStart).connectedWalls.push({ wall, endType: 'start' });

        if (!junctions.has(keyEnd)) {
            junctions.set(keyEnd, { meetingPoint: wall.end, connectedWalls: [] });
        }
        junctions.get(keyEnd).connectedWalls.push({ wall, endType: 'end' });
    });

    // Only keep actual junctions (2+ walls meeting)
    const actualJunctions = new Map();
    for (const [key, junction] of junctions.entries()) {
        if (junction.connectedWalls.length >= 2) {
            actualJunctions.set(key, junction);
        }
    }
    return actualJunctions;
}

/**
 * Calculate the intersection points for walls meeting at a junction
 * @param {Junction} junction
 * @returns {{ wallIntersections: Map<string, { left: Point2D, right: Point2D }> }}
 */
export function calculateJunctionIntersections(junction) {
    const { meetingPoint, connectedWalls } = junction;
    const processedWalls = [];

    for (const connected of connectedWalls) {
        const { wall, endType } = connected;
        const halfThickness = wall.thickness / 2;
        const v = getOutgoingVector(wall, endType);
        const L = Math.sqrt(v.x * v.x + v.y * v.y);

        if (L < 1e-9) continue;

        // Normal vector (perpendicular to wall direction)
        const n_unit = { x: -v.y / L, y: v.x / L };

        // Points on the left and right edges at the meeting point
        const pA = {
            x: meetingPoint.x + n_unit.x * halfThickness,
            y: meetingPoint.y + n_unit.y * halfThickness,
        };
        const pB = {
            x: meetingPoint.x - n_unit.x * halfThickness,
            y: meetingPoint.y - n_unit.y * halfThickness,
        };

        processedWalls.push({
            angle: Math.atan2(v.y, v.x),
            edgeA: createLineFromPointAndVector(pA, v),
            edgeB: createLineFromPointAndVector(pB, v),
            v,
            wall_id: wall.id,
            pA,
            pB,
        });
    }

    // Sort walls by angle for correct neighbor pairing
    processedWalls.sort((a, b) => a.angle - b.angle);

    const wallIntersections = new Map();
    const n = processedWalls.length;
    if (n < 2) return { wallIntersections };

    // Calculate intersection points between adjacent walls
    for (let i = 0; i < n; i++) {
        const wall1 = processedWalls[i];
        const wall2 = processedWalls[(i + 1) % n];

        const intersection = intersectLines(wall1.edgeA, wall2.edgeB);

        let p;
        if (intersection === null) {
            // Parallel walls, use the original point
            p = wall1.pA;
        } else {
            p = intersection;
        }

        if (!wallIntersections.has(wall1.wall_id)) {
            wallIntersections.set(wall1.wall_id, {});
        }
        wallIntersections.get(wall1.wall_id).left = p;

        if (!wallIntersections.has(wall2.wall_id)) {
            wallIntersections.set(wall2.wall_id, {});
        }
        wallIntersections.get(wall2.wall_id).right = p;
    }

    return { wallIntersections };
}

/**
 * Convert HalfEdge/Wall data to LiveWall format for junction calculation
 * @param {Object} wall - Wall object from model
 * @param {Object} edge - HalfEdge object
 * @returns {LiveWall}
 */
export function wallToLiveWall(wall, edge) {
    const start = edge.getStart();
    const end = edge.getEnd();

    return {
        id: wall.id || wall.uuid,
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
        thickness: wall.thickness,
    };
}

/**
 * Get all walls from a floorplan and convert to LiveWall format
 * @param {Object} floorplan
 * @returns {LiveWall[]}
 */
export function getFloorplanWalls(floorplan) {
    const walls = [];

    if (!floorplan || !floorplan.walls) return walls;

    floorplan.walls.forEach((wall) => {
        const start = wall.start;
        const end = wall.end;

        if (start && end) {
            walls.push({
                id: wall.id || wall.uuid,
                start: { x: start.x, y: start.y },
                end: { x: end.x, y: end.y },
                thickness: wall.thickness,
            });
        }
    });

    return walls;
}

/**
 * Calculate all junction data for a floorplan
 * @param {Object} floorplan
 * @returns {Map<string, Map<string, { left: Point2D, right: Point2D }>>}
 */
export function calculateAllJunctions(floorplan) {
    const walls = getFloorplanWalls(floorplan);
    const junctions = findJunctions(walls);

    const allJunctionData = new Map();

    for (const [key, junction] of junctions.entries()) {
        const { wallIntersections } = calculateJunctionIntersections(junction);
        allJunctionData.set(key, wallIntersections);
    }

    return allJunctionData;
}

/**
 * Get junction corners for a specific wall
 * @param {string} wallId
 * @param {Point2D} start
 * @param {Point2D} end
 * @param {Map<string, Map<string, { left: Point2D, right: Point2D }>>} junctionData
 * @returns {{ startLeft: Point2D | null, startRight: Point2D | null, endLeft: Point2D | null, endRight: Point2D | null }}
 */
export function getWallJunctionCorners(wallId, start, end, junctionData) {
    let startLeft = null;
    let startRight = null;
    let endLeft = null;
    let endRight = null;

    const startKey = pointToKey(start);
    const endKey = pointToKey(end);

    const startJunction = junctionData.get(startKey);
    const endJunction = junctionData.get(endKey);

    if (startJunction) {
        const wallData = startJunction.get(wallId);
        if (wallData) {
            startLeft = wallData.left;
            startRight = wallData.right;
        }
    }

    if (endJunction) {
        const wallData = endJunction.get(wallId);
        if (wallData) {
            // Note: At the end, left and right are swapped
            endLeft = wallData.right;
            endRight = wallData.left;
        }
    }

    return { startLeft, startRight, endLeft, endRight };
}

export default {
    pointToKey,
    getOutgoingVector,
    createLineFromPointAndVector,
    intersectLines,
    findJunctions,
    calculateJunctionIntersections,
    wallToLiveWall,
    getFloorplanWalls,
    calculateAllJunctions,
    getWallJunctionCorners,
};
