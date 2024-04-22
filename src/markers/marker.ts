import { LatLng, LatLngExpression, LeafletEvent, Map, Marker, MarkerOptions, Polyline } from "leaflet";
import DraggableLinesHandler from "../handler";
import { setPoint } from "../utils";

export default abstract class DraggableLinesMarker extends Marker {

	_draggable: DraggableLinesHandler;
	_layer: Polyline;
	_isInsert: boolean;

	_dragIdx?: number | [number, number];
	_dragFrom?: LatLng;

	constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, isInsert: boolean, options?: MarkerOptions) {
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

	abstract getIdx(): number | [number, number];

	handleDragStart(e: LeafletEvent) {
		const latlng = this.getLatLng();
		this._dragFrom = latlng;
		this._dragIdx = this.getIdx();

		setPoint(this._layer, latlng, this._dragIdx, this._isInsert);

		this._draggable.fire('dragstart', { layer: this._layer, from: latlng, to: latlng, idx: this._dragIdx, isNew: this._isInsert });
	};

	handleDrag() {
		const latlng = this.getLatLng();

		setPoint(this._layer, latlng, this._dragIdx!, false);

		this._draggable.fire('drag', { layer: this._layer, from: this._dragFrom!, to: latlng, idx: this._dragIdx!, isNew: this._isInsert });
	}

	handleDragEnd() {
		const event = { layer: this._layer, from: this._dragFrom!, to: this.getLatLng(), idx: this._dragIdx!, isNew: this._isInsert };

		Promise.resolve().then(() => {
			// Set points on the next tick so that Dragging._draggable is unset and DraggableLinesHandler reacts to the route point update
			// and rerenders the markers.
			setPoint(event.layer, event.to, event.idx, false);
			this._draggable.fire('dragend', event);
		});
	};

}
