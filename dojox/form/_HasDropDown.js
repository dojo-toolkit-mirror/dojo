dojo.provide("dojox.form._HasDropDown");

dojo.require("dijit._Widget");

dojo.declare("dojox.form._HasDropDown",
	null,
	{
		//	summary:
		//		Mixin for widgets that need drop down ability.

		//	dropDownNode: [protected] DomNode
		//		The button/icon/node to click to display the drop down.
		//		Can be set via a dojoAttachPoint assignment.  
		//		If missing, then either focusNode or domNode (if focusNode is also missing) will be used.
		dropDownNode: null,
		
		//	popupStateNode: [protected] DomNode
		//		The node to set the popupActive class on.
		//		Can be set via a dojoAttachPoint assignment.  
		//		If missing, then focusNode or dropDownNode (if focusNode is missing) will be used.
		popupStateNode: null,
		
		//	aroundNode: [protected] DomNode
		//		The node to display the popup around.
		//		Can be set via a dojoAttachPoint assignment.  
		//		If missing, then domNode will be used.
		aroundNode: null,
		
		//	dropDown: [protected] Widget
		//		The widget to display as a popup.  This widget *must* be 
		//		defined before the startup function is called.
		dropDown: null,
		
		//	autoWidth: [protected] Boolean
		//		Set to true to make the drop down at least as wide as this 
		//		widget.  Set to false if the drop down should just be its
		//		default width
		autoWidth: true,
		
		//  maxHeight: [protected] Integer
		//		The max height for our dropdown.  Set to 0 for no max height.
		//		any dropdown taller than this will have scrollbars
		maxHeight: 0,
		
		//	_stopClickEvents: Boolean
		//		When set to false, the click events will not be stopped, in
		//		case you want to use them in your subwidget
		_stopClickEvents: true,
		
		_onMenuMouseup: function(/*Event*/ e){
			// summary:
			//		Called with the mouseup event if the mouseup occurred
			//		over the menu.  You can try and use this event in
			//		order to automatically execute your dropdown (as
			//		if it were clicked).  You might want to close your menu 
			//		as a part of this function.
			//
			//		This is useful for the common mouse movement pattern
			//		with native browser <select> nodes:
			//			1. mouse down on the select node (probably on the arrow)
			//			2. move mouse to a menu item while holding down the mouse button
			//			3. mouse up.  this selects the menu item as though the user had clicked it.
			
			// TODO: move code from DropDownSelect._onMenuMouseup (to call onItemClick()) into
			// _HasDropDown, and then get rid of this extension function
		},
		
		_onDropDownMouse: function(/*Event*/ e){
			// summary:
			//		Callback when the user mouse clicks on the arrow icon, or presses the down
			//		arrow key, to open the drop down.

			// We handle mouse events using onmousedown in order to allow for
			// selecting via a drag.  So, our click is already handled, unless   (BK: what does this mean, selecting via drag?)
			// we are executed via keypress - in which case, this._seenKeydown
			// will be set to true.			
			if(e.type == "click" && !this._seenKeydown){ return; }
			this._seenKeydown = false;
			
			// If we are a mouse event, set up the mouseup handler.  See _onDropDownMouse() for
			// details on this handler.
			if(e.type == "mousedown"){
				this._docHandler = this.connect(dojo.doc, "onmouseup", "_onDropDownMouseup");
			}
			if(this.disabled || this.readOnly){ return; }
			if(this._stopClickEvents){
				dojo.stopEvent(e);
			}
			this.toggleDropDown();

			// If we are a click, then we'll pretend we did a mouse up
			if(e.type == "click" || e.type == "keypress"){
				this._onDropDownMouseup();
			}
		},

		_onDropDownMouseup: function(/*Event?*/ e){
			// summary:
			//		Callback when the user lifts their mouse after mouse down on the arrow icon.
			//		If the drop is a simple menu and the mouse is over the menu, we execute it, otherwise, we focus our 
			//		dropDown node.  If the event is missing, then we are not
			//		a mouseup event.
			//
			//		This is useful for the common mouse movement pattern
			//		with native browser <select> nodes:
			//			1. mouse down on the select node (probably on the arrow)
			//			2. move mouse to a menu item while holding down the mouse button
			//			3. mouse up.  this selects the menu item as though the user had clicked it.

			if(e && this._docHandler){
				this.disconnect(this._docHandler);
			}
			var dropDown = this.dropDown, overMenu = false;
			
			if(e && this._opened){
				// This code deals with the corner-case when the drop down covers the original widget,
				// because it's so large.  In that case mouse-up shouldn't select a value from the menu.
				// Find out if our target is somewhere in our dropdown widget,
				// but not over our dropDownNode (the clickable node)
				var c = dojo.coords(this.dropDownNode)
				if(!(e.pageX >= c.l && e.pageX <= c.l + c.w) || 
					!(e.pageY >= c.t && e.pageY <= c.t + c.h)){
					var t = e.target;
					while(t && !overMenu){
						if(dojo.hasClass(t, "dijitPopup")){
							overMenu = true;
						}else{
							t = t.parentNode;
						}
					}
					if(overMenu){
						this._onMenuMouseup(e);
						return;
					}
				}
			}
			if(this._opened && dropDown.focus){
				// delay so that we don't steal our own focus.
				// TODOC: this seems strange to focus on the drop down icon; I think it will break
				// screen readers, and also, in dijit we never do this.  Is there a reason?  (BK)
				window.setTimeout(dojo.hitch(dropDown, "focus"), 1);
			}else{
				dijit.focus(this.focusNode);
			}
		},
		
		_setupDropdown: function(){
			//	summary:
			//		set up nodes and connect our mouse and keypress events
			this.dropDownNode = this.dropDownNode || this.focusNode || this.domNode;
			this.popupStateNode = this.popupStateNode || this.focusNode || this.dropDownNode;
			this.aroundNode = this.aroundNode || this.domNode;
			this.connect(this.dropDownNode, "onmousedown", "_onDropDownMouse");
			this.connect(this.dropDownNode, "onclick", "_onDropDownMouse");
			this.connect(this.dropDownNode, "onkeydown", "_onDropDownKeydown");
			this.connect(this.dropDownNode, "onblur", "_onDropDownBlur");
			this.connect(this.dropDownNode, "onkeypress", "_onKey");	
			
			// If we have a _setStateClass function (which happens when
			// we are a form widget), then we need to connect our open/close
			// functions to it
			if(this._setStateClass){
				this.connect(this, "openDropDown", "_setStateClass");
				this.connect(this, "closeDropDown", "_setStateClass");
			}
		},
		
		postCreate: function(){
			this._setupDropdown();
			this.inherited("postCreate", arguments);
		},
		
		destroyDescendants: function(){
			if(this.dropDown){
				this.dropDown.destroyRecursive();
				delete this.dropDown;
			}
			this.inherited("destroyDescendants", arguments);
		},

		_onDropDownKeydown: function(/*Event*/ e){
			this._seenKeydown = true;
		},
		
		_onKeyPress: function(/*Event*/ e){
			if(this._opened && e.charOrCode == dojo.keys.ESCAPE && !e.shiftKey && !e.ctrlKey && !e.altKey){
				this.toggleDropDown();
				dojo.stopEvent(e);
				return;
			}
			this.inherited(arguments);
		},

		_onDropDownBlur: function(/*Event*/ e){
			this._seenKeydown = false;
		},

		_onKey: function(/*Event*/ e){
			// summary:
			//		Callback when the user presses a key on menu popup node

			if(this.disabled || this.readOnly){ return; }
			var d = this.dropDown;
			if(d && this._opened && d.handleKey){
				if(d.handleKey(e) === false){ return; }
			}
			if(d && this._opened && e.keyCode == dojo.keys.ESCAPE){
				this.toggleDropDown();
				return;
			}
			if(e.keyCode == dojo.keys.DOWN_ARROW){
				this._onDropDownMouse(e);
			}
		},

		_onBlur: function(){
			// summary:
			//		Called magically when focus has shifted away from this widget and it's dropdown

			this.closeDropDown();
			// don't focus on button.  the user has explicitly focused on something else.
			this.inherited("_onBlur", arguments);
		},
		
		isLoaded: function(){
			// summary:
			//		Returns whether or not the dropdown is loaded.  This can
			//		be overridden in order to force a call to loadDropDown().
			// tags:
			//		protected

			return true;
		},
		
		loadDropDown: function(/* Function */ loadCallback){
			// summary:
			//		Loads the data for the dropdown, and at some point, calls
			//		the given callback
			// tags:
			//		protected

			loadCallback();
		},

		toggleDropDown: function(){
			// summary:
			//		Toggle the drop-down widget; if it is up, close it, if not, open it
			// tags:
			//		protected
			
			if(this.disabled || this.readOnly){ return; }
			this.focus();
			var dropDown = this.dropDown;
			if(!dropDown){ return; }
			if(!this._opened){
				// If we aren't loaded, load it first so there isn't a flicker
				if(!this.isLoaded()){
					this.loadDropDown(dojo.hitch(this, "openDropDown"));
					return;
				}else{
					this.openDropDown();
				}
			}else{
				this.closeDropDown();
			}
		},
		
		openDropDown: function(){
			// summary:
			//		Opens the dropdown for this widget - it returns the 
			//		return value of dijit.popup.open
			// tags:
			//		protected

			var dropDown = this.dropDown;
			var ddNode = dropDown.domNode;
			var self = this;

			// Prepare our popup's height and honor maxHeight if it exists.
			
			// TODO: isn't maxHeight dependent on the return value from dijit.popup.open(),
			// ie, dependent on how much space is available (BK)

			if(this._preparedNode){
				dojo.style(ddNode, {width: "", height: "", display: "", visibility: "hidden"});
			}else{
				dijit.popup.prepare(ddNode);
				this._preparedNode = true;
			}
			if(this.maxHeight || this.autoWidth){
				var mb = dojo.marginBox(ddNode);
				var overHeight = (this.maxHeight && mb.h > this.maxHeight);
				dojo.style(ddNode, {overflow: overHeight ? "auto" : "hidden"});
				if(this.autoWidth){
					mb.w = Math.max(mb.w, this.domNode.offsetWidth);
				}
				if(overHeight){
					mb.h = this.maxHeight;
					mb.w += 16;
				}
				if(dojo.isFunction(dropDown.resize)){
					dropDown.resize(mb);
				}else{
					dojo.marginBox(ddNode, mb);
				}
			}			
			var retVal = dijit.popup.open({
				parent: this,
				popup: dropDown,
				around: this.aroundNode,
				orient:
					// TODO: add user-defined positioning option, like in Tooltip.js
					this.isLeftToRight() ? {'BL':'TL', 'BR':'TR', 'TL':'BL', 'TR':'BR'}
					: {'BR':'TR', 'BL':'TL', 'TR':'BR', 'TL':'BL'},
				onExecute: function(){
					self.closeDropDown(true);
				},
				onCancel: function(){
					self.closeDropDown(true);
				},
				onClose: function(){
					dojo.attr(self.popupStateNode, "popupActive", false);
					dojo.removeClass(self.popupStateNode, "dojoxHasDropDownOpen");
					self._opened = false;
					self.state = "";
				}
			});
			dojo.attr(this.popupStateNode, "popupActive", "true");
			dojo.addClass(self.popupStateNode, "dojoxHasDropDownOpen");
			this._opened=true;
			this.state="Opened";
			// TODO: set this.checked and call setStateClass(), to affect button look while drop down is shown
			return retVal;
		},
	
		closeDropDown: function(/*Boolean*/ focus){
			// summary:
			//		Closes the drop down on this widget
			// tags:
			//		protected

			if(this._opened){
				dijit.popup.close(this.dropDown);
				if(focus){ this.focus(); }
				this._opened = false;
				this.state = "";
			}
		}
		
	}
);
