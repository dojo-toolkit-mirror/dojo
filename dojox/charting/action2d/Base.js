dojo.provide("dojox.charting.action2d.Base");

dojo.declare("dojox.charting.action2d.Base", null, {

	constructor: function(chart, plot){
		//	summary:
		//		Create a new base action.  This can either be a plot or a chart action.
		//	chart: dojox.charting.Chart
		//		The chart this action applies to.
		//	plot: String?|dojox.charting.plot2d.Base?
		//		Optional target plot for this action.  Default is "default".
		this.chart = chart;
		this.plot = plot ? (dojo.isString(plot) ? this.chart.getPlot(plot) : plot) : this.chart.getPlot("default");
	},

	connect: function(){
		//	summary:
		//		Connect this action to the plot or the chart.
	},

	disconnect: function(){
		//	summary:
		//		Disconnect this action from the plot or the chart.
	}
});
