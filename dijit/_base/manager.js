dojo.provide("dijit._base.manager");

dojo.declare("dijit.WidgetSet", null, {
	// summary:
	//		A set of widgets indexed by id. A default instance of this class is 
	//		available as `dijit.registry`
	//
	// example:
	//		Create a small list of widgets:
	//		|	var ws = new dijit.WidgetSet();
	//		|	ws.add(dijit.byId("one"));
	//		| 	ws.add(dijit.byId("two"));
	//		|	// destroy both:
	//		|	ws.forEach(function(w){ w.destroy(); });
	//
	// example:
	//		Using dijit.registry:
	//		|	dijit.registry.forEach(function(w){ /* do something */ });
	
	constructor: function(){
		this._hash = {};
		this.length = 0;
	},

	add: function(/*Widget*/ widget){
		// summary:
		//		Add a widget to this list. If a duplicate ID is detected, a error is thrown.
		//
		// widget: dijit._Widget
		//		Any dijit._Widget subclass.
		if(this._hash[widget.id]){
			throw new Error("Tried to register widget with id==" + widget.id + " but that id is already registered");
		}
		this._hash[widget.id] = widget;
		this.length++;
	},

	remove: function(/*String*/ id){
		// summary:
		//		Remove a widget from this WidgetSet. Does not destroy the widget; simply
		//		removes the reference.
		if(this._hash[id]){
			delete this._hash[id];
			this.length--;
		}
	},

	forEach: function(/*Function*/ func, /* Object? */thisObj){
		// summary:
		//		Call specified function for each widget in this set.
		//
		// func:
		//		A callback function to run for each item. Is passed the widget, the index
		//		in the iteration, and the full hash, similar to `dojo.forEach`.
		//
		// thisObj:
		//		An optional scope parameter
		//
		// example:
		//		Using the default `dijit.registry` instance:
		//		|	dijit.registry.forEach(function(widget){
		//		|		console.log(widget.declaredClass);	
		//		|	});
		//
		// returns: dijit.WidgetSet
		//		Returns self, in order to allow for further chaining. 

		var i = 0, id;
		for(id in this._hash){
			func.call(thisObj || dojo.global, this._hash[id], i++, this._hash);
		}
		return this;
	},

	filter: function(/*Function*/ filter, /* Object? */thisObj){
		// summary:
		//		Filter down this WidgetSet to a smaller new WidgetSet
		//		Works the same as `dojo.filter` and `dojo.NodeList.filter`
		//		
		// filter:
		//		Callback function to test truthiness. Is passed the widget
		//		reference and the pseudo-index in the object. 
		//
		// thisObj: Object?
		//		Option scope to use for the filter function. 
		//
		// example:
		//		Arbitrary: select the odd widgets in this list
		//		|	dijit.registry.filter(function(w, i){
		//		|		return i % 2 == 0;
		//		|	}).forEach(function(w){ /* odd ones */ });

		var res = new dijit.WidgetSet();
		this.forEach(function(widget, idx){
			if(filter.call(this, widget, idx)){ res.add(widget); }
		}, thisObj);
		return res; // dijit.WidgetSet
	},

	byId: function(/*String*/ id){
		// summary:
		//		Find a widget in this list by it's id. 
		// example:
		//		Test if an id is in a particular WidgetSet
		//		| var ws = new dijit.WidgetSet();
		//		| ws.add(dijit.byId("bar"));
		//		| var t = ws.byId("bar") // returns a widget
		//		| var x = ws.byId("foo"); // returns undefined
		
		return this._hash[id];	// dijit._Widget
	},

	byClass: function(/*String*/ cls){
		// summary:
		//		Reduce this widgetset to a new WidgetSet of a particular `declaredClass`
		// 
		// cls: String
		//		The Class to scan for. Full dot-notated string.
		//
		// example:
		//		Find all `dijit.TitlePane`s in a page:
		//		|	dijit.registry.byClass("dijit.TitlePane").forEach(function(tp){ tp.close(); });
		
		return this.filter(function(widget){ // dijit.WidgetSet
			return widget.declaredClass == cls; 
		});
	},
		
	toArray: function(){
		// summary: 
		//		Convert this WidgetSet into a true Array
		//
		// example:
		//		Work with the widget .domNodes in a real Array 
		//		|	dojo.map(dijit.registry.toArray(), function(w){ return w.domNode; });

		var ar = [];
		this.forEach(function(w){
			ar.push(w); // ^ i, ar[i] = w;
		});
		return ar; // Array
	},
	
	map: function(/* Function */func, /* Object? */thisObj){
		// summary: 
		//		Create a new Array from this WidgetSet, following the same rules as `dojo.map`
		// example:
		//		|	var nodes = dijit.registy.map(function(w){ return w.domNode; });
		//
		// returns: Array
		//		A new array of the returned values.
		return dojo.map(this.toArray(), func, thisObj); // Array
	},
	
	every: function(func, thisObj){
		// summary:
		// 		A synthetic clone of `dojo.every` acting explictly on this WidgetSet
		//
		// func: Function
		//		A callback function run for every widget in this list. Exits loop
		//		when the first false return is encountered.
		//
		// thisObj: Object?
		//		Optional scope parameter to use for the callback
		var x = 0, i;
		for(i in this._hash){
			if(!func.call(thisObj || dojo.global, this._hash[i], x++)){
				return false; // Boolean
			}
		}
		return true; // Boolean 
	},
	
	some: function(func, thisObj){
		// summary:
		// 		A synthetic clone of `dojo.some` acting explictly on this WidgetSet
		//
		// func: Function
		//		A callback function run for every widget in this list. Exits loop
		//		when the first true return is encountered.
		//
		// thisObj: Object?
		//		Optional scope parameter to use for the callback

		var x = 0, i;
		for(i in this._hash){
			if(func.call(thisObj || dojo.global, this._hash[i], x++)){
				return true; // Boolean
			}
		}
		return false; // Boolean
	}
	
});

/*=====
dijit.registry = {
	// summary: A list of widgets on a page.
	// description: Is an instance of `dijit.WidgetSet`
};
=====*/
dijit.registry = new dijit.WidgetSet();

dijit._widgetTypeCtr = {};

dijit.getUniqueId = function(/*String*/widgetType){
	// summary: Generates a unique id for a given widgetType

	var id;
	do{
		id = widgetType + "_" +
			(widgetType in dijit._widgetTypeCtr ?
				++dijit._widgetTypeCtr[widgetType] : dijit._widgetTypeCtr[widgetType] = 0);
	}while(dijit.byId(id));
	return id; // String
};

dijit.findWidgets = function(/*DomNode*/ root){
	// summary:
   	//		Search subtree under root returning widgets found.
	//		Doesn't search for nested widgets (ie, widgets inside other widgets).
	
	var outAry = [];

	function getChildrenHelper(root){
		var list = dojo.isIE ? root.children : root.childNodes, i = 0, node;
		while((node = list[i++])){
			if(node.nodeType != 1){ continue; }
			var widgetId = node.getAttribute("widgetId");
			if(widgetId){
				var widget = dijit.byId(widgetId);
				outAry.push(widget);
			}else{
				getChildrenHelper(node);
			}
		}
	}

	getChildrenHelper(root);
	return outAry;
};

if(dojo.isIE){
	// Only run this for IE because we think it's only necessary in that case,
	// and because it causes problems on FF.  See bug #3531 for details.
	dojo.addOnWindowUnload(function(){
		dojo.forEach(dijit.findWidgets(dojo.body()), function(widget){
			if(widget.destroyRecursive){
				widget.destroyRecursive();
			}else if(widget.destroy){
				widget.destroy();
			}
		});
	});
}

dijit.byId = function(/*String|Widget*/id){
	// summary:
	//		Returns a widget by it's id, or if passed a widget, no-op (like dojo.byId())
	return (dojo.isString(id)) ? dijit.registry.byId(id) : id; // Widget
};

dijit.byNode = function(/* DOMNode */ node){
	// summary:
	//		Returns the widget corresponding to the given DOMNode
	return dijit.registry.byId(node.getAttribute("widgetId")); // Widget
};

dijit.getEnclosingWidget = function(/* DOMNode */ node){
	// summary:
	//		Returns the widget whose DOM tree contains the specified DOMNode, or null if
	//		the node is not contained within the DOM tree of any widget
	while(node){
		if(node.getAttribute && node.getAttribute("widgetId")){
			return dijit.registry.byId(node.getAttribute("widgetId"));
		}
		node = node.parentNode;
	}
	return null;
};

dijit._isElementShown = function(/*Element*/elem){
	var style = dojo.style(elem);
	return (style.visibility != "hidden")
		&& (style.visibility != "collapsed")
		&& (style.display != "none")
		&& (dojo.attr(elem, "type") != "hidden");
}

dijit.isTabNavigable = function(/*Element*/elem){
	// summary:
	//		Tests if an element is tab-navigable
	
	// TODO: convert (and rename method) to return effectivite tabIndex; will save time in _getTabNavigable()
	if(dojo.attr(elem, "disabled")){
		return false;
	}else if(dojo.hasAttr(elem, "tabIndex")){
		// Explicit tab index setting
		return dojo.attr(elem, "tabIndex") >= 0; // boolean
	}else{
		// No explicit tabIndex setting, need to investigate node type
		switch(elem.nodeName.toLowerCase()){
			case "a":
				// An <a> w/out a tabindex is only navigable if it has an href
				return dojo.hasAttr(elem, "href");
			case "area":
			case "button":
			case "input":
			case "object":	
			case "select":
			case "textarea":
				// These are navigable by default
				return true;
			case "iframe":
				// If it's an editor <iframe> then it's tab navigable.
				if(dojo.isMoz){
					return elem.contentDocument.designMode == "on";
				}else if(dojo.isWebKit){
					var doc = elem.contentDocument,
						body = doc && doc.body;
					return body && body.contentEditable=='true';
				}else{
					doc = elem.contentWindow.document,
						body = doc && doc.body;
					return body && body.firstChild && body.firstChild.contentEditable=='true';
				}
			default:
				return elem.contentEditable=='true';
		}
	}
};

dijit._getTabNavigable = function(/*DOMNode*/root){
	// summary:
	//		Finds descendants of the specified root node.
	//
	// description:
	//		Finds the following descendants of the specified root node:
	//		* the first tab-navigable element in document order
	//		  without a tabIndex or with tabIndex="0"
	//		* the last tab-navigable element in document order
	//		  without a tabIndex or with tabIndex="0"
	//		* the first element in document order with the lowest
	//		  positive tabIndex value
	//		* the last element in document order with the highest
	//		  positive tabIndex value
	var first, last, lowest, lowestTabindex, highest, highestTabindex;
	var walkTree = function(/*DOMNode*/parent){
		dojo.query("> *", parent).forEach(function(child){
			var isShown = dijit._isElementShown(child);
			if(isShown && dijit.isTabNavigable(child)){
				var tabindex = dojo.attr(child, "tabIndex");
				if(!dojo.hasAttr(child, "tabIndex") || tabindex == 0){
					if(!first){ first = child; }
					last = child;
				}else if(tabindex > 0){
					if(!lowest || tabindex < lowestTabindex){
						lowestTabindex = tabindex;
						lowest = child;
					}
					if(!highest || tabindex >= highestTabindex){
						highestTabindex = tabindex;
						highest = child;
					}
				}
			}
			if(isShown && child.nodeName.toUpperCase() != 'SELECT'){ walkTree(child) }
		});
	};
	if(dijit._isElementShown(root)){ walkTree(root) }
	return { first: first, last: last, lowest: lowest, highest: highest };
}
dijit.getFirstInTabbingOrder = function(/*String|DOMNode*/root){
	// summary:
	//		Finds the descendant of the specified root node
	//		that is first in the tabbing order
	var elems = dijit._getTabNavigable(dojo.byId(root));
	return elems.lowest ? elems.lowest : elems.first; // DomNode
};

dijit.getLastInTabbingOrder = function(/*String|DOMNode*/root){
	// summary:
	//		Finds the descendant of the specified root node
	//		that is last in the tabbing order
	var elems = dijit._getTabNavigable(dojo.byId(root));
	return elems.last ? elems.last : elems.highest; // DomNode
};

/*=====
dojo.mixin(dijit, {
	// defaultDuration: Integer
	//		The default animation speed (in ms) to use for all Dijit
	//		transitional animations, unless otherwise specified 
	//		on a per-instance basis. Defaults to 200, overrided by 
	//		`djConfig.defaultDuration`
	defaultDuration: 300
});
=====*/

dijit.defaultDuration = dojo.config["defaultDuration"] || 200;