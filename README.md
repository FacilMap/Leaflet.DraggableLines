Leaflet.DraggableLines
======================

Leaflet.DraggableLines is a Leaflet plugin that makes it possible to change the shape of routes, lines and polygons by drag&drop.
It add the following interactions to Polylines and its subclasses (such as Polygons):
* A marker is added to each point on the line. This point can be dragged around to change the shape of the line. Unless disabled
  via the `removeOnClick` option, clicking/tapping this point will remove it (unless that would cause the line to have less than
  2 (3 for polygons) points).
* While hovering anywhere on the line, a temporary marker appears that follows the mouse cursor. This point can be clicked or dragged
  to add an additional corner/waypoint in that place. On touch devices without a mouse cursor (smartphones, tablets), tapping a line
  will add a new point at the tapped position. This point can then be dragged around.
* Unless disabled via the `allowExtendingLine` option, a plus icon is rendered at the beginning and end of each line (not for polygons).
  Clicking/tapping will add a new point before the first point or after the last point of the line. Hovering this icon will show
  a temporary marker that can be dragged around to add a new point there.

There is support for MultiPolylines, for Polygons with holes and for Polylines based on calculated routes (where dragging should
update the route points rather than the coordinates of the Polyline).

Tip: Use it together with [Leaflet.HighlightableLayers](https://github.com/FacilMap/Leaflet.HighlightableLayers) to make it easier to
drag thin lines.

[Demo](https://esm.sh/*leaflet-draggable-lines/example.html)


Usage
-----

Since release 2.0.0, Leaflet.DraggableLines is published as an ES module only. If you are using a module bundler, you can install it using `npm install -S leaflet-highlightable-layers` and import it in your code:
```javascript
import DraggableLines from 'leaflet-draggable-lines';

...
```

TypeScript is supported.

If you want to use Leaflet.DraggableLines in a static HTML page without using a module bundler (not recommended in production), you need to make sure to import it and Leaflet as a module, for example from esm.sh:
```html
<script type="importmap">
	{
		"imports": {
			"leaflet": "https://esm.sh/leaflet",
			"leaflet-draggable-lines": "https://esm.sh/leaflet-draggable-lines"
		}
	}
</script>
<script type="module">
	import L from "leaflet";
	import DraggableLines from "leaflet-draggable-lines";

	...
</script>
```


### Simple usage for lines and polygons

```javascript
const map = L.map('map');

new L.Polyline([53.09897, 12.02728], [52.01701, 14.18884], { color: '#0000ff', weight: 10 }).addTo(map);

const draggable = new DraggableLines(map);
draggable.enable();
```

By default, `DraggableLines` makes all Polylines and Polygons with `interactive: true` on the map draggable, including ones that
are added after it has been enabled.


### Usage for routes

A route is usually a Polyline whose points are calculated to be the best path to get from one place to another, potentially via
some specified waypoints. When you drag a route, you don't want the shape of the underlying Polyline to be modified directly, but
you rather want a new waypoint to be inserted and the route to be recalculated based on that.

Leaflet.DraggableLines adds an additional option `draggableLinesRoutePoints` to Polyline and all classes inheriting from it.
Passsing this option will cause Leaflet.DraggableLines to modify the points in this option rather than the points of the line itself
when the user interacts with the line. (**Note:** To update the route points of an existing line, call
`layer.setDraggableLinesRoutePoints(latlngs)` rather than setting the option by hand. This way Leaflet.DraggableLines will notice
the change and update the drag markers accordingly.)

Since the value of this option does not have any effect on the line itself, you need to recalculate the route every time the user
has changed the course of the route. You can do this by subscribing to the events `dragend` (the user has finished dragging a point),
`remove` (the user has removed a point by clicking on it) and `insert` (the user has added a point by clicking the line).

```javascript
const route = new L.Polyline([], { draggableLinesRoutePoints: [[53.09897, 12.02728], [52.01701, 14.18884]] }).addTo(map);
async function updateRoute() {
	route.setLatLngs(await calculateRoute(route.getDraggableLinesRoutePoints()));
}
updateRoute();

const draggable = new DraggableLines(map);
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
true for all Polylines that have `interactive: true` (including polygons because `L.Polygon` is a sub-type of `L.Polyline`). The callback
is only called for Polylines and its sub-types. Other types are not supported.

An example how to control whether dragging is enabled for a particular layer would be to introduce a custom option:
```javascript
L.Polyline([[53.09897, 12.02728], [52.01701, 14.18884]], { enableDraggableLines: true }).addTo(map);
L.Polyline([[52.93871, 11.92566], [52.73629, 12.57935]], { enableDraggableLines: false }).addTo(map);

new DraggableLines(map, {
	enableForLayer: (layer) => layer.options.enableDraggableLines
}).enable();
```

An alternative way is to manually enable dragging for specific layers using the `enableForLayer` method. To disable automatic enabling
for all layers, pass a function that always returns `false` as `enableForLayer`. As a short-hand, `enableForLayer` also supports passing
a boolean directly:
```javascript
const layer1 = L.Polyline([[53.09897, 12.02728], [52.01701, 14.18884]]).addTo(map);
const layer2 = L.Polyline([[52.93871, 11.92566], [52.73629, 12.57935]]).addTo(map);

const draggable = new DraggableLines(map, {
	enableForLayer: false
});
draggable.enable();
draggable.enableForLayer(layer1);
```


### Options

You can pass the following options as the second parameter to `DraggableLines`:

* `enableForLayer`: Configures for which layers dragging should be enabled automatically. When `DraggableLines` is enabled by
  calling `enable()`, all Polylines on the map are checked against this. If a Polyline is added to the map later, is is also
  checked against this value.

  Supports different types:

  * A callback that receives a Polyline layer as its parameter and returns a boolean
  * An array of Polylines
  * A single Polyline
  * A boolean to enable/disable it for all layers.

  By default this is a callback that returns true for all Polylines that have `interactive: true`.
* `dragMarkerOptions`: A callback that should return the marker options for the draggable markers that are added at every line point.
  Receives 3 arguments: the Polyline layer, the index of this marker in the list of line points (starting with 0) and the number
  of line points. By default, returns a green marker for the first line point, a red marker for the last one and a blue marker
  for all other line points. By default, the marker is on the marker pane behind all other markers.
* `tempMarkerOptions`: A callback that should return the marker options for the temporary marker that appears when hovering a line.
  Receives the Polyline layer as an argument. By default, returns a blue marker.
* `plusMarkerOptions`: A callback that should return the marker options for the plus marker that appears at the start and end of a line
  (unless `allowExtendingLine` is `false`). Receives 2 arguments: the Polyline layer and a boolean that is `true` if the marker is at
  the start of the line or `false` if it is at the end. By default, renders a plus in a circle on the overlay pane behind all other
  overlays.
* `plusTempMarkerOptions`: A callback that should return the marker options for the temporary marker that appears when hovering the plus
  plus markers. Receives 2 arguments: the Polyline layer and a boolean that is `true` if the marker is at the start of the line or
  `false` if it is at the end. By default, renders a green marker at the start of the line and a red marker at the end, on the marker
  pane behind all other markers.
* `allowExtendingLine`: If `true` (default), users are allowed to drag the line in a way that adds additional points before the first
  point and after the last point. This will add draggable plus icons before the start and after the end of each line. Has no effect
  on Polygons.

**Note:** If you want to enable dragging behaviour without showing any drag markers, you need to pass an invisible icon with the
dimensions of the desired draggable areas.


### Events

These events are fired on the `DraggableLines` instance.

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


#### `dragmouseover`, `dragmouseout`

Fired when the user hovers or unhovers one of the draggable markers that is rendered on every line point.

Carries an object with the following properties:
* `layer`: The Polyline which the drag marker belongs to
* `marker`: The marker, an instance of `DraggableLines.DragMarker`
* `idx`: The index to which point the marker belongs. A number for simple Polylines, a tuple of two numbers for a MultiPolyline
  or a Polygon.


#### `tempmouseover`, `tempmousemove`, `tempmouseout`

Fired as the user hovers or unhovers the line and a temporary drag marker is shown/hidden.

Carries an object with the following properties:
* `layer`: The Polyline which is hovered
* `marker`: The temporary marker, an instance of `DraggableLines.TempMarker`
* `idx`: The index where a route point would be inserted if the user started dragging from here. A number for simple Polylines,
  a tuple of two numbers for a MultiPolyline or a Polygon. Note that this can change as the user hovers across the line. The
  `tempmouseout` event may have a different `idx` than its preceding `tempmouseover` event.
* `latlng`: The position where the temporary marker is currently rendered. This is an exact position on the line.


#### `plusmouseover`, `plusmouseout`

Fired as the user hovers or unhovers the plus icons at the beginning and end of a line.

Carries an object with the following properties:
* `layer`: The Polyline to which the plus icons belong
* `marker`: The temporary marker which is rendered on top of the plus icon, an instance of `DraggableLines.PlusTempMarker`
  (which is a sub-class of `DraggableLines.TempMarker`)
* `plusMarker`: The marker that contains the plus icon, an instance of `DraggableLines.PlusMarker`.
* `idx`: The index where a route point would be inserted if the user started dragging from here. A number for simple Polylines,
  a tuple of two numbers for a MultiPolyline. Because plus icons are only rendered at the very beginning and end of each line,
  the index is either 0 or equal to the length of route points.


### Methods

These methods can be called on instances of `DraggableLines`.

* `enableForLayer(layer)`: Manually enable dragging for a specific layer.
* `disableForLayer(layer)`: Manually disable dragging for a specific layer.
* `redraw()`: Reapply the options and redraw the drag markers for all lines. Call this after making any changes to the `options`
  property to apply the changes.
* `redrawForLayer(layer)`: Redraw the drag markers for a specific line.


### Polyline extensions

Leaflet.DraggableLines adds various methods and options to the Polyline subclass. These can be used with any instances of
Polyline and its subclasses.

#### Options

* `draggableLinesRoutePoints`: An array of LatLng expressions that represent the waypoints of the route that this Polyline
  represents. When this option is set, Leaflet.DraggableLines renders the points from this array instead of the ones
  from `getLatLngs()` as draggable markers, and when the route is dragged it modifies this array instead of the actual
  points of the line.

  This is only supported for single polylines, it is not supported for Polygons or MultiPolylines
  where `getLatLngs()` returns an array of arrays.

  To update the route points of an existing line, use the `setDraggableLinesRoutePoints` method rather than setting
  `layer.options.draggableLinesRoutePoints` manually, to make sure that `DraggableLines` notices the change and
  updates the positions of the drag markers.

#### Methods

* `hasDraggableLinesRoutePoints()`: Returns a boolean whether this Polyline has `draggableLinesRoutePoints` set.
* `getDraggableLinesRoutePoints()`: Returns the `draggableLinesRoutePoints` option as an array of `L.LatLng` instances.
* `setDraggableLinesRoutePoints(routePoints)`: Update the `draggableLinesRoutePoints` option.

#### Events

* `draggableLines-setLatLngs`: Fired after the points of this layer are updated using the `setLatLngs()` method.
* `draggableLines-setRoutePoints`: Fired after the `draggableLinesRoutePoints` option is updated using the
  `setDraggableLinesRoutePoints` method.

## Usage with rectangles

`L.Rectangle` is a sub-class of `L.Polygon`, so it is made draggable by default. Since rectangles are a special type of polygon, their behaviour differs in the following ways:
* Rectangles always have 4 drag markers corresponding to their corners. Their indexes are `0` (south-west), `1` (north-west), `2` (north-east) and `3` (south-east).
* Dragging any of the drag markers will keep the shape rectangular, so it will affect the positions of one or two other drag markers.
* It is not possible to insert additional waypoints by clicking the border of the rectangle. No temporary drag marker is shown on hover.
* It is not possible to remove waypoints from rectangles. Nothing will happen when clicking the drag markers, even when `removeOnClick` is set to true.
* The `draggableLinesRoutePoints` option is ignored for rectangles.