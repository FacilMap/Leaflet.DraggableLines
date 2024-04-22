import { DivIcon, DomEvent, Draggable, Icon, latLng, LatLng, LatLngExpression, LeafletMouseEvent, Map, MarkerOptions, Polygon, Polyline, Util } from "leaflet";
import DraggableLinesHandler from "../handler";
import { getInsertPosition, getRouteInsertPosition, setPoint } from "../utils";
import DraggableLinesMarker from "./marker";
import GeometryUtil from "leaflet-geometryutil";

function createIcon(layer: Polyline, baseIcon: Icon | DivIcon) {
	const icon = Util.create(baseIcon);
	const _setIconStyles = icon._setIconStyles;
	icon._setIconStyles = (img: HTMLImageElement, name: string) => {
		_setIconStyles.call(icon, img, name);

		// Create a padding around the marker to make sure that we don't accidentally trigger an unwanted mouseout
		// event while hovering around on the line.
		const padding = layer.options.weight! * 2;
		img.style.padding = `${padding}px`;
		img.style.boxSizing = "content-box";
		img.style.marginLeft = `${parseInt(img.style.marginLeft) - padding}px`;
		img.style.marginTop = `${parseInt(img.style.marginTop) - padding}px`;
	};
	return icon;
}

export default class DraggableLinesTempMarker extends DraggableLinesMarker {

	constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, options: MarkerOptions) {
		super(draggable, layer, latlng, true, {
			draggable: true,
			zIndexOffset: -100000,
			...options,
			icon: createIcon(layer, options.icon!)
		});
	}

	onAdd(map: Map) {
		super.onAdd(map);

		map.on("mousemove", this.handleMapMouseMove, this);
		DomEvent.on(map.getContainer(), "mouseover", this.handleMapMouseOver, this); // Bind manually since map.on("mouseover") does not receive bubbling events
		this.on('click', this.handleClick, this);

		this.fireMouseOver();

		return this;
	}

	onRemove(map: Map) {
		if (!this.isHidden())
			this.fireMouseOut();

		super.onRemove(map);

		map.off("mousemove", this.handleMapMouseMove, this);
		DomEvent.off(map.getContainer(), "mouseover", this.handleMapMouseOver, this);

		return this;
	}

	show() {
		this._icon.style.display = '';
		if (this._shadow)
			this._shadow.style.display = '';

		this.fireMouseOver();
	}

	hide() {
		this._icon.style.display = 'none';
		if (this._shadow)
			this._shadow.style.display = 'none';

		this.fireMouseOut();
	}

	isHidden() {
		return this._icon.style.display == 'none';
	}

	getIdx() {
		const latlng = this.getLatLng();
		if (this._layer.hasDraggableLinesRoutePoints())
			return getRouteInsertPosition(this._map, this._draggable._getRoutePointIndexes(this._layer)!, this._layer.getLatLngs() as any, latlng);
		else
			return getInsertPosition(this._map, this._layer.getLatLngs() as LatLng[] | LatLng[][], latlng, this._layer instanceof Polygon);
	}


	handleClick() {
		const latlng = this.getLatLng();
		const idx = this.getIdx();

		setPoint(this._layer, latlng, idx, true);

		this._draggable.fire('insert', { layer: this._layer, latlng, idx });
	}


	shouldRemove(latlng: LatLng) {
		return !this._layer._containsPoint(this._map.latLngToLayerPoint(latlng));
	}


	getRenderPoint(latlng: LatLng): LatLng | undefined {
		const closest = GeometryUtil.closest(this._map, this._layer, latlng)!;

		// In case of a polygon, we want to hide the marker while we are hovering the fill, we only want to show
		// it while we are hovering the outline.
		if (closest.distance > this._layer.options.weight! / 2 + 1)
			return undefined;

		return latLng(closest);
	}


	handleMapMouseMove(e: LeafletMouseEvent) {
		if (Draggable._dragging)
			return;

		if (this.shouldRemove(this._map.mouseEventToLatLng(e.originalEvent))) {
			this.remove();
			return;
		}

		const latlng = this.getRenderPoint(this._map.mouseEventToLatLng(e.originalEvent));

		if (latlng)
			this.setLatLng(latlng);

		const isVisible = !this.isHidden();
		if (latlng && !isVisible)
			this.show();
		else if (!latlng && isVisible)
			this.hide();
		else if (isVisible)
			this.fireMouseMove();
	};


	handleMapMouseOver(e: Event) {
		if (!Draggable._dragging && e.target !== this.getElement() && e.target !== this._layer.getElement())
			this.remove();
	};


	fireMouseOver() {
		this._draggable.fire("tempmouseover", { layer: this._layer, idx: this.getIdx(), marker: this, latlng: this.getLatLng() });
	}


	fireMouseMove() {
		this._draggable.fire("tempmousemove", { layer: this._layer, idx: this.getIdx(), marker: this, latlng: this.getLatLng() });
	}

	fireMouseOut() {
		this._draggable.fire("tempmouseout", { layer: this._layer, idx: this.getIdx(), marker: this, latlng: this.getLatLng() });
	}

}