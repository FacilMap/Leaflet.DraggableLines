import { LatLng, LatLngExpression, LeafletEvent, Map, Marker, MarkerOptions, Polyline } from "leaflet";
import DraggableLinesHandler from "../handler";
export default abstract class DraggableLinesMarker extends Marker {
    _draggable: DraggableLinesHandler;
    _layer: Polyline;
    _isInsert: boolean;
    _dragIdx?: number | [number, number];
    _dragFrom?: LatLng;
    constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, isInsert: boolean, options?: MarkerOptions);
    onAdd(map: Map): this;
    onRemove(map: Map): this;
    abstract getIdx(): number | [number, number];
    handleDragStart(e: LeafletEvent): void;
    handleDrag(): void;
    handleDragEnd(): void;
}
