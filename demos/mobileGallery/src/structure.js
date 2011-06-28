define(function(){
	dojo.provide("demos.mobileGallery.src.structure");
	
	var THRESHOLD_WIDTH = 600;
	demos.mobileGallery.src.structure = {
			layout: {
				threshold: THRESHOLD_WIDTH, // threshold for layout change
				leftPane: {
					hidden: (window.innerWidth < THRESHOLD_WIDTH) ? true : false,
							currentView: null
				},
				rightPane: {
					hidden: false,
					currentView: null
				},
				getViewHolder: function(view) {
					if (view.id === "navigation")
						return (window.innerWidth < THRESHOLD_WIDTH) ? "rightPane" : "leftPane";
					else
						return "rightPane";
				},
				setCurrentView: function(view) {
					var holder = this.getViewHolder(view);
					this[holder].currentView = view;
				}
			},
			demos: [{
				id: "controls",
				label: "Controls",
				iconBase: "images/navigation_list_all_29.png",
				views: [{
					id: "buttons",
					speclevel: "6",
					iconPos: "0,0,29,29",
					title: "Buttons",
					demourl: "views/buttons.html"
				}, {
					id: "forms",
					speclevel: "6",
					iconPos: "29,0,29,29",
					title: "Forms",
					demourl: "views/forms.html",
					jsmodule: "demos/mobileGallery/src/forms"
				}, {
					id: "mobileSwitches",
					speclevel: "7",
					iconPos: "29,0,29,29",
					title: "Switches",
					demourl: "views/mobileSwitches.html"
				}, {
					id: "flippableView",
					speclevel: "6",
					iconPos: "58,0,29,29",
					title: "Flippable",
					demourl: "views/flippableViews.html"
				}, {
					id: "icons",
					speclevel: "6",
					iconPos: "87,0,29,29",
					title: "Icons",
					demourl: "views/icons.html",
					jsmodule: "demos/mobileGallery/src/icons"
				}, {
					id: "tabBar",
					speclevel: "6",
					iconPos: "116,0,29,29",
					title: "Tab Bar",
					demourl: "views/tabBar.html"
				}, {
					id: "headings",
					speclevel: "6",
					iconPos: "145,0,29,29",
					title: "Headings",
					demourl: "views/headings.html",
					jsmodule: "demos/mobileGallery/src/headings"
				}, {
					id: "map",
					speclevel: "6",
					iconPos: "174,0,29,29",
					title: "Map (Google)",
					demourl: "views/map.html",
					jsmodule: "demos/mobileGallery/src/map"
				}, {
					id: "list",
					speclevel: "6",
					iconPos: "203,0,29,29",
					title: "Lists",
					demourl: "views/list.html"
				}, {
					id: "mobileLists",
					speclevel: "7",
					iconPos: "203,0,29,29",
					title: "List Data",
					demourl: "views/mobileListData.html",
					jsmodule: "demos/mobileGallery/src/mobileListData"
                }, {
					href: "../mobileGauges/demo.html",
					hrefTarget: "_blank",
					speclevel: "7",
					title: "Gauge",
					iconPos: "232,0,29,29"
				}, {
					href: "../../touch/demos/touch/demo.html",
					hrefTarget: "_blank",
					speclevel: "7",
					title: "Touch",
					iconPos: "261,0,29,29"
				}]
			}, {
				id: "effects",
				label: "Effects",
				iconBase: "images/navigation_list_all_29.png",
				views: [{
					id: "animations",
					speclevel: "6",
					iconPos: "290,0,29,29",
					title: "Transitions",
					demourl: "views/animations.html"
				},{
					id: "mobileTransitions",
					speclevel: "7",
					iconPos: "290,0,29,29",
					title: "Transitions",
					demourl: "views/mobileTransitions.html"
				},{
					id: "css3",
					speclevel: "6",
					iconPos: "406,0,29,29",
					title: "CSS 3",
					demourl: "views/css3.html",
					jsmodule: "demos/mobileGallery/src/css3"
                }]
			}, {
				id: "dataList",
				label: "Data",
				iconBase: "images/navigation_list_all_29.png",
				views: [{
					id: "jsonp",
					speclevel: "6",
					iconPos: "319,0,29,29",
					title: "JSON P",
					demourl: "views/jsonp.html",
					jsmodule: "demos/mobileGallery/src/jsonp"
				}, {
					id: "ajax",
					speclevel: "6",
					iconPos: "348,0,29,29",
					title: "AJAX",
					demourl: "views/ajax.html",
					jsmodule: "demos/mobileGallery/src/ajax"
				}]
			}],
			/* Below are internal views. */
			_views: [{
				id: 'source',
				title: 'Source',
				type: 'source'
			}, {
				id: 'welcome',
				title: 'Welcome'
			}, {
				id: 'navigation',
				title: 'Showcase',
				type: 'navigation',
				back: ''
			}],
			/* data model for tracking view loading */
			load: {
				loaded: 0,
				target: 0 //target number of views that should be loaded
			}
		};
	return demos.mobileGallery.src.structure;
});