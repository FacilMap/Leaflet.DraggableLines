// These should really go in other places, but due to https://github.com/microsoft/rushstack/issues/1709, we append
// this file manually to the declarations output during the vite build. Hence external import names need to be unique
// and we cannot import local modules (that will be part of the bundle).

export type PolylineIndex = number | [number, number];
export type FlatOrNested<T> = T | T[];

export type TempMarkerPoint = { idx: PolylineIndex; closest: L.LatLng };
export type PlusMarkerPoint = { idx: PolylineIndex; latLng: L.LatLng };

export type DraggableLinesData = {
	dragMarkers: LeafletDraggableLinesDragMarker[];
	plusMarkers: LeafletDraggableLinesPlusMarker[];
	zoomEndHandler: () => void;
	routePointIndexes: number[] | number[][] | undefined;
};

export interface SupportedLayer extends L.Layer {
	readonly getDraggableLinesRoutePoints: () => FlatOrNested<L.LatLng[]>;
	readonly insertDraggableLinesRoutePoint?: (idx: PolylineIndex, position: L.LatLng) => void;
	readonly moveDraggableLinesRoutePoint: (idx: PolylineIndex, newPosition: L.LatLng) => void;
	readonly removeDraggableLinesRoutePoint?: (idx: PolylineIndex) => void;
	readonly getDraggableLinesTempMarkerPoint?: (mouseLatLng: L.LatLng) => TempMarkerPoint | undefined;
	readonly getDraggableLinesPlusMarkerPoints?: () => FlatOrNested<[start: L.LatLng | undefined, end: L.LatLng | undefined]>;
	_draggableLines?: DraggableLinesData;
}

export type RequiredKeys<O, K extends keyof O> = O & Required<Pick<O, K>>;

export type CornerPosition = "nw" | "ne" | "sw" | "se";

declare module "leaflet" {
	interface Polyline extends SupportedLayer {
		setDraggableLinesRoutePoints: (routePoints: LatLngExpression[] | undefined) => void;
	}

	interface PolylineOptions {
		draggableLinesRoutePoints?: LatLngExpression[];
	}

	interface CircleMarker extends SupportedLayer {
	}

	interface Rectangle {
		_draggableLinesBoundsOrder?: [CornerPosition, CornerPosition, CornerPosition, CornerPosition];
	}
}