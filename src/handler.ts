import L, { Draggable, Evented, Handler, Icon, LatLng, Layer, LeafletEvent, LeafletMouseEvent, LineUtil, Map, Marker, Polygon, Polyline } from 'leaflet';
import GeometryUtil from 'leaflet-geometryutil';
import { defaultIcon, endIcon, plusIcon, startIcon } from './markers/icons';
import DraggableLinesDragMarker from './markers/dragMarker';
import DraggableLinesPlusMarker from './markers/plusMarker';
import DraggableLinesTempMarker from './markers/tempMarker';
import { getPlusIconPoint } from './utils';

export interface DraggableLinesHandlerOptions {
    enableForLayer?: (layer: Polyline) => boolean;
    viaIcon?: Icon;
    startIcon?: Icon;
    endIcon?: Icon;
    dragIcon?: Icon;
    plusIcon?: Icon;
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
            startIcon,
            endIcon,
            viaIcon: defaultIcon,
            dragIcon: defaultIcon,
            plusIcon,
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
                let icon = this.options.viaIcon!;
                if (!(layer instanceof Polygon)) {
                    icon = j == 0 ? this.options.startIcon! : j == routePoints[i].length - 1 ? this.options.endIcon! : icon;

                    //if (j == 0 || j == routePoints[i].length - 1)
                    //    removeOnClick = removeOnClick && this.options.allowExtendingLine!;
                }

                const marker = new DraggableLinesDragMarker(this, layer, routePoints[i][j], idx, icon, removeOnClick).addTo(this._map);
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
        if (layer instanceof Polygon || !layer._draggableLines || !this.options.allowExtendingLine)
            return;

        this.removePlusMarkers(layer);

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
                
                const marker = new DraggableLinesPlusMarker(this, layer, getPlusIconPoint(this._map, trackPoints[i], 24 + layer.options.weight! / 2, isStart), idx).addTo(this._map);
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

        this._tempMarker = new DraggableLinesTempMarker(this, layer, GeometryUtil.closest(this._map, layer, latlng)!).addTo(this._map);
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

}

export default interface DraggableLinesHandler extends Evented {}
Object.assign(DraggableLinesHandler.prototype, Evented.prototype);
