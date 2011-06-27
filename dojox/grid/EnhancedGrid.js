dojo.provide("dojox.grid.EnhancedGrid");

dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.requireLocalization("dojox.grid.enhanced", "EnhancedGrid");

dojo.experimental("dojox.grid.EnhancedGrid");

dojo.declare("dojox.grid.EnhancedGrid", dojox.grid.DataGrid, {
	//	summary:
	//		Provides enhanced features for DataGrid, including:
	//		1. Nested Sorting
	//		2. Built-in support for Indirect Selection (radio buttons and check boxes)
	//		3. Declarative context menu
	//		4. Selecting rows/columns via swipe
	//		5. Drag-n-drop: columns,rows - MOVE
	//
	//	description:
	//		EnhancedGrid features are implemented as plugins that could be loaded on demand.
	//		Explicit dojo.require() is needed to use these feature plugins.
	//
	//	
	//  example:
	//		A quick sample to use all EnhancedGrid features:
	//      
	//	   Step 1. Load EnhancedGrid and required features
	// |   <script type="text/javascript">
	// |		dojo.require("dojox.grid.EnhancedGrid");
	// |		dojo.require("dojox.grid.enhanced.plugins.DnD");
	// |		dojo.require("dojox.grid.enhanced.plugins.Menu");
	// |		dojo.require("dojox.grid.enhanced.plugins.NestedSorting");
	// |		dojo.require("dojox.grid.enhanced.plugins.IndirectSelection");
	// |	</script>
	//
	//		Step 2. Use EnhancedGrid
	//		- Via HTML markup
	// |	<div dojoType="dojox.grid.EnhancedGrid" ...
	// |		 plugins="{nestedSorting: true, dnd: true, indirectSelection: true, 
	// |		 menus:{headerMenu:"headerMenuId", rowMenu:"rowMenuId", cellMenu:"cellMenuId",  
    // |         selectedRegionMenu:"selectedRegionMenuId"}}">
	// |			...
	// |	</div>
	//
	//		- Or via JavaScript
	// |	<script type="text/javascript">
	// |		var grid = new dojox.grid.EnhancedGrid({plugins : {nestedSorting: true, dnd: true, indirectSelection: true, 
	// |	               menus:{headerMenu:"headerMenuId", rowMenu:"rowMenuId", cellMenu:"cellMenuId",selectedRegionMenu:"selectedRegionMenuId"}},
	// |			       ... }, dojo.byId('gridDiv'));
	// |		grid.startup();
	// |	</script>

	//plugins: Object
	//		Plugin properties, e.g. {nestedSorting: true, dnd: true, ...}
	plugins: null,

	//pluginMgr: Object
	//		Singleton plugin manager	
	pluginMgr: null,
	
	//doubleAffordance: Boolean
	//		For special cell hover style
	doubleAffordance: false,

	postMixInProperties: function(){
		//load nls bundle
		this._nls = dojo.i18n.getLocalization("dojox.grid.enhanced", "EnhancedGrid", this.lang);
		this.inherited(arguments);
	},

	postCreate: function(){
		if(this.plugins){
			//create plugin manager
			this.pluginMgr = new dojox.grid.enhanced._Plugin(this);
			this.pluginMgr.preInit();
		}
		this.inherited(arguments);
		this.pluginMgr && this.pluginMgr.postInit();
	},
	
	_fillContent: function(){
		//cached for menu use(menu declared within Grid HTML markup)
		this.menuContainer = this.srcNodeRef;
		this.inherited(arguments);
	},
	
	startup: function(){
		this.menuContainer && this._initMenus && this._initMenus();
		this.inherited(arguments);
		if(this.doubleAffordance){
			dojo.addClass(this.domNode, 'dojoxGridDoubleAffordance');
		}
	},
	
	removeSelectedRows: function(){
		// summary:
		//		Overwritten, see DataGrid.removeSelectedRows()
		if(this.indirectSelection && this._canEdit){
			//cache the selected info before cleaned by DataGrid
			var selected = dojo.clone(this.selection.selected);
			this.inherited(arguments);
			dojo.forEach(selected, function(value, index){
				value && this.grid.rowSelectCell.toggleRow(index, false);
			});
		}
	},
	
	doApplyCellEdit: function(inValue, inRowIndex, inAttrName){
		// summary:
		//		Overwritten, see DataGrid.doApplyCellEdit()
		if(!inAttrName){
			this.invalidated[inRowIndex] = true;
			return;
		}
		this.inherited(arguments);
	},	
	
	mixin: function(target, source){
		var props = {};
		for(p in source){
			if(p == '_inherited' || p == 'declaredClass' || p == 'constructor'){ continue; }
			props[p] = source[p];
		}
		dojo.mixin(target, props);
	},
	
	_copyAttr: function(idx, attr){
		// summary:
		//		Overwritten, see DataGrid._copyAttr()
		//		Fix cell TAB navigation for single click editting
		if(!attr) return;
		return this.inherited(arguments);
	}
});


dojox.grid.EnhancedGrid.markupFactory = function(props, node, ctor, cellFunc){
	return dojox.grid._Grid.markupFactory(props, node, ctor, 
					dojo.partial(dojox.grid.DataGrid.cell_markupFactory, cellFunc));
};
