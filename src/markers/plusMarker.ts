import { DomUtil, LatLng, LatLngExpression, LeafletMouseEvent, Map, MarkerOptions, Polyline } from "leaflet";
import DraggableLinesHandler from "../handler";
import DraggableLinesMarker from "./marker";
import DraggableLinesTempMarker from "./tempMarker";

export default class DraggableLinesPlusMarker extends DraggableLinesMarker {

	_idx: number | [number, number];
	_tempMarker?: DraggableLinesPlusTempMarker;
	_tempMarkerOptions: MarkerOptions;

	constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, idx: number | [number, number], options: MarkerOptions, tempMarkerOptions: MarkerOptions) {
		super(draggable, layer, latlng, true, {
			pane: "overlayPane",
			zIndexOffset: -200000,
			...options
		});

		this._idx = idx;
		this._tempMarkerOptions = tempMarkerOptions;
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

		this._tempMarker = new DraggableLinesPlusTempMarker(this._draggable, this._layer, this, e.latlng, this.getIdx(), this._tempMarkerOptions).addTo(this._map)
		this._draggable._tempMarker = this._tempMarker;
	}

}

export class DraggableLinesPlusTempMarker extends DraggableLinesTempMarker {

	_plusMarker: DraggableLinesPlusMarker;
	_idx: number | [number, number];

	constructor(draggable: DraggableLinesHandler, layer: Polyline, plusMarker: DraggableLinesPlusMarker, latlng: LatLngExpression, idx: number | [number, number], options: MarkerOptions) {
		super(draggable, layer, latlng, options);

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

	fireMouseOver() {
		this._draggable.fire("plusmouseover", { layer: this._layer, idx: this.getIdx(), marker: this, plusMarker: this._plusMarker });
	}


	fireMouseMove() {
	}

	fireMouseOut() {
		this._draggable.fire("plusmouseout", { layer: this._layer, idx: this.getIdx(), marker: this, plusMarker: this._plusMarker });
	}

}