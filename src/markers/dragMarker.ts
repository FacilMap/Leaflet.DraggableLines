import { Draggable, LatLng, LatLngExpression, Map, MarkerOptions, Polygon } from "leaflet";
import DraggableLinesHandler from "../handler";
import DraggableLinesMarker from "./marker";
import { SupportedLayer } from "../injections-types.mjs";

export default class DraggableLinesDragMarker extends DraggableLinesMarker<false> {

	_idx: number | [number, number];
	_removeOnClick: boolean;
	_over = false;

	constructor(draggable: DraggableLinesHandler, layer: SupportedLayer, latlng: LatLngExpression, idx: number | [number, number], options: MarkerOptions, removeOnClick: boolean) {
		super(draggable, layer, latlng, false, {
			draggable: true,
			...options
		});

		this._idx = idx;
		this._removeOnClick = removeOnClick;
	}

	onAdd(map: Map) {
		super.onAdd(map);

		if (this._removeOnClick && this._layer.removeDraggableLinesRoutePoint) {
			const latlngs = this._layer.getDraggableLinesRoutePoints();
			const points = Array.isArray(this._idx) ? (latlngs as LatLng[][])[this._idx[0]] : (latlngs as LatLng[]);
			if (points.length > (this._layer instanceof Polygon ? 3 : 2)) {
				this.on('click', this.handleClick);
			}
		}

		this.on("mouseover", () => {
			if (Draggable._dragging)
				return;

			this._over = true;
			this._draggable.fire("dragmouseover", { layer: this._layer, idx: this._idx, marker: this });
		});
		this.on("mouseout", () => {
			if (Draggable._dragging)
				return;

			this._over = false;
			this._draggable.fire("dragmouseout", { layer: this._layer, idx: this._idx, marker: this });
		});

		return this;
	}

	onRemove(map: Map) {
		super.onRemove(map);

		if (this._over)
			this._draggable.fire("dragmouseout", { layer: this._layer, idx: this._idx, marker: this });

		return this;
	}

	getIdx() {
		return this._idx;
	}

	handleClick() {
		const idx = this.getIdx();

		this._layer.removeDraggableLinesRoutePoint!(idx);
		// Markers are redrawn automatically because we update the line points

		this._draggable.fire('remove', { layer: this._layer, idx });
	}

}

declare global {
	// For usage in injection-types.mts
	type LeafletDraggableLinesDragMarker = DraggableLinesDragMarker;
}