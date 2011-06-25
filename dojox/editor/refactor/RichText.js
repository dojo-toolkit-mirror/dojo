dojo.provide("dojox.editor.refactor.RichText");

dojo.require("dojo.AdapterRegistry"); // for command registration
dojo.require("dijit._Widget");
dojo.require("dijit._editor.selection");
dojo.require("dijit._editor.range");
dojo.require("dijit._editor.html");
dojo.require("dojo.i18n");
dojo.requireLocalization("dijit.form", "Textarea");

// used to restore content when user leaves this page then comes back
// but do not try doing dojo.doc.write if we are using xd loading.
// dojo.doc.write will only work if RichText.js is included in the dojo.js
// file. If it is included in dojo.js and you want to allow rich text saving
// for back/forward actions, then set dojo.config.allowXdRichTextSave = true.
if(!dojo.config["useXDomain"] || dojo.config["allowXdRichTextSave"]){
	if(dojo._postLoad){
		(function(){
			var savetextarea = dojo.doc.createElement('textarea');
			savetextarea.id = dijit._scopeName + "._editor.RichText.savedContent";
			dojo.style(savetextarea, {
				display: "none",
				position: "absolute",
				top: "-100px",
				left: "-100px",
				height: "3px",
				width: "3px"
			});
			dojo.body().appendChild(savetextarea);
		})();
	}else{
		//dojo.body() is not available before onLoad is fired
		try {
			dojo.doc.write('<textarea id="' + dijit._scopeName + '._editor.RichText.savedContent" ' +
				'style="display:none;position:absolute;top:-100px;left:-100px;height:3px;width:3px;overflow:hidden;"></textarea>');
		}catch(e){ }
	}
}

dojox.editor.refactor.RichTextIframeMixin = {
	_writeOpen: function(html){
		// summary: 
		//		the guts of the open() method for use when in an iframe environment

		if(dojo.isIE || dojo.isSafari || dojo.isOpera){ // contentEditable, easy
		
			if(dojo.config["useXDomain"] && !dojo.config["dojoBlankHtmlUrl"]){
				console.warn("dojox.editor.newRT.RichText: When using cross-domain Dojo builds,"
				+ " please save dojo/resources/blank.html to your domain and set djConfig.dojoBlankHtmlUrl"
				+ " to the path on your domain to blank.html");
			}

			var burl = dojo.config["dojoBlankHtmlUrl"] || (dojo.moduleUrl("dojo", "resources/blank.html")+"");
			var ifr = this.editorObject = this.iframe = dojo.doc.createElement('iframe');
			ifr.id = this.id+"_iframe";
			ifr.src = burl;
			ifr.style.border = "none";
			ifr.style.width = "100%";
			ifr.frameBorder = 0;
			// ifr.style.scrolling = this.height ? "auto" : "vertical";
			this.editingArea.appendChild(ifr);
			var h = null; // set later in non-ie6 branch
			var loadFunc = dojo.hitch( this, function(){
				if(h){ dojo.disconnect(h); h = null; }
				this.window = ifr.contentWindow;
				var d = this.document = this.window.document;
				d.open();
				d.write(this._getIframeDocTxt(html));
				d.close();

				if(dojo.isIE >= 7){
					if(this.height){
						ifr.style.height = this.height;
					}
					if(this.minHeight){
						ifr.style.minHeight = this.minHeight;
					}
				}else{
					ifr.style.height = this.height ? this.height : this.minHeight;
				}

				if(dojo.isIE){
					this._localizeEditorCommands();
				}
				
				this.onLoad();
				this.savedContent = this.getValue(true);
			});
			if(dojo.isIE < 7){ // IE 6 is a steaming pile...
				var t = setInterval(function(){
					if(ifr.contentWindow.isLoaded){
						clearInterval(t);
						loadFunc();
					}
				}, 100);
			}else{ // blissful sanity!
				h = dojo.connect(
					((dojo.isIE) ? ifr.contentWindow : ifr), "onload", loadFunc
				);
			}
		}else{ // designMode in iframe
			this._drawIframe(html);
			this.savedContent = this.getValue(true);
		}
	},

	_getIframeDocTxt: function(/* String */ html){
		var _cs = dojo.getComputedStyle(this.domNode);
		if(!this.height && !dojo.isMoz){
			html="<div>"+html+"</div>";
		}
		var font = [ _cs.fontWeight, _cs.fontSize, _cs.fontFamily ].join(" ");

		// line height is tricky - applying a units value will mess things up.
		// if we can't get a non-units value, bail out.
		var lineHeight = _cs.lineHeight;
		if(lineHeight.indexOf("px") >= 0){
			lineHeight = parseFloat(lineHeight)/parseFloat(_cs.fontSize);
			// console.debug(lineHeight);
		}else if(lineHeight.indexOf("em")>=0){
			lineHeight = parseFloat(lineHeight);
		}else{
			lineHeight = "1.0";
		}
		return [
			this.isLeftToRight() ? "<html><head>" : "<html dir='rtl'><head>",
			(dojo.isMoz ? "<title>" + this._localizedIframeTitles.iframeEditTitle + "</title>" : ""),
			"<style>",
			"body,html {",
			"	background:transparent;",
			"	padding: 0;",
			"	margin: 0;",
			"}",
			// TODO: left positioning will cause contents to disappear out of view
			//	   if it gets too wide for the visible area
			"body{",
			"	top:0px; left:0px; right:0px;",
				((this.height||dojo.isOpera) ? "" : "position: fixed;"),
			"	font:", font, ";",
			// FIXME: IE 6 won't understand min-height?
			"	min-height:", this.minHeight, ";",
			"	line-height:", lineHeight,
			"}",
			"p{ margin: 1em 0 !important; }",
			(this.height ?
				"" : "body,html{overflow-y:hidden;/*for IE*/} body > div {overflow-x:auto;/*for FF to show vertical scrollbar*/}"
			),
			"li > ul:-moz-first-node, li > ol:-moz-first-node{ padding-top: 1.2em; } ",
			"li{ min-height:1.2em; }",
			"</style>",
			this._applyEditingAreaStyleSheets(),
			"</head><body>"+html+"</body></html>"
		].join(""); // String
	},

	_drawIframe: function(/*String*/html){
		// summary:
		//		Draws an iFrame using the existing one if one exists.
		//		Used by Mozilla, Safari, and Opera if we're in useIframe mode.

		if(!this.iframe){
			var ifr = this.iframe = dojo.doc.createElement("iframe");
			ifr.id=this.id+'_iframe';
			// this.iframe.src = "about:blank";
			// document.body.appendChild(this.iframe);
			// console.debug(this.iframe.contentDocument.open());
			// dojo.body().appendChild(this.iframe);
			var ifrs = ifr.style;
			// ifrs.border = "1px solid black";
			ifrs.border = "none";
			ifrs.lineHeight = "0"; // squash line height
			ifrs.verticalAlign = "bottom";
			//	ifrs.scrolling = this.height ? "auto" : "vertical";
			this.editorObject = this.iframe;
			// get screen reader text for mozilla here, too
			this._localizedIframeTitles = dojo.i18n.getLocalization("dijit.form", "Textarea");
			// need to find any associated label element and update iframe document title
			var label=dojo.query('label[for="'+this.id+'"]');
			if(label.length){
				this._localizedIframeTitles.iframeEditTitle = label[0].innerHTML + " " + this._localizedIframeTitles.iframeEditTitle;
			}
		}
		// opera likes this to be outside the with block
		//	this.iframe.src = "javascript:void(0)";//dojo.uri.dojoUri("src/widget/templates/richtextframe.html") + ((dojo.doc.domain != currentDomain) ? ("#"+dojo.doc.domain) : "");
		this.iframe.style.width = this.inheritWidth ? this._oldWidth : "100%";

		if(this.height){
			this.iframe.style.height = this.height;
		}else{
			this.iframe.height = this._oldHeight;
		}

		var tmpContent;
		if(this.textarea){
			tmpContent = this.srcNodeRef;
		}else{
			tmpContent = dojo.doc.createElement('div');
			tmpContent.style.display="none";
			tmpContent.innerHTML = html;
			//append tmpContent to under the current domNode so that the margin
			//calculation below is correct
			this.editingArea.appendChild(tmpContent);
		}

		this.editingArea.appendChild(this.iframe);

		//do we want to show the content before the editing area finish loading here?
		//if external style sheets are used for the editing area, the appearance now
		//and after loading of the editing area won't be the same (and padding/margin
		//calculation above may not be accurate)
		//	tmpContent.style.display = "none";
		//	this.editingArea.appendChild(this.iframe);


		// now we wait for the iframe to load. Janky hack!
		var ifrFunc = dojo.hitch(this, function(){
			if(!this.editNode){
				// Iframe hasn't been loaded yet.
				// First deal w/the document to be available (may have to wait for it)
				if(!this.document){
					try{
						if(this.iframe.contentWindow){
							this.window = this.iframe.contentWindow;
							this.document = this.iframe.contentWindow.document
						}else if(this.iframe.contentDocument){
							// for opera
							// TODO: this method is only being called for FF2; can we remove this?
							this.window = this.iframe.contentDocument.window;
							this.document = this.iframe.contentDocument;
						}
					}catch(e){
						//console.debug("waiting for iframe document to appear...");
						setTimeout(ifrFunc,50);
						return;
					}
					if(!this.document){
						setTimeout(ifrFunc,50);
						return;
					}

					// note that on Safari lower than 420+, we have to get the iframe
					// by ID in order to get something w/ a contentDocument property
					var contentDoc = this.document;
					contentDoc.open();
					contentDoc.write(this._getIframeDocTxt(html));
					contentDoc.close();
					
					dojo._destroyElement(tmpContent);
				}

				// Wait for body to be available
				// Writing into contentDoc (above) can make <body> temporarily unavailable, may have to delay again
				if(!this.document.body){
					//console.debug("waiting for iframe body...");
					setTimeout(ifrFunc,50);
					return;
				}

				this.onLoad();
			}else{
				// Iframe is already loaded, we are just switching the content
				dojo._destroyElement(tmpContent);
				this.editNode.innerHTML = html;
				this.onDisplayChanged();
			}
			this._preDomFilterContent(this.editNode);
		});

		ifrFunc();
	},

	onLoad: function(/* Event */ e){
		this.focusNode = this.editNode = (this.height || dojo.isMoz)? this.document.body : this.document.body.firstChild;
		dojox.editor.refactor.RichText.prototype.onLoad.call(this, e);
	},

	_applyEditingAreaStyleSheets: function(){
		// summary:
		//		apply the specified css files in styleSheets
		var files = [];
		if(this.styleSheets){
			files = this.styleSheets.split(';');
			this.styleSheets = '';
		}

		//empty this.editingAreaStyleSheets here, as it will be filled in addStyleSheet
		files = files.concat(this.editingAreaStyleSheets);
		this.editingAreaStyleSheets = [];

		var text='', i=0, url;
		while((url=files[i++])){
			var abstring = (new dojo._Url(dojo.global.location, url)).toString();
			this.editingAreaStyleSheets.push(abstring);
			text += '<link rel="stylesheet" type="text/css" href="'+abstring+'">'
		}
		return text;
	},

	addStyleSheet: function(/*dojo._Url*/uri){
		// summary:
		//		add an external stylesheet for the editing area
		// uri:	a dojo.uri.Uri pointing to the url of the external css file
		var url=uri.toString();

		//if uri is relative, then convert it to absolute so that it can be resolved correctly in iframe
		if(url.charAt(0) == '.' || (url.charAt(0) != '/' && !uri.host)){
			url = (new dojo._Url(dojo.global.location, url)).toString();
		}

		if(dojo.indexOf(this.editingAreaStyleSheets, url) > -1){
			// console.debug("dijit._editor.RichText.addStyleSheet: Style sheet "+url+" is already applied");
			return;
		}

		this.editingAreaStyleSheets.push(url);
		if(this.document.createStyleSheet){ //IE
			this.document.createStyleSheet(url);
		}else{ //other browser
			var head = this.document.getElementsByTagName("head")[0];
			var stylesheet = this.document.createElement("link");
			with(stylesheet){
				rel="stylesheet";
				type="text/css";
				href=url;
			}
			head.appendChild(stylesheet);
		}
	},

	removeStyleSheet: function(/*dojo._Url*/uri){
		// summary:
		//		remove an external stylesheet for the editing area
		var url=uri.toString();
		//if uri is relative, then convert it to absolute so that it can be resolved correctly in iframe
		if(url.charAt(0) == '.' || (url.charAt(0) != '/' && !uri.host)){
			url = (new dojo._Url(dojo.global.location, url)).toString();
		}
		var index = dojo.indexOf(this.editingAreaStyleSheets, url);
		if(index == -1){
			// console.debug("dijit._editor.RichText.removeStyleSheet: Style sheet "+url+" has not been applied");
			return;
		}
		delete this.editingAreaStyleSheets[index];
		dojo.withGlobal(this.window,'query', dojo, ['link:[href="'+url+'"]']).orphan()
	},

	_setDisabledAttr: function(/*Boolean*/ value){
		value = Boolean(value);
		if(dojo.isMoz && this.iframe){
			this.document.designMode = value ? 'off' : 'on';
		}
		dojox.editor.refactor.RichText.prototype._setDisabledAttr.call(this, value);
	},

	blur: function(){
		// summary: remove focus from this instance
		this.window.blur();
	}

};

dojo.declare("dojox.editor.refactor.RichText", dijit._Widget, {
	constructor: function(params){
		// summary:
		//		dijit._editor.RichText is the core of dijit.Editor, which provides basic
		//		WYSIWYG editing features.
		//
		// description:
		//		dijit._editor.RichText is the core of dijit.Editor, which provides basic
		//		WYSIWYG editing features. It also encapsulates the differences
		//		of different js engines for various browsers.  Do not use this widget
		//		with an HTML &lt;TEXTAREA&gt; tag, since the browser unescapes XML escape characters,
		//		like &lt;.  This can have unexpected behavior and lead to security issues
		//		such as scripting attacks.
		//
		// contentPreFilters: Array
		//		pre content filter function register array.
		//		these filters will be executed before the actual
		//		editing area get the html content
		this.contentPreFilters = [];

		// contentPostFilters: Array
		//		post content filter function register array.
		//		these will be used on the resulting html
		//		from contentDomPostFilters. The resuling
		//		content is the final html (returned by getValue())
		this.contentPostFilters = [];

		// contentDomPreFilters: Array
		//		pre content dom filter function register array.
		//		these filters are applied after the result from
		//		contentPreFilters are set to the editing area
		this.contentDomPreFilters = [];

		// contentDomPostFilters: Array
		//		post content dom filter function register array.
		//		these filters are executed on the editing area dom
		//		the result from these will be passed to contentPostFilters
		this.contentDomPostFilters = [];

		// editingAreaStyleSheets: Array
		//		array to store all the stylesheets applied to the editing area
		this.editingAreaStyleSheets=[];

		this._keyHandlers = {};
		this.contentPreFilters.push(dojo.hitch(this, "_preFixUrlAttributes"));
		if(dojo.isMoz){
			this.contentPreFilters.push(this._fixContentForMoz);
			this.contentPostFilters.push(this._removeMozBogus);
		}
		if(dojo.isSafari){
			this.contentPostFilters.push(this._removeSafariBogus);
		}
		//this.contentDomPostFilters.push(this._postDomFixUrlAttributes);

		this.onLoadDeferred = new dojo.Deferred();

		//in this constructor, mixin properties are not yet merged, so we have to check for params here
		this.useIframe = (dojo.isFF && (dojo.isFF < 3)) || params['useIframe'] || params['styleSheets'];

		if(this.useIframe){
			dojo.mixin(this, dojox.editor.refactor.RichTextIframeMixin);
		}
		
		this.onLoadDeferred.addCallback(this, function(data){
			this.connect(this.editNode, "onblur", "_customOnBlur");
			this.connect(this.editNode, "onfocus", "_customOnFocus");
			return data;
		});
	},

	// inheritWidth: Boolean
	//		whether to inherit the parent's width or simply use 100%
	inheritWidth: false,

	// focusOnLoad: Boolean
	//		whether focusing into this instance of richtext when page onload
	focusOnLoad: false,

	// name: String
	//		If a save name is specified the content is saved and restored when the user
	//		leave this page can come back, or if the editor is not properly closed after
	//		editing has started.
	name: "",

	// styleSheets: String
	//		semicolon (";") separated list of css files for the editing area
	styleSheets: "",

	useIframe: false,

	// _content: String
	//		temporary content storage
	_content: "",

	// height: String
	//		set height to fix the editor at a specific height, with scrolling.
	//		By default, this is 300px. If you want to have the editor always
	//		resizes to accommodate the content, use AlwaysShowToolbar plugin
	//		and set height="". If this editor is used within a layout widget,
	//		set height="100%".
	height: "300px",

	// minHeight: String
	//		The minimum height that the editor should have
	minHeight: "1em",
	
	// isClosed: Boolean
	isClosed: true,

	// isLoaded: Boolean
	isLoaded: false,

	// _SEPARATOR: String
	//		used to concat contents from multiple textareas into a single string
	_SEPARATOR: "@@**%%__RICHTEXTBOUNDRY__%%**@@",

	// onLoadDeferred: dojo.Deferred
	//		deferred which is fired when the editor finishes loading
	onLoadDeferred: null,
	
	// isTabIndent: Boolean
	//		used to allow tab key and shift-tab to indent and outdent rather than navigate
	isTabIndent: false,

	postCreate: function(){
		if("textarea" == this.domNode.tagName.toLowerCase()){
			console.warn("RichText should not be used with the TEXTAREA tag.  See dojox.editor.refactor.RichText docs.");
		}
		dojo.publish(dijit._scopeName + "._editor.RichText::init", [this]);
		this.open();
		this.setupDefaultShortcuts();
	},

	setupDefaultShortcuts: function(){
		// summary: add some default key handlers
		// description:
		// 		Overwrite this to setup your own handlers. The default
		// 		implementation does not use Editor commands, but directly
		//		executes the builtin commands within the underlying browser
		//		support.
		var exec = dojo.hitch(this, function(cmd, arg){
			return function(){
				return !this.execCommand(cmd, arg);
			};
		});

		var ctrlKeyHandlers = { 
			b: exec("bold"),
			i: exec("italic"),
			u: exec("underline"),
			a: exec("selectall"),
			s: function(){ this.save(true); },
			m: function(){ this.isTabIndent = !this.isTabIndent; },

			"1": exec("formatblock", "h1"),
			"2": exec("formatblock", "h2"),
			"3": exec("formatblock", "h3"),
			"4": exec("formatblock", "h4"),

			"\\": exec("insertunorderedlist")
		};

		if(!dojo.isIE){
			ctrlKeyHandlers.Z = exec("redo"); //FIXME: undo?
		}

		for(var key in ctrlKeyHandlers){
			this.addKeyHandler(key, true, false, ctrlKeyHandlers[key]);
		}
	},

	// events: Array
	//		 events which should be connected to the underlying editing area
	events: ["onKeyPress", "onKeyDown", "onKeyUp", "onClick"],

	// events: Array
	//		 events which should be connected to the underlying editing
	//		 area, events in this array will be addListener with
	//		 capture=true
	captureEvents: [],

	_editorCommandsLocalized: false,
	_localizeEditorCommands: function(){
		if(this._editorCommandsLocalized){
			return;
		}
		this._editorCommandsLocalized = true;

		//in IE, names for blockformat is locale dependent, so we cache the values here

		//if the normal way fails, we try the hard way to get the list

		//do not use _cacheLocalBlockFormatNames here, as it will
		//trigger security warning in IE7

		//put p after div, so if IE returns Normal, we show it as paragraph
		//We can distinguish p and div if IE returns Normal, however, in order to detect that,
		//we have to call this.document.selection.createRange().parentElement() or such, which
		//could slow things down. Leave it as it is for now
		var formats = ['div', 'p', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ol', 'ul', 'address'];
		var localhtml = "", format, i=0;
		while((format=formats[i++])){
			//append a <br> after each element to separate the elements more reliably
			if(format.charAt(1) != 'l'){
				localhtml += "<"+format+"><span>content</span></"+format+"><br/>";
			}else{
				localhtml += "<"+format+"><li>content</li></"+format+"><br/>";
			}
		}
		//queryCommandValue returns empty if we hide editNode, so move it out of screen temporary
		var div = dojo.doc.createElement('div');
		dojo.style(div, {
			position: "absolute",
			left: "-2000px",
			top: "-2000px"
		});
		dojo.doc.body.appendChild(div);
		div.innerHTML = localhtml;
		var node = div.firstChild;
		try{
			while(node){
				dijit._editor.selection.selectElement(node.firstChild);
				this.s_call("selectElement", [ node.firstChild ]);
				var nativename = node.tagName.toLowerCase();
				this._local2NativeFormatNames[nativename] = document.queryCommandValue("formatblock");
				//this.queryCommandValue("formatblock");
				this._native2LocalFormatNames[this._local2NativeFormatNames[nativename]] = nativename;
				node = node.nextSibling.nextSibling;
			}
		}catch(e){ 
			console.debug(e);
		}
		dojo.body().removeChild(div);
	},

	open: function(/*DomNode?*/element){
		//	summary:
		//		Transforms the node referenced in this.domNode into a rich text editing
		//		node. 
		//	description:
		//		Sets up the editing area asynchronously. This will result in
		//		the creation and replacement with an <iframe> if
		//		designMode(FF)/contentEditable(IE) is used and stylesheets are
		//		specified, if we're in a browser that doesn't support
		//		contentEditable, or if the useIframe flag is specified on the
		//		RichText object.
		//
		//		A dojo.Deferred object is created at this.onLoadDeferred, and
		//		users may attach to it to be informed when the rich-text area
		//		initialization is finalized.

		if((!this.onLoadDeferred)||(this.onLoadDeferred.fired >= 0)){
			this.onLoadDeferred = new dojo.Deferred();
		}

		if(!this.isClosed){ this.close(); }
		dojo.publish(dijit._scopeName + "._editor.RichText::open", [ this ]);

		this._content = "";
		if((arguments.length == 1)&&(element["nodeName"])){ // else unchanged
			this.domNode = element; 
		} 

		var dn = this.domNode;

		var html;
		if(	(dn["nodeName"])&&
			(dn.nodeName.toLowerCase() == "textarea")){
			// if we were created from a textarea, then we need to create a
			// new editing harness node.
			var ta = this.textarea = dn;
			this.name = ta.name;
			html = this._preFilterContent(ta.value);
			dn = this.domNode = dojo.doc.createElement("div");
			dn.setAttribute('widgetId', this.id);
			ta.removeAttribute('widgetId');
			dn.cssText = ta.cssText;
			dn.className += " "+ta.className;
			dojo.place(dn, ta, "before");
			ta.onfocus = function(e){
				console.debug("textarea got focus");
				dojo.stopEvent(e);
				return false;
			};
			var tmpFunc = dojo.hitch(this, function(){
				//some browsers refuse to submit display=none textarea, so
				//move the textarea out of screen instead
				with(ta.style){
					display = "block";
					position = "absolute";
					left = top = "-1000px";

					if(dojo.isIE){ //nasty IE bug: abnormal formatting if overflow is not hidden
						this.__overflow = overflow;
						overflow = "hidden";
					}
				}
			});
			if(dojo.isIE){
				setTimeout(tmpFunc, 10);
			}else{
				tmpFunc();
			}

			// this.domNode.innerHTML = html;

			if(ta.form){
				dojo.connect(ta.form, "onsubmit", this, function(){
					// FIXME: should we be calling close() here instead?
					ta.value = this.getValue();
				});
			}
		}else{
			html = this._preFilterContent(dijit._editor.getChildrenHtml(dn));
			dn.innerHTML = "";
		}
		if(html == ""){ html = "&nbsp;"; }

		var content = dojo.contentBox(dn);
		// var content = dojo.contentBox(this.srcNodeRef);
		this._oldHeight = content.h;
		this._oldWidth = content.w;

		this.savedContent = html;

		// If we're a list item we have to put in a blank line to force the
		// bullet to nicely align at the top of text
		if(	(dn["nodeName"]) &&
			(dn.nodeName == "LI") ){
			dn.innerHTML = " <br>";
		}

		this.editingArea = dn.ownerDocument.createElement("div");
		dn.appendChild(this.editingArea);

		if(this.name != "" && (!dojo.config["useXDomain"] || dojo.config["allowXdRichTextSave"])){
			var saveTextarea = dojo.byId(dijit._scopeName + "._editor.RichText.savedContent");
			if(saveTextarea.value != ""){
				var datas = saveTextarea.value.split(this._SEPARATOR), i=0, dat;
				while((dat=datas[i++])){
					var data = dat.split(":");
					if(data[0] == this.name){
						html = data[1];
						datas.splice(i, 1);
						break;
					}
				}
			}

			// FIXME: need to do something different for Opera/Safari
			this.connect(window, "onbeforeunload", "_saveContent");
			// dojo.connect(window, "onunload", this, "_saveContent");
		}

		this.isClosed = false;

		// FIXME: FIXME FIXME
		this._writeOpen(html);

		// TODO: this is a guess at the default line-height, kinda works
		if(dn.nodeName == "LI"){
			dn.lastChild.style.marginTop = "-1.2em";
		}
		dojo.addClass(dn, "RichTextEditable");
		return this.onLoadDeferred; // dojo.Deferred
	},

	_writeOpen: function(html){
		var en = this.focusNode = this.editNode = this.editingArea;//dojo.doc.createElement("div");
		en.id = this.id;
		en.className = "dijitEditorArea";
		en.innerHTML = html;
		en.contentEditable = true;
		if(this.height){
			en.style.height = this.height;
		}

		if(this.height){
			en.style.overflowY = "auto";
		}

		//this.editingArea.appendChild(en);

		this.window = dojo.global;
		this.document = dojo.doc;

		if(dojo.isIE){
			this._localizeEditorCommands()
		}
		this.onLoad();
	},

	//static cache variables shared among all instance of this class
	_local2NativeFormatNames: {},
	_native2LocalFormatNames: {},
	_localizedIframeTitles: null,

	disabled: true,
	_mozSettingProps: {'styleWithCSS':false},

	_setDisabledAttr: function(/*Boolean*/ value){
		value = Boolean(value);
		if(!this.editNode){ return; }
		this.editNode.contentEditable = !value;
		this.disabled = value;
		if(!value && this._mozSettingProps){
			var ps = this._mozSettingProps;
			for(var n in ps){
				if(ps.hasOwnProperty(n)){
					try{
						this.document.execCommand(n, false, ps[n]);
					}catch(e){}
				}
			}
		}
	},
	setDisabled: function(/*Boolean*/ disabled){
		dojo.deprecated('dijit.Editor::setDisabled is deprecated','use dijit.Editor::attr("disabled",boolean) instead', 2);
		this.attr('disabled',disabled);
	},

/* Event handlers
 *****************/

	_isResized: function(){ return false; },

	onLoad: function(/* Event */ e){
		// summary:
		//		handler after the content of the document finishes loading
		this.isLoaded = true;
		if(!this.window.__registeredWindow){
			this.window.__registeredWindow = true;
			dijit.registerWin(this.window);
		}

		try{
			this.attr('disabled',true);
			this.attr('disabled',false);
		}catch(e){
			// Firefox throws an exception if the editor is initially hidden
			// so, if this fails, try again onClick by adding "once" advice
			var handle = dojo.connect(this, "onClick", this, function(){
				this.attr('disabled',false);
				dojo.disconnect(handle);
			});
		}

		this._preDomFilterContent(this.editNode);

		var events = this.events.concat(this.captureEvents);
		var ap = (this.iframe) ? this.document : this.editNode;
		dojo.forEach(events, function(item){
			// dojo.connect(ap, item.toLowerCase(), console, "debug");
			this.connect(ap, item.toLowerCase(), item);
		}, this);
		
		if(dojo.isIE){ // IE contentEditable
			// give the node Layout on IE
			this.editNode.style.zoom = 1.0;
		}
		if(this.focusOnLoad){ setTimeout(dojo.hitch(this, "focus"), 0) }

		this.onDisplayChanged(e);

		if(this.onLoadDeferred){
			this.onLoadDeferred.callback(true);
		}
	},

	onKeyDown: function(e){
		// console.debug("keydown:", e);
		if(dojo.isIE){
			if(
				e.keyCode === dojo.keys.BACKSPACE && 
				this.document.selection.type === "Control"
			){
				// IE has a bug where if a non-text object is selected in the editor,
				// hitting backspace would act as if the browser's back button was
				// clicked instead of deleting the object. see #1069
				dojo.stopEvent(e);
				this.execCommand("delete");
			}
		}
		return true;
	},

	_lastPressStopped: false,
	onKeyUp: function(e){
		if(this._lastPressStopped){
			this._lastPressStopped = false;
			dojo.stopEvent(e);
			return false;
		}
		return true;
	},

	onKeyPress: function(e){
		// handle the various key events
		// console.debug("keyup char:", e.keyChar, e.ctrlKey);
		var c = e.keyChar.toLowerCase() || e.keyCode
		var handlers = this._keyHandlers[c];
		//console.debug("handler:", handlers);
		var args = arguments;
		if(handlers){
			dojo.forEach(handlers, function(h){ // should this be every()?
				if((!!h.shift == !!e.shiftKey)&&(!!h.ctrl == !!e.ctrlKey)){
					if(!h.handler.apply(this, args)){
						// console.debug("was stopped, clobbering");
						dojo.stopEvent(e);
						this._lastPressStopped = true;
					}
					// break;
				}
			}, this);
		}

		// function call after the character has been inserted
		if(!this._onKeyHitch){
			this._onKeyHitch = dojo.hitch(this, "onKeyPressed");
		}
		setTimeout(this._onKeyHitch, 1);
		return true;
	},

	addKeyHandler: function(/*String*/key, /*Boolean*/ctrl, /*Boolean*/shift, /*Function*/handler){
		// summary: add a handler for a keyboard shortcut
		// description:
		//	The key argument should be in lowercase if it is a letter charater
		if(!dojo.isArray(this._keyHandlers[key])){
			this._keyHandlers[key] = [];
		}
		this._keyHandlers[key].push({
			shift: shift || false,
			ctrl: ctrl || false,
			handler: handler
		});
	},

	onKeyPressed: function(){
		this.onDisplayChanged(/*e*/); // can't pass in e
	},

	onClick: function(/*Event*/e){
		// console.info('onClick',this._tryDesignModeOn);

		this.onDisplayChanged(e);

		// console.debug("onClick");
	},

	_onMouseDown: function(/*Event*/e){ // IE only to prevent 2 clicks to focus
		// console.debug("_onMouseDown");
		if(!this._focused && !this.disabled){
			this.focus();
		}
	},

	_savedSelection: null,
	_saveSelection: function(){
		var r = this.window.getSelection().getRangeAt(0);
		var nodes = this._getRangeNodes(r);
		this._savedSelection = {
			range: ((dojo.isIE) ? r.duplicate() : r.cloneRange()),
			nodes: nodes,
			bookmark: this._getBookmark(nodes)
		};
		console.debug("saving selection:", this._savedSelection);

	},
	_onBlur: function(e){ },
	_customOnBlur: function(e){
		// console.debug("_customOnBlur");
		this._saveSelection();
		// this.inherited(arguments);
		var _c = this.getValue(true);
		
		if( _c != this.savedContent){
			this.onChange(_c);
			this.savedContent = _c;
		}
		if(dojo.isMoz && this.iframe){
			this.iframe.contentDocument.title = this._localizedIframeTitles.iframeEditTitle;
		} 
		e.stopPropagation();
	},
	_initialFocus: true,
	_customOnFocus: function(/*Event*/e){
		setTimeout(dojo.hitch(this, "_doOnFocus"), 10)
	},
	_doOnFocus: function(/*Event*/e){
		// summary: Fired on focus

		/*
		if(dojo.isSafari){
			try{
				console.debug(e);
				e.preventDefault();
				// e.stopPropagation();
				this.editNode.focus();
				// console.dir(s);
				// s.collapseToStart();
				var s = this.window.getSelection();
				s.collapseToStart();
				console.dir(s);
			}catch(e){ console.debug(e); }
			return;
			// this.window.getSelection().getRangeAt(0).collapse();
		}
		*/
		// console.debug("RichText _onFocus", e);
		if(dojo.isMoz && this._initialFocus){
			this._initialFocus = false;
			if(this.editNode.innerHTML.replace(/^\s+|\s+$/g, "") == "&nbsp;"){
				this.placeCursorAtStart();
				// this.execCommand("selectall");
				// this.window.getSelection().collapseToStart();
			}
		}
		// this.inherited(arguments);

		console.debug("_onFocus");
		if(this._savedSelection){
			console.debug("restoring selection from:", this._savedSelection);
			this._moveToBookmark(this._savedSelection.bookmark);
		}
		this._savedSelection = null;

	},

	blur: function(){
		// summary: remove focus from this instance
		this.editNode.blur();
	},

	focus: function(){
		console.debug("focus");
		/*
		if(this._savedSelection){
			console.debug("restoring focus");
			this._moveToBookmark(this._savedSelection.bookmark);
		}
		this._savedSelection = null;
		*/

		if(!this.iframe && dojo.isSafari){
			// when no iframe is used in Safari, no need to do hard-focus (below), just
			// need to restore selection in order to focus into the editing area
			// This is necessary for Safari, otherwise safari will select all content in
			// the editing area upon this.editNode.focus()
			return;
		}
		// summary: move focus to this instance
		if(this.iframe && !dojo.isIE){
			dijit.focus(this.iframe);
		}else if(this.editNode && this.editNode.focus){
			// editNode may be hidden in display:none div, lets just punt in
			// this case this.editNode.focus(); -> causes IE to scroll always
			// (strict and quirks mode) to the top the Iframe 

			// if we fire the event manually and let the browser handle the
			// focusing, the latest  cursor position is focused like in FF 
			this.editNode.focus();

			// createEventObject only in IE 
			// this.iframe.fireEvent('onfocus', document.createEventObject()); 
		}
	},

	// _lastUpdate: 0,
	updateInterval: 200,
	_updateTimer: null,
	onDisplayChanged: function(/*Event*/e){
		// summary:
		//		This event will be fired everytime the display context
		//		changes and the result needs to be reflected in the UI.
		// description:
		//		If you don't want to have update too often,
		//		onNormalizedDisplayChanged should be used instead

		// var _t=new Date();
		if(this._updateTimer){
			clearTimeout(this._updateTimer);
		}
		if(!this._updateHandler){
			this._updateHandler = dojo.hitch(this,"onNormalizedDisplayChanged");
		}
		this._updateTimer = setTimeout(this._updateHandler, this.updateInterval);
	},
	onNormalizedDisplayChanged: function(){
		// summary:
		//		This event is fired every updateInterval ms or more
		// description:
		//		If something needs to happen immidiately after a
		//		user change, please use onDisplayChanged instead
		delete this._updateTimer;
	},
	onChange: function(newContent){
		// summary:
		//		this is fired if and only if the editor loses focus and
		//		the content is changed

		// console.log('onChange',newContent);
	},
	_normalizeCommand: function(/*String*/cmd){
		// summary:
		//		Used as the advice function by dojo.connect to map our
		//		normalized set of commands to those supported by the target
		//		browser

		var command = cmd.toLowerCase();
		if(command == "formatblock"){
			if(dojo.isSafari){ command = "heading"; }
		}else if(command == "hilitecolor" && !dojo.isMoz){
			command = "backcolor";
		}

		return command;
	},

	_qcaCache: {},
	queryCommandAvailable: function(/*String*/command){
		// summary:
		//		Tests whether a command is supported by the host. Clients
		//		SHOULD check whether a command is supported before attempting
		//		to use it, behaviour for unsupported commands is undefined.
		// command: The command to test for

		// memoizing version. See _queryCommandAvailable for computing version
		var ca = this._qcaCache[command];
		if(ca != undefined){ return ca; }
		return this._qcaCache[command] = this._queryCommandAvailable(command);
	},
	
	_queryCommandAvailable: function(/*String*/command){

		var ie = 1;
		var mozilla = 1 << 1;
		var safari = 1 << 2;
		var opera = 1 << 3;
		var safari420 = 1 << 4;

		var gt420 = dojo.isSafari;

		function isSupportedBy(browsers){
			return {
				ie: Boolean(browsers & ie),
				mozilla: Boolean(browsers & mozilla),
				safari: Boolean(browsers & safari),
				safari420: Boolean(browsers & safari420),
				opera: Boolean(browsers & opera)
			}
		}

		var supportedBy = null;

		switch(command.toLowerCase()){
			case "bold": case "italic": case "underline":
			case "subscript": case "superscript":
			case "fontname": case "fontsize":
			case "forecolor": case "hilitecolor":
			case "justifycenter": case "justifyfull": case "justifyleft":
			case "justifyright": case "delete": case "selectall": case "toggledir":
				supportedBy = isSupportedBy(mozilla | ie | safari | opera);
				break;

			case "createlink": case "unlink": case "removeformat":
			case "inserthorizontalrule": case "insertimage":
			case "insertorderedlist": case "insertunorderedlist":
			case "indent": case "outdent": case "formatblock":
			case "inserthtml": case "undo": case "redo": case "strikethrough": case "tabindent":
				supportedBy = isSupportedBy(mozilla | ie | opera | safari420);
				break;

			case "blockdirltr": case "blockdirrtl":
			case "dirltr": case "dirrtl":
			case "inlinedirltr": case "inlinedirrtl":
				supportedBy = isSupportedBy(ie);
				break;
			case "cut": case "copy": case "paste":
				supportedBy = isSupportedBy( ie | mozilla | safari420);
				break;

			case "inserttable":
				supportedBy = isSupportedBy(mozilla | ie);
				break;

			case "insertcell": case "insertcol": case "insertrow":
			case "deletecells": case "deletecols": case "deleterows":
			case "mergecells": case "splitcell":
				supportedBy = isSupportedBy(ie | mozilla);
				break;

			default: return false;
		}

		return (dojo.isIE && supportedBy.ie) ||
			(dojo.isMoz && supportedBy.mozilla) ||
			(dojo.isSafari && supportedBy.safari) ||
			(gt420 && supportedBy.safari420) ||
			(dojo.isOpera && supportedBy.opera);  // Boolean return true if the command is supported, false otherwise
	},

	execCommand: function(/*String*/command, argument){
		// summary: Executes a command in the Rich Text area
		// command: The command to execute
		// argument: An optional argument to the command
		var returnValue;

		//focus() is required for IE to work
		//In addition, focus() makes sure after the execution of
		//the command, the editor receives the focus as expected
		this.focus();

		console.debug("trying:", command, "with arg:", argument);
		var c = dojox.editor.refactor.RichText._commands;
		var handler;
		if(handler = c.match(command.toLowerCase())){
			console.debug("applying:", handler.name, "with arg:", argument);
			this.editNode.normalize();

			// var selection = dijit.range.getSelection(this.window);
			var selection = this.window.getSelection();
			// console.debug(selection.anchorNode, selection.anchorOffset);
			// console.debug(selection.focusNode, selection.focusOffset);
			try{
				var r = selection.getRangeAt(0);
				console.debug(r.startContainer, r.startOffset);
				console.debug(r.endContainer, r.endOffset);
			}catch(e){
				console.debug(e);
			}

			// console.dir(r);
			return;

			return handler.applyCommand(this, argument);
		}

		command = this._normalizeCommand(command);

		if(argument != undefined){
			if(command == "heading"){
				throw new Error("unimplemented");
			}else if((command == "formatblock") && dojo.isIE){
				argument = '<'+argument+'>';
			}
		}
		if(command == "inserthtml"){
			//TODO: we shall probably call _preDomFilterContent here as well
			argument = this._preFilterContent(argument);
			returnValue = true;
			if(dojo.isIE){
				var insertRange = this.document.selection.createRange();
				insertRange.pasteHTML(argument);
				insertRange.select();
				//insertRange.collapse(true);
			}else if(dojo.isMoz && !argument.length){
				//mozilla can not inserthtml an empty html to delete current selection
				//so we delete the selection instead in this case
				this._sCall("remove"); // FIXME
				returnValue = true;
			}else{
				returnValue = this.document.execCommand(command, false, argument);
			}
		}else if(
			(command == "unlink")&&
			(this.queryCommandEnabled("unlink"))&&
			(dojo.isMoz || dojo.isSafari)
		){
			// fix up unlink in Mozilla to unlink the link and not just the selection

			// grab selection
			// Mozilla gets upset if we just store the range so we have to
			// get the basic properties and recreate to save the selection
			//  var selection = this.window.getSelection();

			//	var selectionRange = selection.getRangeAt(0);
			//	var selectionStartContainer = selectionRange.startContainer;
			//	var selectionStartOffset = selectionRange.startOffset;
			//	var selectionEndContainer = selectionRange.endContainer;
			//	var selectionEndOffset = selectionRange.endOffset;

			// select our link and unlink
			var a = this._sCall("getAncestorElement", [ "a" ]);
			this._sCall("selectElement", [ a ]);

			returnValue = this.document.execCommand("unlink", false, null);
		}else if((command == "hilitecolor")&&(dojo.isMoz)){
			// mozilla doesn't support hilitecolor properly when useCSS is
			// set to false (bugzilla #279330)

			this.document.execCommand("styleWithCSS", false, true);
			returnValue = this.document.execCommand(command, false, argument);
			this.document.execCommand("styleWithCSS", false, false);

		}else if((dojo.isIE)&&( (command == "backcolor")||(command == "forecolor") )){
			// Tested under IE 6 XP2, no problem here, comment out
			// IE weirdly collapses ranges when we exec these commands, so prevent it
			//	var tr = this.document.selection.createRange();
			argument = arguments.length > 1 ? argument : null;
			returnValue = this.document.execCommand(command, false, argument);

			// timeout is workaround for weird IE behavior were the text
			// selection gets correctly re-created, but subsequent input
			// apparently isn't bound to it
			//	setTimeout(function(){tr.select();}, 1);
		}else{
			argument = arguments.length > 1 ? argument : null;
			//	if(dojo.isMoz){
			//		this.document = this.iframe.contentWindow.document
			//	}

			// console.debug("execCommand:", command, argument);
			if(argument || command!="createlink"){
				returnValue = this.document.execCommand(command, false, argument);
			}
		}

		this.onDisplayChanged();
		return returnValue;
	},

	queryCommandEnabled: function(/*String*/command){
		// summary: check whether a command is enabled or not

		if(this.disabled){ return false; }
		command = this._normalizeCommand(command);
		if(dojo.isMoz || dojo.isSafari){
			if(command == "unlink"){ // mozilla returns true always
				// console.debug(this._sCall("hasAncestorElement", ['a']));
				this._sCall("hasAncestorElement", ["a"]);
			}else if(command == "inserttable"){
				return true;
			}
		}
		//see #4109
		if(dojo.isSafari){
			if(command == "copy"){
				command = "cut";
			}else if(command == "paste"){
				return true;
			}
		}
		//should not allow user to indent neither a non-list node nor list item which is the first item in its parent 
		if(command == 'indent'){
			var li = this._sCall("getAncestorElement", ["li"]);
			var n = li && li.previousSibling;
			while(n){
				if(n.nodeType == 1){
				  return true;
				}
				n = n.previousSibling;
			}
			return false;
		}else if(command == 'outdent'){
			//should not allow user to outdent a non-list node
			return this._sCall("hasAncestorElement", ["li"]);
		}

		// return this.document.queryCommandEnabled(command);
		var elem = dojo.isIE ? this.document.selection.createRange() : this.document;
		return elem.queryCommandEnabled(command);
	},

	queryCommandState: function(command){
		// summary:
		//		check the state of a given command and returns true or false

		if(this.disabled){ return false; }

		var c = dojox.editor.refactor.RichText._commands;
		var handler;
		if(handler = c.match(command)){
			return handler.queryState(this);
		}

		command = this._normalizeCommand(command);
		// try{
			this.editNode.contentEditable = true;
			return this.document.queryCommandState(command);
		// }catch(e){
		// 	console.debug(e);
		// 	return false;
		// }
	},

	queryCommandValue: function(command){
		// summary:
		//		check the value of a given command. This matters most for
		//		custom selections and complex values like font value setting

		if(this.disabled){ return false; }
		var r;
		command = this._normalizeCommand(command);
		if(dojo.isIE && command == "formatblock"){
			r = this._native2LocalFormatNames[this.document.queryCommandValue(command)];
		}else{
			r = this.document.queryCommandValue(command);
		}
		// console.debug("queryCommandValue:", command, ":",  r);
		return r;
	},

	// Misc.

	_sCall: function(name, args){
		// summary:
		//		run the named method of dijit._editor.selection over the
		//		current editor instance's window, with the passed args
		dojo.withGlobal(this.window, name, dijit._editor.selection, args);
	},

	// FIXME: this is a TON of code duplication. Why?

	placeCursorAtStart: function(){
		// summary:
		//		place the cursor at the start of the editing area
		this.focus();

		//see comments in placeCursorAtEnd
		var isvalid = false;
		if(dojo.isMoz){
			var first=this.editNode.firstChild;
			while(first){
				if(first.nodeType == 3){
					if(first.nodeValue.replace(/^\s+|\s+$/g, "").length>0){
						isvalid = true;
						this._sCall("selectElement", [ first ]);
						break;
					}
				}else if(first.nodeType == 1){
					isvalid = true;
					this._sCall("selectElementChildren", [ first ]);
					break;
				}
				first = first.nextSibling;
			}
		}else{
			isvalid = true;
			this._sCall("selectElementChildren", [ this.editNode ]);
		}
		if(isvalid){
			this._sCall("collapse", [ true ]);
		}
	},

	placeCursorAtEnd: function(){
		// summary:
		//		place the cursor at the end of the editing area
		this.focus();

		// In mozilla, if last child is not a text node, we have to use
		// selectElementChildren on this.editNode.lastChild otherwise the
		// cursor would be placed at the end of the closing tag of
		// this.editNode.lastChild
		var isvalid = false;
		if(dojo.isMoz){
			var last=this.editNode.lastChild;
			while(last){
				if(last.nodeType == 3){
					if(last.nodeValue.replace(/^\s+|\s+$/g, "").length>0){
						isvalid=true;
						this._sCall("selectElement", [ last ]);
						break;
					}
				}else if(last.nodeType == 1){
					isvalid=true;
					if(last.lastChild){
						this._sCall("selectElement", [ last.lastChild ]);
					}else{
						this._sCall("selectElement", [ last ]);
					}
					break;
				}
				last = last.previousSibling;
			}
		}else{
			isvalid = true;
			this._sCall("selectElementChildren", [ this.editNode ]);
		}
		if(isvalid){
			this._sCall("collapse", [ false ]);
		}
	},

	getValue: function(/*Boolean?*/nonDestructive){
		//	summary:
		//		return the current content of the editing area (post filters
		//		are applied)
		//	nonDestructive:
		//		defaults to false. Should the post-filtering be run over a copy
		//		of the live DOM? Most users should pass "true" here unless they
		//		*really* know that none of the installed filters are going to
		//		mess up the editing session.
		if(this.textarea){
			if(this.isClosed || !this.isLoaded){
				return this.textarea.value;
			}
		}

		return this._postFilterContent(null, nonDestructive);
	},

	setValue: function(/*String*/html){
		// summary:
		//		This function sets the content. No undo history is preserved.
		if(this.textarea && (this.isClosed || !this.isLoaded)){
			this.textarea.value = html;
		}else{
			html = this._preFilterContent(html);
			var node = this.isClosed ? this.domNode : this.editNode;
			node.innerHTML = html;
			this._preDomFilterContent(node);
		}
		this.onDisplayChanged();
	},

	replaceValue: function(/*String*/html){
		// summary:
		//		this function set the content while trying to maintain the undo stack
		//		(now only works fine with Moz, this is identical to setValue in all
		//		other browsers)
		if(this.isClosed){
			this.setValue(html);
		}else if(this.window && this.window.getSelection && !dojo.isMoz){ // Safari
			// look ma! it's a totally f'd browser!
			this.setValue(html);
		}else if(this.window && this.window.getSelection){ // Moz
			html = this._preFilterContent(html);
			this.execCommand("selectall");
			if(dojo.isMoz && !html){ html = "&nbsp;" }
			this.execCommand("inserthtml", html);
			this._preDomFilterContent(this.editNode);
		}else if(this.document && this.document.selection){//IE
			//In IE, when the first element is not a text node, say
			//an <a> tag, when replacing the content of the editing
			//area, the <a> tag will be around all the content
			//so for now, use setValue for IE too
			this.setValue(html);
		}
	},

	_preFilterContent: function(/*String*/html){
		// summary:
		//		filter the input before setting the content of the editing
		//		area. DOM pre-filtering may happen after this
		//		string-based filtering takes place but as of 1.2, this is not
		//		gauranteed for operations such as the inserthtml command.
		var ec = html;
		dojo.forEach(this.contentPreFilters, function(ef){ if(ef){ ec = ef(ec); } });
		return ec;
	},
	_preDomFilterContent: function(/*DomNode*/dom){
		// summary:
		//		filter the input's live DOM. All filter operations should be
		//		considered to be "live" and operating on the DOM that the user
		//		will be interacting with in their editing session.
		dom = dom || this.editNode;
		dojo.forEach(this.contentDomPreFilters, function(ef){
			if(ef && dojo.isFunction(ef)){
				ef(dom);
			}
		}, this);
	},

	_postFilterContent: function(
		/*DomNode|DomNode[]|String?*/ dom,
		/*Boolean?*/ nonDestructive){
		//	summary:
		//		filter the output after getting the content of the editing area
		//
		//	description:
		//		post-filtering allows plug-ins and users to specify any number
		//		of transforms over the editor's content, enabling many common
		//		use-cases such as transforming absolute to relative URLs (and
		//		vice-versa), ensuring conformance with a particular DTD, etc.
		//		The filters are registered in the contentDomPostFilters and
		//		contentPostFilters arrays. Each item in the
		//		contentDomPostFilters array is a function which takes a DOM
		//		Node or array of nodes as its only argument and returns the
		//		same. It is then passed down the chain for further filtering.
		//		The contentPostFilters array behaves the same way, except each
		//		member operates on strings. Together, the DOM and string-based
		//		filtering allow the full range of post-processing that should
		//		be necessaray to enable even the most agressive of post-editing
		//		conversions to take place.
		//
		//		If nonDestructive is set to "true", the nodes are cloned before
		//		filtering proceeds to avoid potentially destructive transforms
		//		to the content which may still needed to be edited further.
		//		Once DOM filtering has taken place, the serialized version of
		//		the DOM which is passed is run through each of the
		//		contentPostFilters functions.
		//
		//	dom:
		//		a node, set of nodes, which to filter using each of the current
		//		members of the contentDomPostFilters and contentPostFilters arrays. 
		//
		//	nonDestructive:
		//		defaults to "false". If true, ensures that filtering happens on
		//		a clone of the passed-in content and not the actual node
		//		itself.
		var ec;
		if(!dojo.isString(dom)){
			dom = dom || this.editNode;
			if(this.contentDomPostFilters.length){
				if(nonDestructive){
					dom = dojo.clone(dom);
				}
				dojo.forEach(this.contentDomPostFilters, function(ef){
					dom = ef(dom);
				});
			}
			ec = dijit._editor.getChildrenHtml(dom);
		}else{
			ec = dom;
		}

		if(!dojo.trim(ec.replace(/^\xA0\xA0*/, '').replace(/\xA0\xA0*$/, '')).length){
			ec = "";
		}

		//	if(dojo.isIE){
		//		//removing appended <P>&nbsp;</P> for IE
		//		ec = ec.replace(/(?:<p>&nbsp;</p>[\n\r]*)+$/i,"");
		//	}
		dojo.forEach(this.contentPostFilters, function(ef){
			ec = ef(ec);
		});

		return ec;
	},

	_saveContent: function(/*Event*/e){
		// summary:
		//		Saves the content in an onunload event if the editor has not been closed
		var saveTextarea = dojo.byId(dijit._scopeName + "._editor.RichText.savedContent");
		saveTextarea.value += this._SEPARATOR + this.name + ":" + this.getValue();
	},


	escapeXml: function(/*String*/str, /*Boolean*/noSingleQuotes){
		//summary:
		//		Adds escape sequences for special characters in XML: &<>"'
		//		Optionally skips escapes for single quotes
		str = str.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/"/gm, "&quot;");
		if(!noSingleQuotes){
			str = str.replace(/'/gm, "&#39;");
		}
		return str; // string
	},

	getNodeHtml: function(/* DomNode */node){
		dojo.deprecated('dijit.Editor::getNodeHtml is deprecated','use dijit._editor.getNodeHtml instead', 2);
		return dijit._editor.getNodeHtml(node); // String
	},

	getNodeChildrenHtml: function(/* DomNode */dom){
		dojo.deprecated('dijit.Editor::getNodeChildrenHtml is deprecated','use dijit._editor.getChildrenHtml instead', 2);
		return dijit._editor.getChildrenHtml(dom);
	},

	close: function(/*Boolean*/save, /*Boolean*/force){
		// summary:
		//		Kills the editor and optionally writes back the modified contents to the
		//		element from which it originated.
		// save:
		//		Whether or not to save the changes. If false, the changes are discarded.
		// force:
		if(this.isClosed){return false; }

		if(!arguments.length){ save = true; }
		this._content = this.getValue();
		var changed = (this.savedContent != this._content);

		// line height is squashed for iframes
		// FIXME: why was this here? if (this.iframe){ this.domNode.style.lineHeight = null; }

		if(this.interval){ clearInterval(this.interval); }

		if(this.textarea){
			with(this.textarea.style){
				position = "";
				left = top = "";
				if(dojo.isIE){
					overflow = this.__overflow;
					this.__overflow = null;
				}
			}
			this.textarea.value = save ? this._content : this.savedContent;
			dojo._destroyElement(this.domNode);
			this.domNode = this.textarea;
		}else{
			// if(save){
			// why we treat moz differently? comment out to fix #1061
			//		if(dojo.isMoz){
			//			var nc = dojo.doc.createElement("span");
			//			this.domNode.appendChild(nc);
			//			nc.innerHTML = this.editNode.innerHTML;
			//		}else{
			//			this.domNode.innerHTML = this._content;
			//		}
			// }
			this.domNode.innerHTML = save ? this._content : this.savedContent;
		}

		dojo.removeClass(this.domNode, "RichTextEditable");
		this.isClosed = true;
		this.isLoaded = false;
		// FIXME: is this always the right thing to do?
		delete this.editNode;

		if(this.window && this.window._frameElement){
			this.window._frameElement = null;
		}

		this.window = null;
		this.document = null;
		this.editingArea = null;
		this.editorObject = null;

		return changed; // Boolean: whether the content has been modified
	},

	destroyRendering: function(){
		// summary: stub	
	}, 

	destroy: function(){
		this.destroyRendering();
		if(!this.isClosed){ this.close(false); }
		this.inherited("destroy",arguments);
		//dijit._editor.RichText.superclass.destroy.call(this);
	},

	_removeMozBogus: function(/* String */ html){
		return html.replace(/\stype="_moz"/gi, '').replace(/\s_moz_dirty=""/gi, ''); // String
	},
	_removeSafariBogus: function(/* String */ html){
		return html.replace(/\sclass="webkit-block-placeholder"/gi, ''); // String
	},
	_fixContentForMoz: function(/* String */ html){
		// summary:
		//		Moz can not handle strong/em tags correctly, convert them to b/i
		return html.replace(/<(\/)?strong([ \>])/gi, '<$1b$2')
			.replace(/<(\/)?em([ \>])/gi, '<$1i$2' ); // String
	},

	_preFixUrlAttributes: function(/* String */ html){
		return html.replace(/(?:(<a(?=\s).*?\shref=)("|')(.*?)\2)|(?:(<a\s.*?href=)([^"'][^ >]+))/gi, 
				'$1$4$2$3$5$2 _djrealurl=$2$3$5$2')
			.replace(/(?:(<img(?=\s).*?\ssrc=)("|')(.*?)\2)|(?:(<img\s.*?src=)([^"'][^ >]+))/gi, 
				'$1$4$2$3$5$2 _djrealurl=$2$3$5$2'); // String
	},

	// command and selection helper functions
	_bookmarkId: 0,
	_getBookmark: function(rangeNodes){
		var startMarker, endMarker;
		var id = this._bookmarkId++;
		if(rangeNodes.length){
			startMarker = this.document.createElement("span");
			dojo.attr(startMarker, {
				isBookmark: "true",
				bookmarkId: id,
				style: {
					width: "1px",
					height: "1px",
					overflow: "hidden",
					// visiblity: "hidden"
					border: "3px solid blue"
					/*
					*/
				}
			});
			endMarker = startMarker.cloneNode(false);
			var sid = "_richText_startMarker_"+this.id+"_"+id;
			var eid = "_richText_endMarker_"+this.id+"_"+id;
			startMarker.id = sid;
			endMarker.id = eid;
			if(dojo.isIE){
				// gigantic hack for IE. Can't be stuffed into attributes due
				// to the IE "findText" API design
				startMarker.innerHTML = sid;
				endMarker.innerHTML = eid;
			}
			// place the markers around the selection contents
			dojo.place(startMarker, rangeNodes[0], "before");
			dojo.place(endMarker, rangeNodes.last(), "after");
		}
		return [ startMarker, endMarker ];
	},
	_getRangeNodes: function(/*Selection*/ s){
		// on sane browsers, this returns a docment fragment
		// containing the contents of the range
		var r = [];
		r.last = function(){
			return this[this.length-1];
		}
		var commonAncestor = s.commonAncestorContainer;
		// if we're not the start of the text in the node, or if we're not
		// at the end, split the text node such that we have an individual
		// node to add to the list
		var sc = s.startContainer;
		var so = s.startOffset;
		var ec = s.endContainer;
		var eo = s.endOffset;
		var od = sc.ownerDocument;
		var tmp = od.createTextNode("");
		if(sc === ec){
			// the start and end are in the same node. It's pretty
			// straight-forward from here: just split twice (starting at
			var collpased = (dojo.isIE) ? !s.text.length : s.collapsed;
			// the end) and return the new "middle" node
			if(collpased){
				// console.dir(s);
				// it's a collapsed selection. Split once and insert a new
				// (blank) text node. Return it.
				var ttmp = tmp.cloneNode(true);
				if(sc.nodeType == 1){
					dojo.place(ttmp, this.domNode, "first");
				}else{
					var next = sc.splitText(so);
					sc.parentNode.insertBefore(ttmp, next);
				}
				r.push(ttmp);
			}else{
				// we're not collapsed, but are a selection inside a single node

				if(1 == sc.nodeType){
					// if we're inside an element as our container, just push
					// all the applicable children into the selection
					var tmp = so;
					do{
						r.push(sc.childNodes.item(tmp));
						tmp++;
					}while(tmp < eo);
				}else if(3 == sc.nodeType){
					// otherwise our container is a block of text, so split it
					// up into individual nodes along the selection boundaries
					sc.splitText(eo); // break off any trailing text at the end
					r.push(sc.splitText(so)); // split/add just the selected text
				}
			}
			return r;
		}
		if(3 == sc.nodeType){
			var l = String(sc.value).length;
			if(0 == so){
				// console.debug("at the start of a node:", sc.outerHTML);

				if(sc.parentNode != commonAncestor){
					// we're at the beginning, so all the contents are
					// selected. Just put the parent elements in and move
					// on.
					r.push(sc.parentNode);
				}else{
					// we're at the beginning, but we end in some other
					// node which is a descendant of our parent node.
					// Select the whole text node and move on.
					r.push(sc);
				}
			}else if(l == so){ 
				// console.debug("at the end of a node:", sc.outerHTML);

				// it's at the end, select the parent's next sibling,
				// assuming that the parent isn't our common ancestor or
				// that the selection doesn't terminate inside the next
				// sibling
				var ns = sc.nextSibling;
				if(ns){
					if(!dojo.isDescendant(ec, ns)){
						r.push(ns);
					}else{
						// the selection terminates inside of our next
						// sibling, so we create an empty text node and add
						// it right after ourselves here so that we can
						// generalize the parent/sibling walking
						var ttmp = tmp.cloneNode();
						dojo.place(ttmp, sc, "after");
						r.push(ttmp);
					}
				}
			}else{
				// console.debug("at the intermediate offset:", so, l, sc.outerHTML);
				// not start or end, so split where we are and add the
				// stuff at the end of our element to the selection
				r.push(sc.splitText(so));
				ec.splitText(eo);
			}
		}else if(1 == sc.nodeType){
			// FIXME: what if nodeType suggests it's an element?
			// console.debug("not the same, but starting from an element. Offset:", so, "in", sc);
			// console.debug("start container is common ancestor:", sc === commonAncestor);
			var cn = sc.childNodes;
			if(sc === commonAncestor){
				var end = false;
				dojo.forEach(cn, function(item, idx, arr){
					if(end){ return; }
					if((item === ec) || dojo.isDescendant(ec, item)){
						end = true;
						return;
					}
					if(idx >= so){
						r.push(item);
					}
				});
			}else if(sc.parentNode === commonAncestor){
				// run to the end internally and *then* pop up
				dojo.forEach(cn, function(item, idx, arr){
					if(idx >= so){
						r.push(item);
					}
				});
				// then go grab our siblings until one is (or is an an ancestor
				// of) the end container
				var next = sc.nextSibling;
				while(next && ((next !== ec) && !dojo.isDescendant(ec, next))){
					r.push(next);
					next = next.nextSibling;
				}
			}else{
				r.push(sc);
			}
		}
		this._collectNodes(r, commonAncestor, ec, eo);
		return r;
	},
	_collectNodes: function(arr, ancestor, end, endOffset){
		// while the parent of last isn't ancestor, try to add everything to
		// the "right" of it to arr, popping up a level when we hit the end
		var last = arr.last();
		if(!last || (last === ancestor)){ return; }
		do{
			var n = last.nextSibling;
			while(n){
				if(dojo.isDescendant(end, n)){
					break; 
				}
				arr.push(n);
				n = n.nextSibling;
			}
			last = last.parentNode;
		}while(last && last != ancestor);
		// at this point, we should have all of the nodes which aren't on the
		// furthest-right arm of the tree

		// grab the right-hand side of the tree by doing the opposite: start
		// from the endpoint and walk up to the right until you hit the current
		// value for "last"
		last = arr.last();
		// console.debug("last:", last);
		if(1 == end.nodeType){
			end = end.childNodes[endOffset-1];
			// console.debug("end:", end);
		}
		arr.push(end);
		var al = arr.length-1;
		var prev = end;
		do{
			var n = prev.previousSibling;
			while(n){
				if(n == last){ return; }
				arr.splice(al, 0, n);
				n = n.previousSibling;
			}
			prev = prev.parentNode;
		}while(prev && prev != ancestor);
		// console.debug("tmp:", arr);

	},
	_moveToBookmark: function(bookmark){
		var start = bookmark[0];
		var end = bookmark[1];
		if(!start || !end){
			console.error("_moveToBookmark must be passed start/end caps to be removed!");
			return;
		}
		// create a new selection based on our markers

		console.debug("_moveToBookmark", start, end);

		if(dojo.isIE){
			// gigantic hack! Outlined briefly, we're expecting the passed
			// start/end cap elements to have some unique strings in them.
			// Since IE's selection and range APIs aren't DOM-oriented, we use
			// this unique text as a way to position the range correctly so
			// that when we remove the caps, the selection that's left
			// encompasses the parts of the document that we care about. What
			// a fracking hack for what can only be described as a shitty API.
			var r = this.document.createTextRange();
			var r2 = r.duplicate();

			// find the positions of our text
			var foundStart = r.findText(start.innerHTML, 100000000);
			// r.select();
			var foundEnd = r2.findText(end.innerHTML, 100000000);
			// r2.select();
			// console.debug(foundStart, foundEnd);

			var r3 = r.duplicate();
			r3.move("character", start.innerHTML.length);
			r3.setEndPoint("EndToStart", r2);
			r3.select();
		}

		var startNext = start.nextSibling;
		var endPrev = end.previousSibling
		/*
		while(endPrev && (
			dojo.attr(endPrev, "isBookmark") == "true")
		){
			if(endPrev.nodeType == 3){
				while(!endPrev.nodeValue.length){
					var t = endPrev.previousSibling;
					t.parentNode.removeChild(t);
					endPrev = t;
				}
			}
			endPrev = endPrev.previousSibling;
		}
		*/
		var endNext = end.nextSibling;
		if(dojo.isIE){
			end.innerHTML = start.innerHTML = "";
		}
		/*
		console.debug("endPrev", endPrev);
		console.debug("endNext.previousSibling", endNext.previousSibling);
		console.debug("endNext.parentNode.previousSibling", endNext.parentNode.previousSibling);
		console.debug("endNext", endNext);
		*/
		start.parentNode.removeChild(start);
		end.parentNode.removeChild(end);
		
		if(!dojo.isIE){ // the standard path
			// grab the selection object
			var s = this.window.getSelection();
			// clear out the current contents
			if(s.rangeCount > 0){ s.removeAllRanges(); }
			var r = this.document.createRange();
			r.setStartBefore(startNext);
			var ep = endPrev||endNext.previousSibling||endNext.parentNode.previousSibling||endNext;
			r.setEndAfter(ep);
			s.addRange(r);
		}
	}
});

dojo.declare("dojox.editor.refactor.Command", null, {
	name: "",
	constructor: function(props){
		dojo.mixin(this, props);
		this.register();
		this.init();
	},
	register: function(adapterRegistry){
		var r = this.registry = adapterRegistry||this.registry;
		if(r && this.name.length){
			r.register(
				this.name, 
				dojo.hitch(this, "registryCheck"),
				this
			);
		}
	},
	init: function(){
		//	summary:
		//		stub. 
	},
	registryCheck: function(/*String*/ action, /*Object?*/ value){
		//	summary:
		//		stub. Is this Command the right one to handle the passed-in
		//		action?
		return (action == this.name); // Boolean
	},
	queryEnabled: function(/*dojox.editor.refactor.RichText*/ rt){
		//	summary:
		//		stub. Is it possible to execute this command in the passed
		//		RichText component given the current state of the document and
		//		its selection?

		// see: http://msdn.microsoft.com/en-us/library/ms536676(VS.85).aspx
		return false; // Boolean
	},
	queryValue: function(/*dojox.editor.refactor.RichText*/ rt){
		//	summary:
		//		stub. Returns the current value of the selection in the passed
		//		RichText component.

		// see: http://msdn.microsoft.com/en-us/library/ms536679(VS.85).aspx 
		// see: http://developer.mozilla.org/en/docs/DOM:document
		return null; // Boolean
	},
	queryState: function(/*dojox.editor.refactor.RichText*/ rt){
		//	summary:
		//		stub. Has this command been executed on the current selection
		//		in the passed RichText component?

		// see: http://msdn.microsoft.com/en-us/library/ms536679(VS.85).aspx
		// see: http://developer.mozilla.org/en/docs/DOM:document
		return false; // Boolean
	},
	applyCommand: function(/*dojox.editor.refactor.RichText*/ rt, /*String?*/argument){
		// summary:
		//		stub. Apply the command to the current selection in the passed
		//		RichText component. Individual commands should implement this
		//		function.
		return true;
	}
});

dojo.declare("dojox.editor.refactor.TagWrapCommand", dojox.editor.refactor.Command, {
	init: function(){
		if(this.tag){
			this._upperTag = this._upperTag||this.tag.toUpperCase();
		}
		if(this.name){
			this._nameAttr = this.name+"_command";
		}
	},
	tag: "",
	attrs: {},
	applicationHelper: function(arg, node){
		// summary:
		//		stub. Your command should implement if it's going to need to do
		//		post-processing on nodes that a command is applied to.
	},
	removalHelper: function(arg, node){
		// summary:
		//		stub. Your command should implement if it's going to need to do
		//		post-processing on nodes that a command is removed from.
	},
	isntAppliedHelper: function(node){
		// summary:
		//		stub. Your command should implement if it's going to need
		//		special detection of application to a particular node

		// stub variant defaults to saying that the rule is applied to a node
		return false; // Boolean
	},
	reParentOnRemoval: false,
	applyCommand: function(/*dojox.editor.refactor.RichText*/ rt, arg){
		// FIXME:
		//		need to handle collapsed selection application!!!

		// FIXME:
		//		unlike moz's built-in tag application, we need to find sub-tags
		//		which might over-ride the command we're about to apply and
		//		replace/remove them upon application

		var selection = dijit.range.getSelection(rt.window);
		// var selection = rt.window.getSelection();
		console.dir(selection);
		var r = selection.getRangeAt(0);
		console.dir(r);

		var rangeNodes = rt._getRangeNodes(r);
		console.debug(rangeNodes);
		var bookmark = rt._getBookmark(rangeNodes);
		console.debug(bookmark);

		// selections across browsers aren't necessarialy stable or
		// DOM-oriented. Creating "marker" elements allows us to mutate the
		// contents of a selection and re-create the selection after the
		// command application. Build the markers here.
		var nodes = dojo.filter(
			rangeNodes,
			this._isntAppliedToNode,
			this
		);

		if(!nodes.length){
			// console.debug("applied!");
			dojo.forEach(rangeNodes, this._removeFromNode, this);
			dojo.forEach(rangeNodes, dojo.hitch(this, "removalHelper", arg));
		}else{
			// console.debug("not applied to:", nodes);
			dojo.forEach(nodes, this._applyToNode, this);
			dojo.forEach(nodes, dojo.hitch(this, "applicationHelper", arg));
		}
		// _moveToBookmark destroys our bookmark. Bad API design, but whatcha
		// gonna do? They need to be destroyed at different times based on
		// browser behavior

		rt._moveToBookmark(bookmark);

		return true;
	},
	queryState: function(/*dijit._editor.RichText*/ rt){
		var selection = dijit.range.getSelection(rt.window);
		var r = selection.getRangeAt(0);
		return this._isApplied(rt._getRangeNodes(r));
	},
	_isApplied: function(/*Array*/ rn){
		var a = (
			0 == dojo.filter(rn, this._isntAppliedToNode, this)
		);
		// console.debug(this.name, (a ? "is" : "isn't"), "applied, from:", rn.length);
		return a;
	},
	_isntAppliedToNode: function(node){
		// summary:
		//		determines if the current rule *isn't* applied to the passed in
		//		node. We ask for the negative here because the caller is trying
		//		to "fail fast" on a selection in order to determine if
		//		application is required.
		var ta = this.attrs;
		var nt = node.nodeType;
		if(1 == nt){
			// take a node at its word
			// if(dojo.attr(node, "marker") == "applied"){ return false; }
			// if(dojo.attr(node, this._nameAttr) == "applied"){ return false; }

			if(this.tag.length){
				// FIXME: should we check the parent chain here?
				if(!this._isTagMatch(node)){
					return true; // it's not applied, fail fast
				}
			}
			// if we're an element, check to see if the conditions apply *directly* to us.
			for(var x in ta){
				if(x == "style"){ // style is special
					continue;
				}
				if(dojo.attr(node, x) != ta[x]){
					// we've got a different value for some required attribute.
					// The command isn't fully applied.
					return true; 
				}
			}
			if(ta.style){
				for(var x in ta.style){
					if(dojo.style(node, x) != ta.style[x]){
						return true; 
					}
				}
			}
			// console.debug(node);
			return this.isntAppliedHelper(node);
		}else if(3 == nt){
			if(!node.nodeValue.length){ return false; }
			// if we're a real text node, check to see if it was applied to our
			// parent instead

			// console.debug(node.parentNode);
			return this._isntAppliedToNode(node.parentNode);
		}
	},
	_isTagMatch: function(node){
		// cache our toUpperCase op
		// 	this._upperTag = this._upperTag||this.tag.toUpperCase();
		return (node.tagName == this._upperTag);
	},
	_applyToNode: function(node){
		// NOTE:
		//		for textNode nodes, we're expecting to be pre-split should any
		//		splitting be necessaray based on the seleciton range 
		var nt = node.nodeType;
		var el = node;
		// If the tags don't match or it's a text node, reparent.
		if((3 == nt) || !this._isTagMatch(node)){
			// FIXME: need to handle lists, tables, etc. here.
			el = node.ownerDocument.createElement(this.tag||"span");
			node.parentNode.replaceChild(el, node);
			el.appendChild(node);
		}

		// now we should be normalized on the tag name, so apply attributes
		dojo.attr(el, this.attrs);
		dojo.attr(el, this._nameAttr, "applied");
		return el;
	},
	_singleRemoveFromNode: function(node){
		try{
			dojo.removeAttr(node, this._nameAttr);
		}catch(e){}

		// else we're an element, so go about removing attributes and such. If
		// configured to do so, also re-parent children
		for(var x in this.attrs){
			if(x != "style"){ // style is special
				dojo.attr(node, x, ""); // FIXME: should be null?
			}
		}
		for(var x in this.attrs.style){
			dojo.style(node, x, ""); // un-set
		}
		if(this.reParentOnRemoval){
			while(node.firstChild){
				// move te children out
				node.parentNode.insertBefore(node.firstChild, node);
			}
			// clobber the old host
			node.parentNode.removeChild(node);
		}
	},
	_removeFromNode: function(node, idx, arr){
		// console.debug("_removeFromNode", node, this._nameAttr);
		// if we're a text node, find a parent to remove the rule from

		// FIXME: 
		// need to handle splitting application to de-apply from a
		// sub-selection. Think of a DOM like this:
		//		<b>thing*e*r</e>
		// where the "e" in the word "thinger" is highlighted. "Removing"
		// bolding from the "e" really means (potentially) removing it from
		// everything and re-applying to all but the "e" char.

		if(3 == node.nodeType){
			// FIXME: we don't want to undo the command from the ENTIRE parent
			// if the selection range doesn't cover the whole parent node. In
			// those cases, we want to be parented out.

			var pn = node.parentNode;

			if(pn.lastChild == node){
				// console.debug("re-parent after");
				// if we're the last child, just re-parent
				dojo.place(node, pn, "after");
			}else if(pn.firstChild == node){
				// console.debug("re-parent before");
				dojo.place(node, pn, "before");
			}else{
				// console.debug("recurse");
				return this._removeFromNode(pn, idx, arr);
			}

			return; // short-circuit
		}
		if(dojo.attr(node, this._nameAttr)){
			this._singleRemoveFromNode(node);
		}

		// find all children which might have the rule applied and remove
		// it from them as well
		dojo.query("["+this._nameAttr+"]", node).forEach(this._singleRemoveFromNode, this);

		// FIXME: we should prune here too
	},
});


(function(){
	// set up the commands which are available to all editor instances
	var de = dojox.editor.refactor;
	var c = de.RichText._commands = new dojo.AdapterRegistry(true);

	new de.TagWrapCommand({
		name: "bold",
		tag: "span",
		attrs: {
			style: {
				fontWeight: "bold"
			}
		},
		registry: c
	});

	new de.TagWrapCommand({
		name: "italic",
		tag: "span",
		attrs: {
			style: {
				fontStyle: "italic"
			}
		},
		registry: c
	});

	new de.TagWrapCommand({
		name: "strikethrough",
		tag: "span",
		attrs: {
			style: {
				textDecoration: "line-through"
			}
		},
		registry: c
	});

	new de.TagWrapCommand({
		name: "underline",
		tag: "span",
		attrs: {
			style: {
				textDecoration: "underline"
			}
		},
		registry: c
	});

	new de.TagWrapCommand({
		name: "subscript",
		tag: "span",
		attrs: {
			style: {
				verticalAlign: "sub"
			}
		},
		registry: c
	});

	new de.TagWrapCommand({
		name: "superscript",
		tag: "span",
		attrs: {
			style: {
				verticalAlign: "super"
			}
		},
		registry: c
	});

	new de.TagWrapCommand({
		name: "fontname",
		tag: "span",
		applicationHelper: function(arg, node){
			dojo.style(node, "fontFamily", arg);
		},
		removalHelper: function(arg, node){
			dojo.style(node, "fontFamily", "");
		},
		isntAppliedHelper: function(node){
			console.debug(node, dojo.style(node, "fontFamily"));
			return !dojo.style(node, "fontFamily");
		},
		registry: c
	});

	/*
	TODO:
		"fontsize"
		"forecolor"
		"hilitecolor"
		"justifycenter"
		"justifyfull"
		"justifyleft"
		"justifyright"
		"delete"
		"selectall"
		"toggledir"
		"createlink"
		"unlink"
		"removeformat"
		"inserthorizontalrule" 
		"insertimage"
		"insertorderedlist" 
		"insertunorderedlist"
		"indent" 
		"outdent" 
		"formatblock"
		"inserthtml" 
		"undo" 
		"redo" 
		"tabindent"
		"blockdirltr" 
		"blockdirrtl"
		"dirltr" 
		"dirrtl"
		"inlinedirltr" 
		"inlinedirrtl"
	*/
})();
