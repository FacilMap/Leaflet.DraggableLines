import { DivIcon, DomEvent, Draggable, Icon, LatLng, LatLngExpression, LeafletMouseEvent, Map, MarkerOptions, Polygon, Polyline, Util } from "leaflet";
import DraggableLinesHandler from "../handler";
import { locateOnLine, getRouteInsertPosition, setPoint, PolylineIndex } from "../utils";
import DraggableLinesMarker from "./marker";

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

		// Initialize the icon as hidden
		img.style.display = "none";
	};
	return icon;
}

type RenderPoint = { idx: PolylineIndex; closest: LatLng };

export default class DraggableLinesTempMarker extends DraggableLinesMarker {

	renderPoint?: RenderPoint;

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

		this.updateLatLng(this.getLatLng());

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
		if (!this.renderPoint) {
			throw new Error("renderPoint is not set");
		}

		return this.renderPoint.idx;
	}


	handleClick() {
		if (!this.renderPoint) {
			return;
		}

		const latlng = this.renderPoint.closest;
		const idx = this.renderPoint.idx;

		setPoint(this._layer, latlng, idx, true);

		this._draggable.fire('insert', { layer: this._layer, latlng, idx });
	}


	shouldRemove(mouseLatlng: LatLng) {
		return !this._layer._containsPoint(this._map.latLngToLayerPoint(mouseLatlng));
	}


	// Overridden by DraggableLinesPlusTempMarker
	getRenderPoint(mouseLatLng: LatLng): RenderPoint | undefined {
		const loc = locateOnLine(this._map, this._layer.getLatLngs() as LatLng[] | LatLng[][], mouseLatLng, this._layer instanceof Polygon);

		// In case of a polygon, we want to hide the marker while we are hovering the fill, we only want to show
		// it while we are hovering the outline.
		const distancePx = this._map.project(mouseLatLng).distanceTo(this._map.project(loc.closest));
		if (distancePx > this._layer.options.weight! / 2 + 1)
			return undefined;

		let idx: PolylineIndex = this._layer.hasDraggableLinesRoutePoints()
			? getRouteInsertPosition(this._map, this._draggable._getRoutePointIndexes(this._layer)!, this._layer.getLatLngs() as LatLng[], loc.idx as number)
			: Array.isArray(loc.idx) ? [loc.idx[0], Math.ceil(loc.idx[1])] : Math.ceil(loc.idx);

		return {
			closest: loc.closest,
			idx
		};
	}


	updateLatLng(mouseLatLng: LatLng) {
		if (Draggable._dragging)
			return false;

		if (this.shouldRemove(mouseLatLng)) {
			this.remove();
			return false;
		}

		this.renderPoint = this.getRenderPoint(mouseLatLng);

		if (this.renderPoint)
			this.setLatLng(this.renderPoint.closest);

		const isVisible = !this.isHidden();
		if (this.renderPoint && !isVisible)
			this.show();
		else if (!this.renderPoint && isVisible)
			this.hide();
		else if (isVisible)
			this.fireMouseMove();
	}


	handleMapMouseMove(e: LeafletMouseEvent) {
		this.updateLatLng(this._map.mouseEventToLatLng(e.originalEvent));
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
		this._draggable.fire("tempmouseout", { layer: this._layer, marker: this });
	}

}