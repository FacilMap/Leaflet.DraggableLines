import { Evented, Handler, Icon, LatLng, Layer, LeafletEvent, LeafletMouseEvent, Map, Polyline } from 'leaflet';
import DraggableLinesTempMarker from './markers/tempMarker';
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
    constructor(map: Map, options?: DraggableLinesHandlerOptions);
    addHooks(): void;
    removeHooks(): void;
    handleLayerAdd: (e: {
        layer: Layer;
    }) => void;
    handleLayerRemove: (e: {
        layer: Layer;
    }) => void;
    handleLayerMouseOver: (e: LeafletMouseEvent) => void;
    handleLayerSetLatLngs: (e: LeafletEvent) => void;
    drawDragMarkers(layer: Polyline): void;
    removeDragMarkers(layer: Polyline): void;
    drawPlusMarkers(layer: Polyline): void;
    removePlusMarkers(layer: Polyline): void;
    drawTempMarker(layer: Polyline, latlng: LatLng): void;
    removeTempMarker(): void;
    enableForLayer(layer: Polyline): void;
    disableForLayer(layer: Polyline): void;
}
export default interface DraggableLinesHandler extends Evented {
}
