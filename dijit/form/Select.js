define([
	"dojo",
	"..",
	"dojo/text!./templates/Select.html",
	"./_FormSelectWidget",
	"../_HasDropDown",
	"../Menu",
	"../Tooltip",
	"dojo/i18n!./nls/validate"], function(dojo, dijit) {

	// module:
	//		dijit/form/Select
	// summary:
	//		TODOC
	// 


dojo.declare("dijit.form._SelectMenu", dijit.Menu, {
	// summary:
	//		An internally-used menu for dropdown that allows us a vertical scrollbar
	buildRendering: function(){
		// summary:
		//		Stub in our own changes, so that our domNode is not a table
		//		otherwise, we won't respond correctly to heights/overflows
		this.inherited(arguments);
		var o = (this.menuTableNode = this.domNode);
		var n = (this.domNode = dojo.create("div", {style: {overflowX: "hidden", overflowY: "scroll"}}));
		if(o.parentNode){
			o.parentNode.replaceChild(n, o);
		}
		dojo.removeClass(o, "dijitMenuTable");
		n.className = o.className + " dijitSelectMenu";
		o.className = "dijitReset dijitMenuTable";
		dijit.setWaiRole(o,"listbox");
		dijit.setWaiRole(n,"presentation");
		n.appendChild(o);
	},

	postCreate: function(){
		// summary:
		//		stop mousemove from selecting text on IE to be consistent with other browsers

		this.inherited(arguments);

		this.connect(this.domNode, "onmousemove", dojo.stopEvent);
	},

	resize: function(/*Object*/ mb){
		// summary:
		//		Overridden so that we are able to handle resizing our
		//		internal widget.  Note that this is not a "full" resize
		//		implementation - it only works correctly if you pass it a
		//		marginBox.
		//
		// mb: Object
		//		The margin box to set this dropdown to.
		if(mb){
			dojo.marginBox(this.domNode, mb);
			if("w" in mb){
				// We've explicitly set the wrapper <div>'s width, so set <table> width to match.
				// 100% is safer than a pixel value because there may be a scroll bar with
				// browser/OS specific width.
				this.menuTableNode.style.width = "100%";
			}
		}
	}
});

dojo.declare("dijit.form.Select", [dijit.form._FormSelectWidget, dijit._HasDropDown], {
	// summary:
	//		This is a "styleable" select box - it is basically a DropDownButton which
	//		can take a <select> as its input.

	baseClass: "dijitSelect",

	templateString: dojo.cache("dijit.form", "templates/Select.html"),

	// required: Boolean
	//		Can be true or false, default is false.
	required: false,

	// state: String
	//		Shows current state (ie, validation result) of input (Normal, Warning, or Error)
	state: "",

	// message: String
	//		Currently displayed error/prompt message
	message: "",

	//	tooltipPosition: String[]
	//		See description of dijit.Tooltip.defaultPosition for details on this parameter.
	tooltipPosition: [],

	// emptyLabel: string
	//		What to display in an "empty" dropdown
	emptyLabel: "&nbsp;",

	// _isLoaded: Boolean
	//		Whether or not we have been loaded
	_isLoaded: false,

	// _childrenLoaded: Boolean
	//		Whether or not our children have been loaded
	_childrenLoaded: false,

	_fillContent: function(){
		// summary:
		//		Set the value to be the first, or the selected index
		this.inherited(arguments);
		// set value from selected option
		if(this.options.length && !this.value && this.srcNodeRef){
			var si = this.srcNodeRef.selectedIndex || 0; // || 0 needed for when srcNodeRef is not a SELECT
			this.value = this.options[si >= 0 ? si : 0].value;
		}
		// Create the dropDown widget
		this.dropDown = new dijit.form._SelectMenu({id: this.id + "_menu"});
		dojo.addClass(this.dropDown.domNode, this.baseClass + "Menu");
	},

	_getMenuItemForOption: function(/*dijit.form.__SelectOption*/ option){
		// summary:
		//		For the given option, return the menu item that should be
		//		used to display it.  This can be overridden as needed
		if(!option.value && !option.label){
			// We are a separator (no label set for it)
			return new dijit.MenuSeparator();
		}else{
			// Just a regular menu option
			var click = dojo.hitch(this, "_setValueAttr", option);
			var item = new dijit.MenuItem({
				option: option,
				label: option.label || this.emptyLabel,
				onClick: click,
				disabled: option.disabled || false
			});
			dijit.setWaiRole(item.focusNode, "listitem");
			return item;
		}
	},

	_addOptionItem: function(/*dijit.form.__SelectOption*/ option){
		// summary:
		//		For the given option, add an option to our dropdown.
		//		If the option doesn't have a value, then a separator is added
		//		in that place.
		if(this.dropDown){
			this.dropDown.addChild(this._getMenuItemForOption(option));
		}
	},

	_getChildren: function(){
		if(!this.dropDown){
			return [];
		}
		return this.dropDown.getChildren();
	},

	_loadChildren: function(/*Boolean*/ loadMenuItems){
		// summary:
		//		Resets the menu and the length attribute of the button - and
		//		ensures that the label is appropriately set.
		//	loadMenuItems: Boolean
		//		actually loads the child menu items - we only do this when we are
		//		populating for showing the dropdown.

		if(loadMenuItems === true){
			// this.inherited destroys this.dropDown's child widgets (MenuItems).
			// Avoid this.dropDown (Menu widget) having a pointer to a destroyed widget (which will cause
			// issues later in _setSelected). (see #10296)
			if(this.dropDown){
				delete this.dropDown.focusedChild;
			}
			if(this.options.length){
				this.inherited(arguments);
			}else{
				// Drop down menu is blank but add one blank entry just so something appears on the screen
				// to let users know that they are no choices (mimicing native select behavior)
				dojo.forEach(this._getChildren(), function(child){ child.destroyRecursive(); });
				var item = new dijit.MenuItem({label: "&nbsp;"});
				this.dropDown.addChild(item);
			}
		}else{
			this._updateSelection();
		}

		this._isLoaded = false;
		this._childrenLoaded = true;

		if(!this._loadingStore){
			// Don't call this if we are loading - since we will handle it later
			this._setValueAttr(this.value);
		}
	},

	_setValueAttr: function(value){
		this.inherited(arguments);
		dojo.attr(this.valueNode, "value", this.get("value"));
	},

	_setDisplay: function(/*String*/ newDisplay){
		// summary:
		//		sets the display for the given value (or values)
		var lbl = newDisplay || this.emptyLabel;
		this.containerNode.innerHTML = '<span class="dijitReset dijitInline ' + this.baseClass + 'Label">' + lbl + '</span>';
		dijit.setWaiState(this.focusNode, "valuetext", lbl);
	},

	validate: function(/*Boolean*/ isFocused){
		// summary:
		//		Called by oninit, onblur, and onkeypress.
		// description:
		//		Show missing or invalid messages if appropriate, and highlight textbox field.
		//		Used when a select is initially set to no value and the user is required to
		//		set the value.
		
		var isValid = this.isValid(isFocused);
		this._set("state", isValid ? "" : "Error");
		dijit.setWaiState(this.focusNode, "invalid", isValid ? "false" : "true");
		var message = isValid ? "" : this._missingMsg;
		if(this.message !== message){
			this._set("message", message);
			dijit.hideTooltip(this.domNode);
			if(message){
				dijit.showTooltip(message, this.domNode, this.tooltipPosition, !this.isLeftToRight());
			}
		}
		return isValid;
	},

	isValid: function(/*Boolean*/ isFocused){
		// summary:
		//		Whether or not this is a valid value.  The only way a Select
		//		can be invalid is when it's required but nothing is selected.
		return (!this.required || this.value === 0 || !(/^\s*$/.test(this.value || ""))); // handle value is null or undefined
	},

	reset: function(){
		// summary:
		//		Overridden so that the state will be cleared.
		this.inherited(arguments);
		dijit.hideTooltip(this.domNode);
		this._set("state", "");
		this._set("message", "")
	},

	postMixInProperties: function(){
		// summary:
		//		set the missing message
		this.inherited(arguments);
		this._missingMsg = dojo.i18n.getLocalization("dijit.form", "validate",
									this.lang).missingMessage;
	},

	postCreate: function(){
		// summary:
		//		stop mousemove from selecting text on IE to be consistent with other browsers

		this.inherited(arguments);

		this.connect(this.domNode, "onmousemove", dojo.stopEvent);
	},

	_setStyleAttr: function(/*String||Object*/ value){
		this.inherited(arguments);
		dojo.toggleClass(this.domNode, this.baseClass + "FixedWidth", !!this.domNode.style.width);
	},

	isLoaded: function(){
		return this._isLoaded;
	},

	loadDropDown: function(/*Function*/ loadCallback){
		// summary:
		//		populates the menu
		this._loadChildren(true);
		this._isLoaded = true;
		loadCallback();
	},

	closeDropDown: function(){
		// overriding _HasDropDown.closeDropDown()
		this.inherited(arguments);

		if(this.dropDown && this.dropDown.menuTableNode){
			// Erase possible width: 100% setting from _SelectMenu.resize().
			// Leaving it would interfere with the next openDropDown() call, which
			// queries the natural size of the drop down.
			this.dropDown.menuTableNode.style.width = "";
		}
	},

	uninitialize: function(preserveDom){
		if(this.dropDown && !this.dropDown._destroyed){
			this.dropDown.destroyRecursive(preserveDom);
			delete this.dropDown;
		}
		this.inherited(arguments);
	}
});


return dijit.form.Select;
});
