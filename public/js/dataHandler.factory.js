/**
 * Brian Boudreaux
 * Created:	11/28/2015
 */

app.factory('DataHandlerFact', ['Backend', function(Backend) {
  var self = this, service = {};
	
	self.focalPoints = {
    "dmp" : {
      "x" : 192, 
      "y" : -20
    },
		"hspb" : {
      "x" :  192,
      "y" : -150
    },
    "cpb" : {
      "x" : 192,
      "y" : -200
    }
  };
	
	self.pack = function(data, rawCollege)
	{
    var xSteps, ySteps, marker, yardline, inside, front, college, side;

		xSteps	= Number(data.horizontal.whole) + Number(data.horizontal.partial);
		ySteps	= Number(data.vertical.whole  ) + Number(data.vertical.partial  );
		marker	= 0;
		yardline	= Number(data.yardLine);
		inside	= false;
		front 	= false;
		college	= false;
		side	= (data.fieldSide == 1) ? true : false;

		if (data.fieldMarker === "fsl")
			marker = 0;
		else if (data.fieldMarker === "fh")
			marker = 1;
		else if (data.fieldMarker === "bh")
			marker = 2;
		else if (data.fieldMarker === "bsl")
			marker = 3;

		if (data.horizontal.direction === "inside")
			inside = true;
		else if (data.horizontal.direction === "outside")
			inside = false;

        if (data.vertical.direction === "front")
			front = true;
		else if (data.vertical.direction === "back")
			front = false;
        
    college = (rawCollege === "college") ? true : false;

		var coordPack = Backend.toXY(xSteps, ySteps, marker, yardline, front, inside, college, side);

    console.log(xSteps, ySteps);
		console.log("coordPack:");
    console.log(coordPack);

		return coordPack;
	};

	service.send = function(inputData)
	{
    console.log(inputData);

		//Package the inputData
		var rawTimeSource	= inputData.timeSource;
		var rawFocalPoint	= inputData.focalPoint;
		var error		= (60 / inputData.tempo) / (inputData.error / 4);
		var college		= (inputData.fieldSelection === "college") ? true : false;

		var dTimeSource		= self.pack(inputData.timeSource, inputData.fieldSelection);
		var dFocalPoint		= self.focalPoints[inputData.focalPoint];

		var resultMap = Backend.calculate(dTimeSource, dFocalPoint, error, college);

    console.log(dTimeSource);
    console.log(JSON.stringify(dTimeSource));

    console.log(dFocalPoint);
    console.log(JSON.stringify(dFocalPoint));

    console.log(error);
    console.log(JSON.stringify(error));

    console.log(college);
    console.log(JSON.stringify(college));

		return resultMap;
	};

	return service;
}]);
