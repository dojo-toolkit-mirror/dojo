dojo.provide("dijit.form._Spinner");

dojo.require("dijit.form.ValidationTextBox");

dojo.declare(
	"dijit.form._Spinner",
	dijit.form.RangeBoundTextBox,
	{
		// summary:
		//		Mixin for validation widgets with a spinner.
		// description:
		//		This class basically (conceptually) extends `dijit.form.ValidationTextBox`.
		//		It modifies the template to have up/down arrows, and provides related handling code.

		// defaultTimeout: Number
		//		Number of milliseconds before a held arrow key or up/down button becomes typematic
		defaultTimeout: 500,

		// timeoutChangeRate: Number
		//		Fraction of time used to change the typematic timer between events.
		//		1.0 means that each typematic event fires at defaultTimeout intervals.
		//		< 1.0 means that each typematic event fires at an increasing faster rate.
		timeoutChangeRate: 0.90,

		// smallDelta: Number
		//	  Adjust the value by this much when spinning using the arrow keys/buttons
		smallDelta: 1,

		// largeDelta: Number
		//	  Adjust the value by this much when spinning using the PgUp/Dn keys
		largeDelta: 10,

		templateString: dojo.cache("dijit.form", "templates/Spinner.html"),

		baseClass: "dijitTextBox dijitSpinner",

		// Set classes like dijitUpArrowButtonHover or dijitDownArrowButtonActive depending on
		// mouse action over specified node
		cssStateNodes: {
			"upArrowNode": "dijitUpArrowButton",
			"downArrowNode": "dijitDownArrowButton"
		},

		adjust: function(/* Object */ val, /*Number*/ delta){
			// summary:
			//		Overridable function used to adjust a primitive value(Number/Date/...) by the delta amount specified.
			// 		The val is adjusted in a way that makes sense to the object type.
			// tags:
			//		protected extension
			return val;
		},

		_arrowPressed: function(/*Node*/ nodePressed, /*Number*/ direction, /*Number*/ increment){
			// summary:
			//		Handler for arrow button or arrow key being pressed
			if(this.disabled || this.readOnly){ return; }
			this._setValueAttr(this.adjust(this.attr('value'), direction*increment), false);
			dijit.selectInputText(this.textbox, this.textbox.value.length);
		},

		_arrowReleased: function(/*Node*/ node){
			// summary:
			//		Handler for arrow button or arrow key being released
			this._wheelTimer = null;
			if(this.disabled || this.readOnly){ return; }
		},

		_typematicCallback: function(/*Number*/ count, /*DOMNode*/ node, /*Event*/ evt){
			var inc=this.smallDelta;
			if(node == this.textbox){
				var k=dojo.keys;
				var key = evt.charOrCode;
				inc = (key == k.PAGE_UP || key == k.PAGE_DOWN) ? this.largeDelta : this.smallDelta;
				node = (key == k.UP_ARROW || key == k.PAGE_UP) ? this.upArrowNode : this.downArrowNode;
			}
			if(count == -1){ this._arrowReleased(node); }
			else{ this._arrowPressed(node, (node == this.upArrowNode) ? 1 : -1, inc); }
		},

		_wheelTimer: null,
		_mouseWheeled: function(/*Event*/ evt){
			// summary:
			//		Mouse wheel listener where supported

			dojo.stopEvent(evt);
			// FIXME: Safari bubbles

			// be nice to DOH and scroll as much as the event says to
			var scrollAmount = evt.detail ? (evt.detail * -1) : (evt.wheelDelta / 120);
			if(scrollAmount !== 0){
				var node = this[(scrollAmount > 0 ? "upArrowNode" : "downArrowNode" )];

				this._arrowPressed(node, scrollAmount, this.smallDelta);

				if(!this._wheelTimer){
					clearTimeout(this._wheelTimer);
				}
				this._wheelTimer = setTimeout(dojo.hitch(this,"_arrowReleased",node), 50);
			}

		},

		postCreate: function(){
			this.inherited(arguments);

			// extra listeners
			this.connect(this.domNode, !dojo.isMozilla ? "onmousewheel" : 'DOMMouseScroll', "_mouseWheeled");
			this._connects.push(dijit.typematic.addListener(this.upArrowNode, this.textbox, {charOrCode:dojo.keys.UP_ARROW,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}, this, "_typematicCallback", this.timeoutChangeRate, this.defaultTimeout));
			this._connects.push(dijit.typematic.addListener(this.downArrowNode, this.textbox, {charOrCode:dojo.keys.DOWN_ARROW,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}, this, "_typematicCallback", this.timeoutChangeRate, this.defaultTimeout));
			this._connects.push(dijit.typematic.addListener(this.upArrowNode, this.textbox, {charOrCode:dojo.keys.PAGE_UP,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}, this, "_typematicCallback", this.timeoutChangeRate, this.defaultTimeout));
			this._connects.push(dijit.typematic.addListener(this.downArrowNode, this.textbox, {charOrCode:dojo.keys.PAGE_DOWN,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}, this, "_typematicCallback", this.timeoutChangeRate, this.defaultTimeout));
			if(dojo.isIE){
				var _this = this;
				(function resize(){
					var sz = _this.upArrowNode.parentNode.offsetHeight;
					if(sz){
						_this.upArrowNode.style.height = sz >> 1;
						_this.downArrowNode.style.height = sz - (sz >> 1);
						_this.focusNode.parentNode.style.height = sz;
					}
				})();
				this.connect(this.domNode, "onresize",
					function(){ setTimeout(
						function(){
							resize();
							// cause IE to rerender when spinner is moved from hidden to visible
							_this._setStateClass();
						}, 0);
					}
				);
				this._layoutHackIE7();
			}
		}
});
