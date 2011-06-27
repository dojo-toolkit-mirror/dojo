dojo.provide("dojox.charting.Element");

dojo.require("dojox.gfx");


dojo.declare("dojox.charting.Element", null, {
	constructor: function(chart){
		this.chart = chart;
		this.group = null;
		this.htmlElements = [];
		this.dirty = true;
	},
	createGroup: function(creator){
		if(!creator){ creator = this.chart.surface; }
		if(!this.group){
			this.group = creator.createGroup();
		}
		return this;
	},
	purgeGroup: function(){
		this.destroyHtmlElements();
		if(this.group){
			this.group.clear();
			this.group.removeShape();
			this.group = null;
		}
		this.dirty = true;
		return this;
	},
	cleanGroup: function(creator){
		this.destroyHtmlElements();
		if(!creator){ creator = this.chart.surface; }
		if(this.group){
			this.group.clear();
		}else{
			this.group = creator.createGroup();
		}
		this.dirty = true;
		return this;
	},
	destroyHtmlElements: function(){
		if(this.htmlElements.length){
			dojo.forEach(this.htmlElements, dojo.destroy);
			this.htmlElements = [];
		}
	},
	destroy: function(){
		this.purgeGroup();
	},
	// fill utilities
	_plotFill: function(fill, dim, offsets){
		// process a plot-wide fill
		if(!fill || !fill.type || !fill.space){
			return fill;
		}
		var space = fill.space;
		switch(fill.type){
			case "linear":
				if(space === "plot" || space === "shapeX" || space === "shapeY"){
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultLinearGradient, fill);
					fill.space = space;
					// process dimensions
					if(space === "plot" || space === "shapeX"){
						// process Y
						var span = dim.height - offsets.t - offsets.b;
						fill.y1 = offsets.t + span * fill.y1 / 100;
						fill.y2 = offsets.t + span * fill.y2 / 100;
					}
					if(space === "plot" || space === "shapeY"){
						// process X
						var span = dim.width - offsets.l - offsets.r;
						fill.x1 = offsets.l + span * fill.x1 / 100;
						fill.x2 = offsets.l + span * fill.x2 / 100;
					}
				}
				break;
			case "pattern":
				if(space === "plot" || space === "shapeX" || space === "shapeY"){
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultPattern, fill);
					fill.space = space;
					// process dimensions
					if(space === "plot" || space === "shapeX"){
						// process Y
						var span = dim.height - offsets.t - offsets.b;
						fill.y = offsets.t + span * fill.y / 100;
						fill.height = span * fill.height / 100;
					}
					if(space === "plot" || space === "shapeY"){
						// process X
						var span = dim.width - offsets.l - offsets.r;
						fill.x = offsets.l + span * fill.x / 100;
						fill.width = span * fill.width / 100;
					}
				}
				break;
		}
		return fill;
	},
	_shapeFill: function(fill, bbox){
		// process shape-specific fill
		if(!fill || !fill.space){
			return fill;
		}
		var space = fill.space;
		switch(fill.type){
			case "linear":
				if(space === "shape" || space === "shapeX" || space === "shapeY"){
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultLinearGradient, fill);
					fill.space = space;
					// process dimensions
					if(space === "shape" || space === "shapeX"){
						// process X
						var span = bbox.width;
						fill.x1 = bbox.x + span * fill.x1 / 100;
						fill.x2 = bbox.x + span * fill.x2 / 100;
					}
					if(space === "shape" || space === "shapeY"){
						// process Y
						var span = bbox.height;
						fill.y1 = bbox.y + span * fill.y1 / 100;
						fill.y2 = bbox.y + span * fill.y2 / 100;
					}
				}
				break;
			case "radial":
				if(space === "shape"){
					// this one is used exclusively for bubble charts and pie charts
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient, fill);
					fill.space = space;
					// process both dimensions
					fill.cx = bbox.x + bbox.width / 2;
					fill.cy = bbox.y + bbox.height / 2;
					fill.r  = fill.r * bbox.width / 200;
				}
				break;
			case "pattern":
				if(space === "shape" || space === "shapeX" || space === "shapeY"){
					// clone a fill so we can modify properly directly
					fill = dojox.gfx.makeParameters(dojox.gfx.defaultPattern, fill);
					fill.space = space;
					// process dimensions
					if(space === "shape" || space === "shapeX"){
						// process X
						var span = bbox.width;
						fill.x = bbox.x + span * fill.x / 100;
						fill.width = span * fill.width / 100;
					}
					if(space === "shape" || space === "shapeY"){
						// process Y
						var span = bbox.height;
						fill.y = bbox.y + span * fill.y / 100;
						fill.height = span * fill.height / 100;
					}
				}
				break;
		}
		return fill;
	},
	_pseudoRadialFill: function(fill, center, radius, start, end){
		// process pseudo-radial fills
		if(!fill || fill.type !== "radial" || fill.space !== "shape"){
			return fill;
		}
		// clone and normalize fill
		var space = fill.space;
		fill = dojox.gfx.makeParameters(dojox.gfx.defaultRadialGradient, fill);
		fill.space = space;
		if(arguments.length < 4){
			// process both dimensions
			fill.cx = center.x;
			fill.cy = center.y;
			fill.r  = fill.r * radius / 100;
			return fill;
		}
		// convert to a linear gradient
		var angle = arguments.length < 5 ? start : (end + start) / 2;
		return {
			type: "linear",
			x1: center.x,
			y1: center.y,
			x2: center.x + fill.r * radius * Math.cos(angle) / 100,
			y2: center.y + fill.r * radius * Math.sin(angle) / 100,
			colors: fill.colors
		};
		return fill;
	}
});
