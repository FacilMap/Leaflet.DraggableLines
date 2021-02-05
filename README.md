Leaflet.DraggableLines
======================

Leaflet.DraggableLines is a Leaflet plugin that makes it possible to add additional waypoints or corners to routes, lines and polygons
by drag&drop. The way it works is that while hovering the line, a temporary marker appears at the position of the mouse cursor. When the
user drags the marker, it is added as a new point to the shape.

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

By default, `L.DraggableLines` makes all Polylines and Polygons on the map draggable, including ones that are added after it
has been enabled.


### Usage for routes

A route is usually a Polyline whose points are calculated to be the best path to get from one place to another, potentially via
some specified waypoints. When you drag a route, you don't want the shape of the underlying Polyline to be modified directly, but
you rather want a new waypoint to be inserted and the route to be recalculated based on that.

To achieve this, you can disable the `autoApply` option to disable the automatic adjustment of the Polyline when dragging.
The events fired by Leaflet.DraggableLines can than be used in connection with some helper functions to manually add the way point.

```javascript
const wayPoints = [53.09897, 12.02728], [52.01701, 14.18884];
const route = new L.Polyline().addTo(map);
async function updateRoute() {
	route.setLatLngs(await calculateRoute(waypoints));
}
updateRoute();

const draggable = new L.DraggableLines(map, { autoApply: false });
draggable.enable();

draggable.on("dragend", (e) => {
	const idx = L.DraggableLines.getRouteInsertPosition(map, wayPoints, route.getLatLngs(), e.from);
	wayPoints.splice(idx, 0, e.to);
	updateRoute();
});
```

This will insert an additional waypoint as soon as the user has finished dragging.

It is also possible to continuously update the route as the user is dragging. For this, it is advisable to wrap the `updateRoute` function
with [debounce](https://lodash.com/docs/#debounce) to make sure that the route is not calculated on every pixel.

```javascript
let idx;

draggable.on("dragstart", (e) => {
	idx = L.DraggableLines.getRouteInsertPosition(map, wayPoints, route.getLatLngs(), e.from);
	wayPoints.splice(idx, 0, e.from);
});

draggable.on("drag", debounce((e) => {
	wayPoints[idx] = e.to;
	updateRoute();
}));
```


### Enabling for specific layers only

You can use the `enableForLayer` option to decide which layers are made draggable automatically. By default, this callback returns
true for all objects that are instances of `L.Polyline` (including `L.Polygon` because it is a subtype of `L.Polyline`).
Note that only layer instances of `L.Polyline` and classes that inherit from it are supported. Returning `true` for another
type of layer will not work properly.

An example how to control whether dragging is enabled for a particular layer would be to introduce a custom option:
```javascript
L.Polyline([[53.09897, 12.02728], [52.01701, 14.18884]], { enableDraggableLines: true }).addTo(map);
L.Polyline([[52.93871, 11.92566], [52.73629, 12.57935]], { enableDraggableLines: false }).addTo(map);

new L.DraggableLines(map, {
	enableForLayer: (layer) => (layer instanceof L.Polyline && layer.options.enableDraggableLines)
}).enable();
```

An alternative way is to manually enable dragging for specific layers using the `enableForLayer` method. To disable automatic enabling
for all layers, either pass a function that always returns `false` as `enableForLayer`, or simply don't call `enable()` an the
`L.DraggableLines` instance:
```javascript
const layer1 = L.Polyline([[53.09897, 12.02728], [52.01701, 14.18884]]).addTo(map);
const layer2 = L.Polyline([[52.93871, 11.92566], [52.73629, 12.57935]]).addTo(map);

const draggable = new L.DraggableLines(map, {
	enableForLayer: () => false
});
draggable.enableForLayer(layer1);
```


### Options

You can pass the following options as the second parameter to `L.DraggableLines`:

* `enableForLayer`: A callback that receives a layer as its parameter and needs to return a boolean that decides whether dragging
  should be enabled for this layer. This is called for all existing layers when `enable()` is called on the `L.DraggableLines` object,
  and for any layer that is added to the map while it is enabled. Only layers that are instances of `L.Polyline` or its sub classes
  are supported, so you should always check for that using `layer instanceof L.Polyline` and return false otherwise.
  By default this returns true for all supported layers.
* `icon`: An instance of `L.Icon` that should be used for the temporary marker that appears while you hover and drag a line.
* `allowExtendingLine`: If `true` (default), users are allowed to drag the line in a way that adds additional points before the first
  point and after the last point. Has no effect on Polygons.
* `autoApply`: If `true` (default), automatically adjust the points of a Polyline/Polygon when the user is dragging it. If `false`,
  a temporary marker still appears when the user hovers the line and this marker can be dragged around, but the line is not affected
  by this. When the drag operation ends, the marker simply disappears. When using this option, you can customize the effects of the
  drag operation by subscribing to the drag events of the `L.DraggableLines` instance.

### Events

#### `dragstart`, `drag`, `dragend`

`dragstart` is fired when the user starts to drag the temporary marker. `drag` is fired continuously as the user moves the marker
around (if you subscribe to this event, it might make sense to debounce the handler). `dragend` is fired after the user releases
the mouse and the temporary marker is removed.

All 3 events carry an object with the following properties:
* `layer`: The layer which is being dragged
* `from`: An `L.LatLng` instance with the coordinates where the dragging started. These coordinates will be exactly on the line
  (even if the mouse cursor was outside of the center of the line when the dragging started), but they will probably not be equal
  to a line point (rather, the point will be somewhere in between two line points).
* `to`: An `L.LatLng` instance with the coordinates where the marker is currently being dragged. In case of a `dragstart` event,
  this is equal to `from`. In case of a `dragend` event, this is the final position of the drag marker.
* `idx`: The index where the new point should be inserted. For example, on a Polyline that has 3 points A, B and C, and the user
  starts dragging the line between point A and B, `idx` will be `1`, because the new point needs to be inserted at index `1`
  (`latlngs.splice(event.idx, 0, event.to)`).

  In case of a multi-line (a Polyline constructed with an array or arrays of coordinates) or a Polygon (where `getLatLngs()`
  always returns an array of arrays of coordinates, regardless of whether it was constructed as such), `idx` will be a tuple (array)
  of two numbers rather than a single number. The tuple describes the position in the array or arrays, with the first number
  describing the index in the top array and the second number describing the index in the nested array.

  See below for some helper methods that make it easier to insert a point into an array of coordinates or an array of arrays of
  coordinates.

### Methods

These methods can be called on instances of `L.DraggableLines`.

* `enable()`: When called, enables dragging for all supported layer that are currently on the map (or, if an `enableForLayer` option
  is specified, for all layers for which that returns true). Registers an event handler that will enable dragging for all supported
  layers that are added to the map laters.
* `disable()`: Disables dragging for all layers on the map and disables the auto-enabling event handlers.
* `enableForLayer(layer)`: Manually enable dragging for a specific layer.
* `disableForLayer(layer)`: Manually disable dragging for a specific layer.

### Helpers

### `L.DraggableLines.getInsertPosition(map, points, point, allowExtendingLine?, isPolygon?)`

If `points` is the array of coordinates or array of arrays of coordinates that a Polyline/Polygon consists of and `point` is the
coordinates where the dragging starts, this method returns the index in the `points` array where the new point should be inserted.
The returned value is a number of a tuple of two numbers, depending on whether `points` is an array or an array of arrays.

For example, by default, `Leaflet.DraggableLines` inserts a new point to the line in the `dragstart` handler like so:

```javascript
draggable.on('dragstart', (e) => {
	const idx = getInsertPosition(map, e.layer.getLatLngs(), e.from, draggable.options.allowExtendingLine, e.layer instanceof Polygon);
	e.layer.setLatLngs(insertAtPosition(e.layer.getLatLngs(), latlng, idx));
});
```

**Parameters:**

* `map`: The instance of `L.Map`.
* `points`: An array of coordinates or array of arrays of coordinates as returned by `layer.getLatLngs()`.
* `point`: An instance of `L.LatLng` that represents the point on the line where dragging has started.
* `allowExtendingLine`: If `true` (default), will return `0` or `points.length` if the dragging has started before the beginning
  or after the end of the line. If `false`, will always return at least `1` and at most `points.length - 1` to prevent the
  beginning/end of the line to be modified. Has no effect if `isPolygon` is `true`.
* `isPolygon`: If `true`, `points` will be considered to be the coordinates of a polygon, if `false` (default), it will be considered
  the coordinates of a line. The difference between a polygon and a line is that in a polygon, the first point and the last point
  of the coordinates listed in `points` are connected by an additional segment that can also be dragged.


### `L.DraggableLines.getRouteInsertPosition(map, routePoints, trackPoints, point)`

Similar to `getInsertPosition`, but for a line where the points returned by `getLatLngs()` (“track points”) are a route that has been
calculated to be the best connection between a set of waypoints (“route points”). Dragging starts on a segment between two track
points, but should lead an additional point in the set of route points rather than track points, so that the route can be recalculated.
This method returns the index where the new route point should be inserted into the array of route points.

See the examples above for how to use this method.

**Parameters:**

* `map`: The instance of `L.Map`.
* `routePoints`: An array of coordinates that are the waypoints that are used as the basis for calculating the route.
* `trackPoints`: An array of coordinates as returned by `layer.getLatLngs()`.
* `point`: An instance of `L.LatLng` that represents the point on the line where dragging has started.


### `L.DraggableLines.insertAtPosition(arr, item, idx)`

Returns a copy of the `arr` array with `item` inserted at the index `idx`. `arr` can be an array or an array of arrays (as
returned by `getLatLngs()` on a Polyline/Polygon), and `idx` can be a number or a tuple of two numbers as returned by
`L.DraggableLines.getInsertPosition()` (and as passed along with the drag events). This method can be used to easily insert
a new point at the right position:

```javascript
draggable.on('dragstart', (e) => {
	e.layer.setLatLngs(insertAtPosition(e.layer.getLatLngs(), e.from, e.idx));
});
```

### `L.DraggableLines.updateAtPosition(arr, item, idx)`

Like `L.DraggableLines.insertAtPosition`, but overwrites the item at the given index instead of inserting it there.

Returns a copy of the `arr` array with the item at index `idx` overwritten with `item`. `arr` can be an array or an array
of arrays (as returned by `getLatLngs()` on a Polyline/Polygon), and `idx` can be a number or a tuple of two numbers as
returned by `L.DraggableLines.getInsertPosition()` (and as passed along with the drag events). This method can be used
to easily update a new point at the right position while the user is dragging:

```javascript
draggable.on('drag', (e) => {
	e.layer.setLatLngs(updateAtPosition(e.layer.getLatLngs(), e.from, e.idx));
});
```