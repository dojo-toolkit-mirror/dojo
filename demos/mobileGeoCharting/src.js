require([
	"dojox/mobile",
	"dojox/mobile/parser",
	"dojox/mobile/compat",
	"dojox/mobile/SpinWheel",
	"dojo/data/ItemFileReadStore",
	"dojox/data/CsvStore",
	"dojox/geo/charting/widget/Map",
	"dojox/geo/charting/widget/Legend",
	"dojox/geo/charting/TouchInteractionSupport",
	"dojox/geo/charting/MouseInteractionSupport"],function(mobile,parser){

	dojo.ready(function(){
		configureUI();

		
		var changeYear = function() {
			var newYear = dijit.byId("yearSlot").getValue();
			var map = dijit.byId("mapWidget").getInnerMap();
			map.setDataBindingAttribute(newYear);
			if(selectedFeature){ onFeatureClick(selectedFeature); }
		};
	
		dojo.connect(dijit.byId("yearSlot"), "onFlickAnimationEnd",this, changeYear);
		dijit.byId("yearSlot").setInitialValue();
		
		dojo.connect(dojo.doc,"touchmove",this,function(event){
			if (dojo.NodeList(event.target).parents("#mapLegend").length == 1) {
				dojo.stopEvent(event);
			}
				
		});
		
		// prevent fitToMapContents once any interaction with map widget has occurred
		var surface = dijit.byId("mapWidget").getInnerMap().surface;
		var callback1 = surface.connect("touchstart", this, function(event){
			startedInteraction = true;
			dojo.disconnect(callback1);
		});
		var callback2 = surface.connect("onmousedown", this, function(event){
			startedInteraction = true;
			dojo.disconnect(callback2);
		});
		
		dojo.connect(dojo.global,"onresize",this, function(){
			//console.log(" pageX " + dojo.doc.pageX);
			configureUI();
			dojo.global.scrollTo(0,0);
		});
		
		dojo.connect(dojo.global,"onorientationchange",this, function(){
			configureUI();
			dojo.global.scrollTo(0,0);
		});	
		
				
		// init widget
		var mapWidget = dijit.byId("mapWidget");
		mapWidget.startup();
	});

});
var selectedFeature;
var startedInteraction = false;
function onFeatureClick(feature) {
	selectedFeature = feature;
	var text = "US population from 1960 to 2009";
	if (selectedFeature) {
		var map = dijit.byId("mapWidget").getInnerMap();
		var year = dijit.byId("yearSlot").getValue();
		var text = year + " "  +map.mapObj.marker.markerData[feature.id] +  " pop. : " + (feature.value / 1000000).toFixed(1) + "M";
	}
	dojo.byId("mapHeader").innerHTML = text;
};

function getPopulationForYear(data) {
	var pop = dojo.number.parse(data,{locale:"en-us"});
	return pop * 1000; // population is expressed in thousands
};

function configureUI() {
	var innerW = dojo.global.innerWidth,
		innerH = dojo.global.innerHeight,
		spinnerScale = 1.0,
		vertical = true;
	
	if (innerH < innerW) {
		vertical = false;
	}
	var spinStyle = dojo.byId("yearSpinner").style,
		mapWidget = dijit.byId("mapWidget"),
		mapWidgetStyle = mapWidget.domNode.style,
		height2 = dojo.marginBox(dojo.byId("mapHeader")).h,
		height3 = dojo.marginBox(dojo.byId("yearSpinner")).h,
		legendStyle = dojo.byId("mapLegend")?dojo.byId("mapLegend").style:{};
	
	if (vertical) {
		mapWidgetStyle.position = "relative";
		mapWidgetStyle.height = (innerH-height2-height3 * spinnerScale)+"px";
		mapWidgetStyle.width = innerW+"px";
		mapWidgetStyle.top = 0;
		mapWidgetStyle.left = 0;
		var spinW = 150;
		spinStyle.width = spinW - 6 + "px"; // (spinner has 2 * 3px borders..)
		spinStyle.position = "relative";
		legendStyle.top = (innerH-height3 * spinnerScale)+"px";
		legendStyle.left = spinW * spinnerScale + "px";
		legendStyle.height = height3 * spinnerScale + "px";
		legendStyle.width = innerW - (spinW * spinnerScale) + "px";
		legendStyle.margin = "0px 0px 0px 10px";
	} else {
		// horizontal layout
		var spinW = 120;
		spinStyle.width = spinW - 6 + "px"; // (spinner has 2 * 3px borders..)
		spinStyle.position = "absolute";
		legendStyle.height = height3 * spinnerScale + "px";
		legendStyle.width = spinW*spinnerScale + "px";
		
		if ((innerH-height2) > 2 * (height3  * spinnerScale)) {
			legendStyle.top = height3 * spinnerScale + height2 + "px";
			legendStyle.left = 0;
			legendStyle.borderSpacing="0px 0px";
			legendStyle.margin = "5px 0px 0px 5px";
			mapWidgetStyle.position = "absolute";
			mapWidgetStyle.height = (innerH - height2)+"px";
			mapWidgetStyle.width = (innerW -  spinW * spinnerScale) +"px";
			mapWidgetStyle.top = height2 +"px";
			mapWidgetStyle.left = spinW * spinnerScale +"px";
		} else {
			legendStyle.top = height2 +"px";
			legendStyle.left = spinW * spinnerScale +"px";
			legendStyle.margin = "0px 0px 0px 5px";
			mapWidgetStyle.position = "absolute";
			mapWidgetStyle.height = (innerH - height2)+"px";
			mapWidgetStyle.width = (innerW -  2 * spinW * spinnerScale) +"px";
			mapWidgetStyle.top = height2 +"px";
			mapWidgetStyle.left = 2 * spinW*spinnerScale +"px";
		}
	}	
	mapWidget.resize();
	if (!startedInteraction) {
		mapWidget.getInnerMap().fitToMapContents(3);
	}
};	
