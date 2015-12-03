$(function () { 
	$('#container').highcharts({
        chart: {
            type: 'heatmap',
            margin: [0,0,0,0],
            spacing: [0,0,0,0],   		
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
           tickLength: 0
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
           }
        },
        series: [{
            turboThreshold: 0,
            borderWidth: 0,
    		data: calculate({x:0, y:0}, {x:0, y:-20}, .0441, true),


    	}],
    	plotOptions: {
    		heatmap: {
    			point: {
    				events: {
    					click: {
    						function() {
    							var x = this.x;
    							var y = this.y;

    							//pass these x and y values to front possibly using fromXY? need college boolean for this function
    						}
    					}
    				}
    			}
    		}
    	}
	 });
});