import L, { Draggable, Evented, Handler, Icon, LatLng, Layer, LeafletMouseEvent, Map, Marker, Polyline, Util } from 'leaflet';
import GeometryUtil from 'leaflet-geometryutil';

interface DraggableLinesOptions {
    enableForLayer?: (layer: Layer) => boolean;
    icon?: Icon;
}

class DraggableLines extends Handler {

    options: DraggableLinesOptions;
    
    _active?: {
        layer: Polyline;
        marker: Marker;
        dragStart?: LatLng;
    };

    constructor(map: Map, options?: DraggableLinesOptions) {
        super(map);

        this.options = {
            enableForLayer: (layer) => (layer instanceof Polyline),
            icon: new Icon.Default() as Icon,
            ...options
        };
    }

    addHooks() {
        this._map.on("layeradd", this.handleLayerAdd);
        this._map.on("layerremove", this.handleLayerRemove);

        this._map.eachLayer((layer) => { this.handleLayerAdd({ layer }); });
    }

    removeHooks() {
        this._map.on("layeradd", this.handleLayerAdd);
        this._map.on("layerremove", this.handleLayerRemove);

        this._map.eachLayer((layer) => { this.handleLayerRemove({ layer }); });
    }

    handleLayerAdd = (e: { layer: Layer }) => {
        if (this.options.enableForLayer!(e.layer))
            this.enableForLayer(e.layer as Polyline);
    };

    handleLayerRemove = (e: { layer: Layer }) => {
        this.disableForLayer(e.layer as Polyline);
    };

    handleLayerMouseOver = (e: LeafletMouseEvent) => {
        if (Draggable._dragging)
            return;

        if (this._active)
            this.unsetActive();

        this.setActive(e.target as Polyline, e.latlng);
    };

    handleMapMouseMove = (e: LeafletMouseEvent) => {
        if (!this._active || Draggable._dragging)
            return;

        const latlng = this._map.mouseEventToLatLng(e.originalEvent);
        const closest = GeometryUtil.closest(this._map, this._active.layer, latlng)!;
        if (GeometryUtil.distance(this._map, latlng, closest) > this._active.layer.options.weight! / 2 + 1)
            this.unsetActive();
        else
            this._active.marker.setLatLng(closest);
    };

    handleMarkerDragStart = () => {
        if (!this._active)
            return;

        const latlng = this._active.marker.getLatLng();
        this._active!.dragStart = latlng;
        this.fire('dragstart', { layer: this._active.layer, from: latlng, to: latlng });
    };

    handleMarkerDrag = () => {
        if (!this._active)
            return;

        this.fire('drag', { layer: this._active.layer, from: this._active.dragStart, to: this._active.marker.getLatLng() });
    }

    handleMarkerDragEnd = () => {
        if (!this._active)
            return;

        const event = { layer: this._active.layer, from: this._active.dragStart, to: this._active.marker.getLatLng() }

        this.unsetActive();

        this.fire('dragend', event);
    };

    enableForLayer(layer: Polyline) {
        layer.on("mouseover", this.handleLayerMouseOver);
    }

    disableForLayer(layer: Polyline) {
        layer.off("mouseover", this.handleLayerMouseOver);
    }

    setActive(layer: Polyline, latlng: LatLng) {
        const icon = Util.create(this.options.icon!);
        const _setIconStyles = icon._setIconStyles;
        icon._setIconStyles = (img: HTMLImageElement, name: string) => {
            _setIconStyles.call(icon, img, name);

            const padding = layer.options.weight! * 2;
            img.style.padding = `${padding}px`;
            img.style.marginLeft = `${parseInt(img.style.marginLeft) - padding}px`;
            img.style.marginTop = `${parseInt(img.style.marginTop) - padding}px`;
        };

        const marker = new Marker(GeometryUtil.closest(this._map, layer, latlng)!, {
            icon,
            draggable: true
        }).addTo(this._map);

        this._active = {
            layer,
            marker
        };

        this._map.on('mousemove', this.handleMapMouseMove);
        marker.on('dragstart', this.handleMarkerDragStart);
        marker.on('drag', this.handleMarkerDrag);
        marker.on('dragend', this.handleMarkerDragEnd);
    }

    unsetActive() {
        this._active!.marker.removeFrom(this._map);
        delete this._active;
        this._map.off('mousemove', this.handleMapMouseMove);
    }

}

interface DraggableLines extends Evented {}
Object.assign(DraggableLines.prototype, Evented.prototype);

type DraggableLinesType = typeof DraggableLines;

declare module "leaflet" {
    let DraggableLines: DraggableLinesType;
}

L.DraggableLines = DraggableLines;