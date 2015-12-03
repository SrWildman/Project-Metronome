

var xMax = 384;
var yMax = 172;

var dist = function (x1, y1, x2, y2) {

    return Math.sqrt( (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1) );
};



var calculateDelay = function (dTimeSource, dFocalPoint, x, y) {
    var dtx, dty, dfx, dfy, val;
    // expecting TS and FP as an object with x and y params
    // x and y are the coordinates of the user location
    // returns sound delay at specified location

    var dtx = dTimeSource.x + (xMax/2);
    var dty = dTimeSource.y;
    var dfx = dFocalPoint.x + (xMax/2);
    var dfy = dFocalPoint.y;


    return -(.9375/(1150)) * (dist(dtx, dty, dfx, dfy) - (dist(dtx, dty, x, y) + dist(x, y, dfx, dfy)));

};



var calculate = function (dTimeSource, dFocalPoint, error, college) {
    // expecting TS and FP as an object with x and y params, error in terms of seconds, and a boolean
    // representing the type of field (true for college, false for hs)
    // returns an array of delays for each point
    // if any input value is null - a transparent field is shown

    var fDelays = [];

    if(dTimeSource === null || dFocalPoint === null || error === null || college === null){

    	for (x=0;x<xMax;x++) {
    	    for (y=0;y<yMax;y++) {

    	    	var location = fromXY(x, y, college);

    	    	if(location.marker === 0){
    	    		var marker = "front sideline";
    	    	}
    	    	else if(location.marker === 1){
    	    		var marker = "front hash";
    	    	}
    	    	else if(location.marker === 2){ 
    	    		var marker = "back hash";
    	    	}
    	    	else {
    	    		var marker = "back sideline";
    	    	}


    	    	fDelays[(yMax * x) + y] = {
                    x: x,
                    y: y,
                    name: location.xSteps + " steps " + (location.inside ? "inside " : "outside ") + "the " + (location.side ? "S1 " : "S2 ") + location.yardline + " yardline"
                        + "<br><b>" + location.ySteps + (location.front ? " steps in front of the " : " steps behind the ") + marker + "</b>",
                    color: "transparent"
                };

    	    }
    	}

    	return fDelays;

    }


    //account for slight difference in hashes
    if(!college) yMax -= 3;




    //counters for array indicies
    var c0 = 0;
    var c1 = 0;

    for (x=0;x<xMax;x++) {
        for (y=0;y<yMax;y++) {
            tmp = calculateDelay(dTimeSource, dFocalPoint, x, y);


            var location = fromXY(x, y, college);

            if(location.marker === 0){
            	var marker = "front sideline";
            }
            else if(location.marker === 1){
            	var marker = "front hash";
            }
            else if(location.marker === 2){
            	var marker = "back hash";
            }
            else {
            	var marker = "back sideline";
            }


            var dfx = dFocalPoint.x + (xMax/2);
            var dfy = dFocalPoint.y;


            var err = (.9375/(1150)) * (dist(x, y, dfx, dfy));

            for(var i = 1; i<10; i++){
                if(err < i*error){
                    var ring = i%2===1;
                    break;
                }
            } 

            if(x === (dTimeSource.x + (xMax/2)) && y === dTimeSource.y){
                fDelays[(yMax * x) + y] = {
                    x: x,
                    y: y,
                    value: tmp,
                    name: location.xSteps + " steps " + (location.inside ? "inside " : "outside ") + "the " + (location.side ? "S1 " : "S2 ") + location.yardline + " yardline"
                        + "<br><b>" + location.ySteps + (location.front ? " steps in front of the " : " steps behind the ") + marker + "</b>",
                    color: "#ffff00"
                };
            }
            else if(tmp <= error){

                fDelays[(yMax * x) + y] = {
                    x: x,
                    y: y,
                    value: tmp,
                   name: location.xSteps + " steps " + (location.inside ? "inside " : "outside ") + "the " + (location.side ? "S1 " : "S2 ") + location.yardline + " yardline"
                        + "<br><b>" + location.ySteps + (location.front ? " steps in front of the " : " steps behind the ") + marker + "</b>",
                    color: "#008000"
                };
            }
            else{
                    fDelays[(yMax * x) + y] = {
                    x: x,
                    y: y,
                    value: tmp,
                    name: location.xSteps + " steps " + (location.inside ? "inside " : "outside ") + "the " + (location.side ? "S1 " : "S2 ") + location.yardline + " yardline"
                        + "<br><b>" + location.ySteps + (location.front ? " steps in front of the " : " steps behind the ") + marker + "</b>",
                    color: ring ? "#880000" : "#000088"
                };
            }
            
        }
    }

    return fDelays;

};



var fromXY = function (x, y, college){
	//converys x,y coordinates to band jargon
	//x is an int value representing the x position on the field
	//y is an int value representing the y position on the field
	// college is a boolean representing what field we are on (true for college, false for hs)
	//returns an object: {xSteps:xSteps, ySteps:ySteps, side:side, marker:marker, yardline:yardline, inside:inside, front:front}
	// xSteps and ySteps are values between 0 and 4 in increments of .5
	// side is a boolean representing what side of the field we are on (true: side 1, false: side 2)   
    // marker is an int, 0: front sideline, 1: front hash, 2:back hash, 3: back sideline
    // yardline is an int value of the yardline 0-50 increments of 5
    // inside is a boolean representing weather we are inside or outside (true for inside, false for outside)
    // front is a boolean representing weather we are in front or behind our marker (true: front, false; behind)
 

	 //determine x relationship on field
            //true = S1, false = S2
            var side = x <= xMax/2;

            
            var xTmp = side ? x : x-(xMax/2);
            var yardlineTmp = ((xTmp/(xMax/2)) * 12);
            var yardline = side ? (yardlineTmp * 5) - 10 : (yardlineTmp * -5) + 50;
            if(yardline < 0) yardline = 0;
            yardline = Math.round(yardline/5)*5;


            var inside = side ? ((xTmp/2)%8 < 4) : ((xTmp/2)%8 <= 4);
            if(!side) inside = !inside;

            var xSteps = (xTmp/2) % 4;
            xSteps = (xSteps === 0 && (xTmp/4)%4 != 0) ? 4 : (xSteps === 0) ? 0 :
             ((inside && side) || (!inside && !side)) ? xSteps : 4-xSteps;

             if(x < 32 || x > 352){
                 var xSteps = side ? 16 - (xTmp/2) :  (xTmp/2) - 80;
                 inside = false; 
             }
            

            //determine y relationship
            var marker;
            var front;
            var ySteps;
            if(college){
                if(y < 64){
                    if(y < 32){
                        ySteps = y/2;
                        front = false;
                        marker = 0;
                    }
                    else{
                        ySteps = 32 - y/2;
                        front = true;
                        marker = 1;
                    }
                }
                else if(y < 107){
                    ySteps = (y-64)/2;
                    front = false;
                    marker = 1;
                }
                else{
                    if(y < 139){
                        ySteps = (y-107)/2;
                        front = false;
                        marker = 2;
                    }
                    else{
                        ySteps = 32 - (y-107)/2;
                        front = true;
                        marker = 3;
                    }
                }
            }
            else{
                if(y < 56){
                    if(y < 28){
                        ySteps = y/2;
                        front = false;
                        marker = 0;
                    }
                    else{
                        ySteps = 28 - y/2;
                        front = true;
                        marker = 1;
                    }
                }
                else if(y < 112){
                    if(y < 84){   
                        ySteps = (y-56)/2;
                        front = false;
                        marker = 1;
                    }
                    else{
                        ySteps = 28 - (y-56)/2;
                        front = true;
                        marker = 2;
                    }
                }
                else{
                    if(y < 140){
                        ySteps = (y-112)/2;
                        front = false;
                        marker = 2;
                    }
                    else{
                        ySteps = 28 - (y-112)/2;
                        front = true;
                        marker = 3;
                    }
                }
            }


            return {xSteps:xSteps, ySteps:ySteps, side:side, marker:marker, yardline:yardline, inside:inside, front:front};
};



var toXY = function (xSteps, ySteps, marker, yardline, inside, front, college, side){
    // converts band jargon to x and y coordinates needed for backend calculations
    // xSteps and ySteps are values between 0 and 4 in increments of .5
    // marker is an int, 0: front sideline, 1: front hash, 2:back hash, 3: back sideline
    // yardline is an int value of the yardline 0-50 increments of 5
    // inside is a boolean representing weather we are inside or outside (true for inside, false for outside)
    // front is a boolean representing weather we are in front or behind our marker (true: front, false; behind)
    // college is a boolean representing what field we are on (true for college, false for hs)
    // side is a boolean representing what side of the field we are on (true: side 1, false: side 2)
    // returns an object of coordinates in the form {x:x, y:y}

    var x, y;


    if(yardline === 0) yardline = side ? 2 : 10;
    else yardline = side ? (yardline + 10) / 5: (yardline - 50) / -5;

    x = yardline * 16;
    if(!side) yardline += xMax/2;

    if(side){
        x += inside ? xSteps*2 : -xSteps*2;
    }
    else{
        x += inside ? -xSteps*2 : xSteps*2;
    }


    if(college){
        if(marker < 2){
            y = 64*marker;
        }
        else if(marker < 3){
            y = 107;
        }
        else{
            y = yMax;
        }

        y += front ? -ySteps*2 : ySteps*2;
    }
    else{
        y = 56*marker;
        y += front ? -ySteps*2 : ySteps*2;
    }


    return {x:x, y:y};

}






