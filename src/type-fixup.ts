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

    namespace Draggable {
        const _dragging: any;
    }

    namespace LineUtil {
        function isFlat(latlngs: LatLngExpression[] | LatLngExpression[][]): latlngs is LatLngExpression[];
    }
}