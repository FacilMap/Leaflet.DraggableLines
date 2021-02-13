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
declare type DraggableLinesType = typeof DraggableLinesHandler;
declare module "leaflet" {
    let DraggableLines: DraggableLinesType & typeof utils & {
        icons: typeof icons;
        Marker: typeof DraggableLinesMarker;
        DragMarker: typeof DraggableLinesDragMarker;
        TempMarker: typeof DraggableLinesTempMarker;
        PlusMarker: typeof DraggableLinesPlusMarker;
    };
}
export default DraggableLinesHandler;
