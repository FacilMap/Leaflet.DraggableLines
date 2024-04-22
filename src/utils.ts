import * as L from "leaflet";

export type PolylineIndex = number | [number, number];

/**
 * Returns indexes that indicate the positions of each of the given points on the given polyline.
 * For each point, calculates the segment that the point is closest to. The returned number is a fractional value in
 * between the indexes of the two segment points in the trackPoints sub-array, depending on where exactly the given point
 * lies on the segment.
 * The resulting array has the same length and order as the points array. Each value is a tuple of the index in the
 * trackPoints array and the fractional index in the trackPoint sub-array.
 */
export function _locateOnLine(map: L.Map, trackPoints: L.LatLng[][], points: L.LatLng[]): Array<[number, number]> {
	if (!trackPoints.some((t) => t.length >= 2)) {
		return points.map(() => [0, 0]);
	}

	// Inspired by L.GeometryUtil.locateOnLine() (https://github.com/makinacorpus/Leaflet.GeometryUtil/blob/75fc60255cc973c931c069f281b6514a8904ee21/src/leaflet.geometryutil.js#L567)
	// but much more performant for our use case:
	// - we don't need precise line distances, just the index of the closest segment and the fraction on it
	// - we need to calculate the index for multiple points on multiple lines, which is more performant if we need
	//   to project the points just once.

	let maxzoom = map.getMaxZoom();
	if (maxzoom === Infinity) {
		maxzoom = map.getZoom();
	}

	const projectedPoints = points.map((point) => map.project(point, maxzoom));

	const results: Array<{ sqDist: number; idx: [number, number]; point: L.Point; pointA: L.Point; pointB: L.Point }> = [];

	for (let i = 0; i < trackPoints.length; i++) {
		let pointA: L.Point;
		let pointB = map.project(trackPoints[i][0], maxzoom);
		for (let j = 1; j < trackPoints[i].length; j++) {
			pointA = pointB;
			pointB = map.project(trackPoints[i][j], maxzoom);

			for (let k = 0; k < projectedPoints.length; k++) {
				const point = projectedPoints[k];
				const sqDist = L.LineUtil._sqClosestPointOnSegment(point, pointA, pointB, true);
				if (results[k] == null || sqDist < results[k].sqDist) {
					results[k] = { sqDist, idx: [i, j - 1], point, pointA, pointB };
				}
			}
		}
	}

	return results.map((result) => {
		const closest = L.LineUtil.closestPointOnSegment(result.point, result.pointA, result.pointB);
		return [result.idx[0], result.idx[1] + (closest.x - result.pointA.x) / (result.pointB.x - result.pointA.x)]; // Since closest is on line between pointA and pointB, the ratio of x and y are the same
	});
}

/**
 * If `points` is the array of coordinates or array of arrays of coordinates that a Polyline/Polygon consists of and `point` is the
 * coordinates where the dragging starts, this method returns the index in the `points` array where the new point should be inserted.
 * The returned value is a number or a tuple of two numbers, depending on whether `points` is an array or an array of arrays.
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
export function getInsertPosition(map: L.Map, points: L.LatLng[], point: L.LatLng, isPolygon?: boolean): number;
export function getInsertPosition(map: L.Map, points: L.LatLng[][], point: L.LatLng, isPolygon?: boolean): [number, number];
export function getInsertPosition(map: L.Map, points: L.LatLng[] | L.LatLng[][], point: L.LatLng, isPolygon?: boolean): number | [number, number];
export function getInsertPosition(map: L.Map, points: L.LatLng[] | L.LatLng[][], point: L.LatLng, isPolygon = false): number | [number, number] {
	if (L.LineUtil.isFlat(points)) {
		return Math.ceil(_locateOnLine(map, [isPolygon ? [...points, points[0]] : points], [point])[0][1]);
	} else {
		const res = _locateOnLine(map, isPolygon ? points.map((p) => [...p, p[0]]) : points, [point])[0];
		return [res[0], Math.ceil(res[1])];
	}
}


/**
 * Similar to `getInsertPosition`, but for a line where the points returned by `getLatLngs()` (“track points”) are a route that has been
 * calculated to be the best connection between a set of waypoints (“route points”). Dragging starts on a segment between two track
 * points, but should lead an additional point in the set of route points rather than track points, so that the route can be recalculated.
 * This method returns the index where the new route point should be inserted into the array of route points.
 * @param map: The instance of `L.Map`.
 * @param routePoints: An array of coordinates that are the waypoints that are used as the basis for calculating the route. If an array
 *     of numbers is passed instead, these are assumed to be the already calculated indexes for the route points.
 * @param trackPoints: An array of coordinates as returned by `layer.getLatLngs()`.
 * @param point: An instance of `L.LatLng` that represents the point on the line where dragging has started.
 */
export function getRouteInsertPosition(map: L.Map, routePoints: L.LatLng[] | number[], trackPoints: L.LatLng[], point: L.LatLng): number {
	let pointIndex: number;
	let routePointIndexes: number[];
	if (typeof routePoints[0] === "number") {
		pointIndex = _locateOnLine(map, [trackPoints], [point])[0][1];
		routePointIndexes = routePoints as number[];
	} else {
		[pointIndex, ...routePointIndexes] = _locateOnLine(map, [trackPoints], [point, ...routePoints as L.LatLng[]]).map((r) => r[1]);
	}

	for (let i = 1; i < routePointIndexes.length; i++) {
		if (routePointIndexes[i] > pointIndex)
			return i;
	}
	return routePointIndexes.length - 1;
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

export function setPoint(layer: L.Polyline, point: L.LatLng, idx: number | [number, number], insert: boolean) {
	const hasRoutePoints = layer.hasDraggableLinesRoutePoints();

	let points = hasRoutePoints ? layer.getDraggableLinesRoutePoints()! : layer.getLatLngs() as L.LatLng[] | L.LatLng[][];

	if (insert)
		points = insertAtPosition(points, point, idx);
	else
		points = updateAtPosition(points, point, idx);

	if (hasRoutePoints)
		layer.setDraggableLinesRoutePoints(points as any);
	else
		layer.setLatLngs(points);
}

export function removePoint(layer: L.Polyline, idx: number | [number, number]) {
	const hasRoutePoints = layer.hasDraggableLinesRoutePoints();

	let points = hasRoutePoints ? layer.getDraggableLinesRoutePoints()! : layer.getLatLngs() as L.LatLng[] | L.LatLng[][];
	points = removeFromPosition(points, idx);

	if (hasRoutePoints)
		layer.setDraggableLinesRoutePoints(points as any);
	else
		layer.setLatLngs(points);
}

export function getPlusIconPoint(map: L.Map, trackPoints: L.LatLng[], distance: number, atStart: boolean) {
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