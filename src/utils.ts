import * as L from "leaflet";

export type PolylineIndex = number | [number, number];

export type SupportedLayer = L.Polyline | L.Polygon;

export type LayerFilter<Args extends any[] = []> = boolean | SupportedLayer | SupportedLayer[] | ((layer: SupportedLayer, ...args: Args) => boolean);
export function matchesLayerFilter<Args extends any[]>(layer: SupportedLayer, filter: LayerFilter<Args>, ...args: NoInfer<Args>): boolean {
	if (typeof filter === "function")
		return filter(layer, ...args);
	else if (typeof filter === "boolean")
		return filter;
	else if (Array.isArray(filter))
		return filter.includes(layer);
	else
		return filter === layer;
}

/**
 * Finds the closest position to the given point(s) on the given polyline.
 * The position is given in the form of a fractional index. The index is a float somewhere between the integer index of point A
 * of the matching segment and the integer index of point B of the matching segment.
 * @param trackPoints The track points of the line. If this is an array of arrays, it is treated as a MultiLineString/Multipolygon.
 * @param points The point or points to locate on the line.
 * @param isPolygon If true, the line will be treated as a polygon, meaning that there is an additional segment between the last
 *     and the first trackpoint (which can result in an index somewhere between trackPoints.length - 1 and trackPoints.length).
 * @returns If points is an array of points, returns an array matching its length and order. Otherwise a single object is returned.
 *     If trackPoints is an array of lines, the resulting index will be a tuple where the first number is the index of the line
 *     and the second number is the fractional index on that line. Otherwise, the fractional index is returned as a number.
 */
export function locateOnLine(map: L.Map, trackPoints: L.LatLng[], point: L.LatLng, isPolygon?: boolean): { idx: number; closest: L.LatLng };
export function locateOnLine(map: L.Map, trackPoints: L.LatLng[], points: L.LatLng[], isPolygon?: boolean): Array<{ idx: number; closest: L.LatLng }>;
export function locateOnLine(map: L.Map, trackPoints: L.LatLng[][], point: L.LatLng, isPolygon?: boolean): { idx: [number, number]; closest: L.LatLng };
export function locateOnLine(map: L.Map, trackPoints: L.LatLng[][], points: L.LatLng[], isPolygon?: boolean): Array<{ idx: [number, number]; closest: L.LatLng }>;
export function locateOnLine(map: L.Map, trackPoints: L.LatLng[] | L.LatLng[][], point: L.LatLng, isPolygon?: boolean): { idx: number | [number, number]; closest: L.LatLng };
export function locateOnLine(map: L.Map, trackPoints: L.LatLng[] | L.LatLng[][], points: L.LatLng[], isPolygon?: boolean): Array<{ idx: number | [number, number]; closest: L.LatLng }>;
export function locateOnLine(map: L.Map, trackPoints: L.LatLng[] | L.LatLng[][], points: L.LatLng | L.LatLng[], isPolygon = false): { idx: number | [number, number]; closest: L.LatLng } | Array<{ idx: number | [number, number]; closest: L.LatLng }> {
	const isFlat = L.LineUtil.isFlat(trackPoints);
	let normalizedTrackPoints = isFlat ? [trackPoints] : trackPoints;

	if (!normalizedTrackPoints.some((t) => t.length >= 2)) {
		throw new Error("Line doesn't have any track points.");
	}

	if (isPolygon) {
		normalizedTrackPoints = normalizedTrackPoints.map((trackPoints) => [...trackPoints, trackPoints[0]]);
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

	const projectedPoints = (Array.isArray(points) ? points : [points]).map((point) => map.project(point, maxzoom));

	const data: Array<{ sqDist: number; idx: [number, number]; point: L.Point; pointA: L.Point; pointB: L.Point }> = [];

	for (let i = 0; i < normalizedTrackPoints.length; i++) {
		let pointA: L.Point;
		let pointB = map.project(normalizedTrackPoints[i][0], maxzoom);
		for (let j = 1; j < normalizedTrackPoints[i].length; j++) {
			pointA = pointB;
			pointB = map.project(normalizedTrackPoints[i][j], maxzoom);

			for (let k = 0; k < projectedPoints.length; k++) {
				const point = projectedPoints[k];
				const sqDist = L.LineUtil._sqClosestPointOnSegment(point, pointA, pointB, true);
				if (data[k] == null || sqDist < data[k].sqDist) {
					data[k] = { sqDist, idx: [i, j - 1], point, pointA, pointB };
				}
			}
		}
	}

	const results = data.map((d) => {
		const closest = L.LineUtil.closestPointOnSegment(d.point, d.pointA, d.pointB);
		const segDist = d.pointB.distanceTo(d.pointA);
		const idx: [number, number] = [d.idx[0], d.idx[1] + (segDist === 0 ? 0.5 : closest.distanceTo(d.pointA) / segDist)];
		return {
			idx: isFlat ? idx[1] : idx,
			closest: map.unproject(closest, maxzoom)
		};
	});

	return Array.isArray(points) ? results : results[0];
}

/**
 * Returns the index where a new route point should be inserted into the list of route points.
 * To be used for a line where the points returned by `getLatLngs()` (“track points”) are a route that has been calculated to be the best
 * connection between a set of waypoints (“route points”). Dragging starts on a segment between two track points, but should lead an additional
 * point in the set of route points rather than track points, so that the route can be recalculated.
 * @param map: The instance of `L.Map`.
 * @param routePoints: An array of coordinates that are the waypoints that are used as the basis for calculating the route. If an array
 *     of numbers is passed instead, these are assumed to be the already calculated fractional indexes for the route points as returned by
 *     `locateOnLine`.
 * @param trackPoints: An array of coordinates as returned by `layer.getLatLngs()`.
 * @param point: An instance of `L.LatLng` that represents the point on the line where dragging has started. If a number is passed instead,
 *     it is assumed to be the already calculated fractional index for the point as returned by `locateOnLine`.
 */
export function getRouteInsertPosition(map: L.Map, routePoints: L.LatLng[] | number[], trackPoints: L.LatLng[], point: L.LatLng | number): number {
	let pointIndex: number;
	let routePointIndexes: number[];
	if (typeof routePoints[0] === "number") {
		pointIndex = typeof point === "number" ? point : locateOnLine(map, trackPoints, point).idx;
		routePointIndexes = routePoints as number[];
	} else if (typeof point === "number") {
		pointIndex = point;
		routePointIndexes = locateOnLine(map, trackPoints, routePoints as L.LatLng[]).map((r) => r.idx);
	} else {
		[pointIndex, ...routePointIndexes] = locateOnLine(map, trackPoints, [point, ...routePoints as L.LatLng[]]).map((r) => r.idx);
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

export function setPoint(layer: L.Polyline | L.Polygon, point: L.LatLng, idx: number | [number, number], insert: boolean) {
	if (layer instanceof L.Rectangle) {
		// L.Rectangle extends L.Polygon. By default, it contains 4 points, [0, 0] (SW), [0, 1] (NW), [0, 2] (NE), [0, 3] (SE).
		// However, we manually create drag markers with indexes 0 (SW), 1 (NW), 2 (NE), 3 (SE) in DraggableLinesHandler.drawDragMarkers()
		// instead of relying on layer.getLatLngs().
		const i = Array.isArray(idx) ? idx[1] : idx;
		const bounds = layer.getBounds();
		if (i === 0) { // south-west
			layer.setBounds(L.latLngBounds([Math.min(point.lat, bounds.getNorth()), Math.min(point.lng, bounds.getEast())], bounds.getNorthEast()));
		} else if (i === 1) { // north-west
			layer.setBounds(L.latLngBounds([Math.max(point.lat, bounds.getSouth()), Math.min(point.lng, bounds.getEast())], bounds.getSouthEast()));
		} else if (i === 2) { // north-east
			layer.setBounds(L.latLngBounds([Math.max(point.lat, bounds.getSouth()), Math.max(point.lng, bounds.getWest())], bounds.getSouthWest()));
		} else if (i === 3) { // south-east
			layer.setBounds(L.latLngBounds([Math.min(point.lat, bounds.getNorth()), Math.max(point.lng, bounds.getWest())], bounds.getNorthWest()));
		}
		return;
	}

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

export function removePoint(layer: L.Polyline | L.Polygon, idx: number | [number, number]) {
	if (layer instanceof L.Rectangle) {
		return;
	}

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