import { latLng, LatLngExpression, Marker, Polyline } from "leaflet";

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
        _draggableLines?: {
            dragMarkers: Marker[];
            plusMarkers: Marker[];
            zoomEndHandler: () => void;
            routePointIndexes: number[] | undefined;
        };
    }
}

Polyline.prototype.hasDraggableLinesRoutePoints = function() {
    return this.options.draggableLinesRoutePoints != null;
};

Polyline.prototype.getDraggableLinesRoutePoints = function() {
    return this.options.draggableLinesRoutePoints?.map((p) => latLng(p));
};

Polyline.prototype.setDraggableLinesRoutePoints = function(routePoints: LatLngExpression[] | undefined) {
    this.options.draggableLinesRoutePoints = routePoints;
    this.fire('draggableLines-setRoutePoints');
};

const setLatLngsBkp = Polyline.prototype.setLatLngs;
Polyline.prototype.setLatLngs = function(...args: any) {
    const result = setLatLngsBkp.apply(this, args);
    this.fire('draggableLines-setLatLngs');
    return result;
};