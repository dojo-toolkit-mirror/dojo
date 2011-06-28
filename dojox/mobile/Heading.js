define([
  "dojo",
  "dijit",
  "dojox",
  "./common",
  "dijit/_WidgetBase",
  "dijit/_Container",
  "dijit/_Contained"], function(dojo, dijit, dojox){
	// module:
	//		dojox/mobile/Heading
	// summary:
	//		TODOC

dojo.declare(
	"dojox.mobile.Heading",
	[dijit._WidgetBase, dijit._Container, dijit._Contained],
{
	back: "",
	href: "",
	moveTo: "",
	transition: "slide",
	label: "",
	iconBase: "",

	buildRendering: function(){
		this.domNode = this.containerNode = this.srcNodeRef || dojo.doc.createElement("H1");
		this.domNode.className = "mblHeading";
		if(this.label){
			this.labelNode = dojo.create("SPAN", null, this.domNode);
		}else{
			dojo.forEach(this.domNode.childNodes, function(n){
				if(n.nodeType == 3){
					var v = dojo.trim(n.nodeValue);
					if(v){
						this.label = v;
						this.labelNode = dojo.create("SPAN", {innerHTML:v}, n, "replace");
					}
				}
			}, this);
		}
		if(this.back){
			var btn = dojo.create("DIV", {className:"mblArrowButton"}, this.domNode, "first");
			var head = dojo.create("DIV", {className:"mblArrowButtonHead"}, btn);
			var body = dojo.create("DIV", {className:"mblArrowButtonBody mblArrowButtonText"}, btn);

			this._body = body;
			this._head = head;
			this._btn = btn;
			this.connect(body, "onclick", "onClick");
			var neck = dojo.create("DIV", {className:"mblArrowButtonNeck"}, btn);
		}
	},

	startup: function(){
		if(this._started){ return; }
		var parent = this.getParent && this.getParent();
		if(!parent || !parent.resize){ // top level widget
			this.resize();
		}
		this.inherited(arguments);
	},

	resize: function(){
		if(this._btn){
			this._btn.style.width = this._body.offsetWidth + this._head.offsetWidth + "px";
			this._btn.style.position = "absolute";
			var dim = dojo.marginBox(this._btn);

			var hasBtn = false;
			var children = this.containerNode.childNodes;
			for(i = 0; i < children.length; i++){
				var c = children[i];
				if(c.nodeType === 1 && dojo.hasClass(c, "mblToolbarButton")){
					hasBtn = true;
					break;
				}
			}

			this._btn.style.position = !hasBtn && this.labelNode &&
				(dim.l + dim.w < this.labelNode.offsetLeft) ? "absolute" : "relative";
		}
		dojo.forEach(this.getChildren(), function(child){
			if(child.resize){ child.resize(); }
		});
	},

	_setBackAttr: function(/*String*/back){
		this.back = back;
		this._body.innerHTML = this._cv(this.back);
		this.resize();
	},

	_setLabelAttr: function(/*String*/label){
		this.label = label;
		this.labelNode.innerHTML = this._cv(label);
	},

	findCurrentView: function(){
		var w = this;
		while(true){
			w = w.getParent();
			if(!w){ return null; }
			if(w instanceof dojox.mobile.View){ break; }
		}
		return w;
	},

	onClick: function(e){
		var h1 = this.domNode;
		dojo.addClass(h1, "mblArrowButtonSelected");
		setTimeout(function(){
			dojo.removeClass(h1, "mblArrowButtonSelected");
		}, 1000);

		// keep the clicked position for transition animations
		var view = this.findCurrentView();
		if(view){
			view.clickedPosX = e.clientX;
			view.clickedPosY = e.clientY;
		}

		this.goTo(this.moveTo, this.href);
	},

	goTo: function(moveTo, href){
		var view = this.findCurrentView();
		if(!view){ return; }
		if(href){
			view.performTransition(null, -1, this.transition, this, function(){location.href = href;});
		}else{
			if(dojox.mobile.app && dojox.mobile.app.STAGE_CONTROLLER_ACTIVE){
				// If in a full mobile app, then use its mechanisms to move back a scene
				dojo.publish("/dojox/mobile/app/goback");
			}else{
				// Basically transition should be performed between two
				// siblings that share the same parent.
				// However, when views are nested and transition occurs from
				// an inner view, search for an ancestor view that is a sibling
				// of the target view, and use it as a source view.
				var node = dijit.byId(view.convertToId(moveTo));
				if(node){
					var parent = node.getParent();
					while(view){
						var myParent = view.getParent();
						if (parent === myParent){
							break;
						}
						view = myParent;
					}
				}
				if(view){
					view.performTransition(moveTo, -1, this.transition);
				}
			}
		}
	}
});

return dojox.mobile.Heading;
});
