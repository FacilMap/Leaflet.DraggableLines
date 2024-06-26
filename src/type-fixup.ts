import "leaflet";

declare module "leaflet" {
	interface Handler {
		_map: Map;
	}

	interface Polyline {
		_containsPoint(p: Point): boolean;

		// Cannot override this
		//getLatLngs(): LatLng[] | LatLng[][];
	}

	interface Marker {
		_icon: HTMLElement;
	}

	namespace Draggable {
		const _dragging: Draggable;
	}

	namespace LineUtil {
		function isFlat(latlngs: LatLngExpression[] | LatLngExpression[][]): latlngs is LatLngExpression[];
		function _sqClosestPointOnSegment(p: Point, p1: Point, p2: Point, sqDist?: false): Point;
		function _sqClosestPointOnSegment(p: Point, p1: Point, p2: Point, sqDist: true): number;
	}
}