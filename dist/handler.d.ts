import { Evented, Handler, LatLng, Layer, LeafletEvent, LeafletMouseEvent, Map, MarkerOptions, Polyline } from 'leaflet';
import DraggableLinesTempMarker from './markers/tempMarker';
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
    constructor(map: Map, options?: DraggableLinesHandlerOptions);
    addHooks(): void;
    removeHooks(): void;
    shouldEnableForLayer(layer: Polyline): boolean;
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
    redrawForLayer(layer: Polyline): void;
    disableForLayer(layer: Polyline): void;
    redraw(): void;
}
export default interface DraggableLinesHandler extends Evented {
}
