var MAX_DISTANCE = 10;

function renderPolygon(locationX, locationY, points, color) {
	ctx.beginPath();
	ctx.moveTo(locationX, locationY);
	for (var j = 0; j < points.length; j++) {
		var point = points[j];
		ctx.lineTo(point.x + locationX, point.y + locationY);
	}
	ctx.closePath();
	ctx.stroke();
	ctx.fillStyle = color;
	ctx.fill();
}

function renderWall(hole, height, width, location) {
	ctx.fillStyle = "blue";
	ctx.fillRect(location.x, location.y, width, height);
	ctx.beginPath();
	renderPolygon(location.x + hole.location.x, location.y + hole.location.y, hole.points, "#000000");
}

function scalePolygon(polygon, distance) {
	var n = MAX_DISTANCE - distance;

	return {
		...polygon,
		location: {
			x: polygon.location.x * n,
			y: polygon.location.y * n,
		},
		points: polygon.points.map(
			point => {
				return {
					x: point.x * n,
					y: point.y * n,
				}
			}
		)
	}
}

function scaleWall(object, distance) {
	var n = MAX_DISTANCE - distance;

	return {
		...object,
		location: {
			x: object.location.x - (((n - 1) / 2) * object.width),
			y: object.location.y - (((n - 1) / 2) * object.height),
		},
		width: n * object.width,
		height: n * object.height,
		hole: scalePolygon(object.hole, distance)
	}
}

function generateWall() {
	var holeX = Math.random() * ((200 - 50) - 10) + 10;
	var holeY = Math.random() * ((200 - 80) - 10) + 10;
	return {
		distance: 10,
		moving: true,
		location: {
			x: 150,
			y: 100,
		},
		height: 200,
		width: 200,
		hole: {
			// Hole location is relative to wall location
			location: {
				x: holeX,
				y: holeY
			},
			// Points are relative to the location
			points: [
				{ x: 0, y: 80 },
				{ x: 50, y: 80 }
			],
		},
		render: function() {
			var obj = scaleWall(this, this.distance);
			renderWall(obj.hole, obj.height, obj.width, obj.location);
		}
	};
}

var game = {
	state: 1,
	wall: generateWall(), 
	obj: {
		distance: 9,
		color: "red",
		moving: false,
		location: {
			x: 70 + 80,
			y: 60 + 100,
		},
		// Points are relative to the location
		points: [
			{ x: 0, y: 65 },
			{ x: 40, y: 65 }
		],
		render: function() {
			var obj = scalePolygon(this, this.distance);
			renderPolygon(obj.location.x, obj.location.y, obj.points, obj.color);
		}
	}
}

function renderGame() {
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, 500, 500);
	var objects = [game.wall, game.obj].sort(obj => -obj.location.y);
	for (var i = 0; i < objects.length; i++) {
		var object = objects[i];
		object.render();
	}
}

function onSegment(p, q, r) {
    if (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
            q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y))
        return true;
    return false;
}

function orientation(p, q, r) {
	var val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    
    if (!val) return 0;  // colinear
    return (val > 0)? 1: 2; // clock or counterclock wise
}

function intersects(p1, q1, p2, q2) {

    // Find the four orientations needed for general and
    // special cases
    var o1 = orientation(p1, q1, p2);
    var o2 = orientation(p1, q1, q2);
    var o3 = orientation(p2, q2, p1);
    var o4 = orientation(p2, q2, q1);
    // General case
    if (o1 !== o2 && o3 !== o4)
        return true;

    // Special Cases
    // p1, q1 and p2 are colinear and p2 lies on segment p1q1
    if (o1 === 0 && onSegment(p1, p2, q1)) {
		return true;
	}

    // p1, q1 and p2 are colinear and q2 lies on segment p1q1
    if (o2 === 0 && onSegment(p1, q2, q1)) {
    	return true;
    }

    // p2, q2 and p1 are colinear and p1 lies on segment p2q2
    if (o3 === 0 && onSegment(p2, p1, q2)) {
    	return true;
    }

     // p2, q2 and q1 are colinear and q1 lies on segment p2q2
    if (o4 === 0 && onSegment(p2, q1, q2)) {
    	return true;
    }

    return false; // Doesn't fall in any of the above cases
}

function inPolygon(point, polygon) {
	var edges = [];
	for (var i = 0; i < polygon.length; i++) {
		edges.push([polygon[i], polygon[ (i + 1) % polygon.length]]);
	}
	var intersections = 0;
	for (var i = 0; i < edges.length; i++) {

		var edge = edges[i];

		if (intersects(edge[0], edge[1], point, { x: 10000, y: point.y })) {

			if (orientation(edge[0], point, edge[1]) === 0) {
               return onSegment(edge[0], point, edge[1]);
			}
 
			intersections += 1;
		}
	}
	return (intersections % 2) === 1;
}

function fitsThroughHole(obj, hole) {	
	for (var i = 0; i < obj.length; i++) {
		var point = obj[i];
		if (!inPolygon(point, hole)) {
			return false;
		} 
	}
	return true;
}

function moveObjects() {
	if (game.state === 0) {
		return;
	}
	var objects = [game.wall, game.obj];
	for (var i = 0; i < objects.length; i++) {
		var object = objects[i];
		if (object.moving) {
			object.distance -= 0.01;
		}
	}
	var wall = game.wall;
	var obj = game.obj;
	if (Math.abs(wall.distance - obj.distance) < 0.01) {

		var points = [
			obj.location,
			...obj.points.map(p => {
				return {
					x: p.x + obj.location.x, 
					y: p.y + obj.location.y, 
				}
			})
		];
		var hole = [
			{
				x: wall.hole.location.x + wall.location.x,
				y: wall.hole.location.y + wall.location.y,
			},
			...wall.hole.points.map(p => {
				return {
					x: p.x + wall.hole.location.x + wall.location.x,
					y: p.y + wall.hole.location.y + wall.location.y,
				}
			})
		];
		if (fitsThroughHole(points, hole)) {
			console.log('BOOM');
			game.wall = generateWall();
		} 
		else {
			game.state = 0;
		}
	}
}

document.addEventListener('keydown', (e) => {
	if (game.state === 0) {
		return;
	}
	switch(e.key) {
        case "ArrowRight":
            game.obj.location.x += 5;
            break;
        case "ArrowLeft":
            game.obj.location.x -= 5;
            break;
        case "ArrowUp":
        	game.obj.location.y -= 5;
            break;
        case "ArrowDown":
         	game.obj.location.y += 5;
            break;
        default:
            break;
    }
}, false);


function initCanvas() {
	var canvas = document.getElementById("myCanvas");
	ctx = canvas.getContext("2d");
	ctx.fillStyle = "#000000";
	ctx.fillRect(0,0,500,500);
	setInterval(renderGame, 20);
	setInterval(moveObjects, 100);
}

initCanvas();