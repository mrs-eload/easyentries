/*const anime = require('animejs').default;
const deg_container = document.getElementById('deg_val');
const slider = document.querySelector('.progress');
var circle_outline = anime.path('.circle_outline path');
var animation = anime({
    targets: '.plane',
    translateX: circle_outline('x'),
    translateY: circle_outline('y'),
    rotate: circle_outline('angle'),
    easing: 'linear',
    autoplay:false,
    update: onTick
});

var rotation = getTransformation(animation.animations, "rotate");
rotation = "0deg";


function getTransformation(transform_array, property){
    for(var i = 0; i < transform_array.length; i++){
        if(transform_array[i].property === property){
            return transform_array[i];
        }
    }
}

function toDegrees(value){
    //convert negative value to actual degrees
    return (value[0] === '-') ? 360 + parseFloat(value) : parseFloat(value);
}

function onTick(anim){
    var rotation = getTransformation(anim.animations, "rotate");
    var current_deg = toDegrees(rotation.currentValue);
    deg_container.innerHTML = Math.floor(current_deg) + '°';
    console.log(animation)
}
slider.addEventListener('input', function() {
    animation.seek(animation.duration * (slider.value / 100));
});
console.log(animation);
console.log(circle_outline);*/
const paper = require('paper');
const canvas = document.getElementById('entry-tool-canvas');

const $progress_bar =  document.getElementById('progress');
const $entry_radial =  document.getElementById('outbound_progress');

const $plane_radial = document.getElementById('plane_radial');
const $plane_heading = document.getElementById('plane_heading');

const $outbound_radial = document.getElementById('outbound_radial');

let axis_radial = 90;
let plane_radial = 180;

const img = new Image();
img.src = "/aeroplane.svg";
img.id = "plane";

paper.setup(canvas);

let project = paper.project;

let movable_layer = new paper.Layer();
let intersectionGroup = new paper.Group();
let textGroup = new paper.Group();
let planeText = new paper.Group();
//Circle
let center = new paper.Point(400,400);
let deg360 = new paper.Point(400,200);
let deg90 = new paper.Point(600,400);
let deg180 = new paper.Point(400,600);
let deg270 = new paper.Point(200,400);

let base_vector = center.subtract(deg360);
let entry_vector = base_vector.clone();

let circle = new paper.Shape.Circle(center, 200);
let circle_path = circle.toPath(false);
circle.strokeColor = "green";
circle.strokeWidth = 2;

//Fixed axis
let hAxis = new paper.Path.Line(deg90, deg270);
let yAxis = new paper.Path.Line(deg360,deg180);
let fixed_axis = new paper.Layer([hAxis,yAxis]);
let intersections = null;


fixed_axis.name = 'fixed_axis';
fixed_axis.strokeColor = 'black';
fixed_axis.dashArray = [6,6];

let entries = new paper.Layer();
entries.name = 'entries';

let plane = null;
let last_degree = {plane:0, axis: 0};

img.onload = (cb) => {
    init();
};

function init(){
    debug();
    setup();
    console.log(plane);
}


function debug(){
    let debug_circles = new paper.Layer();
    project.addLayer(debug_circles);
    let circle360 = new paper.Shape.Circle(deg360, 4);
    let circle90 = new paper.Shape.Circle(deg90, 4);
    let circle180 = new paper.Shape.Circle(deg180, 4);
    let circle270 = new paper.Shape.Circle(deg270, 4);
    let work_circles = [circle360,circle90,circle180,circle270];
    debug_circles.addChildren(work_circles);
    debug_circles.fillColor = 'red';
    debug_circles.name = 'debug_circles';
}

function setup(){
    $progress_bar.addEventListener('input', onProgressBarStep);
    $entry_radial.addEventListener('input', onProgressBarStep);
    updateText(last_degree.plane, 'plane');
    updateText(last_degree.axis, 'axis');

    setupMovable();

    let center_circle = new paper.Shape.Circle(center, 4);
    center_circle.fillColor = 'red';
    center_circle.bringToFront();

    plane = new paper.Raster(img);
    plane.width = 100;
    plane.height = 100;
    plane.position = deg180;
    console.log(project);
    textGroup = new paper.Group();
    updateEntry();
}

function setupMovable(){
    let axis_layer = drawAxis();
    let basic_hold = drawHoldingPattern();
    drawEntries();
    movable_layer.addChild(axis_layer);
    movable_layer.addChild(basic_hold);
    movable_layer.addChild(entries);
    movable_layer.name = 'movable';
}

function onProgressBarStep(event){
    let degree = event.target.value;
    if( degree < 1) degree = 360;
    let to_move = event.target.dataset.obj;

    degree = parseInt(degree);
    let rotation = 0;
    if(to_move === 'plane'){
        rotation = degree - last_degree.plane;
        last_degree.plane = degree;
        plane.rotate(parseInt(rotation), center);
        updateText(last_degree.plane, 'plane');
    }else if( to_move === 'axis'){
        updateAxis();
        rotation = degree - last_degree.axis;
        last_degree.axis = degree;
        entry_vector.angle += rotation;
        movable_layer.rotate(parseInt(rotation), center);
        updateText(last_degree.axis, 'axis')
    }
    updateEntry();
}

function updateEntry(){
    planeText.removeChildren();
    let text = new paper.PointText(plane.position);
    let vector = center.subtract(plane.position);
    let angle = getFullAngle(entry_vector.getDirectedAngle(vector));
    let txt_angle = getFullAngle(base_vector.getDirectedAngle(vector));

    if(angle > 20 && angle < 200){
        entries.children.forEach(item => item.visible = item.name === 'direct');
        text.content = "Entrée directe";
    }else if(angle >= 200 && angle < 270){
        entries.children.forEach(item => item.visible = item.name === 'direct' || item.name === 'teardrop');
        text.content = "Entrée décalée";
    }else{
        entries.children.forEach(item => item.visible = item.name === 'direct' || item.name === 'parallel');
        text.content = "Entrée parallèle";
    }

    text.fontSize = 24;
    text.fillColor = 'steelblue';
    text.strokeColor = 'steelblue';
    text.strokeWidth = 1.5;
    text.shadowColor = new paper.Color(70,130,180);
        // Set the shadow blur radius to 12:
    text.shadowBlur = 0;
    text.shadowOffset = new paper.Point(1, 1);
    text.parent = planeText;
    text.position.y = (txt_angle > 90 && txt_angle < 270 ) ? plane.position.y + 80 : plane.position.y - 80;
    text.position.x = (txt_angle > 180) ? plane.position.x - 30 : plane.position.x + 30;
}

function updateText (last, type){

    let heading = getHeading(last);

    if(type === 'plane'){
        let radial = getRadial(last, plane_radial);
        $plane_heading.innerHTML = 'Cap avion:' + addLeadingZero(heading) + '°';
        $plane_radial.innerHTML = 'Route avion: Radial ' + addLeadingZero(radial) + '°';
    }

    if(type === 'axis'){
        let radial = getRadial(last, axis_radial);
        $outbound_radial.innerHTML = 'Axe d\'éloignement: Radial ' + addLeadingZero(radial) + '°';
    }
}

function getRadial(last, radial){
    return (radial + last > 360) ? (radial + last) - 360 : radial + last;
}

function getHeading(last){
    return last;
}

function drawAxis () {
    let axis_layer = new paper.Layer();
    axis_layer.name = 'axis_layer';

    let mhAxis = new paper.Path.Line(new paper.Point(deg90.x + 30, deg90.y), new paper.Point(deg270.x - 30,deg270.y));
    mhAxis.name = 'hAxis';
    let p1 = deg360.clone();
    let p2 = deg180.clone();
    p1.y = p1.y - 30;
    p2.y = p2.y + 30;
    let mvAxis = new paper.Path.Line(p1.rotate(20, center), p2.rotate(20, center));
    mvAxis.name = 'vAxis';
    axis_layer.addChild(mhAxis);
    axis_layer.addChild(mvAxis);
    axis_layer.strokeColor = 'green';
    // getIntersections(mhAxis);
    // getIntersections(mvAxis);
    return axis_layer;

}

function drawHoldingPattern(){
    let basic_holding = new paper.Layer();
    basic_holding.name = 'basic_holding';
    let rectangle = new paper.Rectangle(new paper.Point(center.x - 40, center.y - 90), new paper.Point(deg90.x - 40, deg90.y));
    let radius = new paper.Size(45, 45);
    let hold = new paper.Path.Rectangle(rectangle, radius);
    hold.strokeColor = 'black';
    hold.strokeColor.alpha = 0.5;
    hold.strokeWidth = 3;
    basic_holding.addChild(hold);
    return basic_holding;
}

function drawEntries(){
    let rect_top = new paper.Point(center.x - 40, center.y - 85);
    let rect_bottom = new paper.Point(deg90.x - 40, deg90.y + 1);
    let rectangle = new paper.Rectangle(rect_top, rect_bottom);
    let radius = new paper.Size(45, 45);
    let direct = new paper.Path.Rectangle(rectangle, radius);

    direct.strokeColor = 'red';
    direct.strokeWidth = 2;
    direct.name = 'direct';

    //Create Compound Path holder
    let teardrop = new paper.CompoundPath();
    teardrop.name = 'teardrop';

    let start = deg360.clone();
    start = start.rotate(60, center);
    let temp_segment = new paper.Path.Line(center, start);
    let inter = temp_segment.getIntersections(direct);
    let turning_point = null;
    inter.forEach(inters => {
        turning_point = inters.point;
    });

    let teardrop_segment = new paper.Path.Line(center, turning_point);
    let through = new paper.Point(deg90.x - 40, center.y - 42.5);
    let final = new paper.Point(deg90.x - 80, deg90.y);
    let teardrop_arc = new paper.Path.Arc(turning_point, through, final);
    let inbound_seg = new paper.Path.Line(center, final);
    teardrop.addChild(teardrop_segment);
    teardrop.addChild(teardrop_arc);
    teardrop.addChild(inbound_seg);
    teardrop.strokeColor = 'blue';
    teardrop.strokeWidth = 2;

    let parallel = new paper.CompoundPath();
    parallel.name = 'parallel';

    let point1 = new paper.Point(center.x + 20, center.y + 5);
    let point2 = new paper.Point(deg90.x - 60, deg90.y + 5);
    let point3 = turning_point.clone();
    let point4 = new paper.Point(center.x + 50, center.y);
    let arc2_through = new paper.Point(center.x + 80, center.y - 20);
    point3.y = point3.y + 30;
    point3.x = point3.x - 30;
    let segment1 = new paper.Path.Line(center, point1);
    let segment2 = new paper.Path.Line(point1, point2);

    let segment3 = new paper.Path.Line(point4, center);
    let arc2 = new paper.Path.Arc(point3,arc2_through , point4)
    let arc_through = new paper.Point(point2.x +  30 , point2.y - 40);
    let arc = new paper.Path.Arc(point2, arc_through, point3);

    parallel.addChild(segment1);
    parallel.addChild(segment2);
    parallel.addChild(arc);
    parallel.addChild(arc2);
    parallel.addChild(segment3);

    parallel.strokeColor = 'blue';
    parallel.strokeWidth = 2;

    entries.addChild(parallel);
    entries.addChild(direct);
    entries.addChild(teardrop);
}

function getFullAngle(angle){
    if(angle < 0){
        angle = 180 - Math.abs(angle);
        angle = Math.abs(angle) + 180
    }
    return Math.floor(angle);
}



function getIntersections(axis){
    let intersection_points = [];
    let intersections = circle_path.getIntersections(axis);
    for (let i = 0; i < intersections.length; i++) {
        let point1 = intersections[i].point;
        let vector = center.subtract(point1);
        let angle = getFullAngle(base_vector.getDirectedAngle(vector));

        let text = new paper.PointText(intersections[i].point);
        text.fillColor = 'black';
        text.content = addLeadingZero(angle) + '°';
        text.parent = textGroup;
        text.position.y = (angle > 90 && angle < 270 ) ? intersections[i].point.y + 10 : intersections[i].point.y - 10;
        text.position.x = (angle > 180) ? intersections[i].point.x - 30 : intersections[i].point.x + 30;
        let intersectionPath = new paper.Path.Circle({
            center: intersections[i].point,
            radius: 4,
            fillColor: 'red',
            parent: intersectionGroup
        });
    }
    return intersection_points;
}

function updateAxis() {
    let axis_layer = movable_layer.children['axis_layer'];
    let axises = axis_layer.children;

    intersectionGroup.removeChildren();
    textGroup.removeChildren();

    axises.forEach(axis => {
        getIntersections(axis)
    });
}

function addLeadingZero(degree){
    if(degree < 10){
        return '00'+degree;
    }else if( degree < 100){
        return '0' + degree;
    }
    return degree;
}