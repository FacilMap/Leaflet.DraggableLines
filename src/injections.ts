import { latLng, LatLngExpression, Polyline, Rectangle } from "leaflet";

Polyline.prototype.hasDraggableLinesRoutePoints = function() {
	if (this instanceof Rectangle) {
		return false;
	} else {
		return this.options.draggableLinesRoutePoints != null;
	}
};

Polyline.prototype.getDraggableLinesRoutePoints = function() {
	if (this instanceof Rectangle) {
		return undefined;
	} else {
		return this.options.draggableLinesRoutePoints?.map((p) => latLng(p));
	}
};

Polyline.prototype.setDraggableLinesRoutePoints = function(routePoints: LatLngExpression[] | undefined) {
	if (this instanceof Rectangle) {
		return;
	} else {
		this.options.draggableLinesRoutePoints = routePoints;
		this.fire('draggableLines-setRoutePoints');
	}
};

const setLatLngsBkp = Polyline.prototype.setLatLngs;
Polyline.prototype.setLatLngs = function(...args: any) {
	const result = setLatLngsBkp.apply(this, args);
	this.fire('draggableLines-setLatLngs');
	return result;
};