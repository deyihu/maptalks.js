
// Cohen-Sutherland line clippign algorithm, adapted to efficiently
// handle polylines rather than just segments

import { Point } from "../../geo";
import { BBOX } from "./bbox";

const TEMP_POINT = new Point(0, 0);

/**
 * p1-------------p2
 * |             |
 *  |           |
 *   |         |
 *   p4-------p3
 * @param points 
 * @param p1 
 * @param p2 
 * @param p3 
 * @param p4 
 * @returns 
 */

export function clipLineByQuadrilatera(points: Array<Point>, p1: Point, p2: Point, p3: Point, p4: Point) {

    var len = points.length,
        codeA = bitCode1(points[0], p1, p2, p3, p4),
        part = [],
        i, a, b, codeB, lastCode;

    const result = [];

    for (i = 1; i < len; i++) {
        a = points[i - 1];
        b = points[i];
        codeB = lastCode = bitCode1(b, p1, p2, p3, p4);
        let idx = 0;
        while (true) {
            console.log(codeA, codeB, i);
            if (!(codeA | codeB)) { // accept
                part.push(a);

                if (codeB !== lastCode) { // segment went outside
                    part.push(b);

                    if (i < len - 1) { // start a new line
                        result.push(part);
                        part = [];
                    }
                } else if (i === len - 1) {
                    part.push(b);
                }
                break;

            } else if (codeA & codeB) { // trivial reject
                break;

            } else if (codeA) { // a outside, intersect with clip edge
                if (codeA === 8 && codeB === 6) {
                    debugger;
                }
                // console.log(codeA, codeB);
                a = intersect(a, b, codeA, p1, p2, p3, p4);
                codeA = bitCode1(a, p1, p2, p3, p4);

            } else { // b outside
                b = intersect(a, b, codeB, p1, p2, p3, p4);
                codeB = bitCode1(b, p1, p2, p3, p4);
            }
        }

        codeA = lastCode;
    }

    if (part.length) result.push(part);
    result.forEach((part, index) => {
        const path = [];
        for (let i = 0, len = part.length; i < len; i++) {
            path[i] = {
                index: i,
                point: part[i]
            }
        }
        result[index] = path;
    });
    console.log('------')
    return result;
}

// // Sutherland-Hodgeman polygon clipping algorithm

// function polygonclip(points, p1: Point, p2: Point, p3: Point, p4: Point) {

//     var result, edge, prev, prevInside, i, p, inside;

//     // clip against each side of the clip rectangle
//     for (edge = 1; edge <= 8; edge *= 2) {
//         result = [];
//         prev = points[points.length - 1];
//         prevInside = !(bitCode(prev, bbox) & edge);

//         for (i = 0; i < points.length; i++) {
//             p = points[i];
//             inside = !(bitCode(p, bbox) & edge);

//             // if segment goes through the clip window, add an intersection
//             if (inside !== prevInside) result.push(intersect(prev, p, edge, bbox));

//             if (inside) result.push(p); // add a point if it's inside

//             prev = p;
//             prevInside = inside;
//         }

//         points = result;

//         if (!points.length) break;
//     }

//     return result;
// }

// intersect a segment against one of the 4 lines that make up the bbox

function intersect(a: Point, b: Point, edge: number, p1: Point, p2: Point, p3: Point, p4: Point) {
    if (edge & 8) {// top
        return segmentIntersection(a, b, p1, p2);
    }
    if (edge & 4) {// bottom
        return segmentIntersection(a, b, p3, p4);
    }
    if (edge & 2) {// right
        return segmentIntersection(a, b, p2, p3);
    }
    if (edge & 1) {// left
        return segmentIntersection(a, b, p4, p1);
    }
    return null;
    // return edge & 8 ? [a[0] + (b[0] - a[0]) * (bbox[3] - a[1]) / (b[1] - a[1]), bbox[3]] : // top
    //     edge & 4 ? [a[0] + (b[0] - a[0]) * (bbox[1] - a[1]) / (b[1] - a[1]), bbox[1]] : // bottom
    //         edge & 2 ? [bbox[2], a[1] + (b[1] - a[1]) * (bbox[2] - a[0]) / (b[0] - a[0])] : // right
    //             edge & 1 ? [bbox[0], a[1] + (b[1] - a[1]) * (bbox[0] - a[0]) / (b[0] - a[0])] : null; // left
}

/**
 * p1-------p2
 * |        |
 * |        |
 * |        |
 * p4-------p3
 * @param p 
 * @param p1 
 * @param p2 
 * @param p3 
 * @param p4 
 * @returns 
 */
// bit code reflects the point position relative to the bbox:

//         left  mid  right
//    top  1001  1000  1010
//    mid  0001  0000  0010
// bottom  0101  0100  0110

function bitCode1(p: Point, p1: Point, p2: Point, p3: Point, p4: Point) {
    var code = 0;
    if (pointLeftSegment(p, p4, p1)) {
        code |= 1; // left
    } else if (pointLeftSegment(p, p2, p3)) {
        code |= 2; // right
    }
    if (pointLeftSegment(p, p3, p4)) {
        code |= 4; // bottom
    } else if (pointLeftSegment(p, p1, p2)) {
        code |= 8; // top
    }

    return code;
}

function pointInTriangle(p: Point, p1: Point, p2: Point, p3: Point) {

    const a = pointRightSegment(p, p1, p2);
    const b = pointRightSegment(p, p2, p3);
    const c = pointRightSegment(p, p3, p1);
    return a && b && c;


}


/**
 * 点在线段上
 * point in segment
 * @param p 
 * @param p1 
 * @param p2 
 * @returns 
 */
function pointInLine(p: Point, p1: Point, p2: Point) {
    const dx = p2.x - p1.x;
    if (dx === 0) {
        return Math.abs(p.x - p1.x) <= 0.0000001;
    }
    const dy = p2.y - p1.y;
    const k = dy / dx;

    if (k === 0) {
        return Math.abs(p.y - p1.y) <= 0.0000001;
    }

    const b = p1.y - k * p1.x;
    const y = k * p.x + b;
    // console.log(Math.abs(y - p.y))
    return Math.abs(y - p.y) <= 0.0000001;
}

/**
 * point left segment
 * @param p 
 * @param p1 
 * @param p2 
 * @returns 
 */
function pointLeftSegment(p: Point, p1: Point, p2: Point) {
    if (pointInLine(p, p1, p2)) {
        return false;
    }

    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x = p.x, y = p.y;
    return (y1 - y2) * x + (x2 - x1) * y + x1 * y2 - x2 * y1 > 0;

    // const dx1 = p2.x - p1.x, dy1 = p2.y - p1.y;
    // const a1 = Math.atan2(dy1, dx1) / Math.PI * 180;

    // const dx2 = p.x - p1.x, dy2 = p.y - p1.y;
    // const a2 = Math.atan2(dy2, dx2) / Math.PI * 180;

    // if (a2 === undefined || a1 === undefined) {
    //     return false;
    // }
    // if (a1 === a2) {
    //     return false;
    // }
    // if (a1 === 0) {
    //     return a2 > 0 && a2 < 180;
    // }
    // if (a1 > 0 && a1 < 90) {
    //     return a2 > a1 || a2 < a1 - 180;
    // }
    // if (a1 === 90) {
    //     return a2 > a1 || a2 < -90;
    // }
    // if (a1 > 90 && a1 < 180) {
    //     return a2 > a1 || a2 < a1 - 180;
    // }
    // if (a1 === 180) {
    //     return a2 < 0;
    // }
    // if (a1 > -90 && a1 < 0) {
    //     return a2 > a1 && a2 < a1 + 180;
    // }
    // if (a1 === -90) {
    //     return a2 > a1 && a2 < 90;
    // }
    // if (a1 < -90) {
    //     return a2 > a1 && a2 < a1 + 180;
    // }
    // return false;


}

function pointRightSegment(p: Point, p1: Point, p2: Point) {
    return !pointLeftSegment(p, p1, p2);
}

/**
 * 
 * @param p1 
 * @param p2 
 * @param p3 
 * @param p4 
 * @returns 
 */
function segmentIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
    const dx1 = p2.x - p1.x, dy1 = p2.y - p1.y;
    const dx2 = p4.x - p3.x, dy2 = p4.y - p3.y;
    if (dx1 === 0 && dx2 === 0) {
        //垂直平行
        const ys = [p1.y, p2.y, p3.y, p4.y].sort((a, b) => {
            return a - b;
        });
        const a1 = Math.atan2(dy2, dx2);
        const a2 = Math.atan2(ys[1] - p3.y, dx2);
        if (a1 === a2) {
            return new Point(p3.x, ys[1]);
        }
        return new Point(p3.x, ys[2]);
    }
    if (dy1 === 0 && dy2 === 0) {
        //横向平行
        const xs = [p1.x, p2.x, p3.x, p4.x].sort((a, b) => {
            return a - b;
        });
        const a1 = Math.atan2(dy2, dx2);
        const a2 = Math.atan2(dy2, xs[1] - p3.x);
        if (a1 === a2) {
            return new Point(xs[1], p3.y);
        }
        return new Point(xs[2], p3.y);
    }

    const k1 = dy1 / dx1;
    const k2 = dy2 / dx2;

    const b1 = p1.y - k1 * p1.x;
    const b2 = p3.y - k2 * p3.x;

    let x, y;

    if (dx1 === 0) {
        x = p1.x;
        y = k2 * x + b2;
    } else if (dx2 === 0) {
        x = p3.x;
        y = k1 * x + b1;
    } else if (dy1 === 0) {
        y = p1.y;
        x = (y - b2) / k2;
    } else if (dy2 === 0) {
        y = p3.y;
        x = (y - b1) / k1;
    } else {
        x = (b2 - b1) / (k1 - k2);
        y = k1 * x + b1;
    }

    let noCross = false;

    if (x < Math.min(p1.x, p2.x) || x > Math.max(p1.x, p2.x)) {
        noCross = true;
    }
    if (x < Math.min(p3.x, p4.x) || x > Math.max(p3.x, p4.x)) {
        noCross = true;
    }
    if (y < Math.min(p1.y, p2.y) || y > Math.max(p1.y, p2.y)) {
        noCross = true;
    }
    if (y < Math.min(p3.y, p4.y) || y > Math.max(p3.y, p4.y)) {
        noCross = true;
    }
    if (!noCross) {
        return new Point(x, y);
    }
    const a1 = Math.atan2(dy2, dx2);
    const a2 = Math.atan2(y - p3.y, x - p3.x);
    if (a1 === a2) {
        return p4;
    }
    return p3;
}


/**
 * bbox within a convex quadrilateral
 * p1-------p2
 * |        |
 * |        |
 * |        |
 * p4-------p3
 * @param bbox 
 * @param p1 
 * @param p2 
 * @param p3 
 * @param p4 
 * @returns 
 */
export function bboxInInQuadrilateral(bbox: BBOX, p1: Point, p2: Point, p3: Point, p4: Point) {
    return false;
    // const [xmin, ymin, xmax, ymax] = bbox;

    // TEMP_POINT.x = xmin;
    // TEMP_POINT.y = ymin;
    // if (!pointInQuadrilateral(TEMP_POINT, p1, p2, p3, p4)) {
    //     return false;
    // }

    // TEMP_POINT.x = xmin;
    // TEMP_POINT.y = ymax;
    // if (!pointInQuadrilateral(TEMP_POINT, p1, p2, p3, p4)) {
    //     return false;
    // }

    // TEMP_POINT.x = xmax;
    // TEMP_POINT.y = ymax;
    // if (!pointInQuadrilateral(TEMP_POINT, p1, p2, p3, p4)) {
    //     return false;
    // }

    // TEMP_POINT.x = xmax;
    // TEMP_POINT.y = ymin;
    // if (!pointInQuadrilateral(TEMP_POINT, p1, p2, p3, p4)) {
    //     return false;
    // }

    return true;
}

/**
 * p1-------p2
 * |        |
 * |        |
 * |        |
 * p4-------p3
 * @param p 
 * @param p1 
 * @param p2 
 * @param p3 
 * @param p4 
 * @returns 
 */
function pointInQuadrilateral(p: Point, p1: Point, p2: Point, p3: Point, p4: Point) {
    //LT-RT
    const a = pointRightSegment(p, p1, p2)
    //RT-RB
    const b = pointRightSegment(p, p2, p3)
    //RB-LB
    const c = pointRightSegment(p, p3, p4)
    //LB-LT
    const d = pointRightSegment(p, p4, p1)
    return a && b && c && d;
}
