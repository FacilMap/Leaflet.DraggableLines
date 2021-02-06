import { Icon, LatLngExpression, Map, Polyline } from "leaflet";
import DraggableLinesHandler from "../handler";
import DraggableLinesMarker from "./marker";
export default class DraggableLinesDragMarker extends DraggableLinesMarker {
    _idx: number | [number, number];
    _removeOnClick: boolean;
    constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, idx: number | [number, number], icon: Icon, removeOnClick: boolean);
    onAdd(map: Map): this;
    getIdx(): import("../utils").PolylineIndex;
    handleClick(): void;
}
