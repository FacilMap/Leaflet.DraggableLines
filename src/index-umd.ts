import DraggableLinesHandler from './handler';
import './injections';
import * as utils from './utils';
import * as icons from './markers/icons';
import DraggableLinesMarker from './markers/marker';
import DraggableLinesDragMarker from './markers/dragMarker';
import DraggableLinesTempMarker from './markers/tempMarker';
import DraggableLinesPlusMarker, { DraggableLinesPlusTempMarker } from './markers/plusMarker';

export default DraggableLinesHandler;

Object.assign(DraggableLinesHandler, {
    ...utils,
    icons,
    Marker: DraggableLinesMarker,
    DragMarker: DraggableLinesDragMarker,
    TempMarker: DraggableLinesTempMarker,
    PlusMarker: DraggableLinesPlusMarker,
    PlusTempMarker: DraggableLinesPlusTempMarker
});