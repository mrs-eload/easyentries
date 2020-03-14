import * as paper from 'paper'
import Color = paper.Color;
import CompoundPath = paper.CompoundPath;
import Group = paper.Group;
import {nCircle} from "./circle";
import {Axis} from "./axis";
import Path = paper.Path;
import {translations} from "./translation";

const canvas = document.getElementById('entry-tool-canvas');
const $std_chkbx = document.getElementById('enable_nnstd');

const $progress_bar =  document.getElementById('progress');
const $entry_radial =  document.getElementById('outbound_progress');

const $plane_radial = document.getElementById('plane_radial');
const $plane_heading = document.getElementById('plane_heading');

const $outbound_radial = document.getElementById('outbound_radial');

// INPUT FIELDS

const $plane_input = document.getElementById('plane-hdg-input');
const $plane_btn = document.getElementById('plane-heading-btn');
const $lang_btns = document.querySelectorAll('.switchlang');

const $outbound_input = document.getElementById('outbound-input');
const $outbound_btn = document.getElementById('outbound-btn');


let axis_radial = 90;
let plane_radial = 180;

// @ts-ignore
paper.setup(canvas);
let project = paper.project;
let plane = null;

const img = new Image();
img.src = "/aeroplane.svg";
img.id = "plane";

img.onload = (cb) => {
    draw();
    setup();
    switchHand('r');
    updateAxis(0,0);
    updateEntry();
};

let lang = (document.location.hash === "#fr" || document.location.hash === "#en")  ? document.location.hash.replace('#','') : document.documentElement.lang ;

let center = new paper.Point(325,300);
let beacon = new paper.Shape.Circle(center,6);
beacon.fillColor = new Color('green');
let circle = new nCircle(center, 200,"#333333");

let base_vector = center.subtract(circle.deg360);
let entry_vector = base_vector.clone();

let hAxis = new Axis (circle.deg90, circle.deg270);
let yAxis = new Axis (circle.deg360,circle.deg180);
let fixed_axis = new paper.Layer([hAxis,yAxis]);

fixed_axis.name = 'fixed_axis';
fixed_axis.strokeColor = new Color('#000000');
fixed_axis.dashArray = [6,6];

let current_prefix = 'r';
let movable = {
    r: {
        axis: null,
        basic_hold: null,
        entries: null,
        text: new Group(),
        intersections: new Group(),
        arrows: null
    },
    l: {
        axis: null,
        basic_hold: null,
        entries: null,
        text: new Group(),
        intersections: new Group(),
        arrows: null
    },
};
let last_degree = {plane:0, axis: 0};
let planeText = new Group();

function setup (){
    onLangChange(null);
    $std_chkbx.addEventListener('change', onStdChange);
    $progress_bar.addEventListener('input', onProgressBarStep);
    $entry_radial.addEventListener('input', onProgressBarStep);

    $plane_input.addEventListener("keyup", onKeyBoardInput);
    $outbound_input.addEventListener("keyup", onKeyBoardInput);
    $outbound_btn.addEventListener('click', onProgressBarStep);
    $plane_btn.addEventListener('click', onProgressBarStep);
    $lang_btns.forEach($lang => $lang.addEventListener('click',onLangChange));

    updateText(last_degree.plane, 'plane');
    updateText(last_degree.axis, 'axis');
}

function onKeyBoardInput (event){
    let to_move = event.target.dataset.obj;

    switch(event.key){
        case "Enter":
        case "ArrowUp":
        case "ArrowDown":
            event.preventDefault();
            if(to_move === 'axis'){
                $outbound_btn.click();
            }else{
                $plane_btn.click();
            }
            break;
        default: return;
    }
}

function onProgressBarStep(event){
    let degree = event.target.value;
    let to_move = event.target.dataset.obj;
    let $input = (to_move === 'plane') ? $plane_input : $outbound_input;
    if(event.target.nodeName === 'BUTTON'){
        // @ts-ignore
        let val = parseInt($input.value);
        if(val < 0 || val > 360) return;
        if( val < 1) val = 360;
        if(to_move === "axis"){
            degree = (val < 90) ? 270 + (val) : val - 90;
            // @ts-ignore
            $entry_radial.value = degree;
            // @ts-ignore
            $entry_radial.MaterialSlider.change();
        }else{
            degree = (val < 180) ? 180 + (val) : val - 180;
            degree = Math.abs(val);
            // @ts-ignore
            $progress_bar.value = (degree == 360) ? 0 : degree;
            // @ts-ignore
            $progress_bar.MaterialSlider.change();
        }
    }

    if( degree < 1) degree = 360;
    degree = parseInt(degree);

    let rotation = 0;
    if(to_move === 'plane'){
        updatePlane(degree);
        updateText(last_degree.plane, 'plane');
        // @ts-ignore
        $plane_input.value = last_degree.plane;
    }else if( to_move === 'axis'){
        updateAxis(rotation, degree);
        rotation = updateEntriesPosition(rotation, degree);

        last_degree.axis = degree;
        entry_vector.angle += rotation;

        updateText(last_degree.axis, 'axis');
        // @ts-ignore
        $outbound_input.value = getRadial(last_degree.axis, axis_radial);
    }
    updateEntry();
}


function onStdChange(event){
    let prefix = (event.target.checked) ? 'l': 'r';
    current_prefix = prefix;
    switchHand(prefix);
    updateEntry();
}

function onLangChange(event){
    lang = (event) ? event.target.dataset.lang : lang;
    let $button = document.querySelectorAll('.switchlang');
    if(event) {
        $button.forEach($btn => $btn.classList.remove('active'));
        event.target.classList.add('active');
        document.location.hash = `#${lang}`
    }else{
        $button.forEach($btn => $btn.classList.remove('active'));
        $button.forEach($btn => {
            //@ts-ignore
            if($btn.dataset.lang === lang){
                $btn.classList.add('active')
            }
        });
    }

    let translatables = document.querySelectorAll('.translatable');
    for(let i = 0; i < translatables.length; i++){
        let to_trans = translatables[i];
        //@ts-ignore
        to_trans.innerHTML = translations[lang][to_trans.dataset.trans]
    }
    updateText(last_degree.plane, 'plane');
    updateText(last_degree.axis, 'axis');
    updateEntry();
}

function draw () {
    movable.r.axis = drawAxis('r');
    movable.r.basic_hold = drawHoldingPattern('r');
    movable.r.entries = drawEntries('r');

    movable.l.axis = drawAxis('l');
    movable.l.basic_hold = drawHoldingPattern('l');
    movable.l.entries = drawEntries('l');

    let plane_layer = new paper.Layer();
    plane_layer.name = 'plane';

    plane = new paper.Raster(img);
    plane.width = 100;
    plane.height = 100;
    plane.position = circle.deg180;
    plane_layer.addChild(plane);
    console.log(project);
}

function switchHand (prefix) {
    for(let hand in movable){
        movable[hand].axis.visible = false;
        movable[hand].basic_hold.visible = false;
        movable[hand].entries.visible = false;
        movable[hand].text.visible = false;
        movable[hand].intersections.visible = false;
    }
    movable[prefix].axis.visible = true;
    movable[prefix].basic_hold.visible = true;
    movable[prefix].entries.visible = true;
    movable[prefix].text.visible = true;
    movable[prefix].intersections.visible = true;
}


function drawAxis (prefix) {
    let axis_layer = new paper.Layer();
    axis_layer.name = `${prefix}_axis_layer`;

    let mhAxis = new Axis (new paper.Point(circle.deg90.x + 30, circle.deg90.y), new paper.Point(circle.deg270.x - 30, circle.deg270.y));
    mhAxis.name = `${prefix}_hAxis`;

    let p1 = circle.deg360.clone();
    let p2 = circle.deg180.clone();
    p1.y = p1.y - 30;
    p2.y = p2.y + 30;

    let angle = (prefix === 'l') ? -20 : 20;

    let mvAxis = new Axis (p1.rotate(angle, center), p2.rotate(angle, center));
    mvAxis.name = `${prefix}_vAxis`;

    axis_layer.addChild(mhAxis);
    axis_layer.addChild(mvAxis);
    axis_layer.strokeColor = new Color('green');
    return axis_layer;

}

function drawHoldingPattern (prefix){
    let basic_holding = new paper.Layer();

    basic_holding.name = `${prefix}_basic_holding`;
    let x_modifier = (prefix === 'l') ? -40 :  -40;
    let y_modifier = (prefix === 'l') ? 90 : -90;
    let top_left = new paper.Point(center.x + x_modifier, center.y + y_modifier);
    let bottom_right = new paper.Point(circle.deg90.x + x_modifier, circle.deg90.y);

    let rectangle = new paper.Rectangle(top_left, bottom_right);

    let radius = new paper.Size(45, 45);
    let hold = new paper.Path.Rectangle(rectangle, radius);
    hold.strokeColor = new Color('#000000');
    hold.strokeColor.alpha = 0.5;
    hold.strokeWidth = 3;
    basic_holding.addChild(hold);
    return basic_holding;
}

function updateEntriesPosition(rotation, degree){
    for(let prefix in movable){
        rotation = degree - last_degree.axis;
        movable[prefix].entries.rotate(Math.floor(rotation), center);
        movable[prefix].basic_hold.rotate(Math.floor(rotation), center);
    }
    return rotation;
}

function updateEntry(){
    planeText.removeChildren();
    let text = new paper.PointText(plane.position);
    let vector = center.subtract(plane.position);
    let angle = getFullAngle(entry_vector.getDirectedAngle(vector));
    let txt_angle = getFullAngle(base_vector.getDirectedAngle(vector));
    console.log(angle);

    if(current_prefix === 'r'){
        if(angle > 20 && angle < 200){
            text.content = showDirect();
        }else if(angle >= 200 && angle < 270){
            text.content = showTearDrop()
        }else{
            text.content = showParallel()
        }
    }else{
        if(angle > 340 || angle < 160){
            text.content = showDirect();
        }else if(angle >= 160 && angle < 270){
            text.content = showParallel()
        }else{
            text.content = showTearDrop()
        }
    }

    text.fontSize = 24;
    text.fillColor = new Color('#2e4b6c');
    text.strokeColor = new Color('#2e4b6c');
    text.strokeWidth = 0;
    text.shadowColor = new paper.Color('#2e4b6c');
    // Set the shadow blur radius to 12:
    text.fontWeight = 700;
    text.shadowBlur = 1;
    text.shadowOffset = new paper.Point(0, 0);
    text.parent = planeText;
    text.position.y = (txt_angle > 90 && txt_angle < 270 ) ? plane.position.y + 80 : plane.position.y - 80;
    text.position.x = (txt_angle > 180) ? plane.position.x - 30 : plane.position.x + 30;
}

function showDirect() {
    for ( let prefix in movable){
        movable[prefix].entries.children.forEach(item => {
            if(item.name === `${current_prefix}_direct`){
                item.visible = true;
                item.opacity = 1;
            }else{
                item.visible = false
            }
        });
    }
    return translations[lang].direct;
}

function showTearDrop(){
    for ( let prefix in movable){
        movable[prefix].entries.children.forEach(item => {
            item.visible = item.name === `${current_prefix}_direct` || item.name === `${current_prefix}_teardrop`
            if(item.name === `${current_prefix}_direct`){
                item.opacity = 0.5;
            }
        });
    }
    return translations[lang].teardrop;
}

function showParallel(){
    for ( let prefix in movable){
        movable[prefix].entries.children.forEach(item => {
            item.visible = item.name === `${current_prefix}_direct` || item.name === `${current_prefix}_parallel`;
            if(item.name === `${current_prefix}_direct`){
                item.opacity = 0.5;
            }
        });
    }
    return translations[lang].parallel;
}

function drawDirect(prefix){

    let rect_x_modifier = (prefix === 'l') ? -40 :  -40;
    let rect_y_modifier = (prefix === 'l') ? 85 : -85;

    let direct = new CompoundPath('');

    let rect_top = new paper.Point(center.x + rect_x_modifier, center.y + rect_y_modifier);
    let rect_bottom = new paper.Point(circle.deg90.x + rect_x_modifier, circle.deg90.y + 1);
    let rectangle = new paper.Rectangle(rect_top, rect_bottom);
    let radius = new paper.Size(45, 45);
    let pattern = new paper.Path.Rectangle(rectangle, radius);

    let outbnd_arrow = createArrow(center.x - rect_x_modifier + 20, center.y + rect_y_modifier);

    let inbnd_arrow = outbnd_arrow.clone();
    inbnd_arrow.rotate(180);
    inbnd_arrow.position.y = center.y;

    direct.addChild(pattern);
    direct.addChild(outbnd_arrow);
    direct.addChild(inbnd_arrow);

    direct.strokeColor = new Color('#FF0000');
    direct.strokeWidth = 2;

    direct.name = `${prefix}_direct`;

    return direct;
}

function drawTearDrop(prefix, direct){

    //Create Compound Path holder
    let teardrop = new CompoundPath('');
    teardrop.name = `${prefix}_teardrop`;

    let start = circle.deg90.clone();
    let angle = (prefix ==='l') ? 30 : -30;
    start = start.rotate(angle, center);
    let temp_segment = new paper.Path.Line(center, start);
    let inter = temp_segment.getIntersections(direct);
    let turning_point = null;

    inter.forEach(inters => {
        turning_point = inters.point;
    });

    let through_modifier = {
        x : (prefix === 'l') ? -40 : -40,
        y: (prefix === 'l') ? 42.5 : -42.5
    };

    let final_modifiers = {
        x : (prefix === 'l') ? -80 : -80,
        y: (prefix === 'l') ? 0 : 0
    };

    let teardrop_segment = new paper.Path.Line(center, turning_point);
    let through = new paper.Point(circle.deg90.x + through_modifier.x, center.y + through_modifier.y);
    let final = new paper.Point(circle.deg90.x + final_modifiers.x, circle.deg90.y + final_modifiers.y);
    let teardrop_arc = new paper.Path.Arc(turning_point, through, final);
    let inbound_seg = new paper.Path.Line(center, final);

    let outbnd_arrow = createArrow(center.x + 100, center.y);
    let inbnd_arrow1 = outbnd_arrow.clone();
    outbnd_arrow.rotate(angle, center);

    inbnd_arrow1.rotate(180);
    inbnd_arrow1.position.y = center.y;

    teardrop.addChild(teardrop_segment);
    teardrop.addChild(teardrop_arc);
    teardrop.addChild(inbound_seg);
    teardrop.addChild(outbnd_arrow);
    teardrop.addChild(inbnd_arrow1);
    teardrop.strokeColor = new Color('#0000FF');
    teardrop.strokeWidth = 2;

    return {teardrop, turning_point};
}

function drawParallel(prefix, turning_point){
    let parallel = new paper.CompoundPath('');
    parallel.name = `${prefix}_parallel`;

    let point1, point2, point3, point4, arc2_through, segment1,segment2,segment3,arc2,arc_through,arc;

    let angle = (prefix === 'l') ? 42 : - 42;
    let modifiers = {
        point1: 5,
        point2: 5,
        arc2_through:  -20,
        point3: 30,
        arc_through: -40
    };
    if(prefix === 'l'){
        for(let key in modifiers){
            modifiers[key] = modifiers[key] * -1;
        }
    }

    point1 = new paper.Point(center.x + 20, center.y + modifiers.point1);
    point2 = new paper.Point(circle.deg90.x - 60, circle.deg90.y + modifiers.point2);
    point3 = turning_point.clone();
    point4 = new paper.Point(center.x + 50, center.y);
    arc2_through = new paper.Point(center.x + 80, center.y + modifiers.arc2_through);
    point3.y = point3.y + modifiers.point3;
    point3.x = point3.x - 30;
    segment1 = new paper.Path.Line(center, point1);
    segment2 = new paper.Path.Line(point1, point2);

    segment3 = new paper.Path.Line(point4, center);
    arc2 = new paper.Path.Arc(point3,arc2_through , point4);
    arc_through = new paper.Point(point2.x +  30 , point2.y + modifiers.arc2_through);
    arc = new paper.Path.Arc(point2, arc_through, point3);

    let outbnd_arrow = createArrow(arc2_through.x + 16, arc2_through.y - 10);
    let inbnd_arrow = outbnd_arrow.clone();
    if( prefix === 'l'){
        outbnd_arrow = createArrow(arc2_through.x + 5, arc2_through.y +2 );
    }

    outbnd_arrow.rotate(angle);
    inbnd_arrow.rotate(180);
    inbnd_arrow.position.y = point2.y;

    parallel.addChild(segment1);
    parallel.addChild(segment2);
    parallel.addChild(arc);
    parallel.addChild(arc2);
    parallel.addChild(segment3);
    parallel.addChild(inbnd_arrow);
    parallel.addChild(outbnd_arrow);


    parallel.strokeColor = new Color('#0000FF');
    parallel.strokeWidth = 2;

    return parallel;
}

function createArrow (x,y){
    let arrow = new paper.CompoundPath('');
    let arrow_head = new paper.Point(x, y);
    let arrow_base1 = new paper.Point(arrow_head.x - 10 , arrow_head.y + 8);
    let arrow_base2 = new paper.Point(arrow_head.x - 10, arrow_head.y - 8);
    arrow.addChild(new paper.Path.Line(arrow_base1, arrow_head));
    arrow.addChild(new paper.Path.Line(arrow_base2, arrow_head));
    return arrow;
}

function drawEntries(prefix){
    let entries = new paper.Layer();
    entries.name = 'entries';

    let direct = drawDirect(prefix);
    let {teardrop, turning_point} = drawTearDrop(prefix, direct);
    let parallel = drawParallel(prefix, turning_point);

    entries.addChild(parallel);
    entries.addChild(direct);
    entries.addChild(teardrop);

    return entries;
}



function getIntersections(axis, prefix){
    let intersections = circle.path.getIntersections(axis);
    for (let i = 0; i < intersections.length; i++) {
        let point1 = intersections[i].point;
        let vector = center.subtract(point1);
        let angle = getFullAngle(base_vector.getDirectedAngle(vector));

        let text = new paper.PointText(intersections[i].point);
        text.fillColor = new Color('#000000');
        text.content = addLeadingZero(angle) + '°';
        text.parent = movable[prefix].text;
        text.position.y = (angle > 90 && angle < 270 ) ? intersections[i].point.y + 10 : intersections[i].point.y - 10;
        text.position.x = (angle > 180) ? intersections[i].point.x - 30 : intersections[i].point.x + 30;
        let intersectionPath = new paper.Path.Circle({
            center: intersections[i].point,
            radius: 4,
            fillColor: '#000000',
            parent: movable[prefix].intersections
        });
    }
    return intersections;
}

function updateAxis(rotation, degree) {
    movable.l.intersections.removeChildren();
    movable.r.intersections.removeChildren();
    movable.l.text.removeChildren();
    movable.r.text.removeChildren();

    for(let prefix in movable){
        rotation = degree - last_degree.axis;
        movable[prefix].axis.rotate(Math.floor(rotation), center);
        let axis_layer = movable[prefix].axis;
        let axises = axis_layer.children;
        axises.forEach(axis => {
            getIntersections(axis, prefix);
        });
    }
    return {degree, rotation};
}

function updatePlane(degree){
    let rotation = degree - last_degree.plane;
    last_degree.plane = degree;
    plane.rotate(Math.floor(rotation), center);
}

function addLeadingZero(degree){
    if(degree < 10){
        return '00'+degree;
    }else if( degree < 100){
        return '0' + degree;
    }
    return degree;
}

function getFullAngle(angle){
    if(angle < 0){
        angle = 180 - Math.abs(angle);
        angle = Math.abs(angle) + 180
    }
    return Math.floor(angle);
}

function updateText (last, type){

    let heading = getHeading(last);
    heading = (heading < 1 || heading > 359) ? 360 : heading;
    if(type === 'plane'){
        let radial = getRadial(last, plane_radial);
        $plane_heading.innerHTML = `${translations[lang].plane_heading}: ${addLeadingZero(heading)}°`;
        $plane_radial.innerHTML = `${translations[lang].course }: ${addLeadingZero(radial)}°`;
    }

    if(type === 'axis'){
        let radial = getRadial(last, axis_radial);
        $outbound_radial.innerHTML = `${translations[lang].outbound_leg}: ${addLeadingZero(radial)}°`;
    }
}

function getRadial(last, radial){
    let final = (radial + last > 360) ? (radial + last) - 360 : radial + last;
    return (final < 1 || final > 359) ? 360 : final;
}

function getHeading(last){
    return last;
}
