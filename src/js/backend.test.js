describe("BackendTest", function () {
	

	var xMax = 384;
	var yMax = 172;

    //
	//beforeEach(module('Backend'));
    //
	//var backend;
	//beforeEach(function () {
	//	angular.mock.inject(function ($injector) {
	//		backend = $injector.get('Backend');
	//	})
	//});



	fromXY = function (x, y, college) {
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

		side = (x <= (xMax / 2));
		xTmp = side ? x : x - (xMax / 2);
		yardlineTmp = ((xTmp / (xMax / 2)) * 12);
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

	toXY = function (xSteps, ySteps, marker, yardline, front, inside, college, side) {
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
		if (!side) x += (xMax / 2);

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
				y = yMax;
			}

			y += (front) ? (-1 * ySteps * 2) : (ySteps * 2);
		}
		else {
			y = 56 * marker;
			y += (front) ? (-1 * ySteps * 2) : (ySteps * 2);
		}

		return {x:x, y:y};
	};
	
	
	describe("toXY college tests", function () {
		it("front left", function () {
			expect(toXY(16, 0, 0, 0, false, false, true, true)).toEqual({x: 0, y: 0});
		});

		it("front right", function () {
			expect(toXY(16, 0, 0, 0, false, false, true, false)).toEqual({x: xMax, y: 0});
		});

		it("back left", function () {
			expect(toXY(16, 0, 3, 0, false, false, true, true)).toEqual({x: 0, y: yMax});
		});

		it("back right", function () {
			expect(toXY(16, 0, 3, 0, false, false, true, false)).toEqual({x: xMax, y: yMax});
		});

		it("front 50", function () {
			expect(toXY(0, 0, 0, 50, false, false, true, true)).toEqual({x: xMax / 2, y: 0});
		});

		it("front 50 again", function () {
			expect(toXY(0, 0, 0, 50, false, false, true, false)).toEqual({x: xMax / 2, y: 0});
		});

		it("front hash 50", function () {
			expect(toXY(0, 0, 1, 50, false, false, true, true)).toEqual({x: xMax / 2, y: 64});
		});

		it("back hash 50", function () {
			expect(toXY(0, 0, 2, 50, false, false, true, true)).toEqual({x: xMax / 2, y: 107});
		});
	});


	describe("toXY high school tests", function () {
		it("front left", function () {
			expect(toXY(16, 0, 0, 0, false, false, false, true)).toEqual({x: 0, y: 0});
		});

		it("front right", function () {
			expect(toXY(16, 0, 0, 0, false, false, false, false)).toEqual({x: xMax, y: 0});
		});

		it("back left", function () {
			expect(toXY(16, 0, 3, 0, false, false, false, true)).toEqual({x: 0, y: yMax - 4});
		});

		it("back right", function () {
			expect(toXY(16, 0, 3, 0, false, false, false, false)).toEqual({x: xMax, y: yMax - 4});
		});

		it("front 50", function () {
			expect(toXY(0, 0, 0, 50, false, false, false, true)).toEqual({x: xMax / 2, y: 0});
		});

		it("front 50 again", function () {
			expect(toXY(0, 0, 0, 50, false, false, false, false)).toEqual({x: xMax / 2, y: 0});
		});

		it("front hash 50", function () {
			expect(toXY(0, 0, 1, 50, false, false, false, true)).toEqual({x: xMax / 2, y: 56});
		});

		it("back hash 50", function () {
			expect(toXY(0, 0, 2, 50, false, false, false, true)).toEqual({x: xMax / 2, y: 112});
		});
	});


	describe("fromXY college tests", function () {
		it("front left", function () {
			expect(fromXY(0, 0, true)).toEqual({
				xSteps: 16,
				ySteps: 0,
				side: true,
				marker: 0,
				yardline: 0,
				inside: false,
				front: false
			});
		});

		it("front right", function () {
			expect(fromXY(xMax, 0, true)).toEqual({
				xSteps: 16,
				ySteps: 0,
				side: false,
				marker: 0,
				yardline: 0,
				inside: false,
				front: false
			});
		});

		it("back left", function () {
			expect(fromXY(0, yMax-1, true)).toEqual({
				xSteps: 16,
				ySteps: 0,
				side: true,
				marker: 3,
				yardline: 0,
				inside: false,
				front: true
			});
		});

		it("back right", function () {
			expect(fromXY(xMax, yMax-1, true)).toEqual({
				xSteps: 16,
				ySteps: 0,
				side: false,
				marker: 3,
				yardline: 0,
				inside: false,
				front: true
			});
		});

		it("front 50", function () {
			expect(fromXY(xMax / 2, 0, true)).toEqual({
				xSteps: 0,
				ySteps: 0,
				side: true,
				marker: 0,
				yardline: 50,
				inside: true,
				front: false
			});
		});

		it("front hash 50", function () {
			expect(fromXY(xMax / 2, 64, true)).toEqual({
				xSteps: 0,
				ySteps: 0,
				side: true,
				marker: 1,
				yardline: 50,
				inside: true,
				front: false
			});
		});

		it("back hash 50", function () {
			expect(fromXY(xMax / 2, 107, true)).toEqual({
				xSteps: 0,
				ySteps: 0,
				side: true,
				marker: 2,
				yardline: 50,
				inside: true,
				front: false
			});
		});


		describe("fromXY high school tests", function () {
			it("front left", function () {
				expect(fromXY(0, 0, false)).toEqual({
					xSteps: 16,
					ySteps: 0,
					side: true,
					marker: 0,
					yardline: 0,
					inside: false,
					front: false
				});
			});

			it("front right", function () {
				expect(fromXY(xMax, 0, false)).toEqual({
					xSteps: 16,
					ySteps: 0,
					side: false,
					marker: 0,
					yardline: 0,
					inside: false,
					front: false
				});
			});

			it("back left", function () {
				expect(fromXY(0, yMax-4, false)).toEqual({
					xSteps: 16,
					ySteps: 0,
					side: true,
					marker: 3,
					yardline: 0,
					inside: false,
					front: true
				});
			});

			it("back right", function () {
				expect(fromXY(xMax, yMax-4, false)).toEqual({
					xSteps: 16,
					ySteps: 0,
					side: false,
					marker: 3,
					yardline: 0,
					inside: false,
					front: true
				});
			});

			it("front 50", function () {
				expect(fromXY(xMax / 2, 0, false)).toEqual({
					xSteps: 0,
					ySteps: 0,
					side: true,
					marker: 0,
					yardline: 50,
					inside: true,
					front: false
				});
			});

			it("front hash 50", function () {
				expect(fromXY(xMax / 2, 56, false)).toEqual({
					xSteps: 0,
					ySteps: 0,
					side: true,
					marker: 1,
					yardline: 50,
					inside: true,
					front: false
				});
			});

			it("back hash 50", function () {
				expect(fromXY(xMax / 2, 112, false)).toEqual({
					xSteps: 0,
					ySteps: 0,
					side: true,
					marker: 2,
					yardline: 50,
					inside: true,
					front: false
				});
			});
		});
	});
});
