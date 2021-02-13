import L, { LatLng, LineUtil, Map, Polyline } from "leaflet";
import GeometryUtil from "leaflet-geometryutil";

export type PolylineIndex = number | [number, number];

/**
 * If `points` is the array of coordinates or array of arrays of coordinates that a Polyline/Polygon consists of and `point` is the
 * coordinates where the dragging starts, this method returns the index in the `points` array where the new point should be inserted.
 * The returned value is a number of a tuple of two numbers, depending on whether `points` is an array or an array of arrays.
 *
 * @param map: The instance of `L.Map`.
 * @param points: An array of coordinates or array of arrays of coordinates as returned by `layer.getLatLngs()`.
 * @param point: An instance of `L.LatLng` that represents the point on the line where dragging has started.
 * @param allowExtendingLine: If `true` (default), will return `0` or `points.length` if the dragging has started before the beginning
 * or after the end of the line. If `false`, will always return at least `1` and at most `points.length - 1` to prevent the
 * beginning/end of the line to be modified. Has no effect if `isPolygon` is `true`.
 * @param isPolygon: If `true`, `points` will be considered to be the coordinates of a polygon, if `false` (default), it will be considered
 * the coordinates of a line. The difference between a polygon and a line is that in a polygon, the first point and the last point
 * of the coordinates listed in `points` are connected by an additional segment that can also be dragged.
 */
export function getInsertPosition(map: Map, points: LatLng[], point: LatLng, isPolygon?: boolean): number;
export function getInsertPosition(map: Map, points: LatLng[][], point: LatLng, isPolygon?: boolean): [number, number];
export function getInsertPosition(map: Map, points: LatLng[] | LatLng[][], point: LatLng, isPolygon?: boolean): number | [number, number];
export function getInsertPosition(map: Map, points: LatLng[] | LatLng[][], point: LatLng, isPolygon = false): number | [number, number] {
    if (!LineUtil.isFlat(points)) {
        // In case of a multi polyline/polygon, we need to figure out first which one of the polylines/polygons the closest point is on.
        // GeometryUtil.closest() doesn't seem to tell us that, so we need to check the distance to each sub polyline/polygon manually.
        // Internally, GeometryUtil.closest() seems to do it the same way.
        let result: { distance: number, i: number } | undefined;
        for (let i = 0; i < points.length; i++) {
            const polyline = isPolygon ? L.polygon(points[i]) : L.polyline(points[i]);
            const distance = GeometryUtil.closest(map, polyline, point)!.distance;
            if (!result || distance < result.distance) {
                result = { distance, i };
            }
        }
        return result ? [result.i, getInsertPosition(map, points[result.i], point, isPolygon)] : [0, 0];
    }

    const polyline = L.polyline(isPolygon ? [...points, points[0]] : points);
    const pos = GeometryUtil.locateOnLine(map, polyline, point);
    const before = L.GeometryUtil.extract(map, polyline, 0, pos);
    
    let idx = before.length - 1;
    if (!isPolygon)
        idx = Math.max(1, Math.min(points.length - 1, idx));
    return idx;
}


/**
 * Similar to `getInsertPosition`, but for a line where the points returned by `getLatLngs()` (“track points”) are a route that has been
 * calculated to be the best connection between a set of waypoints (“route points”). Dragging starts on a segment between two track
 * points, but should lead an additional point in the set of route points rather than track points, so that the route can be recalculated.
 * This method returns the index where the new route point should be inserted into the array of route points.
 * @param map: The instance of `L.Map`.
 * @param routePoints: An array of coordinates that are the waypoints that are used as the basis for calculating the route.
 * @param trackPoints: An array of coordinates as returned by `layer.getLatLngs()`.
 * @param point: An instance of `L.LatLng` that represents the point on the line where dragging has started.
 */
export function getRouteInsertPosition(map: Map, routePoints: LatLng[], trackPoints: LatLng[], point: LatLng): number {
    const polyline = L.polyline(trackPoints);
    const pos = GeometryUtil.locateOnLine(map, polyline, point);

    for (let i = 0; i < routePoints.length; i++) {
        if (GeometryUtil.locateOnLine(map, polyline, routePoints[i]) > pos)
            return i;
    }
    return routePoints.length;
}

export function getFromPosition<T, A extends T[] | T[][]>(arr: A, idx: PolylineIndex): T {
    return Array.isArray(idx) ? (arr as any)[idx[0]][idx[1]] : arr[idx];
}

/**
 * Returns a copy of the `arr` array with `item` inserted at the index `idx`. `arr` can be an array or an array of arrays (as
 * returned by `getLatLngs()` on a Polyline/Polygon), and `idx` can be a number or a tuple of two numbers as returned by
 * `L.DraggableLines.getInsertPosition()` (and as passed along with the drag events). This method can be used to easily insert
 * a new point at the right position.
 */
export function insertAtPosition<T, A extends T[] | T[][]>(arr: A, item: T, idx: number | [number, number]): A {
    const idxArr = Array.isArray(idx) ? idx : [idx];

    if (idxArr.length === 0) {
        return arr;
    } else if (idxArr.length === 1) {
        return [...arr.slice(0, idxArr[0]), item, ...arr.slice(idxArr[0])] as any;
    } else {
        const result = [...arr];
        result[idxArr[0]] = insertAtPosition(result[idxArr[0]] as any, item, idxArr.slice(1) as any);
        return result as any;
    }
}

/**
 * Like `L.DraggableLines.insertAtPosition`, but overwrites the item at the given index instead of inserting it there.
 * 
 * Returns a copy of the `arr` array with the item at index `idx` overwritten with `item`. `arr` can be an array or an array
 * of arrays (as returned by `getLatLngs()` on a Polyline/Polygon), and `idx` can be a number or a tuple of two numbers as
 * returned by `L.DraggableLines.getInsertPosition()` (and as passed along with the drag events). This method can be used
 * to easily update a new point at the right position while the user is dragging:
 */
export function updateAtPosition<T, A extends T[] | T[][]>(arr: A, item: T, idx: number | [number, number]): A {
    const idxArr = Array.isArray(idx) ? idx : [idx];

    if (idxArr.length === 0) {
        return arr;
    } else if (idxArr.length === 1) {
        return [...arr.slice(0, idxArr[0]), item, ...arr.slice(idxArr[0] + 1)] as any;
    } else {
        const result = [...arr];
        result[idxArr[0]] = updateAtPosition(result[idxArr[0]] as any, item, idxArr.slice(1) as any);
        return result as any;
    }
}

export function removeFromPosition<A extends any[] | any[][]>(arr: A, idx: number | [number, number]): A {
    const idxArr = Array.isArray(idx) ? idx : [idx];

    if (idxArr.length === 0) {
        return arr;
    } else if (idxArr.length === 1) {
        return [...arr.slice(0, idxArr[0]), ...arr.slice(idxArr[0] + 1)] as any;
    } else {
        const result = [...arr];
        result[idxArr[0]] = removeFromPosition(result[idxArr[0]] as any, idxArr.slice(1) as any);
        return result as any;
    }
}

export function setPoint(layer: Polyline, point: LatLng, idx: number | [number, number], insert: boolean) {
    const hasRoutePoints = layer.hasDraggableLinesRoutePoints();
    
    let points = hasRoutePoints ? layer.getDraggableLinesRoutePoints()! : layer.getLatLngs() as LatLng[] | LatLng[][];
    
    if (insert)
        points = insertAtPosition(points, point, idx);
    else
        points = updateAtPosition(points, point, idx);
    
    if (hasRoutePoints)
        layer.setDraggableLinesRoutePoints(points as any);
    else
        layer.setLatLngs(points);
}

export function removePoint(layer: Polyline, idx: number | [number, number]) {
    const hasRoutePoints = layer.hasDraggableLinesRoutePoints();
    
    let points = hasRoutePoints ? layer.getDraggableLinesRoutePoints()! : layer.getLatLngs() as LatLng[] | LatLng[][];
    points = removeFromPosition(points, idx);

    if (hasRoutePoints)
        layer.setDraggableLinesRoutePoints(points as any);
    else
        layer.setLatLngs(points);
}

export function getPlusIconPoint(map: Map, trackPoints: LatLng[], distance: number, atStart: boolean) {
    const tr = atStart ? trackPoints : [...trackPoints].reverse();

    const point0 = map.latLngToContainerPoint(tr[0]);
    const tr1 = tr.find((p, i) => i > 0 && point0.distanceTo(map.latLngToContainerPoint(p)) > 0);

    let result;
    if (!tr1) {
        result = L.point(point0.x + (atStart ? -1 : 1) * distance, point0.y);
    } else {
        const point1 = map.latLngToContainerPoint(tr1);

        const fraction = distance / point0.distanceTo(point1);

        result = L.point(point0.x - fraction * (point1.x - point0.x), point0.y - fraction * (point1.y - point0.y));
    }

    return map.containerPointToLatLng(result);
}