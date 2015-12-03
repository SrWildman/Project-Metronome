app.factory('Backend', [function() {
  var self = this;

  self.xMax = 384;
  self.yMax = 172;

  self.createName = function(location, marker) {
    var name;

    name = "";
    name += location.xSteps + " steps ";
    name += (location.inside) ? "inside " : "outside ";
    name += "the " + (location.side) ? "S1 " : "S2 ";
    name += location.yardline + " yardline";
    name += "<br /><b>" + location.ySteps + " steps ";
    name += (location.front) ? "in front of the " 
                             : "behind the ";
    name += marker + "</b>"; 

    return name;
  };

  self.dist = function (x1, y1, x2, y2) {
    return Math.sqrt( (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1) );
  };

  self.calculateDelay = function (dTimeSource, dFocalPoint, x, y) {
    var dtx, dty, dfx, dfy, val;
    // expecting TS and FP as an object with x and y params
    // x and y are the coordinates of the user location
    // returns sound delay at specified location

    dtx = dTimeSource.x;
    dty = dTimeSource.y;
    dfx = dFocalPoint.x;
    dfy = dFocalPoint.y;


    return -1 * (0.9375 / 1150) * (self.dist(dtx, dty, dfx, dfy) - (self.dist(dtx, dty, x, y) + self.dist(x, y, dfx, dfy)));
  };

  self.calculate = function (dTimeSource, dFocalPoint, error, college) {
    // expecting TS and FP as an object with x and y params, error in terms of seconds, and a boolean
    // representing the type of field (true for college, false for hs)
    // returns an array of delays for each point
    // if any input value is null - a transparent field is shown

    var x, y, location, marker, name, fDelaysi, c0, c1, dfx, dfy, err, ring, tmp;

    self.xMax = 384;
    self.yMax = 172;
    
    fDelays = [];

    if (dTimeSource === null || 
        dFocalPoint === null || 
        error       === null || 
        college     === null) 
    {
      for (x = 0; x < self.xMax; x++) {
        for (y = 0; y < self.yMax; y++) {
          location = self.fromXY(x, y, college);

          if (location.marker === 0)
            marker = "front sideline";
          else if(location.marker === 1)
            marker = "front hash";
          else if(location.marker === 2)
            marker = "back hash";
          else
            marker = "back sideline";
        }
      }

      fDelays[(self.yMax * x) + y] = {
        "x"    : x,
        "y"    : y,
        "name" : createName(location, marker),
        "color" : "transparent"
      };
    
      return fDelays;
    }

    //account for slight difference in hashes
    if (!college) self.yMax -= 3;

    //counters for array indicies
    c0 = c1 = 0;

    for (x = 0; x < self.xMax; x++) {
      for (y = 0; y < self.yMax; y++) {
        tmp = self.calculateDelay(dTimeSource, dFocalPoint, x, y);
        location = self.fromXY(x, y, college);

        if (location.marker === 0)
          marker = "front sideline";
        else if (location.marker === 1)
          marker = "front hash";
        else if (location.marker === 2)
          marker = "back hash";
        else
          marker = "back sideline";

        dfx = dFocalPoint.x;
        dfy = dFocalPoint.y;

        err = (0.9375 / 1150) * self.dist(x, y, dfx, dfy);

        for (i = 1; i < 100; i++) {
          if (err < (i * error)) {
            ring = (i % 2) === 1;
              break;
          }
        } 

        if (x === (dTimeSource.x) && y === dTimeSource.y){
          fDelays[(self.yMax * x) + y] = {
            "x" : x,
            "y" : y,
            "value" : tmp,
            "name" : self.createName(location, marker),
            "color" : "#ffff00"
          };
        }
        else if (tmp <= error) {

          fDelays[(self.yMax * x) + y] = {
            "x" : x,
            "y" : y,
            "value" : tmp,
            "name"  : self.createName(location, marker),
            "color" : "#008000"
          };
        }
        else {
   
          fDelays[(self.yMax * x) + y] = {
            "x" : x,
            "y" : y,
            "value" : tmp,
            "name" : self.createName(location, marker),
            "color" : (ring) ? "#d43f3a" : "#4a494a"
          };
        } 
            
      }
    }

    return fDelays;
  };

  self.fromXY = function (x, y, college) {
    //converys x,y coordinates to band jargon
    //x is an int value representing the x position on the field
    //y is an int value representing the y position on the field
    //returns an object: {xSteps:xSteps, ySteps:ySteps, side:side, marker:marker, yardline:yardline, inside:inside, front:front}
    // xSteps and ySteps are values between 0 and 4 in increments of .5
    // side is a boolean representing what side of the field we are on (true: side 1, false: side 2)   
    // marker is an int, 0: front sideline, 1: front hash, 2:back hash, 3: back sideline
    // yardline is an int value of the yardline 0-50 increments of 5
    // inside is a boolean representing weather we are inside or outside (true for inside, false for outside)
    // front is a boolean representing weather we are in front or behind our marker (true: front, false; behind)
 
    //determine x relationship on field
    //true = S1, false = S2
    var side, xTmp, yardlineTmp, yardline, inside, xSteps, marker, front, ySteps;

    side = (x <= (self.xMax / 2));
    xTmp = side ? x : x - (self.xMax / 2);
    yardlineTmp = ((xTmp / (self.xMax / 2)) * 12);
    yardline = side ? (yardlineTmp * 5) - 10 : (yardlineTmp * -5) + 50;

    if (yardline < 0) yardline = 0;
    yardline = Math.round(yardline / 5)*5;
    inside = side ? ((xTmp / 2) % 8 < 4) : ((xTmp / 2) % 8 <= 4);
    if (!side) inside = !inside;

    // xSteps = ((xSteps === 0) && ((xTmp / 4) % 4 != 0)) ? 4 : (xSteps === 0) ? 0 :
    // ((inside && side) || (!inside && !side)) ? xSteps : 4-xSteps;

    xSteps = (xTmp / 2) % 4;
    if ((xSteps === 0) && (((xTmp / 4) % 4) !== 0)) {
      xSteps = 4;
    }
    else {
      if (xSteps === 0) {
        xSteps = 0;
      }
      else {
        if (!((inside && side) || (!inside && !side)))
          xSteps = 4 - xSteps;
      }
    }
 
    if (x < 32 || x > 352) {
      xSteps = side ? 16 - (xTmp/2) :  (xTmp/2) - 80;
      inside = false; 
    }
 
    //determine y relationship
    if (college) {
      if (y < 64) {
        if (y < 32) {
          ySteps = y / 2;
          front = false;
          marker = 0;
        }
        else {
          ySteps = 32 - y/2;
          front = true;
          marker = 1;
        }
      }
      else if (y < 107) {
        ySteps = (y-64)/2;
        front = false;
        marker = 1;
      }
      else {
        if (y < 139) {
          ySteps = (y-107) / 2;
          front = false;
          marker = 2;
        }
        else {
          ySteps = 32 - ((y - 107) / 2);
          front = true;
          marker = 3;
        }
      }
    }
    else {
      if (y < 56) {
        if (y < 28) {
          ySteps = y/2;
          front = false;
          marker = 0;
        }
        else {
          ySteps = 28 - y/2;
          front = true;
          marker = 1;
        }
      }
      else if (y < 112) {
        if (y < 84) {
          ySteps = (y - 56) / 2;
            front = false;
            marker = 1;
        }
        else {
          ySteps = 28 - (y-56) / 2;
          front = true;
          marker = 2;
        }
      }
      else {
        if (y < 140) {
          ySteps = (y-112) / 2;
          front = false;
          marker = 2;
        }
        else {
          ySteps = 28 - (y - 112) / 2;
          front = true;
          marker = 3;
        }
      }
    }
 
    return {xSteps:xSteps, ySteps:ySteps, side:side, marker:marker, yardline:yardline, inside:inside, front:front};
  };

  self.toXY = function (xSteps, ySteps, marker, yardline, front, inside, college, side) {
    // converts band jargon to x and y coordinates needed for backend calculations
    // xSteps and ySteps are values between 0 and 4 in increments of .5
    // marker is an int, 0: front sideline, 1: front hash, 2:back hash, 3: back sideline
    // yardline is an int value of the yardline 0-50 increments of 5
    // inside is a boolean representing weather we are inside or outside (true for inside, false for outside)
    // front is a boolean representing weather we are in front or behind our marker (true: front, false; behind)
    // college is a boolean representing what field we are on (true for college, false for hs)
    // side is a boolean representing what side of the field we are on (true: side 1, false: side 2)
    // returns an object of coordinates in the form {x:x, y:y}

    var x, y, obj;

    obj = {
      "xSteps" : xSteps,
      "ySteps" : ySteps,
      "marker" : marker,
      "yardline" : yardline,
      "inside" : inside,
      "front" : front,
      "college" : college,
      "side" : side
    };

    console.log(obj);

    if (yardline === 0)
      yardline = ((side) ? 2 : 10);
    else
      yardline = ((side) ? ((yardline + 10) / 5) : ((yardline - 50) / -5));

    x = yardline * 16;
    if (!side) x += self.xMax / 2;

    if (side)
      x += (inside) ? (xSteps * 2) : (-1 * xSteps * 2);
    else
      x += (inside) ? (-1 * xSteps * 2) : (xSteps * 2);

    if (college) {
      if (marker < 2) {
        y = 64*marker;
      }
      else if (marker < 3) {
        y = 107;
      }
      else {
        y = self.yMax;
      }

      y += (front) ? (-1 * ySteps * 2) : (ySteps * 2);
    }
    else {
      y = 56 * marker;
      y += (front) ? (-1 * ySteps * 2) : (ySteps * 2);
    }

    return {x:x, y:y};
  };

  return {
    "calculate" : self.calculate,
    "toXY" : self.toXY,
    "fromXY" : self.fromXY
  };

}]);
