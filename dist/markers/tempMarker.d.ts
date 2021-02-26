import { LatLng, LatLngExpression, LeafletMouseEvent, Map, MarkerOptions, Polyline } from "leaflet";
import DraggableLinesHandler from "../handler";
import DraggableLinesMarker from "./marker";
export default class DraggableLinesTempMarker extends DraggableLinesMarker {
    constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, options: MarkerOptions);
    onAdd(map: Map): this;
    onRemove(map: Map): this;
    show(): void;
    hide(): void;
    isHidden(): boolean;
    getIdx(): number | [number, number];
    handleClick(): void;
    shouldRemove(latlng: LatLng): boolean;
    getRenderPoint(latlng: LatLng): LatLng | undefined;
    handleMapMouseMove(e: LeafletMouseEvent): void;
    handleMapMouseOver(e: Event): void;
}
