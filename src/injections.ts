import { Circle, CircleMarker, LatLng, latLng, latLngBounds, LatLngExpression, LineUtil, Polygon, Polyline, Rectangle } from "leaflet";
import { PolylineIndex, TempMarkerPoint, FlatOrNested } from "./injections-types.mjs";
import { approximate, getCircleCorners, getDistanceToCircle, getPlusIconPoint, getRectangleCornerPositions, getRouteInsertPosition, insertAtPosition, locateOnLine, moveRectangleCorner, removeFromPosition, updateAtPosition } from "./utils";

function extend<Obj extends {}>(
	obj: Obj,
	extensions: Record<any, ((this: Obj, ...args: any[]) => any) | undefined>,
	overrides: {
		[K in keyof Obj]?: Obj[K] extends (...args: any[]) => any ? (this: Obj, sup: (...args: Parameters<Obj[K]>) => ReturnType<Obj[K]>, ...args: Parameters<Obj[K]>) => ReturnType<Obj[K]> : never;
	} = {}
) {
	Object.assign(obj, extensions);

	for (const [k, func] of Object.entries(overrides) as any) {
		const bkp = (obj as any)[k];
		(obj as any)[k] = function(this: Obj, ...args: any[]) {
			return func.call(this, (...a: any) => bkp.apply(this, a), ...args);
		};
	}
}

function getRoutePointIndexes(layer: Polyline): number[] | number[][] | undefined {
	if (!layer._draggableLines || !layer["_map"]) {
		return undefined;
	} else if (!layer._draggableLines.routePointIndexes) {
		const routePoints = layer.getDraggableLinesRoutePoints();
		if (!routePoints) {
			return undefined;
		}
		const latlngs = layer.getLatLngs() as LatLng[] | LatLng[][];
		if (LineUtil.isFlat(latlngs) && LineUtil.isFlat(routePoints)) {
			layer._draggableLines.routePointIndexes = locateOnLine(layer["_map"], latlngs, routePoints).map((r) => r.idx);
		} else if (!LineUtil.isFlat(latlngs) && !LineUtil.isFlat(routePoints)) {
			layer._draggableLines.routePointIndexes = routePoints.map((p, i) => locateOnLine(layer["_map"], latlngs[i] ?? [], p).map((r) => r.idx));
		}
	}

	return layer._draggableLines.routePointIndexes;
}

extend(Polyline.prototype, {
	getDraggableLinesRoutePoints() {
		if (this.options.draggableLinesRoutePoints != null) {
			return this.options.draggableLinesRoutePoints?.map((p) => latLng(p));
		} else {
			return this.getLatLngs() as L.LatLng[] | L.LatLng[][];
		}
	},

	insertDraggableLinesRoutePoint(idx: PolylineIndex, position: LatLng) {
		const points = insertAtPosition(this.getDraggableLinesRoutePoints(), position, idx);
		if (this.options.draggableLinesRoutePoints) {
			this.setDraggableLinesRoutePoints(points as any);
		} else {
			this.setLatLngs(points);
		}
	},

	moveDraggableLinesRoutePoint(idx: PolylineIndex, newPosition: LatLng) {
		const points = updateAtPosition(this.getDraggableLinesRoutePoints(), newPosition, idx);
		if (this.options.draggableLinesRoutePoints) {
			this.setDraggableLinesRoutePoints(points as any);
		} else {
			this.setLatLngs(points);
		}
	},

	removeDraggableLinesRoutePoint(idx: PolylineIndex) {
		const points = removeFromPosition(this.getDraggableLinesRoutePoints(), idx);
		if (this.options.draggableLinesRoutePoints) {
			this.setDraggableLinesRoutePoints(points as any);
		} else {
			this.setLatLngs(points);
		}
	},

	getDraggableLinesTempMarkerPoint(mouseLatLng: LatLng): TempMarkerPoint | undefined {
		if (!this["_map"]) {
			return;
		}

		const latLngs = this.getLatLngs() as LatLng[] | LatLng[][];
		const loc = locateOnLine(this["_map"], latLngs, mouseLatLng, this instanceof Polygon);

		// In case of a polygon, we want to hide the marker while we are hovering the fill, we only want to show
		// it while we are hovering the outline.
		const distancePx = this["_map"].project(mouseLatLng).distanceTo(this["_map"].project(loc.closest));
		if (distancePx > this.options.weight! / 2 + 1)
			return undefined;

		if (this.options.draggableLinesRoutePoints) {
			const indexes = getRoutePointIndexes(this);
			if (indexes && !Array.isArray(loc.idx) && LineUtil.isFlat(latLngs) && !Array.isArray(indexes[0])) {
				return { closest: loc.closest, idx: getRouteInsertPosition(this["_map"], (indexes as number[]), latLngs, loc.idx) };
			} else if (Array.isArray(loc.idx) && !LineUtil.isFlat(latLngs) && Array.isArray(indexes?.[loc.idx[0]])) {
				return { closest: loc.closest, idx: getRouteInsertPosition(this["_map"], (indexes as number[][])[loc.idx[0]], latLngs[loc.idx[0]], loc.idx[1]) };
			} else {
				return undefined;
			}
		} else {
			return { closest: loc.closest, idx: Array.isArray(loc.idx) ? [loc.idx[0], Math.ceil(loc.idx[1])] : Math.ceil(loc.idx) };
		}
	},

	getDraggableLinesPlusMarkerPoints(): FlatOrNested<[start: L.LatLng | undefined, end: L.LatLng | undefined]> {
		if (!this["_map"]) {
			return [];
		}

		const latlngs = this.getLatLngs() as LatLng[] | LatLng[][];

		const trackPoints = LineUtil.isFlat(latlngs) ? [latlngs] : latlngs;

		const result = trackPoints.map((p): [L.LatLng | undefined, L.LatLng | undefined] => [
			getPlusIconPoint(this["_map"], p, 24 + this.options.weight! / 2, true),
			getPlusIconPoint(this["_map"], p, 24 + this.options.weight! / 2, false)
		]);

		return LineUtil.isFlat(latlngs) ? result[0] : result;
	},

	setDraggableLinesRoutePoints(routePoints: LatLngExpression[] | undefined) {
		this.options.draggableLinesRoutePoints = routePoints;
		this.fire('draggableLines-setRoutePoints');
	}
}, {
	setLatLngs(setLatLngs, ...args) {
		const result = setLatLngs(...args);
		this.fire('draggableLines-setLatLngs');
		return result;
	}
});

extend(Rectangle.prototype, {
	getDraggableLinesRoutePoints() {
		const bounds = this.getBounds();
		const b = { nw: bounds.getNorthWest(), ne: bounds.getNorthEast(), sw: bounds.getSouthWest(), se: bounds.getSouthEast() };
		return (this._draggableLinesBoundsOrder ?? ["sw", "nw", "ne", "se"]).map((k) => b[k]);
	},

	insertDraggableLinesRoutePoint: undefined,

	moveDraggableLinesRoutePoint(idx: PolylineIndex, newPosition: LatLng) {
		const i = (Array.isArray(idx) ? idx[1] : idx) as 0 | 1 | 2 | 3;

		const points = this.getDraggableLinesRoutePoints() as [LatLng, LatLng, LatLng, LatLng];
		const newPoints = moveRectangleCorner(points, i, newPosition);
		this.setBounds(latLngBounds(newPoints));
		this._draggableLinesBoundsOrder = getRectangleCornerPositions(newPoints);

		// // L.Rectangle extends L.Polygon. It contains 4 points, [0, 0] (SW), [0, 1] (NW), [0, 2] (NE), [0, 3] (SE).
		// const bounds = this.getBounds();
		// const [n, e, s, w] = [bounds.getNorth(), bounds.getEast(), bounds.getSouth(), bounds.getWest()];
		// let newI;
		// if (i === 0) { // south-west
		// 	// this._draggableLines!.dragMarkers[1].setLatLng([this._draggableLines!.dragMarkers[1].getLatLng().lat, point.lng]);
		// 	// this._draggableLines!.dragMarkers[3].setLatLng([newPosition.lat, this._draggableLines!.dragMarkers[3].getLatLng().lng]);
		// 	this.setBounds(latLngBounds(newPosition, [n, e]));
		// 	newI = newPosition.lat > n && newPosition.lng > e ? 2 : newPosition.lat > n ? 1 : newPosition.lng > e ? 3 : 0;
		// } else if (i === 1) { // north-west
		// 	// this._draggableLines!.dragMarkers[0].setLatLng([this._draggableLines!.dragMarkers[0].getLatLng().lat, newPosition.lng]);
		// 	// this._draggableLines!.dragMarkers[2].setLatLng([newPosition.lat, this._draggableLines!.dragMarkers[2].getLatLng().lng]);
		// 	this.setBounds(latLngBounds(newPosition, [s, e]));

		// 	newI = newPosition.lat < s && newPosition.lng > e ? 3 : newPosition.lat < s ? 0 : newPosition.lng > e ? 2 : 1;
		// } else if (i === 2) { // north-east
		// 	// this._draggableLines!.dragMarkers[1].setLatLng([newPosition.lat, this._draggableLines!.dragMarkers[1].getLatLng().lng]);
		// 	// this._draggableLines!.dragMarkers[3].setLatLng([this._draggableLines!.dragMarkers[3].getLatLng().lat, newPosition.lng]);
		// 	this.setBounds(latLngBounds(newPosition, [s, w]));

		// 	newI = newPosition.lat < s && newPosition.lng < w ? 0 : newPosition.lat < s ? 3 : newPosition.lng < w ? 1 : 2;
		// } else if (i === 3) { // south-east
		// 	// this._draggableLines!.dragMarkers[0].setLatLng([newPosition.lat, this._draggableLines!.dragMarkers[0].getLatLng().lng]);
		// 	// this._draggableLines!.dragMarkers[2].setLatLng([this._draggableLines!.dragMarkers[2].getLatLng().lat, newPosition.lng]);
		// 	this.setBounds(latLngBounds(newPosition, [n, w]));

		// 	newI = newPosition.lat > n && newPosition.lng < w ? 1 : newPosition.lat > n ? 2 : newPosition.lng < w ? 0 : 3;
		// }

		// if (newI !== i) {
		// 	return Array.isArray(idx) ? [idx[0], newI] : newI;
		// }
	},

	removeDraggableLinesRoutePoint: undefined
});

extend(CircleMarker.prototype, {
	getDraggableLinesRoutePoints() {
		if (!this["_map"]) {
			return [];
		}

		const centerPoint = this["_map"].latLngToLayerPoint(this.getLatLng());

		return [
			this.getLatLng(),
			this["_map"].layerPointToLatLng([centerPoint.x, centerPoint.y - this.getRadius()]),
			this["_map"].layerPointToLatLng([centerPoint.x + this.getRadius(), centerPoint.y]),
			this["_map"].layerPointToLatLng([centerPoint.x, centerPoint.y + this.getRadius()]),
			this["_map"].layerPointToLatLng([centerPoint.x - this.getRadius(), centerPoint.y])
		];
	},

	moveDraggableLinesRoutePoint(idx: PolylineIndex, newPosition: LatLng) {
		if (idx === 0) { // centre
			this.setLatLng(newPosition);
		} else { // radius
			const centerPoint = this["_map"].latLngToLayerPoint(this.getLatLng());
			const radiusPoint = this["_map"].latLngToLayerPoint(newPosition);
			this.setRadius(centerPoint.distanceTo(radiusPoint));
		}
	}
}, {
	setLatLng(setLatLng, ...args) {
		const result = setLatLng(...args);
		this.fire('draggableLines-setLatLngs');
		return result;
	},

	setRadius(setRadius, ...args) {
		const result = setRadius(...args);
		this.fire('draggableLines-setLatLngs');
		return result;
	}
});

extend(Circle.prototype, {
	getDraggableLinesRoutePoints() {
		if (!this["_map"]) {
			return [];
		}

		return [
			this.getLatLng(),
			...Object.values(getCircleCorners(this["_map"], this.getLatLng(), this.getRadius()))
		];
	},

	moveDraggableLinesRoutePoint(idx: PolylineIndex, newPosition: LatLng) {
		if (idx === 0) { // centre
			// layer._draggableLines!.dragMarkers[2].setLatLng([layer._draggableLines!.dragMarkers[2].getLatLng().lat, point.lng]);

			this.setLatLng(newPosition);
		} else if (this["_map"]) { // radius
			// L.Circle objects are not actual circles but ellipses. Their centre and radii are calculated using a complicated
			// formula that involves the map projection, so we (probably) cannot rearrange the formula to calculate the new
			// radius directly. Instead, we determine the new radius through trial an error. Tests have shown that with the
			// default projection, it usually takes 3–6 guesses, so performance is still acceptable.
			const newRadius = approximate(0, (radius) => getDistanceToCircle(this["_map"], this.getLatLng(), radius, newPosition));
			if (isFinite(newRadius)) {
				this.setRadius(newRadius);
			}
		}
	}
}, {
	setRadius(setRadius, ...args) {
		const result = setRadius(...args);
		this.fire('draggableLines-setLatLngs');
		return result;
	}
});