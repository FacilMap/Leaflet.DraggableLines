import DraggableLinesHandler from './handler';
import './injections';
import * as utils from './utils';
import * as icons from './markers/icons';
import DraggableLinesMarker from './markers/marker';
import DraggableLinesDragMarker from './markers/dragMarker';
import DraggableLinesTempMarker from './markers/tempMarker';
import DraggableLinesPlusMarker from './markers/plusMarker';

export * from './utils';
export * from './markers/icons';
export { DraggableLinesMarker, DraggableLinesDragMarker, DraggableLinesTempMarker, DraggableLinesPlusMarker };

export default DraggableLinesHandler;

export const DraggableLines = Object.assign(DraggableLinesHandler, {
    ...utils,
    icons,
    Marker: DraggableLinesMarker,
    DragMarker: DraggableLinesDragMarker,
    TempMarker: DraggableLinesTempMarker,
    PlusMarker: DraggableLinesPlusMarker
});