import { Draggable, GeometryUtil, Icon, latLng, LatLng, LatLngExpression, LeafletMouseEvent, Map, Point, Polygon, Polyline, Util } from "leaflet";
import DraggableLinesHandler, { DraggableLinesHandlerOptions } from "../handler";
import { getInsertPosition, getRouteInsertPosition, setPoint } from "../utils";
import DraggableLinesMarker from "./marker";

function createIcon(layer: Polyline, baseIcon: Icon) {
    const icon = Util.create(baseIcon);
    const _setIconStyles = icon._setIconStyles;
    icon._setIconStyles = (img: HTMLImageElement, name: string) => {
        _setIconStyles.call(icon, img, name);

        // Create a padding around the marker to make sure that we don't accidentally trigger an unwanted mouseout
        // event while hovering around on the line.
        const padding = layer.options.weight! * 2;
        img.style.padding = `${padding}px`;
        img.style.marginLeft = `${parseInt(img.style.marginLeft) - padding}px`;
        img.style.marginTop = `${parseInt(img.style.marginTop) - padding}px`;
    };
    return icon;
}

export default class DraggableLinesTempMarker extends DraggableLinesMarker {

    constructor(draggable: DraggableLinesHandler, layer: Polyline, latlng: LatLngExpression, icon?: Icon) {
        super(draggable, layer, latlng, true, {
            icon: createIcon(layer, icon ?? draggable.options.dragIcon!),
            draggable: true,
            zIndexOffset: -100000
        });
    }

    onAdd(map: Map) {
        super.onAdd(map);

        map.on("mousemove", this.handleMapMouseMove, this);
        this.on('click', this.handleClick, this);

        return this;
    }

    onRemove(map: Map) {
        super.onRemove(map);

        map.off("mousemove", this.handleMapMouseMove, this);

        return this;
    }

    show() {
        this._icon.style.display = '';
        if (this._shadow)
            this._shadow.style.display = '';
    }

    hide() {
        this._icon.style.display = 'none';
        if (this._shadow)
            this._shadow.style.display = 'none';
    }

    isHidden() {
        return this._icon.style.display == 'none';
    }

    getIdx() {
        const latlng = this.getLatLng();
        if (this._layer.hasDraggableLinesRoutePoints())
            return getRouteInsertPosition(this._map, this._layer.getDraggableLinesRoutePoints()!, this._layer.getLatLngs() as any, latlng);
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
    };
}