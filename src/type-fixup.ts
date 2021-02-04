import "leaflet";

declare module "leaflet" {
    interface Handler {
        _map: Map;
    }

    namespace Draggable {
        const _dragging: any;
    }
}