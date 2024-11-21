import { CircleMarker, Draggable, Evented, Handler, LatLng, Layer, LeafletEvent, LeafletMouseEvent, LineUtil, Map, MarkerOptions, Polygon, Polyline } from 'leaflet';
import { defaultIcon, endIcon, plusIcon, startIcon } from './markers/icons';
import DraggableLinesDragMarker from './markers/dragMarker';
import DraggableLinesPlusMarker from './markers/plusMarker';
import DraggableLinesTempMarker from './markers/tempMarker';
import { LayerFilter, matchesLayerFilter } from './utils';
import { PolylineIndex, SupportedLayer } from './injections-types.mjs';

export interface DraggableLinesHandlerOptions {
	enableForLayer?: LayerFilter;
	dragMarkerOptions?: (layer: SupportedLayer, i: number, length: number) => MarkerOptions;
	tempMarkerOptions?: (layer: SupportedLayer) => MarkerOptions;
	plusMarkerOptions?: (layer: SupportedLayer, isStart: boolean) => MarkerOptions;
	plusTempMarkerOptions?: (layer: SupportedLayer, isStart: boolean) => MarkerOptions;
	allowDraggingLine?: LayerFilter;
	allowExtendingLine?: LayerFilter;
	removeOnClick?: LayerFilter<SupportedLayer, [PolylineIndex]>;
}

export default class DraggableLinesHandler extends (() => {
	function HandlerAndEvented(this: Handler & Evented, map: Map) {
		Handler.call(this, map);
	}
	Object.setPrototypeOf(HandlerAndEvented.prototype, Handler.prototype);
	Object.assign(HandlerAndEvented.prototype, Evented.prototype);
	return HandlerAndEvented as any as new (map: Map) => Handler & Evented;
})() {
	options: DraggableLinesHandlerOptions & Required<Pick<DraggableLinesHandlerOptions, "enableForLayer" | "allowDraggingLine" | "allowExtendingLine" | "removeOnClick">>;

	_tempMarker?: DraggableLinesTempMarker;

	constructor(map: Map, options?: DraggableLinesHandlerOptions) {
		super(map);

		this.options = {
			enableForLayer: (layer) => (layer.options as any).interactive !== false,
			allowDraggingLine: true,
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
		this._map.off("layeradd", this.handleLayerAdd);
		this._map.off("layerremove", this.handleLayerRemove);

		this._map.eachLayer((layer) => { this.handleLayerRemove({ layer }); });
	}

	shouldEnableForLayer(layer: SupportedLayer) {
		return matchesLayerFilter(layer, this.options.enableForLayer);
	}

	handleLayerAdd = (e: { layer: Layer }) => {
		if ((e.layer instanceof Polyline || e.layer instanceof CircleMarker) && this.shouldEnableForLayer(e.layer))
			this.enableForLayer(e.layer);
	};

	handleLayerRemove = (e: { layer: Layer }) => {
		if (e.layer instanceof Polyline || e.layer instanceof CircleMarker)
			this.disableForLayer(e.layer);
	};

	handleLayerMouseOver = (e: LeafletMouseEvent) => {
		if (Draggable._dragging)
			return;

		this.drawTempMarker(e.target as SupportedLayer, e.latlng);
	};

	handleLayerSetLatLngs = (e: LeafletEvent) => {
		const layer = e.target as SupportedLayer;
		// if (!Draggable._dragging) {
			this.removeTempMarker();

			if (layer._draggableLines) {
				layer._draggableLines.routePointIndexes = undefined; // Reset cache
				this.drawDragMarkers(layer);
				this.drawPlusMarkers(layer);
			}
		// }
	};

	drawDragMarkers(layer: SupportedLayer) {
		if (!layer._draggableLines)
			return;

		// if (layer instanceof Rectangle) {
		// 	// For rectangles, this function is also called continuously while dragging (because dragging a marker affects the positions
		// 	// of others). Hence we cannot remove and re-add the markers, but we need to update their positions.
		// 	const bounds = layer.getBounds();
		// 	const latLngs = [bounds.getSouthWest(), bounds.getNorthWest(), bounds.getNorthEast(), bounds.getSouthEast()];
		// 	for (const i of [1, 2, 0, 3]) { // Render in this order to keep z-indexes in expected order when rectangle has 0 width/height
		// 		if (layer._draggableLines.dragMarkers[i]) {
		// 			layer._draggableLines.dragMarkers[i].setLatLng([latLngs[i].lat, latLngs[i].lng]);
		// 		} else {
		// 			// The [0, i] index corresponds to what is returned by layer.getLatLngs()
		// 			layer._draggableLines.dragMarkers[i] = new DraggableLinesDragMarker(this, layer, latLngs[i], [0, i], {
		// 				icon: defaultIcon,
		// 				...this.options.dragMarkerOptions?.(layer, i, latLngs.length)
		// 			}, false).addTo(this._map);
		// 		}
		// 	}
		// } else if (layer instanceof CircleMarker) {
		// 	// For circles, this function is also called continuously while dragging (because dragging the center will move
		// 	// the radius drag marker). Hence we cannot remove and re-add the markers, but we need to update their positions.
		// 	const latLngs = [
		// 		layer.getLatLng(),
		// 		...(() => {
		// 			if (layer instanceof Circle) {
		// 				// Radius is in metres
		// 				return Object.values(getCircleCorners(this._map, layer.getLatLng(), layer.getRadius()));
		// 			} else {
		// 				// Radius is in pixels
		// 				const centerPoint = this._map.latLngToLayerPoint(layer.getLatLng());
		// 				return [
		// 					this._map.layerPointToLatLng([centerPoint.x, centerPoint.y - layer.getRadius()]),
		// 					this._map.layerPointToLatLng([centerPoint.x + layer.getRadius(), centerPoint.y]),
		// 					this._map.layerPointToLatLng([centerPoint.x, centerPoint.y + layer.getRadius()]),
		// 					this._map.layerPointToLatLng([centerPoint.x - layer.getRadius(), centerPoint.y])
		// 				];
		// 			}
		// 		})()
		// 	];
		// 	for (const i of [1, 4, 0, 2, 3]) {
		// 		if (layer._draggableLines.dragMarkers[i]) {
		// 			layer._draggableLines.dragMarkers[i].setLatLng(latLngs[i]);
		// 		} else {
		// 			layer._draggableLines.dragMarkers[i] = new DraggableLinesDragMarker(this, layer, latLngs[i], i, {
		// 				icon: defaultIcon,
		// 				...this.options.dragMarkerOptions?.(layer, i, latLngs.length)
		// 			}, false).addTo(this._map);
		// 		}
		// 	}
		// } else {


		// this.removeDragMarkers(layer);

		const latlngs = layer.getDraggableLinesRoutePoints();
		const routePoints = LineUtil.isFlat(latlngs) ? [latlngs] : latlngs;
		const isFlat = LineUtil.isFlat(latlngs);
		const stringifyIdx = (idx: PolylineIndex) => Array.isArray(idx) ? idx.join("\n") : `${idx}`;
		const existingDragMarkers = Object.fromEntries(layer._draggableLines.dragMarkers.map((m) => [stringifyIdx(m.getIdx()), m]));
		for (let i = 0; i < routePoints.length; i++) {
			for (let j = 0; j < routePoints[i].length; j++) {
				const idx = isFlat ? j : [i, j] as [number, number];

				let removeOnClick = matchesLayerFilter(layer, this.options.removeOnClick, idx);
				const options = {
					icon: layer instanceof Polygon ? defaultIcon : (j == 0 ? startIcon : j == routePoints[i].length - 1 ? endIcon : defaultIcon),
					...this.options.dragMarkerOptions?.(layer, j, routePoints[i].length)
				};

				const idxString = stringifyIdx(idx);
				if (!existingDragMarkers[idxString]) {
					const marker = new DraggableLinesDragMarker(this, layer, routePoints[i][j], idx, options, removeOnClick).addTo(this._map);
					layer._draggableLines.dragMarkers.push(marker);
				} else {
					if (options.icon !== existingDragMarkers[idxString].options.icon) {
						existingDragMarkers[idxString].setIcon(options.icon);
					}

					if (!existingDragMarkers[idxString].getLatLng().equals(routePoints[i][j])) {
						existingDragMarkers[idxString].setLatLng(routePoints[i][j]);
					}

					delete existingDragMarkers[idxString];
				}
			}
		}

		for (const marker of Object.values(existingDragMarkers)) {
			marker.remove();
		}

		// }
	}

	removeDragMarkers(layer: SupportedLayer) {
		if (!layer._draggableLines)
			return;

		for (const marker of layer._draggableLines.dragMarkers) {
			marker.removeFrom(this._map);
		}
		layer._draggableLines.dragMarkers = [];
	}

	drawPlusMarkers(layer: SupportedLayer) {
		this.removePlusMarkers(layer);

		if (!layer._draggableLines || !matchesLayerFilter(layer, this.options.allowExtendingLine) || !layer.getDraggableLinesPlusMarkerPoints || !layer.insertDraggableLinesRoutePoint) {
			return;
		}

		const routePoints = layer.getDraggableLinesRoutePoints();
		const normalizedRoutePoints = LineUtil.isFlat(routePoints) ? [routePoints] : routePoints;
		const plusMarkerPoints = layer.getDraggableLinesPlusMarkerPoints();

		for (let i = 0; i < normalizedRoutePoints.length; i++) {
			for (const isStart of [true, false]) {
				const plusIconPoint = (
					LineUtil.isFlat(routePoints) && !Array.isArray(plusMarkerPoints[0]) ? (plusMarkerPoints as [start: L.LatLng | undefined, end: L.LatLng | undefined])[isStart ? 0 : 1] :
					!LineUtil.isFlat(routePoints) && Array.isArray(plusMarkerPoints[i]) ? (plusMarkerPoints as Array<[start: L.LatLng | undefined, end: L.LatLng | undefined]>)[i][isStart ? 0 : 1] :
					undefined
				);
				if (!plusIconPoint) {
					continue;
				}

				let idx: PolylineIndex;
				if (LineUtil.isFlat(routePoints)) {
					idx = isStart ? 0 : normalizedRoutePoints[i].length;
				} else {
					idx = isStart ? [i, 0] : [i, routePoints[i].length];
				}

				const options = {
					icon: plusIcon,
					...this.options.plusMarkerOptions?.(layer, isStart)
				};
				const tempMarkerOptions = {
					icon: isStart ? startIcon : endIcon,
					...this.options.plusTempMarkerOptions?.(layer, isStart)
				};
				const marker = new DraggableLinesPlusMarker(this, layer as any, plusIconPoint, idx, options, tempMarkerOptions).addTo(this._map);
				layer._draggableLines.plusMarkers.push(marker);
			}
		}
	}

	removePlusMarkers(layer: SupportedLayer) {
		if (!layer._draggableLines)
			return;

		for (const marker of layer._draggableLines.plusMarkers) {
			marker.removeFrom(this._map);
		}
		layer._draggableLines.plusMarkers = [];
	}

	drawTempMarker(layer: SupportedLayer, latlng: LatLng) {
		this.removeTempMarker();

		if (!layer.insertDraggableLinesRoutePoint || !matchesLayerFilter(layer, this.options.allowDraggingLine)) {
			return;
		}

		const options = {
			icon: defaultIcon,
			...this.options.tempMarkerOptions?.(layer)
		};
		this._tempMarker = new DraggableLinesTempMarker(this, layer as any, latlng, options).addTo(this._map);
	}

	removeTempMarker() {
		if (this._tempMarker) {
			this._tempMarker.removeFrom(this._map);
			delete this._tempMarker;
		}
	}

	enableForLayer(layer: SupportedLayer) {
		if (layer._draggableLines)
			return;

		layer._draggableLines = {
			dragMarkers: [],
			plusMarkers: [],
			zoomEndHandler: () => {
				this.drawPlusMarkers(layer);
				// Some layers, such as CircleMarker, change their geometry on zoom
				this.drawDragMarkers(layer);
			},
			routePointIndexes: undefined
		};
		layer.on("mouseover", this.handleLayerMouseOver);
		layer.on("draggableLines-setLatLngs", this.handleLayerSetLatLngs);
		layer.on("draggableLines-setRoutePoints", this.handleLayerSetLatLngs);
		this._map.on("zoomend", layer._draggableLines.zoomEndHandler);
		this.drawDragMarkers(layer);
		this.drawPlusMarkers(layer);
	}

	redrawForLayer(layer: SupportedLayer) {
		if (!layer._draggableLines)
			return;

		this.drawDragMarkers(layer);
		this.drawPlusMarkers(layer);

		if (this._tempMarker && this._tempMarker._layer === layer)
			this.drawTempMarker(layer, this._tempMarker.getLatLng());
	}

	disableForLayer(layer: SupportedLayer) {
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
