app.controller('tController', ['$scope', 'DataHandlerFact', function($scope, DataHandlerFact) {
  var self, res, i, v;

  self = this;

  $scope.chart = null;
  $scope.errors = new Array(7);

  for (i = 0; i < 7; i++) {
    v = Math.pow(2, i + 2);
    $scope.errors[i] = {
      label : '1/' + v + ' note',
      val : v
    }
  }

  $scope.maxVerticalSteps = {
    "college" : 32,
    "highschool" : 28
  };

  // initialization variables
  $scope.fieldSelection = "highschool";
  $scope.focalPoint = "hspb";

  $scope.horWhoStp = 0;
  $scope.horParStp = 0;
  $scope.horStpDir = "inside";

  $scope.verWhoStp = 0;
  $scope.verParStp = 0;
  $scope.verStpDir = "front";

  $scope.fieldSide = 1;
  $scope.fieldMarker = "fh";
  $scope.yardLine = 50;

  $scope.tempo = 160;
  $scope.error = 64;

  self.fillData = function() {
    self.data = {
      "fieldSelection" : $scope.fieldSelection,
      "focalPoint" : $scope.focalPoint,
      "error" : $scope.error,
      "tempo" : $scope.tempo,
      "timeSource" : {
        "yardLine" : $scope.yardLine,
        "fieldSide" : $scope.fieldSide,
        "fieldMarker" : $scope.fieldMarker,
        "vertical" : {
          "whole" : $scope.verWhoStp,
          "partial" : $scope.verParStp,
          "direction" : $scope.verStpDir
        },
        "horizontal" : {
          "whole" : $scope.horWhoStp,
          "partial" : $scope.horParStp,
          "direction" : $scope.horStpDir
        }
      }
    };

  };

  $scope.res = function() {
    var data, target;

    target = $("#results");

    self.fillData();
    data = DataHandlerFact.send(self.data);

    if (!($scope.chart)) $scope.chart = self.fillChart();
    $scope.chart.showLoading('Loading chart...');


    $('html,body').animate({
      scrollTop: target.offset().top
    }, 1000, function () {
      $scope.chart.series[0].setData(data);
      $scope.chart.hideLoading();
    });

  };

  self.fillChart = function (chartData) {

  	return new Highcharts.Chart({
      chart: {
        type: 'heatmap',
        renderTo: 'fieldContainer',
        margin: [0,0,0,0],
        spacing: [0,0,0,0],
        backgroundColor: "transparent"
      },
      navigator: {
        adaptToUpdatedData: false,
        series: { data : [] }
      },
      title: {
        text: null,
      },
      credits: {
        enabled: false
      },
      legend: {
        enabled: false
      },
      tooltip: {
        headerFormat: '',
        pointFormat: '<b>{point.name}</b><br>Delay: {point.value:.3f} seconds',
      },
      xAxis: { 
        lineWidth: 0,
        minorGridLineWidth: 0,
        lineColor: 'transparent',        
        labels: {
          enabled: false
        },
        minorTickLength: 0,
        tickLength: 0,
        tickInterval: 0,
      },
      yAxis: { 
        lineWidth: 0,
        minorGridLineWidth: 0,
        lineColor: 'transparent',
        gridLineColor: 'transparent',         
        labels: {
          enabled: false
        },
        minorTickLength: 0,
        tickLength: 0,
        title: {
          text: ''
        },
        tickInterval: 0
      },
      series: [{
        turboThreshold: 0,
        borderWidth: 0,
        data: []
      }],
    });
  };


}]);
