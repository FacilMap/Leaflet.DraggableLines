import L, { LatLng, LineUtil, Map, Polyline } from "leaflet";
import GeometryUtil from "leaflet-geometryutil";

export function getInsertPosition(map: Map, points: LatLng[], point: LatLng, allowExtendingLine?: boolean, isPolygon?: boolean): number;
export function getInsertPosition(map: Map, points: LatLng[][], point: LatLng, allowExtendingLine?: boolean, isPolygon?: boolean): [number, number];
export function getInsertPosition(map: Map, points: LatLng[] | LatLng[][], point: LatLng, allowExtendingLine = true, isPolygon = false): number | [number, number] {
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
        return result ? [result.i, getInsertPosition(map, points[result.i], point, allowExtendingLine, isPolygon)] : [0, 0];
    }

    const polyline = L.polyline(isPolygon ? [...points, points[0]] : points);
    const pos = GeometryUtil.locateOnLine(map, polyline, point);
    const before = L.GeometryUtil.extract(map, polyline, 0, pos);
    let idx = before.length - 1;

    if (!allowExtendingLine && !isPolygon)
        idx = Math.max(1, Math.min(points.length - 1, idx));
    
    return idx;
}

export function getRouteInsertPosition(map: Map, routePoints: LatLng[], trackPoints: LatLng[], point: LatLng): number {
    const polyline = L.polyline(trackPoints);
    const pos = GeometryUtil.locateOnLine(map, polyline, point);

    for (let i = 0; i < routePoints.length; i++) {
        if (GeometryUtil.locateOnLine(map, polyline, point) > pos)
            return i;
    }
    return routePoints.length;
}

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