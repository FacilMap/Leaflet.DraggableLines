import { LatLngExpression, Map, MarkerOptions, Polyline } from "leaflet";
import DraggableLinesHandler from "../handler";
import DraggableLinesMarker from "./marker";
export default class DraggableLinesDragMarker extends DraggableLinesMarker {
    _idx: number | [number, number];
    _removeOnClick: boolean;
    constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, idx: number | [number, number], options: MarkerOptions, removeOnClick: boolean);
    onAdd(map: Map): this;
    getIdx(): import("../utils").PolylineIndex;
    handleClick(): void;
}
