import L, { Draggable, Evented, Handler, Icon, LatLng, LatLngExpression, Layer, LeafletEvent, LeafletMouseEvent, LineUtil, Map, Marker, Polygon, Polyline, Util } from 'leaflet';
import GeometryUtil from 'leaflet-geometryutil';
import { defaultIcon, endIcon, startIcon } from './icons';
import { getInsertPosition, getRouteInsertPosition, insertAtPosition, updateAtPosition, setPoint, removePoint } from './utils';

interface DraggableLinesOptions {
    enableForLayer?: (layer: Polyline) => boolean;
    icon?: Icon;
    startIcon?: Icon;
    endIcon?: Icon;
    dragIcon?: Icon;
    allowExtendingLine?: boolean;
    removeOnClick?: boolean;
}

class DraggableLines extends Handler {

    options: DraggableLinesOptions;
    
    _active?: {
        layer: Polyline;
        tempMarker?: Marker;
        dragMarker?: Marker;
        dragFrom?: LatLng;
        dragIdx?: number | [number, number];
        dragIsNew?: boolean;
    };

    constructor(map: Map, options?: DraggableLinesOptions) {
        super(map);

        this.options = {
            enableForLayer: (layer) => layer.options.interactive!,
            startIcon,
            endIcon,
            icon: defaultIcon,
            dragIcon: defaultIcon,
            allowExtendingLine: true,
            removeOnClick: true,
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
        if (e.layer instanceof Polyline && this.options.enableForLayer!(e.layer))
            this.enableForLayer(e.layer as Polyline);
    };

    handleLayerRemove = (e: { layer: Layer }) => {
        if (e.layer instanceof Polyline)
            this.disableForLayer(e.layer as Polyline);
    };

    handleLayerMouseOver = (e: LeafletMouseEvent) => {
        if (Draggable._dragging)
            return;

        if (this._active)
            this.removeTempMarker();

        this.addTempMarker(e.target as Polyline, e.latlng);
    };

    handleMapMouseMove = (e: LeafletMouseEvent) => {
        if (!this._active?.tempMarker || Draggable._dragging)
            return;

        if (!this._active.layer._containsPoint(this._map.mouseEventToLayerPoint(e.originalEvent))) {
            this.removeTempMarker();
            return;
        }

        const latlng = this._map.mouseEventToLatLng(e.originalEvent);
        const closest = GeometryUtil.closest(this._map, this._active.layer, latlng)!;
        this._active.tempMarker.setLatLng(closest);

        // In case of a polygon, we want to hide the marker while we are hovering the fill, we only want to show
        // it while we are hovering the outline.
        const shouldBeVisible = closest.distance <= this._active.layer.options.weight! / 2 + 1;
        const isVisible = this._map.hasLayer(this._active.tempMarker);
        if (shouldBeVisible && !isVisible)
            this._map.addLayer(this._active.tempMarker);
        else if (!shouldBeVisible && isVisible)
            this._map.removeLayer(this._active.tempMarker);
    };

    handleMarkerDragStart = (e: LeafletEvent) => {
        if (!this._active)
            return;
        
        const marker = e.target as Marker;

        this._active.dragMarker = marker;
        const latlng = marker.getLatLng();
        this._active.dragFrom = latlng;
        this._active.dragIsNew = marker._draggableLayers?.idx == null;

        if (marker._draggableLayers?.idx != null) {
            this._active.dragIdx = marker._draggableLayers.idx;
            setPoint(this._active.layer, latlng, marker._draggableLayers.idx, false);
        } else {
            if (this._active.layer.hasDraggableLayersRoutePoints())
                this._active.dragIdx = getRouteInsertPosition(this._map, this._active.layer.getDraggableLayersRoutePoints()!, this._active.layer.getLatLngs() as any, latlng);
            else
                this._active.dragIdx = getInsertPosition(this._map, this._active.layer.getLatLngs() as any, latlng, this.options.allowExtendingLine, this._active.layer instanceof Polygon);
            setPoint(this._active.layer, latlng, this._active.dragIdx, true);
        }

        this.fire('dragstart', { layer: this._active.layer, from: this._active.dragFrom!, to: this._active.dragFrom!, idx: this._active.dragIdx!, isNew: this._active.dragIsNew! });
    };

    handleMarkerDrag = () => {
        if (!this._active)
            return;

        const latlng = this._active.dragMarker!.getLatLng();

        setPoint(this._active.layer, latlng, this._active.dragIdx!, false);

        this.fire('drag', { layer: this._active.layer, from: this._active.dragFrom!, to: latlng, idx: this._active.dragIdx!, isNew: this._active.dragIsNew! });
    }

    handleMarkerDragEnd = () => {
        if (!this._active)
            return;

        const event = { layer: this._active.layer, from: this._active.dragFrom!, to: this._active.dragMarker!.getLatLng(), idx: this._active.dragIdx!, isNew: this._active.dragIsNew! };

        this.removeTempMarker();
        this.drawMarkers(event.layer);

        this.fire('dragend', event);
    };

    handleLayerSetLatLngs = (e: LeafletEvent) => {
        const layer = e.target as Polyline;
        if (!Draggable._dragging && layer._draggableLayers)
            this.drawMarkers(layer);
    };

    drawMarkers(layer: Polyline) {
        if (!layer._draggableLayers)
            return;

        this.removeMarkers(layer);
        
        const latlngs = layer.getDraggableLayersRoutePoints() || (layer.getLatLngs() as LatLng[] | LatLng[][]);
        const routePoints = LineUtil.isFlat(latlngs) ? [latlngs] : latlngs;
        const isFlat = LineUtil.isFlat(latlngs);
        for (let i = 0; i < routePoints.length; i++) {
            for (let j = 0; j < routePoints[i].length; j++) {
                let icon = this.options.icon!;
                if (!(layer instanceof Polygon))
                    icon = j == 0 ? this.options.startIcon! : j == routePoints[i].length - 1 ? this.options.endIcon! : icon;

                const idx = isFlat ? j : [i, j] as [number, number];

                const marker = L.marker(routePoints[i][j], { icon, draggable: true }).addTo(this._map);
                marker._draggableLayers = { idx };
                
                marker.on('dragstart', (e) => {
                    this._active = { layer };
                    this.handleMarkerDragStart(e);
                });
                marker.on('drag', this.handleMarkerDrag);
                marker.on('dragend', this.handleMarkerDragEnd);

                if (this.options.removeOnClick && routePoints[i].length > (layer instanceof Polygon ? 3 : 2)) {
                    marker.on('click', () => {
                        removePoint(layer, idx);
                        // Markers are redrawn automatically because we update the line points

                        this.fire('remove', { layer, idx });
                    });
                }

                layer._draggableLayers.markers.push(marker);
            }
        }
    }

    removeMarkers(layer: Polyline) {
        if (!layer._draggableLayers)
            return;
        
        for (const marker of layer._draggableLayers.markers) {
            marker.removeFrom(this._map);
        }
        layer._draggableLayers.markers = [];
    }

    enableForLayer(layer: Polyline) {
        if (layer._draggableLayers)
            return;

        layer._draggableLayers = { markers: [] };
        layer.on("mouseover", this.handleLayerMouseOver);
        layer.on("draggableLayers-setLatLngs", this.handleLayerSetLatLngs);
        layer.on("draggableLayers-setRoutePoints", this.handleLayerSetLatLngs);
        this.drawMarkers(layer);
    }

    disableForLayer(layer: Polyline) {
        layer.off("mouseover", this.handleLayerMouseOver);
        layer.off("draggableLayers-setLatLngs", this.handleLayerSetLatLngs);
        layer.off("draggableLayers-setRoutePoints", this.handleLayerSetLatLngs);
        this.removeMarkers(layer);
        delete layer._draggableLayers;
    }

    addTempMarker(layer: Polyline, latlng: LatLng) {
        const icon = Util.create(this.options.dragIcon!);
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

        const marker = new Marker(GeometryUtil.closest(this._map, layer, latlng)!, {
            icon,
            draggable: true,
            zIndexOffset: -100000
        }).addTo(this._map);

        this._active = {
            layer,
            tempMarker: marker
        };

        this._map.on('mousemove', this.handleMapMouseMove);
        marker.on('mouseout', () => {
            if (!Draggable._dragging)
                this.removeTempMarker();
        });
        marker.on('dragstart', this.handleMarkerDragStart);
        marker.on('drag', this.handleMarkerDrag);
        marker.on('dragend', this.handleMarkerDragEnd);
        marker.on('click', () => {
            const latlng = marker.getLatLng();
            let idx;
            if (layer.hasDraggableLayersRoutePoints())
                idx = getRouteInsertPosition(this._map, layer.getDraggableLayersRoutePoints()!, layer.getLatLngs() as any, latlng);
            else
                idx = getInsertPosition(this._map, layer.getLatLngs() as any, latlng, this.options.allowExtendingLine, layer instanceof Polygon);
            setPoint(layer, latlng, idx, true);
            this.fire('insert', { layer, latlng, idx });
        });
    }

    removeTempMarker() {
        if (!this._active)
            return;

        this._active.tempMarker?.removeFrom(this._map);
        delete this._active;
        this._map.off('mousemove', this.handleMapMouseMove);
    }

}

interface DraggableLines extends Evented {}
Object.assign(DraggableLines.prototype, Evented.prototype);

export default DraggableLines;