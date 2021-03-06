define([
	"dojo/_base/kernel",
	"../core/_Module",
	"dojox/html/metrics",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/html",
	"dojo/query"
], function(dojo, _Module){

	return _Module.registerModule(
	dojo.declare('demos.gridx.src.modules.Header', _Module, {
		name: 'header',
	
		required: ['layout'],
	
		getAPIPath: function(){
			return {
				header: this
			};
		},
	
		load: function(args, deferStartup){
			var g = this.grid, _this = this;
			//Add this.domNode to be a part of the grid header
			g.layout.register(this, 'domNode', 'headerNode');
			this.batchConnect(
				[g, 'onHScroll', '_scrollLeft'],
				[g, 'onHeaderCellMouseOver', '_onHeaderCellMouseHover'],
				[g, 'onHeaderCellMouseOut', '_onHeaderCellMouseHover']
			);
			//Prepare this.domNode
			this.domNode = dojo.create('div', {
				'class': 'dojoxGridxHeaderRow'
			});
			this.innerNode = dojo.create('div', {
				'class': 'dojoxGridxHeaderRowInner'
			});
			this.domNode.appendChild(this.innerNode);
			//Prepare mouse events
			g._connectEvents(_this.domNode, '_onMouseEvent', _this);
			//Set width and render after grid is started up
			deferStartup.then(function(){
				_this._adaptColumnWidth();
				_this.refresh();
				_this.loaded.callback();
			});
		},
	
		columnMixin: {
			headerNode: function(){
				return this.grid.header.getHeaderNode(this.id);
			}
		},
	
		//Public-----------------------------------------------------------------------------
		getHeaderNode: function(id){
			return dojo.query("[colid=" + id + "]", this.domNode)[0];
		},
		
		refresh: function(){
			var sb = ['<table border="0" cellpadding="0" cellspacing="0"><tr>'];
			dojo.forEach(this.grid.columns(), function(col){
				sb.push('<th colid="', col.id, '" class="dojoxGridxCell" style="width: ',
					(col.width || 'auto'), 
					'"><div class="dojoxGridxSortNode">', 
					col.name(), '</div></th>');
			});
			sb.push('</tr></table>');
			this.innerNode.innerHTML = sb.join('');
		},
		
		//Private-----------------------------------------------------------------------------
		_adaptColumnWidth: function(){
			var g = this.grid;
			var bodyWidth = g.domNode.offsetWidth - dojox.html.metrics.getScrollbar().w - 1;
			g.bodyNode.style.width = bodyWidth + 'px';
			dojo.style(this.innerNode, 'marginRight', (dojox.html.metrics.getScrollbar().w - 1) + "px");
			var contentWidth = 0, autoCount = 0, autoWidth = 30;
			//camculate content width of the grid
			dojo.forEach(g._columns, function(col){
				if(/px$/.test(col.width)){
					contentWidth += parseInt(col.width);
				}else if(/%$/.test(col.width)){
					col.width = eval(bodyWidth + '*' + col.width) + 'px';
					contentWidth += parseInt(col.width);
				}else{
					col.width = 'auto';
					this._lastAutoColumn = col; //last column for auto resize
					autoCount ++;
				}
			}, this);
			//camculate auto width
			if(bodyWidth > contentWidth + autoCount * autoWidth){
				autoWidth = (bodyWidth - contentWidth)/autoCount;
			}
			//set auto width
			dojo.forEach(dojo.filter(g._columns, function(col){
				return col.width === 'auto';
			}), function(col){
				col.width = autoWidth + 'px';
			});
		},
	
		_scrollLeft: function(left){
			this.domNode.style.marginLeft = -left + 'px';
		},
	
		_onMouseEvent: function(eventName, e){
			var g = this.grid,
				evtCell = 'onHeaderCell' + eventName,
				evtRow = 'onHeader' + eventName;
			if(g._isConnected(evtCell) || g._isConnected(evtRow)){
				this._decorateEvent(e);
				if(e.columnIndex >= 0){
					this.grid[evtCell](e);
				}
				this.grid[evtRow](e);
			}
		},
	
		_decorateEvent: function(e){
			var node = e.target;
			while(node && node !== this.domNode){
				if(node.tagName.toLowerCase() === 'th'){
					var col = this.grid._columnsById[dojo.attr(node, 'colid')];
					e.columnId = col.id;
					e.columnIndex = col.index;
					return;
				}
				node = node.parentNode;
			}
		},
		
		_onHeaderCellMouseHover: function(event){
			var node = this.getHeaderNode(event.columnId);
			if(event.type == "mouseover"){
				dojo.addClass(node, "dojoxGridxHeaderCellOver");
			}else if(event.type == "mouseout"){
				dojo.removeClass(node, "dojoxGridxHeaderCellOver");
			}
		}
	}));
});