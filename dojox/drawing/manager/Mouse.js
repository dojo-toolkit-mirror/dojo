dojo.provide("dojox.drawing.manager.Mouse");

dojox.drawing.manager.Mouse = dojox.drawing.util.oo.declare(
	// summary:
	//		Master object (instance) that tracks mouse
	//		events. A new instance is created for each
	//		Drawing object.
	// description:
	//		You could connect to any method or event in this
	//		class, but it is designed to have the object
	//		'registered'. All objects with the current event
	//		will be called directly.
	//
	//		Custom events are used often. In addition to
	//		standard events onDown, onUp, onDrag, etc, if
	//		a certain object is clicked upon (or dragged, etc),
	//		that object's drawingType will create the custom event,
	//		such as onAnchorDown, or onStencilDown.
	//
	function(/* Object */options){
		this.util = options.util;
		this.keys = options.keys;
	},
	
	{
		// doublClickSpeed: Number
		//		Milliseconds between clicks to
		//		register as for onDoubleClick
		doublClickSpeed:400,
		
		// private properties
		registerd:{},
		_lastx:0,
		_lasty:0,
		__reg:0,
		_downOnCanvas:false,
		
/*=====
CustomEventMethod: function(){
	// summary:
	//		The custom event method that an Object that has
	//		registered with manager.Mouse can receive.
	//		Can contain any or all of the following methods
	//		and they will be called as mouse events. All events
	//		will be sent a EventObject event object.
	//	NOTE:
	//		Events happen anywhere in the document unless
	//		otherwise noted.
	//
	//	onMove
	//		Fires on mousemove when mouse is up
	//	onDown
	//		Fires on mousedown *on the canvas*
	//	onDrag
	//		Fires on mousemove when mouse is down
	//	onUp
	//		Fires on mouseup, anywhere in the document
	//	onStencilDown
	//		Fired on mousedown on a Stencil
	//	onStencilDrag
	//		Fired when mouse moves and mose is down on a Stencil
	//	onStencilUp
	//		Fired on mouseup off of a Stencil
	//	on[Custom]Up|Down|Move
	//		Custom events can bet set and fired by setting a
	//		different drawingType on a Stencil, or by calling
	//		setEventMode(customEventName)
},
EventObject: function(){
	// summary:
	//		The custom event object that is sent to registered objects
	//		and their respective methods.
	//	NOTE: Most event objects are the same with the exception
	//		of the onDown events, which have fewer.
	//
	// All event properties included onDown:
	//
	//	id: String
	//		Id of the focused object
	//	pageX: Number
	//		The X coordinate of the mouse from the left side of
	//		the document.
	//	pageY: Number
	//		The Y coordinate of the mouse from the top of
	//		the document.
	//	x:	Number
	//		The X coordinate of the mouse from the left side
	//		of the canvas
	//	y:	Number
	//		The Y coordinate of the mouse from the top
	//		of the canvas
	//
	// These event properties are *not* in onDown:
	//
	//	last:	Object
	//		The x and y coordinates of the last mousemove
	//		relative to the canvas
	//	move: Object
	//		The x and y amounts the mouse moved since the last event
	//	orgX:	Number
	//		The left side of the canvas from the side of the document
	//	orgY:	Number
	//		The top of the canvas from the top of the document
	//	scroll: Object
	//		The 'top' and 'left' scroll amounts of the canvas.
	//	start:	Object
	//		The x and y coordinates of the mousedown event
	//	withinCanvas: Boolean
	//		Whether the event happened within the Canvas or not
	
},
=====*/
			
		init: function(/* HTMLNode*/node){
			//	summary:
			//		Internal. Initializes mouse.
			//
			this.container = node;
			this.setCanvas();
			var c;
			var _isDown = false;
			dojo.connect(this.container, "mousedown", this, function(evt){
				this.down(evt);
				_isDown = true;
				c = dojo.connect(document, "mousemove", this, "drag");
			});
			dojo.connect(document, "mouseup", this, function(evt){
				dojo.disconnect(c);
				_isDown = false;
				this.up(evt);
			});
			dojo.connect(document, "mousemove", this, function(evt){
				if(!_isDown){
					this.move(evt);
				}
			});
			dojo.connect(this.keys, "onEsc", this, function(evt){
				this._dragged = false;	
			});
		},
		
		setCanvas: function(){
			// summary:
			//		Internal. Sets canvas position
			var pos = dojo.coords(this.container.parentNode);
			this.origin = dojo.clone(pos);
		},
		
		scrollOffset: function(){
			// summary:
			// 	Gets scroll offset of canvas
			return {
				top:this.container.parentNode.scrollTop,
				left:this.container.parentNode.scrollLeft		
			}; // Object
		},
		register: function(/* Object*/scope){
			// summary:
			//		All objects (Stencils) should register here if they
			//		use mouse events. When registering, the object will
			//		be called if it has that method.
			//	argument:
			//		The object to be called
			//	Returns: handle
			//		Keep the handle to be used for disconnection.
			// See: CustomEventMethod and EventObject
			//
			var handle = scope.id || "reg_"+(this.__reg++);
			if(!this.registerd[handle]) { this.registerd[handle] = scope; }
			return handle; // String
		},
		unregister: function(handle){
			// summary:
			// 		Disconnects object. Mouse events are no longer
			//		called for it.
			if(!this.registerd[handle]){ return; }
			delete this.registerd[handle];
		},
		
		_broadcastEvent:function(strEvt, obj){
			// summary:
			//		Fire events to all registered objects.
			//
			//console.log("mouse.broadcast:", strEvt, obj)
			for(var nm in this.registerd){
				if(this.registerd[nm][strEvt]) this.registerd[nm][strEvt](obj);
			}
		},
		
		onDown: function(obj){
			// summary:
			// 		Create on[xx]Down event and send to broadcaster.
			//		Could be connected to.
			//
			//console.info("onDown:", this.eventName("down"))
			this._broadcastEvent(this.eventName("down"), obj);			
		},
		
		onDrag: function(obj){
			// summary:
			// 		Create on[xx]Drag event and send to broadcaster.
			//		Could be connected to.
			//
			var nm = this.eventName("drag");
			if(this._selected && nm == "onDrag"){
				nm = "onStencilDrag"
			}
			this._broadcastEvent(nm, obj);
		},
		
		onMove: function(obj){
			// summary:
			// 		Create onMove event and send to broadcaster.
			//		Could be connected to.
			//		Note: onMove never uses a custom event
			//		Note: onMove is currently not enabled in the app.
			//
			this._broadcastEvent("onMove", obj);
		},
		
		onUp: function(obj){
			// summary:
			// 		Create on[xx]Up event and send to broadcaster.
			//		Could be connected to.
			//
			// 	blocking first click-off (deselect), largely for TextBlock
			// 	TODO: should have param to make this optional?
			var nm = this.eventName("up");
			
			if(nm == "onStencilUp"){
				this._selected  = true;
			}else if(this._selected && nm == "onUp"){ //////////////////////////////////////////
				nm = "onStencilUp";
				this._selected = false;
			}
			
			console.info("Up Event:", nm, "id:", obj.id);
			this._broadcastEvent(nm, obj);
			
			// Silverlight double-click handled in Silverlight class
			if(dojox.gfx.renderer == "silverlight"){ return; }
			
			// Check Double Click
			// If a double click is detected, the onDoubleClick event fires,
			// but does not replace the normal event. They both fire.
			this._clickTime = new Date().getTime();
			if(this._lastClickTime){
				if(this._clickTime-this._lastClickTime<this.doublClickSpeed){
					var dnm = this.eventName("doubleClick");
					console.warn("DOUBLE CLICK", dnm, obj);
					this._broadcastEvent(dnm, obj);
				}else{
					//console.log("    slow:", this._clickTime-this._lastClickTime)
				}
			}
			this._lastClickTime = this._clickTime;
			
		},
		
		zoom: 1,
		setZoom: function(zoom){
			// summary:
			// 		Internal. Sets the mouse zoom percentage to
			//		that of the canvas
			this.zoom = 1/zoom;
		},
		
		setEventMode: function(mode){
			// summary:
			//		Sets the mouse mode s that custom events can be called.
			//		Also can 'disable' events by using a bogus mode:
			// 		|	mouse.setEventMode("DISABLED")
			//		(unless any object subscribes to this event,
			//		it is effectively disabled)
			//
			this.mode = mode ? "on" + mode.charAt(0).toUpperCase() + mode.substring(1) :  "";
		},
		
		eventName: function(name){
			// summary:
			//		Internal. Determine the event name
			//
			name = name.charAt(0).toUpperCase() + name.substring(1);
			if(this.mode){
				return this.mode + name;		
			}else{
				var dt = !this.drawingType || this.drawingType=="surface" || this.drawingType=="canvas" ? "" : this.drawingType;
				var t = !dt ? "" : dt.charAt(0).toUpperCase() + dt.substring(1);
				return "on"+t+name;
			}
		},
		
		up: function(evt){
			// summary:
			//		Internal. Create onUp event
			//
			this.onUp(this.create(evt));
		},
		
		down: function(evt){
			// summary:
			//		Internal. Create onDown event
			//
			this._downOnCanvas = true;
			var sc = this.scrollOffset();
			var dim = this._getXY(evt);
			this._lastpagex = dim.x;
			this._lastpagey = dim.y;
			var x = dim.x - this.origin.x;
			var y = dim.y - this.origin.y;
			
			x*= this.zoom;
			y*= this.zoom;
			x += sc.left*this.zoom;
			y += sc.top*this.zoom;
			
			this.origin.startx = x;
			this.origin.starty = y;
			this._lastx = x;
			this._lasty = y;
			
			this.drawingType = this.util.attr(evt, "drawingType") || "";
		
			//console.log("evt:", evt);
			//console.log("this.drawingType:", this.drawingType)
			this.onDown({x:x,y:y, pageX:dim.x, pageY:dim.y, id:this._getId(evt)});
			dojo.stopEvent(evt);
		},
		move: function(evt){
			// summary:
			//		Internal.
			//
			// TODO: move currently disabled
			//this.onMove(this.create(evt));
		},
		drag: function(evt){
			// summary:
			//		Internal. Create onDrag event
			this.onDrag(this.create(evt, true));
		},
		create: function(evt, squelchErrors){
			// summary:
			//		Internal. Create EventObject
			//
			var sc = this.scrollOffset();
			var dim = this._getXY(evt);
			
			var pagex = dim.x;
			var pagey = dim.y;
			
			var x = dim.x - this.origin.x;
			var y = dim.y - this.origin.y;
			var o = this.origin;
			
			x += sc.left;
			y += sc.top;
			x*= this.zoom;
			y*= this.zoom;
			
			var withinCanvas = x>=0 && y>=0 && x<=o.w && y<=o.h;
			var id = withinCanvas ? this._getId(evt, squelchErrors) : "";
			
			var ret = {
				x:x,
				y:y,
				pageX:dim.x,
				pageY:dim.y,
				page:{
					x:dim.x,
					y:dim.y
				},
				orgX:o.x,
				orgY:o.y,
				last:{
					x: this._lastx,
					y: this._lasty
				},
				start:{
					x: this.origin.startx, //+ sc.left,
					y: this.origin.starty //+ sc.top
				},
				move:{
					x:pagex - this._lastpagex,
					y:pagey - this._lastpagey
				},
				scroll:sc,
				id:id,
				withinCanvas:withinCanvas
			};
			
			//console.warn("MSE LAST:", x-this._lastx, y-this._lasty)
			this._lastx = x;
			this._lasty = y;
			this._lastpagex = pagex;
			this._lastpagey = pagey;
			dojo.stopEvent(evt);
			return ret; //Object
		},
		_getId: function(evt, squelchErrors){
			// summary:
			//		Internal. Gets ID of focused node.
			return this.util.attr(evt, "id", null, squelchErrors); // String
		},
		_getXY: function(evt){
			// summary:
			//		Internal. Gets mouse coords to page.
			return {x:evt.pageX, y:evt.pageY}; // Object
		}
	}
);
