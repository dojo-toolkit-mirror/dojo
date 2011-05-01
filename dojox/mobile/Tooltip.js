define(["dojo/_base/html", "dijit/place", "dijit/_WidgetBase"], function(dhtml, place, WidgetBase) {

	return dojo.declare("dojox.mobile.Tooltip", WidgetBase, {
		// summary:
		//		A non-templated popup bubble widget
		//

		baseClass: "mblTooltip mblTooltipHidden",

		show: function(/*DomNode*/ aroundNode, positions){
			// summary:
			//		Pop up the tooltip and point to aroundNode using the best position
			var connectorClasses = {
				"MRM": "mblTooltipAfter",
				"MLM": "mblTooltipBefore",
				"BMT": "mblTooltipBelow",
				"TMB": "mblTooltipAbove",
				"BLT": "mblTooltipBelow",
				"TLB": "mblTooltipAbove",
				"BRT": "mblTooltipBelow",
				"TRB": "mblTooltipAbove",
				"TLT": "mblTooltipBefore",
				"TRT": "mblTooltipAfter",
				"BRB": "mblTooltipAfter",
				"BLB": "mblTooltipBefore"
			};
			if(!this.anchor){
				// create the helper nodes here in case the user overwrote domNode.innerHTML
				this.anchor = dojo.create("div", {"class":"mblTooltipAnchor"}, this.domNode, "first");
				this.arrow = dojo.create("div", {"class":"mblTooltipArrow"}, this.anchor, "first");
				this.innerArrow = dojo.create("div", {"class":"mblTooltipInnerArrow"}, this.anchor, "last");
			}//else already showing, so just adjust as needed
			dojo.removeClass(this.domNode, ["mblTooltipAfter","mblTooltipBefore","mblTooltipBelow","mblTooltipAbove"]);
			var best = place.around(this.domNode, aroundNode, positions || ['below-centered', 'above-centered', 'after', 'before'], this.isLeftToRight());
			var connectorClass = connectorClasses[best.corner + best.aroundCorner.charAt(0)] || '';
			dojo.addClass(this.domNode, connectorClass);
			var pos = dojo.position(aroundNode, true);
			if(connectorClass == "mblTooltipAbove" || connectorClass == "mblTooltipBelow"){
				this.anchor.style.left = Math.max(0, pos.x - best.x + (pos.w >> 1) - (this.arrow.offsetWidth >> 1)) + "px";
				this.anchor.style.top = "";
			}else{
				this.anchor.style.top = Math.max(0, pos.y - best.y + (pos.h >> 1) - (this.arrow.offsetHeight >> 1)) + "px";
				this.anchor.style.left = "";
			}
			dojo.replaceClass(this.domNode, "mblTooltipVisible", "mblTooltipHidden");
			return best;
		},

		hide: function(){
			// summary:
			//		Pop down the tooltip
			if(this.anchor){
				this.anchor.removeChild(this.innerArrow);
				this.anchor.removeChild(this.arrow);
				this.domNode.removeChild(this.anchor);
				this.anchor = this.arrow = this.innerArrow = undefined;
			}
			dojo.replaceClass(this.domNode, "mblTooltipHidden", "mblTooltipVisible");
		},

		onBlur: function(/*Event*/e){
			return true; // touching outside the overlay area does call hide() by default
		},

		destroy: function(){
			if(this.anchor){ this.hide(); }
			this.inherited(arguments);
		}
	});
});
