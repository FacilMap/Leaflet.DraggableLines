Leaflet.DraggableLines
======================

Leaflet.DraggableLines is a Leaflet plugin that makes it possible to change the shape of routes, lines and polygons by drag&drop.
It add the following interactions to Polylines and its subclasses (such as Polygons):
* A marker is added to each point on the line. This point can be dragged around to change the shape of the line. Unless disabled
  via the `removeOnClick` option, unless that would cause the line to have less than 2 (3 for polygons) points.
* While hovering anywhere on the line, a temporary marker appears that follows the mouse cursor. This point can be clicked or dragged
  to add an additional corner/waypoint in that place.

There is support for MultiPolylines, for Polygons with holes and for Polylines based on calculated routes (where dragging should
update the route points rather than the coordinates of the Polyline).

Tip: Use it together with [Leaflet.HighlightableLayers](https://github.com/FacilMap/Leaflet.HighlightableLayers) to make it easier to
drag thin lines.


Usage
-----

Leaflet.DraggableLines depends on [Leaflet.GeometryUtil](https://github.com/makinacorpus/Leaflet.GeometryUtil). Make sure to load
the Leaflet and Leaflet.GeometryUtil scripts before loading Leaflet.DraggableLines.

To use Leaflet.DraggableLines, load the [L.DraggableLines.js](./dist/L.DraggableLines.js) script. One easy way to do it is to use
[UNPKG](https://unpkg.com/).
```
<script src="https://unpkg.com/leaflet"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet-geometryutil"></script>
<script src="https://unpkg.com/leaflet-draggablelines"></script>
```

If you are using npm, run `npm install -S leaflet-draggablelines` to install it. You can then either `import 'leaflet-draggablelines'` and access it through `L.DraggableLines`, or `import DraggableLines from 'leaflet-draggablelines'` directly. TypeScript is also supported.


### Simple usage for lines and polygons

```javascript
const map = L.map('map');

new L.Polyline([53.09897, 12.02728], [52.01701, 14.18884], { color: '#0000ff', weight: 10 }).addTo(map);

const draggable = new L.DraggableLines(map);
draggable.enable();
```

By default, `L.DraggableLines` makes all Polylines and Polygons with `interactive: true` on the map draggable, including ones that
are added after it has been enabled.


### Usage for routes

A route is usually a Polyline whose points are calculated to be the best path to get from one place to another, potentially via
some specified waypoints. When you drag a route, you don't want the shape of the underlying Polyline to be modified directly, but
you rather want a new waypoint to be inserted and the route to be recalculated based on that.

Leaflet.DraggableLines adds an additional option `draggableLayersRoutePoints` to Polyline and all classes inheriting from it.
Passsing this option will cause Leaflet.DraggableLines to modify the points in this option rather than the points of the line itself
when the user interacts with the line. (**Note:** To update the route points of an existing line, call
`layer.setDraggableLayersRoutePoints(latlngs)` rather than setting the option by hand. This way Leaflet.DraggableLines will notice
the change and update the drag markers accordingly.)

Since the value of this option does not have any effect on the line itself, you need to recalculate the route every time the user
has changed the course of the route. You can do this by subscribing to the events `dragend` (the user has finished dragging a point),
`remove` (the user has removed a point by clicking on it) and `insert` (the user has added a point by clicking the line).

```javascript
const route = new L.Polyline([], { draggableLayersRoutePoints: [[53.09897, 12.02728], [52.01701, 14.18884]] }).addTo(map);
async function updateRoute() {
	route.setLatLngs(await calculateRoute(route.getDraggableLayerRoutePoints()));
}
updateRoute();

const draggable = new L.DraggableLines(map);
draggable.enable();

draggable.on("dragend remove insert", (e) => {
	if (e.layer === route)
		updateRoute();
});
```

It is also possible to continuously update the route as the user is dragging. For this, it is advisable to wrap the `updateRoute` function
with [debounce](https://lodash.com/docs/#debounce) to make sure that the route is not calculated on every pixel.

```javascript
draggable.on("drag", debounce((e) => {
	if (e.layer === route)
		updateRoute();
}));
```


### Enabling for specific layers only

You can use the `enableForLayer` option to decide which layers are made draggable automatically. By default, this callback returns
true for all Polylines (including `L.Polygon` because it is a subtype of `L.Polyline`) that have `interactive: true`.

An example how to control whether dragging is enabled for a particular layer would be to introduce a custom option:
```javascript
L.Polyline([[53.09897, 12.02728], [52.01701, 14.18884]], { enableDraggableLines: true }).addTo(map);
L.Polyline([[52.93871, 11.92566], [52.73629, 12.57935]], { enableDraggableLines: false }).addTo(map);

new L.DraggableLines(map, {
	enableForLayer: (layer) => (layer.options.enableDraggableLines)
}).enable();
```

An alternative way is to manually enable dragging for specific layers using the `enableForLayer` method. To disable automatic enabling
for all layers, pass a function that always returns `false` as `enableForLayer`:
```javascript
const layer1 = L.Polyline([[53.09897, 12.02728], [52.01701, 14.18884]]).addTo(map);
const layer2 = L.Polyline([[52.93871, 11.92566], [52.73629, 12.57935]]).addTo(map);

const draggable = new L.DraggableLines(map, {
	enableForLayer: () => false
});
draggable.enable();
draggable.enableForLayer(layer1);
```


### Options

You can pass the following options as the second parameter to `L.DraggableLines`:

* `enableForLayer`: A callback that receives a layer as its parameter and needs to return a boolean that decides whether dragging
  should be enabled for this layer. This is called for all existing Polyline layers when `enable()` is called on the `L.DraggableLines`
  object, and for any Polyline that is added to the map while it is enabled.
  By default this returns true for all Polylines that have `interactive: true`.
* `icon`: An instance of `L.Icon` that should be used for draggable points on the line. Defaults to a blue marker. If you want
  draggable points to be invisible but still draggable, you need to pass an invisible icon with the desired dimensions of the
  draggable area here.
* `startIcon`: An instance of `L.Icon` that should be used for the start point of the line (not applicable for polygons). Defaults to
  a green marker.
* `endIcon`: An instance of `L.Icon` that should be used for the end point of the line (not applicable for polygons). Defaults to
  a red marker.
* `dragIcon`: An instance of `L.Icon` that should be used for the temporary marker that appears while you hover and drag a line.
  Defaults to a blue marker.
* `allowExtendingLine`: If `true` (default), users are allowed to drag the line in a way that adds additional points before the first
  point and after the last point. Has no effect on Polygons.


### Events

#### `dragstart`, `drag`, `dragend`

`dragstart` is fired when the user starts to drag a marker. `drag` is fired continuously as the user moves the marker
around (if you subscribe to this event, it might make sense to debounce the handler). `dragend` is fired after the user releases
the mouse.

All 3 events carry an object with the following properties:
* `layer`: The Polyline which is being dragged
* `from`: An `L.LatLng` instance with the coordinates where the dragging started. In case of a point marker, this will be the
  coordinates of the point. In case of a temporary marker, these coordinates will be exactly on the line, but they will most likely
  not equal any existing point, but rather be somewhere in between two existing points.
* `to`: An `L.LatLng` instance with the coordinates where the marker is currently being dragged. In case of a `dragstart` event,
  this is equal to `from`. In case of a `dragend` event, this is the final position of the drag marker.
* `idx`: The index where the new point was inserted. For example, on a Polyline that has 3 points A, B and C, and the user
  starts dragging the line between point A and B, `idx` will be `1`, because the new point is inserted at index `1`
  (`latlngs.splice(event.idx, 0, event.to)`).

  In case of a multi-line (a Polyline constructed with an array or arrays of coordinates) or a Polygon (where `getLatLngs()`
  always returns an array of arrays of coordinates, regardless of whether it was constructed as such), `idx` will be a tuple (array)
  of two numbers rather than a single number. The tuple describes the position in the array or arrays, with the first number
  describing the index in the top array and the second number describing the index in the nested array.

  See below for some helper methods that make it easier to insert a point into an array of coordinates or an array of arrays of
  coordinates.
* `isNew`: `true` if the dragged marker is a temporary marker (adding a new point to the line). `false` if it is an existing point.

#### `remove`

Fired when the user removed a point by clicking it. Only fired if the `removeOnClick` options is not disabled.

Carries an object with the following properties:
* `layer`: The Polyline from which the point has been removed
* `idx`: The index where the point was removed. A number for simple Polylines, a tuple of two numbers for a MultiPolyline or
  a Polygon.

#### `insert`

Fired when the user added a point by clicking the line.

Carries an object with the following properties:
* `layer`: The Polyline which has been clicked
* `idx`: The index where the point was inserted. A number for simple Polylines, a tuple of two numbers for a MultiPolyline or
  a Polygon.
* `latlng`: An instance of `L.LatLng` with the coordinates of the new point.


### Methods

These methods can be called on instances of `L.DraggableLines`.

* `enableForLayer(layer)`: Manually enable dragging for a specific layer.
* `disableForLayer(layer)`: Manually disable dragging for a specific layer.
