import { latLng, LatLngExpression, Polyline } from "leaflet";

Polyline.prototype.hasDraggableLinesRoutePoints = function() {
	return this.options.draggableLinesRoutePoints != null;
};

Polyline.prototype.getDraggableLinesRoutePoints = function() {
	return this.options.draggableLinesRoutePoints?.map((p) => latLng(p));
};

Polyline.prototype.setDraggableLinesRoutePoints = function(routePoints: LatLngExpression[] | undefined) {
	this.options.draggableLinesRoutePoints = routePoints;
	this.fire('draggableLines-setRoutePoints');
};

const setLatLngsBkp = Polyline.prototype.setLatLngs;
Polyline.prototype.setLatLngs = function(...args: any) {
	const result = setLatLngsBkp.apply(this, args);
	this.fire('draggableLines-setLatLngs');
	return result;
};