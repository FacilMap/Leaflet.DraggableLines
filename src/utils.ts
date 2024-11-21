import * as L from "leaflet";
import { CornerPosition, PolylineIndex, SupportedLayer } from "./injections-types.mjs";

export type LayerFilter<L extends SupportedLayer = SupportedLayer, Args extends any[] = []> = boolean | L | L[] | ((layer: L, ...args: Args) => boolean);
export function matchesLayerFilter<L extends SupportedLayer, Args extends any[]>(layer: L, filter: LayerFilter<L, Args>, ...args: NoInfer<Args>): boolean {
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

export function getPlusIconPoint(map: L.Map, trackPoints: L.LatLng[], distance: number, atStart: boolean): L.LatLng | undefined {
	if (trackPoints.length < 2) {
		return undefined;
	}

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

/**
 * Reverses a formula through trial and error: Tries passing different input values to the given callback until its result
 * matches the desired output; then returns the input.
 * There **must** be a correlation between the input and output, meaning a larger input must always result in a larger output
 * and a smaller input must always result in a smaller output (or the opposite).
 * @param desiredOutput The desired result of getOutput(input)
 * @param getOutput The callback that calculates the result
 * @param precision The output will be considered equal to the desired output if their difference is less than this value
 * @returns The input that produces the desired output (within the given precision). If no input could be found, NaN is returned.
 */
export function approximate(desiredOutput: number, getOutput: (input: number) => number, precision = 1): number {
	let input1 = 1;
	let input2 = 2;
	let output1 = getOutput(input1);
	let output2 = getOutput(input2);
	while (true) {
		if (Math.abs(output2 - desiredOutput) < precision) {
			return input2;
		} else if (output1 === output2 || !isFinite(input2)) {
			return NaN;
		}
		[input1, input2] = [input2, input1 + (input2 - input1) * (desiredOutput - output1) / (output2 - output1)];
		[output1, output2] = [output2, getOutput(input2)];
	};
}

/**
 * Returns the centre point and vertical/horizontal radius of the ellipsis created by an L.Circle. Notably, the centre
 * point will usually not be exactly at the specified latlng.
 */
export function getCircleParams(map: L.Map, latlng: L.LatLng, radius: number): { center: L.Point; radius: L.Point } {
	const obj: any = {
		_latlng: latlng,
		_map: map,
		_mRadius: radius,
		_updateBounds: () => undefined
	};
	(L.Circle.prototype as any)._project.call(obj);
	return {
		center: obj._point,
		radius: L.point(obj._radius, obj._radiusY)
	};
}

/**
 * Returns the distance in pixels from the given point to the given L.Circle ellipsis. If the point is inside the circle,
 * a negative distance is returned.
 */
export function getDistanceToCircle(map: L.Map, latlng: L.LatLng, radius: number, point: L.LatLngExpression): number {
	const { center: { x: cx, y: cy }, radius: { x: rx, y: ry } } = getCircleParams(map, latlng, radius);
	const { x: px, y: py } = map.latLngToLayerPoint(point);
	// https://math.stackexchange.com/a/4636320
	return (
		Math.sqrt((px - cx)**2 + (py - cy)**2)
		- Math.sqrt(
			(rx**2 * ry**2 * ((px - cx)**2 + (py - cy)**2))
			/ ((px - cx)**2 * ry**2 + (py - cy)**2 * rx**2)
		)
	);
}

export function getCircleCorners(map: L.Map, latlng: L.LatLng, radius: number): Record<"top" | "right" | "bottom" | "left", L.LatLng> {
	const { x: px, y: py } = map.latLngToLayerPoint(latlng);
	const { center: { x: cx, y: cy }, radius: { x: rx, y: ry } } = getCircleParams(map, latlng, radius);
	const dx = Math.sqrt(1 - ((py - cy) / ry) ** 2) * rx;
	return {
		top: map.layerPointToLatLng([px, cy - ry]),
		right: map.layerPointToLatLng([cx + dx, py]),
		bottom: map.layerPointToLatLng([px, cy + ry]),
		left: map.layerPointToLatLng([cx - dx, py])
	};
}

// export function isClockwiseRectangle(corners: [L.LatLng, L.LatLng, L.LatLng, L.LatLng]): boolean {
// 	return (
// 		corners[1].lat > corners[0].lat && corners[2].lng > corners[1].lng // 0 is sw
// 		|| corners[1].lng > corners[0].lng && corners[2].lat < corners[1].lat // 0 is nw
// 		|| corners[1].lat < corners[0].lat && corners[2].lng < corners[1].lng // 0 is ne
// 		|| corners[1].lng < corners[0].lng && corners[2].lat > corners[1].lat // 0 is se
// 	);
// }

export function moveRectangleCorner(corners: [L.LatLng, L.LatLng, L.LatLng, L.LatLng], idx: 0 | 1 | 2 | 3, newPosition: L.LatLng): [L.LatLng, L.LatLng, L.LatLng, L.LatLng] {
	const newCorners = [...corners] as [L.LatLng, L.LatLng, L.LatLng, L.LatLng];

	newCorners[idx] = newPosition;

	let idxSameLat = (idx + 3) % 4;
	let idxSameLng = (idx + 1) % 4;
	if (corners[idx].lng === corners[idxSameLat].lng) {
		[idxSameLat, idxSameLng] = [idxSameLng, idxSameLat];
	}

	newCorners[idxSameLat] = L.latLng(newPosition.lat, newCorners[idxSameLat].lng);
	newCorners[idxSameLng] = L.latLng(newCorners[idxSameLng].lat, newPosition.lng);

	return newCorners;
}

export function getRectangleCornerPositions(corners: [L.LatLng, L.LatLng, L.LatLng, L.LatLng]): [CornerPosition, CornerPosition, CornerPosition, CornerPosition] {
	if (corners[0].lat < corners[1].lat) {
		return corners[1].lng < corners[2].lng ? ["sw", "nw", "ne", "se"] : ["se", "ne", "nw", "sw"];
	} else if (corners[0].lat > corners[1].lat) {
		return corners[1].lng < corners[2].lng ? ["nw", "sw", "se", "ne"] : ["ne", "se", "sw", "nw"];
	} else if (corners[0].lng < corners[1].lng) {
		return corners[2].lat < corners[1].lat ? ["nw", "ne", "se", "sw"] : ["sw", "se", "ne", "nw"];
	} else {
		return corners[2].lat < corners[1].lat ? ["ne", "nw", "sw", "se"] : ["se", "sw", "nw", "ne"];
	}
}