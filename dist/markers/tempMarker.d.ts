import { Icon, LatLng, LatLngExpression, LeafletMouseEvent, Map, Polyline } from "leaflet";
import DraggableLinesHandler from "../handler";
import DraggableLinesMarker from "./marker";
export default class DraggableLinesTempMarker extends DraggableLinesMarker {
    constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, icon?: Icon);
    onAdd(map: Map): this;
    onRemove(map: Map): this;
    show(): void;
    hide(): void;
    isHidden(): boolean;
    getIdx(): import("../utils").PolylineIndex;
    handleClick(): void;
    shouldRemove(latlng: LatLng): boolean;
    getRenderPoint(latlng: LatLng): LatLng | undefined;
    handleMapMouseMove(e: LeafletMouseEvent): void;
    handleMapMouseOver(e: Event): void;
}
