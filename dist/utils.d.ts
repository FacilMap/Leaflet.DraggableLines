import L, { LatLng, Map, Polyline } from "leaflet";
export declare type PolylineIndex = number | [number, number];
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
export declare function getInsertPosition(map: Map, points: LatLng[], point: LatLng, isPolygon?: boolean): number;
export declare function getInsertPosition(map: Map, points: LatLng[][], point: LatLng, isPolygon?: boolean): [number, number];
export declare function getInsertPosition(map: Map, points: LatLng[] | LatLng[][], point: LatLng, isPolygon?: boolean): number | [number, number];
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
export declare function getRouteInsertPosition(map: Map, routePoints: LatLng[], trackPoints: LatLng[], point: LatLng): number;
export declare function getFromPosition<T, A extends T[] | T[][]>(arr: A, idx: PolylineIndex): T;
/**
 * Returns a copy of the `arr` array with `item` inserted at the index `idx`. `arr` can be an array or an array of arrays (as
 * returned by `getLatLngs()` on a Polyline/Polygon), and `idx` can be a number or a tuple of two numbers as returned by
 * `L.DraggableLines.getInsertPosition()` (and as passed along with the drag events). This method can be used to easily insert
 * a new point at the right position.
 */
export declare function insertAtPosition<T, A extends T[] | T[][]>(arr: A, item: T, idx: number | [number, number]): A;
/**
 * Like `L.DraggableLines.insertAtPosition`, but overwrites the item at the given index instead of inserting it there.
 *
 * Returns a copy of the `arr` array with the item at index `idx` overwritten with `item`. `arr` can be an array or an array
 * of arrays (as returned by `getLatLngs()` on a Polyline/Polygon), and `idx` can be a number or a tuple of two numbers as
 * returned by `L.DraggableLines.getInsertPosition()` (and as passed along with the drag events). This method can be used
 * to easily update a new point at the right position while the user is dragging:
 */
export declare function updateAtPosition<T, A extends T[] | T[][]>(arr: A, item: T, idx: number | [number, number]): A;
export declare function removeFromPosition<A extends any[] | any[][]>(arr: A, idx: number | [number, number]): A;
export declare function setPoint(layer: Polyline, point: LatLng, idx: number | [number, number], insert: boolean): void;
export declare function removePoint(layer: Polyline, idx: number | [number, number]): void;
export declare function getPlusIconPoint(map: Map, trackPoints: LatLng[], distance: number, atStart: boolean): L.LatLng;
