import * as paper from 'paper';
import Circle = paper.Shape.Circle;
import Color = paper.Color;
import Point = paper.Point;
import Path = paper.Path;

export class nCircle extends Circle{

    center: Point;
    deg360: Point;
    deg90: Point;
    deg180: Point;
    deg270: Point;
    path: Path.Circle;
    diameter: number;

    constructor (center:Point, radius:number, color: string) {
        super(center, radius);
        this.center = center;
        this.diameter = radius * 2;
        this.path = this.toPath(false);
        this.deg360 = new Point(this.center.x, this.center.y - radius);
        this.deg90 = new Point(this.center.x + radius, this.center.y);
        this.deg180 = new Point(this.center.x, this.center.y + radius);
        this.deg270 = new Point(this.center.x - radius, this.center.y);
        this.strokeColor = new Color(color);
        this.strokeWidth = 2;
    }
}


