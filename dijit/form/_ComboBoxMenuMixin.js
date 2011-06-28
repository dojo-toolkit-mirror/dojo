define(["dojo", ".."], function(dojo, dijit) {
	// module:
	//		dijit/form/_ComboBoxMenuMixin
	// summary:
	//		TODOC

dojo.declare( "dijit.form._ComboBoxMenuMixin", null, {
	// summary:
	//		Focus-less menu for internal use in `dijit.form.ComboBox`
	// tags:
	//		private

	// _messages: Object
	//		Holds "next" and "previous" text for paging buttons on drop down
	_messages: null,

	postMixInProperties: function(){
		this.inherited(arguments);
		this._messages = dojo.i18n.getLocalization("dijit.form", "ComboBox", this.lang);
	},

	buildRendering: function(){
		this.inherited(arguments);

		// fill in template with i18n messages
		this.previousButton.innerHTML = this._messages["previousMessage"];
		this.nextButton.innerHTML = this._messages["nextMessage"];
	},

	_setValueAttr: function(/*Object*/ value){
		this.value = value;
		this.onChange(value);
	},

	onClick: function(/*DomNode*/ node){
		if(node == this.previousButton){
			this._setSelectedAttr(null);
			this.onPage(-1);
		}else if(node == this.nextButton){
			this._setSelectedAttr(null);
			this.onPage(1);
		}else{
			this.onChange(node);
		}
	},

	// stubs
	onPage: function(/*Number*/ direction){
		// summary:
		//		Notifies ComboBox/FilteringSelect that user clicked to advance to next/previous page.
		// tags:
		//		callback
	},

	onClose: function(){
		// summary:
		//		Callback from dijit.popup code to this widget, notifying it that it closed
		// tags:
		//		private
		this._setSelectedAttr(null);
	},

	_createOption: function(/*Object*/ item, labelFunc){
		// summary:
		//		Creates an option to appear on the popup menu subclassed by
		//		`dijit.form.FilteringSelect`.

		var menuitem = this._createMenuItem();
		var labelObject = labelFunc(item);
		if(labelObject.html){
			menuitem.innerHTML = labelObject.label;
		}else{
			menuitem.appendChild(
				dojo.doc.createTextNode(labelObject.label)
			);
		}
		// #3250: in blank options, assign a normal height
		if(menuitem.innerHTML == ""){
			menuitem.innerHTML = "&nbsp;";
		}

		// update menuitem.dir if BidiSupport was required
		this.applyTextDir(menuitem, (menuitem.innerText || menuitem.textContent || ""));

		menuitem.item=item;
		return menuitem;
	},

	createOptions: function(results, dataObject, labelFunc){
		// summary:
		//		Fills in the items in the drop down list
		// results:
		//		Array of dojo.data items
		// dataObject:
		//		dojo.data store
		// labelFunc:
		//		Function to produce a label in the drop down list from a dojo.data item

		//this._dataObject=dataObject;
		//this._dataObject.onComplete=dojo.hitch(comboBox, comboBox._openResultList);
		// display "Previous . . ." button
		this.previousButton.style.display = (dataObject.start == 0) ? "none" : "";
		dojo.attr(this.previousButton, "id", this.id + "_prev");
		// create options using _createOption function defined by parent
		// ComboBox (or FilteringSelect) class
		// #2309:
		//		iterate over cache nondestructively
		dojo.forEach(results, function(item, i){
			var menuitem = this._createOption(item, labelFunc);
			dojo.attr(menuitem, "id", this.id + i);
			this.nextButton.parentNode.insertBefore(menuitem, this.nextButton);
		}, this);
		// display "Next . . ." button
		var displayMore = false;
		//Try to determine if we should show 'more'...
		if(dataObject._maxOptions && dataObject._maxOptions != -1){
			if((dataObject.start + dataObject.count) < dataObject._maxOptions){
				displayMore = true;
			}else if((dataObject.start + dataObject.count) > dataObject._maxOptions && dataObject.count == results.length){
				//Weird return from a datastore, where a start + count > maxOptions
				// implies maxOptions isn't really valid and we have to go into faking it.
				//And more or less assume more if count == results.length
				displayMore = true;
			}
		}else if(dataObject.count == results.length){
			//Don't know the size, so we do the best we can based off count alone.
			//So, if we have an exact match to count, assume more.
			displayMore = true;
		}

		this.nextButton.style.display = displayMore ? "" : "none";
		dojo.attr(this.nextButton,"id", this.id + "_next");
		return this.containerNode.childNodes;
	},

	clearResultList: function(){
		// summary:
		//		Clears the entries in the drop down list, but of course keeps the previous and next buttons.
		var container = this.containerNode;
		while(container.childNodes.length > 2){
			container.removeChild(container.childNodes[container.childNodes.length-2]);
		}
		this._setSelectedAttr(null);
	},

	highlightFirstOption: function(){
		// summary:
		//		Highlight the first real item in the list (not Previous Choices).
		this.selectFirstNode();
	},

	highlightLastOption: function(){
		// summary:
		//		Highlight the last real item in the list (not More Choices).
		this.selectLastNode();
	},

	selectFirstNode: function(){
		this.inherited(arguments);
		if(this.getHighlightedOption() == this.previousButton){
			this.selectNextNode();
		}
	},

	selectLastNode: function(){
		this.inherited(arguments);
		if(this.getHighlightedOption() == this.nextButton){
			this.selectPreviousNode();
		}
	},

	getHighlightedOption: function(){
		return this._getSelectedAttr();
	}
});

return dijit.form._ComboBoxMenuMixin;
});
