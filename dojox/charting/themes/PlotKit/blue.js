dojo.provide("dojox.charting.themes.PlotKit.blue");
dojo.require("dojox.charting.Theme");

(function(){
	var dxc=dojox.charting;
	dxc.themes.PlotKit.blue=new dxc.Theme({
		chart:{
			stroke:null,
			fill: "#e7eef6"
		},
		plotarea:{
			stroke:null,
			fill: "#e7eef6"
		},
		axis:{
			stroke:{ color:"#fff",width:1 },
			line:{ color:"#fff",width:.5 },
			majorTick:{ color:"#fff", width:.5, length:6 },
			minorTick:{ color:"#fff", width:.5, length:3 },
			tick: {font:"normal normal normal 7pt Helvetica,Arial,sans-serif", fontColor:"#999"}
		},
		series:{
			stroke:{ width: 2.5, color:"#fff" },
			fill:new dojo.Color([0x66, 0x66, 0x66, 0.8]),
			font:"normal normal normal 7.5pt Helvetica,Arial,sans-serif",	//	label
			fontColor:"#666"
		},
		marker:{	//	any markers on a series.
			stroke:{ width:2 },
			fill:"#333",
			font:"normal normal normal 7pt Helvetica,Arial,sans-serif",	//	label
			fontColor:"#666"
		},
		colors: dxc.Theme.defineColors({hue:217, saturation:60, low:40, high:88})
	});

	dxc.themes.PlotKit.blue.next = function(elementType, mixin, doPost){
		var theme = dxc.Theme.prototype.next.apply(this, arguments);
		if(elementType != "line"){
			theme.series.stroke.color = "#fff";
		}
		return theme;
	};
})();
