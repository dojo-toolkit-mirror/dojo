require([
	"dojox/mobile",
	"dojox/mobile/parser",
	"dojox/mobile/compat",
	"dojox/mobile/deviceTheme",
	"dojox/data/FileStore",
	"dojo/_base/config",	// dojo.config
	"dijit/_base/manager",	// dijit.byId, dijit.byNode
	"dijit/tree/ForestStoreModel",
	"dojox/mobile/ProgressIndicator",
	"dojox/mobile/View",
	"dojox/mobile/_ScrollableMixin",
	"dojo/NodeList-traverse",
	"dojo/domReady!"
	], function(){
		dojo.ready(function(){
			var store = new dojox.data.FileStore({
				url: "../../dojox/data/demos/stores/filestore_dojotree.php",
				id: "theStore",
				label: "name",
				pathAsQueryParam: true
			});
			var treeModel = new dijit.tree.ForestStoreModel({
				store: store,
				rootLabel: "Files",
				childrenAttrs: ["children"],
				newItemIdAttr: "path"
			});
			dojo.declare("TreeView", [dojox.mobile.View,dojox.mobile._ScrollableMixin], {
				postCreate: function(){
					this._load();
					this.inherited(arguments);
				},
				_load: function() {
					this.model.getRoot(
						dojo.hitch(this, function(item) {
							var scope = this;
							var list = new dojox.mobile.RoundRectList();
							var node = {};
							var listitem = new dojox.mobile.ListItem({
								label: scope.model.rootLabel,
								moveTo: '#',
								onClick: function() {scope.handleClick(this)},
								id: "modelRoot",
								item: item
							});
							list.addChild(listitem);
							this.addChild(list);
						})
					)
				},
				handleClick: function(li) {
					var newViewId = "view_";
					if (li.item[this.model.newItemIdAttr]) {
						newViewId += li.item[this.model.newItemIdAttr];
					} else {
						newViewId += "rootView";
					}
					newViewId = newViewId.replace('/', '_');
					if (dijit.byId(newViewId)) {  // view already exists, just transition to it
						dijit.byNode(li.domNode).transitionTo(newViewId);
						return;
					}
					var prog = dojox.mobile.ProgressIndicator.getInstance();
					dojo.body().appendChild(prog.domNode);
					prog.start();
					this.model.getChildren(li.item,
						dojo.hitch(this, function(items) {
							var scope = this;
							var list = new dojox.mobile.RoundRectList();
							dojo.forEach(items, function(item, i) {
								var listItemArgs = {
									item: item,
									label: item[scope.model.store.label],
									transition: "slide"
								};
								if (scope.model.mayHaveChildren(item)) {
									listItemArgs.moveTo = '#';
									listItemArgs.onClick = function() {scope.handleClick(this)};
								}
								var listitem = new dojox.mobile.ListItem(listItemArgs);
								list.addChild(listitem);
							});
							// find the parent View's id so we can enable the back button
							var ulParent = dojo.query('#'+li.id).parent();
							var divParent = dojo.query('#'+ulParent[0].id).parent();
							var headingArgs = {
								label: "Dynamic View",
								back : "Back",
								moveTo : divParent[0].id
							};
							var heading = new dojox.mobile.Heading(headingArgs);
							var newView = dojox.mobile.View({
								id: newViewId,
								selected: true
							}, dojo.create("DIV", null, dojo.body()));
							newView.addChild(heading);
							newView.addChild(list);
							newView.startup();
							prog.stop();
							dijit.byNode(li.domNode).transitionTo(newView.id);
						})
					);
				}
			});//declare
			new TreeView({model: treeModel, selected: true},dojo.byId("treeView")).startup();
		});//dojo.ready callback
});//req callback