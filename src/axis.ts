import * as paper from 'paper';
import Line = paper.Path.Line;
import Path = paper.Path;
import Point = paper.Point;
import Color = paper.Color;



export class Axis extends Line{

    name: string;
    path: Path.Line;

    constructor (start: Point, end: Point, width?: number, color?: string, dashed?: []) {
        super (start, end);
    }
}