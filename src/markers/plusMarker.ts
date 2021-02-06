import { DomUtil, Icon, LatLng, LatLngExpression, LeafletMouseEvent, Map, Point, Polyline } from "leaflet";
import DraggableLinesHandler, { DraggableLinesHandlerOptions } from "../handler";
import { setPoint } from "../utils";
import DraggableLinesMarker from "./marker";
import DraggableLinesTempMarker from "./tempMarker";

function isStart(idx: number | [number, number]): boolean {
    return (Array.isArray(idx) ? idx[1] : idx) == 0;
}

export default class DraggableLinesPlusMarker extends DraggableLinesMarker {

    _idx: number | [number, number];
    _dragIcon: Icon;
    _tempMarker?: DraggableLinesPlusTempMarker;

    constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, idx: number | [number, number]) {
        super(draggable, layer, latlng, true, {
            icon: draggable.options.plusIcon,
            pane: "overlayPane",
            zIndexOffset: -200000
        });

        this._idx = idx;
        this._dragIcon = isStart(idx) ? draggable.options.startIcon! : draggable.options.endIcon!;
    }

    onAdd(map: Map) {
        super.onAdd(map);

        this.on('mouseover', this.handleMouseOver, this);

        return this;
    }

    onRemove(map: Map) {
        super.onRemove(map);

        if (this._tempMarker) {
            this._tempMarker.remove();
            delete this._tempMarker;
        }
        
        return this;
    }

    getIdx() {
        return this._idx;
    }

    handleMouseOver(e: LeafletMouseEvent) {
        this._draggable.removeTempMarker();

        this._tempMarker = new DraggableLinesPlusTempMarker(this._draggable, this._layer, this, e.latlng, this.getIdx(), this._dragIcon).addTo(this._map)
        this._draggable._tempMarker = this._tempMarker;
    }

}

class DraggableLinesPlusTempMarker extends DraggableLinesTempMarker {
    
    _plusMarker: DraggableLinesPlusMarker;
    _idx: number | [number, number];

    constructor(draggable: DraggableLinesHandler, layer: Polyline, plusMarker: DraggableLinesPlusMarker, latlng: LatLngExpression, idx: number | [number, number], icon: Icon) {
        super(draggable, layer, latlng, icon);

        this._plusMarker = plusMarker;
        this._idx = idx;
    }

    getIdx() {
        return this._idx;
    }

    shouldRemove(latlng: LatLng) {
        const layerPoint = this._map.latLngToLayerPoint(latlng);
        const position = DomUtil.getPosition(this._plusMarker._icon);
        return Math.abs(position.y - layerPoint.y) > this._plusMarker._icon.offsetHeight / 2
            || Math.abs(position.x - layerPoint.x) > this._plusMarker._icon.offsetWidth / 2;
    }

    getRenderPoint() {
        return this.getLatLng();
    }

}