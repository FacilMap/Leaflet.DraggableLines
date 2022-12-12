import { Draggable, Evented, Handler, LatLng, Layer, LeafletEvent, LeafletMouseEvent, LineUtil, Map, MarkerOptions, Polygon, Polyline } from 'leaflet';
import GeometryUtil from 'leaflet-geometryutil';
import { defaultIcon, endIcon, plusIcon, startIcon } from './markers/icons';
import DraggableLinesDragMarker from './markers/dragMarker';
import DraggableLinesPlusMarker from './markers/plusMarker';
import DraggableLinesTempMarker from './markers/tempMarker';
import { getPlusIconPoint } from './utils';

export interface DraggableLinesHandlerOptions {
    enableForLayer?: boolean | Polyline | Polyline[] | ((layer: Polyline) => boolean);
    dragMarkerOptions?: (layer: Polyline, i: number, length: number) => MarkerOptions;
    tempMarkerOptions?: (layer: Polyline) => MarkerOptions;
    plusMarkerOptions?: (layer: Polyline, isStart: boolean) => MarkerOptions;
    plusTempMarkerOptions?: (layer: Polyline, isStart: boolean) => MarkerOptions;
    allowExtendingLine?: boolean;
    removeOnClick?: boolean;
}

export default class DraggableLinesHandler extends Handler {

    options: DraggableLinesHandlerOptions;

    _tempMarker?: DraggableLinesTempMarker;

    constructor(map: Map, options?: DraggableLinesHandlerOptions) {
        super(map);

        this.options = {
            enableForLayer: (layer) => layer.options.interactive!,
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

    shouldEnableForLayer(layer: Polyline) {
        if (typeof this.options.enableForLayer === "function")
            return this.options.enableForLayer(layer);
        else if (typeof this.options.enableForLayer === "boolean")
            return this.options.enableForLayer;
        else if (Array.isArray(this.options.enableForLayer))
            return this.options.enableForLayer.includes(layer);
        else
            return this.options.enableForLayer === layer;
    }

    handleLayerAdd = (e: { layer: Layer }) => {
        if (e.layer instanceof Polyline && this.shouldEnableForLayer(e.layer))
            this.enableForLayer(e.layer as Polyline);
    };

    handleLayerRemove = (e: { layer: Layer }) => {
        if (e.layer instanceof Polyline)
            this.disableForLayer(e.layer as Polyline);
    };

    handleLayerMouseOver = (e: LeafletMouseEvent) => {
        if (Draggable._dragging)
            return;

        this.drawTempMarker(e.target as Polyline, e.latlng);
    };

    handleLayerSetLatLngs = (e: LeafletEvent) => {
        const layer = e.target as Polyline;
        if (!Draggable._dragging) {
            this.removeTempMarker();

            if (layer._draggableLines) {
                this.drawDragMarkers(layer);
                this.drawPlusMarkers(layer);
            }
        }
    };

    drawDragMarkers(layer: Polyline) {
        if (!layer._draggableLines)
            return;

        this.removeDragMarkers(layer);

        const latlngs = layer.getDraggableLinesRoutePoints() || (layer.getLatLngs() as LatLng[] | LatLng[][]);
        const routePoints = LineUtil.isFlat(latlngs) ? [latlngs] : latlngs;
        const isFlat = LineUtil.isFlat(latlngs);
        for (let i = 0; i < routePoints.length; i++) {
            for (let j = 0; j < routePoints[i].length; j++) {
                const idx = isFlat ? j : [i, j] as [number, number];

                let removeOnClick = this.options.removeOnClick!;
                const options = {
                    icon: layer instanceof Polygon ? defaultIcon : (j == 0 ? startIcon : j == routePoints[i].length - 1 ? endIcon : defaultIcon),
                    ...this.options.dragMarkerOptions?.(layer, j, routePoints[i].length)
                };
                const marker = new DraggableLinesDragMarker(this, layer, routePoints[i][j], idx, options, removeOnClick).addTo(this._map);
                layer._draggableLines.dragMarkers.push(marker);
            }
        }
    }

    removeDragMarkers(layer: Polyline) {
        if (!layer._draggableLines)
            return;

        for (const marker of layer._draggableLines.dragMarkers) {
            marker.removeFrom(this._map);
        }
        layer._draggableLines.dragMarkers = [];
    }

    drawPlusMarkers(layer: Polyline) {
        this.removePlusMarkers(layer);

        if (layer instanceof Polygon || !layer._draggableLines || !this.options.allowExtendingLine)
            return;

        const latlngs = layer.getLatLngs() as LatLng[] | LatLng[][];
        const trackPoints = LineUtil.isFlat(latlngs) ? [latlngs] : latlngs;
        const routePoints = layer.getDraggableLinesRoutePoints();

        for (let i = 0; i < trackPoints.length; i++) {
            if (trackPoints[i].length < 2)
                continue;

            for (const isStart of [true, false]) {
                let idx: number | [number, number];
                if (routePoints)
                    idx = isStart ? 0 : routePoints.length;
                else if (LineUtil.isFlat(latlngs))
                    idx = isStart ? 0 : trackPoints[i].length;
                else
                    idx = isStart ? [i, 0] : [i, trackPoints[i].length];

                const options = {
                    icon: plusIcon,
                    ...this.options.plusMarkerOptions?.(layer, isStart)
                };
                const tempMarkerOptions = {
                    icon: isStart ? startIcon : endIcon,
                    ...this.options.plusTempMarkerOptions?.(layer, isStart)
                };
                const marker = new DraggableLinesPlusMarker(this, layer, getPlusIconPoint(this._map, trackPoints[i], 24 + layer.options.weight! / 2, isStart), idx, options, tempMarkerOptions).addTo(this._map);
                layer._draggableLines.plusMarkers.push(marker);
            }
        }
    }

    removePlusMarkers(layer: Polyline) {
        if (!layer._draggableLines)
            return;

        for (const marker of layer._draggableLines.plusMarkers) {
            marker.removeFrom(this._map);
        }
        layer._draggableLines.plusMarkers = [];
    }

    drawTempMarker(layer: Polyline, latlng: LatLng) {
        this.removeTempMarker();

        const options = {
            icon: defaultIcon,
            ...this.options.tempMarkerOptions?.(layer)
        };
        this._tempMarker = new DraggableLinesTempMarker(this, layer, GeometryUtil.closest(this._map, layer, latlng)!, options).addTo(this._map);
    }

    removeTempMarker() {
        if (this._tempMarker) {
            this._tempMarker.removeFrom(this._map);
            delete this._tempMarker;
        }
    }

    enableForLayer(layer: Polyline) {
        if (layer._draggableLines)
            return;

        layer._draggableLines = {
            dragMarkers: [],
            plusMarkers: [],
            zoomEndHandler: () => {
                this.drawPlusMarkers(layer);
            }
        };
        layer.on("mouseover", this.handleLayerMouseOver);
        layer.on("draggableLines-setLatLngs", this.handleLayerSetLatLngs);
        layer.on("draggableLines-setRoutePoints", this.handleLayerSetLatLngs);
        this._map.on("zoomend", layer._draggableLines.zoomEndHandler);
        this.drawDragMarkers(layer);
        this.drawPlusMarkers(layer);
    }

    redrawForLayer(layer: Polyline) {
        if (!layer._draggableLines)
            return;

        this.drawDragMarkers(layer);
        this.drawPlusMarkers(layer);

        if (this._tempMarker && this._tempMarker._layer === layer)
            this.drawTempMarker(layer, this._tempMarker.getLatLng());
    }

    disableForLayer(layer: Polyline) {
        layer.off("mouseover", this.handleLayerMouseOver);
        layer.off("draggableLines-setLatLngs", this.handleLayerSetLatLngs);
        layer.off("draggableLines-setRoutePoints", this.handleLayerSetLatLngs);
        if (layer._draggableLines)
            this._map.off("zoomend", layer._draggableLines.zoomEndHandler);
        this.removeDragMarkers(layer);
        this.removePlusMarkers(layer);
        delete layer._draggableLines;
    }

    redraw() {
        this._map.eachLayer((layer) => {
            if (!(layer instanceof Polyline))
                return;

            const enable = this.shouldEnableForLayer(layer);
            if (layer._draggableLines && !enable)
                this.disableForLayer(layer);
            else if (!layer._draggableLines && enable)
                this.enableForLayer(layer);
            else if (layer._draggableLines)
                this.redrawForLayer(layer);
        });
    }

}

export default interface DraggableLinesHandler extends Evented {}
Object.assign(DraggableLinesHandler.prototype, Evented.prototype);
