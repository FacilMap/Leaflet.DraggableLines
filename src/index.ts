import L from 'leaflet';
import DraggableLines from './DraggableLines';
import './injections';
import * as utils from './utils';

type DraggableLinesType = typeof DraggableLines;

declare module "leaflet" {
    let DraggableLines: DraggableLinesType & typeof utils;
}

L.DraggableLines = Object.assign(DraggableLines, utils);

export default DraggableLines;