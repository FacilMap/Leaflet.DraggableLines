import { Icon, LatLng, LatLngExpression, LeafletMouseEvent, Map, Polyline } from "leaflet";
import DraggableLinesHandler from "../handler";
import DraggableLinesMarker from "./marker";
import DraggableLinesTempMarker from "./tempMarker";
export default class DraggableLinesPlusMarker extends DraggableLinesMarker {
    _idx: number | [number, number];
    _dragIcon: Icon;
    _tempMarker?: DraggableLinesPlusTempMarker;
    constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, idx: number | [number, number]);
    onAdd(map: Map): this;
    onRemove(map: Map): this;
    getIdx(): import("../utils").PolylineIndex;
    handleMouseOver(e: LeafletMouseEvent): void;
}
declare class DraggableLinesPlusTempMarker extends DraggableLinesTempMarker {
    _plusMarker: DraggableLinesPlusMarker;
    _idx: number | [number, number];
    constructor(draggable: DraggableLinesHandler, layer: Polyline, plusMarker: DraggableLinesPlusMarker, latlng: LatLngExpression, idx: number | [number, number], icon: Icon);
    getIdx(): import("../utils").PolylineIndex;
    shouldRemove(latlng: LatLng): boolean;
    getRenderPoint(): LatLng;
}
export {};
