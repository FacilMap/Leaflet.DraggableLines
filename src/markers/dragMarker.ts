import { Icon, LatLng, LatLngExpression, Map, MarkerOptions, Polygon, Polyline } from "leaflet";
import DraggableLinesHandler from "../handler";
import { removePoint } from "../utils";
import DraggableLinesMarker from "./marker";

export default class DraggableLinesDragMarker extends DraggableLinesMarker {

    _idx: number | [number, number];
    _removeOnClick: boolean;

    constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, idx: number | [number, number], options: MarkerOptions, removeOnClick: boolean) {
        super(draggable, layer, latlng, false, {
            draggable: true,
            ...options
        });

        this._idx = idx;
        this._removeOnClick = removeOnClick;
    }

    onAdd(map: Map) {
        super.onAdd(map);

        const latlngs = this._layer.getDraggableLinesRoutePoints() || (this._layer.getLatLngs() as LatLng[] | LatLng[][]);
        const points = Array.isArray(this._idx) ? (latlngs as LatLng[][])[this._idx[0]] : (latlngs as LatLng[]);

        if (this._removeOnClick && points.length > (this._layer instanceof Polygon ? 3 : 2)) {
            this.on('click', this.handleClick);
        }

        return this;
    }

    getIdx() {
        return this._idx;
    }

    handleClick() {
        const idx = this.getIdx();

        removePoint(this._layer, idx);
        // Markers are redrawn automatically because we update the line points

        this._draggable.fire('remove', { layer: this._layer, idx });
    }

}
