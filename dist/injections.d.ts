import { Marker } from "leaflet";
interface PolylineInfo {
    dragMarkers: Marker[];
    plusMarkers: Marker[];
    zoomEndHandler: () => void;
}
declare module "leaflet" {
    interface Polyline {
        hasDraggableLinesRoutePoints: () => boolean;
        getDraggableLinesRoutePoints: () => LatLng[] | undefined;
        setDraggableLinesRoutePoints: (routePoints: LatLngExpression[] | undefined) => void;
    }
    interface PolylineOptions {
        draggableLinesRoutePoints?: LatLngExpression[];
    }
    interface Polyline {
        _draggableLines?: PolylineInfo;
    }
}
export {};
