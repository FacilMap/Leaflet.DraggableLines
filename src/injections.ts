import { latLng, LatLngExpression, Marker, Polyline } from "leaflet";

Polyline.prototype.hasDraggableLayersRoutePoints = function() {
    return this.options.draggableLayersRoutePoints != null;
};

Polyline.prototype.getDraggableLayersRoutePoints = function() {
    return this.options.draggableLayersRoutePoints?.map((p) => latLng(p));
};

Polyline.prototype.setDraggableLayersRoutePoints = function(routePoints: LatLngExpression[] | undefined) {
    this.options.draggableLayersRoutePoints = routePoints;
    this.fire('draggableLayers-setRoutePoints');
};

const setLatLngsBkp = Polyline.prototype.setLatLngs;
Polyline.prototype.setLatLngs = function(...args: any) {
    const result = setLatLngsBkp.apply(this, args);
    this.fire('draggableLayers-setLatLngs');
    return result;
};

interface PolylineInfo {
    markers: Marker[];
}

interface MarkerInfo {
    idx: number | [number, number];
}

declare module "leaflet" {
    interface Polyline {
        hasDraggableLayersRoutePoints: () => boolean;
        getDraggableLayersRoutePoints: () => LatLng[] | undefined;
        setDraggableLayersRoutePoints: (routePoints: LatLngExpression[] | undefined) => void;
    }

    interface PolylineOptions {
        draggableLayersRoutePoints?: LatLngExpression[];
    }

    interface Polyline {
        _draggableLayers?: PolylineInfo;
    }

    interface Marker {
        _draggableLayers?: MarkerInfo;
    }
}