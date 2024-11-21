import { LatLng, LatLngExpression, LeafletEvent, Map, Marker, MarkerOptions } from "leaflet";
import DraggableLinesHandler from "../handler";
import { PolylineIndex, RequiredKeys, SupportedLayer } from "../injections-types.mjs";

export default abstract class DraggableLinesMarker<
	IsInsert extends boolean,
	L extends (IsInsert extends true ? RequiredKeys<SupportedLayer, "insertDraggableLinesRoutePoint"> : SupportedLayer) = (IsInsert extends true ? RequiredKeys<SupportedLayer, "insertDraggableLinesRoutePoint"> : SupportedLayer)
> extends Marker {

	_draggable: DraggableLinesHandler;
	_layer: L;
	_isInsert: IsInsert;

	_dragIdx?: number | [number, number];
	_dragFrom?: LatLng;

	constructor(draggable: DraggableLinesHandler, layer: L, latlng: LatLngExpression, isInsert: IsInsert, options?: MarkerOptions) {
		super(latlng, options);

		this._draggable = draggable;
		this._layer = layer;
		this._isInsert = isInsert;
	}

	onAdd(map: Map) {
		super.onAdd(map);

		this.on("dragstart", this.handleDragStart, this);
		this.on("drag", this.handleDrag, this);
		this.on("dragend", this.handleDragEnd, this);

		return this;
	}

	onRemove(map: Map) {
		super.onRemove(map);

		return this;
	}

	abstract getIdx(): PolylineIndex;

	handleDragStart(e: LeafletEvent) {
		const latlng = this.getLatLng();
		this._dragFrom = latlng;
		this._dragIdx = this.getIdx();

		if (this._isInsert) {
			this._layer.insertDraggableLinesRoutePoint!(this._dragIdx, latlng);
			this._layer._draggableLines?.dragMarkers.push(this);
		} else {
			this._layer.moveDraggableLinesRoutePoint(this._dragIdx, latlng);
		}

		this._draggable.fire('dragstart', { layer: this._layer, from: latlng, to: latlng, idx: this._dragIdx, isNew: this._isInsert });
	};

	handleDrag() {
		const latlng = this.getLatLng();

		this._layer.moveDraggableLinesRoutePoint(this._dragIdx!, latlng);

		this._draggable.fire('drag', { layer: this._layer, from: this._dragFrom!, to: latlng, idx: this._dragIdx!, isNew: this._isInsert });
	}

	handleDragEnd() {
		this._layer.moveDraggableLinesRoutePoint(this._dragIdx!, this.getLatLng());

		this._draggable.fire('dragend', { layer: this._layer, from: this._dragFrom!, to: this.getLatLng(), idx: this._dragIdx!, isNew: this._isInsert });
	};

}
