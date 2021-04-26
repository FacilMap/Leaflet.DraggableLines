import { LatLng, LatLngExpression, LeafletMouseEvent, Map, MarkerOptions, Polyline } from "leaflet";
import DraggableLinesHandler from "../handler";
import DraggableLinesMarker from "./marker";
import DraggableLinesTempMarker from "./tempMarker";
export default class DraggableLinesPlusMarker extends DraggableLinesMarker {
    _idx: number | [number, number];
    _tempMarker?: DraggableLinesPlusTempMarker;
    _tempMarkerOptions: MarkerOptions;
    constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, idx: number | [number, number], options: MarkerOptions, tempMarkerOptions: MarkerOptions);
    onAdd(map: Map): this;
    onRemove(map: Map): this;
    getIdx(): number | [number, number];
    handleMouseOver(e: LeafletMouseEvent): void;
}
export declare class DraggableLinesPlusTempMarker extends DraggableLinesTempMarker {
    _plusMarker: DraggableLinesPlusMarker;
    _idx: number | [number, number];
    constructor(draggable: DraggableLinesHandler, layer: Polyline, plusMarker: DraggableLinesPlusMarker, latlng: LatLngExpression, idx: number | [number, number], options: MarkerOptions);
    getIdx(): number | [number, number];
    shouldRemove(latlng: LatLng): boolean;
    getRenderPoint(): LatLng;
    fireMouseOver(): void;
    fireMouseMove(): void;
    fireMouseOut(): void;
}
