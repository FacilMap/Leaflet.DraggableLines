import { Evented, LatLng } from "leaflet";
import { SupportedLayer } from "./utils";
import DraggableLinesDragMarker from "./markers/dragMarker";
import DraggableLinesTempMarker from "./markers/tempMarker";
import DraggableLinesPlusMarker, { DraggableLinesPlusTempMarker } from "./markers/plusMarker";

type Listener<EventMap extends Record<string, any>, E extends keyof EventMap> = (event: EventMap[E]) => void;

type ListenerMap<EventMap extends Record<string, any>> = {
	[E in keyof EventMap]?: Listener<EventMap, E>;
};

interface Override<EventMap extends Record<string, any>> {
	on<E extends keyof EventMap>(type: E, fn: Listener<EventMap, E>, context?: any): this;
	on(eventMap: ListenerMap<EventMap>): this;
	addEventListener<E extends keyof EventMap>(type: E, fn: Listener<EventMap, E>, context?: any): this;
	addEventListener(eventMap: ListenerMap<EventMap>): this;

	off<E extends keyof EventMap>(type: E, fn: Listener<EventMap, E>, context?: any): this;
	off(eventMap: ListenerMap<EventMap>): this;
	off(): this;
	removeEventListener<E extends keyof EventMap>(type: E, fn: Listener<EventMap, E>, context?: any): this;
	removeEventListener(eventMap: ListenerMap<EventMap>): this;
	clearAllEventListeners(): this;

	fire<E extends keyof EventMap>(type: E, data: EventMap[E], propagate?: boolean): this;
	fireEvent<E extends keyof EventMap>(type: E, data: EventMap[E], propagate?: boolean): this;

	listens(type: keyof EventMap, propagate?: boolean): boolean;
	listens<E extends keyof EventMap>(type: E, fn: Listener<EventMap, E>, context?: any, propagate?: boolean): this;
	hasEventListeners(type: keyof EventMap): boolean;

	once<E extends keyof EventMap>(type: E, fn: Listener<EventMap, E>, context?: any): this;
	once(eventMap: ListenerMap<EventMap>): this;
	addOneTimeEventListener<E extends keyof EventMap>(type: E, fn: Listener<EventMap, E>, context?: any): this;
	addOneTimeEventListener(eventMap: ListenerMap<EventMap>): this;
}

export interface FixedEvented<EventMap extends Record<string, any>> extends Omit<Evented, keyof Override<EventMap>>, Override<EventMap> {
}

export type FixedEventedConstructor<EventMap extends Record<string, any>> = new () => FixedEvented<EventMap>;


export type DraggableLinesEvents = {
	dragmouseover: { layer: SupportedLayer; idx: number | [number, number]; marker: DraggableLinesDragMarker };
	dragmouseout: { layer: SupportedLayer; idx: number | [number, number]; marker: DraggableLinesDragMarker };

	insert: { layer: SupportedLayer; idx: number | [number, number]; latlng: LatLng };
	remove: { layer: SupportedLayer; idx: number | [number, number] };

	dragstart: { layer: SupportedLayer; from: LatLng; to: LatLng; idx: number | [number, number]; isNew: boolean };
	drag: { layer: SupportedLayer; from: LatLng; to: LatLng; idx: number | [number, number]; isNew: boolean };
	dragend: { layer: SupportedLayer; from: LatLng; to: LatLng; idx: number | [number, number]; isNew: boolean };

	tempmouseover: { layer: SupportedLayer; idx: number | [number, number]; marker: DraggableLinesTempMarker; latlng: LatLng };
	tempmousemove: { layer: SupportedLayer; idx: number | [number, number]; marker: DraggableLinesTempMarker; latlng: LatLng };
	tempmouseout: { layer: SupportedLayer; marker: DraggableLinesTempMarker };

	plusmouseover: { layer: SupportedLayer; idx: number | [number, number]; marker: DraggableLinesPlusTempMarker, plusMarker: DraggableLinesPlusMarker };
	plusmouseout: { layer: SupportedLayer; idx: number | [number, number]; marker: DraggableLinesPlusTempMarker, plusMarker: DraggableLinesPlusMarker };
};

export type DraggableLinesEvented = FixedEvented<DraggableLinesEvents>;