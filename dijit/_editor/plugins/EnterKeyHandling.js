dojo.provide("dijit._editor.plugins.EnterKeyHandling");

dojo.require("dojo.window");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit._editor.range");

dojo.declare("dijit._editor.plugins.EnterKeyHandling", dijit._editor._Plugin, {
	// summary:
	//		This plugin tries to make all browsers behave consistently with regard to
	//		how ENTER behaves in the editor window.  It traps the ENTER key and alters 
	//		the way DOM is constructed in certain cases to try to commonize the generated 
	//		DOM and behaviors across browsers.
	//
	// description:
	//		This plugin has three modes:
	//
	//			* blockModeForEnter=BR
	//			* blockModeForEnter=DIV
	//			* blockModeForEnter=P
	//
	//		In blockModeForEnter=P, the ENTER key semantically means "start a new
	//		paragraph", whereas shift-ENTER means  "new line in the current paragraph".
	//		For example:
	//
	//		|	first paragraph <shift-ENTER>
	//		|	second line of first paragraph <ENTER>
	//		|
	//		|	second paragraph
	//
	//		In BR and DIV mode other, the ENTER key means to go to a new line in the
	//		current paragraph (P tag), and users [visually] create a new paragraph by pressing ENTER twice.
	//		For example, if the user enters text into an editor like this:
	//
	//		|		one <ENTER>
	//		|		two <ENTER>
	//		|		three <ENTER>
	//		|		<ENTER>
	//		|		four <ENTER>
	//		|		five <ENTER>
	//		|		six <ENTER>
	//
	//		It will appear on the screen as two 'paragraphs' of three lines each.  Markupwise, this generates:
	//
	//		BR:
	//		|		one<br/>
	//		|		two<br/>
	//		|		three<br/>
	//		|		<br/>
	//		|		four<br/>
	//		|		five<br/>
	//		|		six<br/>
	//
	//		DIV:
	//		|		<div>one</div>
	//		|		<div>two</div>
	//		|		<div>three</div>
	//		|		<div>&nbsp;</div>
	//		|		<div>four</div>
	//		|		<div>five</div>
	//		|		<div>six</div>
	//
	//		Additional notes:  blockNodeForEnter=BR
	//		--------------------
	//		On IE, FireFox, and Webkit based editors (Safari, Chrome), typing the above keystrokes in the editor will internally produce DOM of:
	//
	//		|		one
	//		|		<br>
	//		|		two
	//		|		<br>
	//		|		three
	//		|		<br>
	//		|		four
	//		|		<br>
	//		|		five
	//		|		<br>
	//		|		six
	//

	// blockNodeForEnter: String
	//		This property decides the behavior of Enter key. It can be either P,
	//		DIV, BR, or empty (which means disable this feature). Anything else
	//		will trigger errors.  The default is 'BR'
	//
	//		See class description for more details.
	blockNodeForEnter: 'BR',

	constructor: function(args){
		if(args){
			if("blockNodeForEnter" in args){
				args.blockNodeForEnter = args.blockNodeForEnter.toUpperCase(); 
			}	
			dojo.mixin(this,args);
		}
	},

	setEditor: function(editor){
		// Overrides _Plugin.setEditor().
		if(this.editor === editor) { return; }
		this.editor = editor;
		if(this.blockNodeForEnter == 'BR'){
			// While Moz has a mode tht mostly works, it's still a little different,
			// So, try to just have a common mode and be consistent.  Which means 
			// we need to enable customUndo, if not already enabled.
			this.editor.customUndo = true;
			editor.onLoadDeferred.addCallback(dojo.hitch(this,function(d){
				this.connect(editor.document, "onkeypress", function(e){
					if(e.charOrCode == dojo.keys.ENTER){
						// Just do it manually.  The handleEnterKey has a shift mode that
						// Always acts like <br>, so just use it.
						var ne = dojo.mixin({},e);
						ne.shiftKey = true;
						if(!this.handleEnterKey(ne)){
							dojo.stopEvent(e);
						}
					}
				});
				return d;
			}));
		}else if(this.blockNodeForEnter){
			// add enter key handler
			// FIXME: need to port to the new event code!!
			var h = dojo.hitch(this,this.handleEnterKey);
			editor.addKeyHandler(13, 0, 0, h); //enter
			editor.addKeyHandler(13, 0, 1, h); //shift+enter
			this.connect(this.editor,'onKeyPressed','onKeyPressed');
		}
	},
	onKeyPressed: function(e){
		// summary:
		//		Handler for keypress events.
		// tags:
		//		private
		if(this._checkListLater){
			if(dojo.withGlobal(this.editor.window, 'isCollapsed', dijit)){
				var liparent=dojo.withGlobal(this.editor.window, 'getAncestorElement', dijit._editor.selection, ['LI']);
				if(!liparent){
					// circulate the undo detection code by calling RichText::execCommand directly
					dijit._editor.RichText.prototype.execCommand.call(this.editor, 'formatblock',this.blockNodeForEnter);
					// set the innerHTML of the new block node
					var block = dojo.withGlobal(this.editor.window, 'getAncestorElement', dijit._editor.selection, [this.blockNodeForEnter]);
					if(block){
						block.innerHTML=this.bogusHtmlContent;
						if(dojo.isIE){
							// move to the start by moving backwards one char
							var r = this.editor.document.selection.createRange();
							r.move('character',-1);
							r.select();
						}
					}else{
						console.error('onKeyPressed: Cannot find the new block node'); // FIXME
					}
				}else{
					if(dojo.isMoz){
						if(liparent.parentNode.parentNode.nodeName == 'LI'){
							liparent=liparent.parentNode.parentNode;
						}
					}
					var fc=liparent.firstChild;
					if(fc && fc.nodeType == 1 && (fc.nodeName == 'UL' || fc.nodeName == 'OL')){
						liparent.insertBefore(fc.ownerDocument.createTextNode('\xA0'),fc);
						var newrange = dijit.range.create(this.editor.window);
						newrange.setStart(liparent.firstChild,0);
						var selection = dijit.range.getSelection(this.editor.window, true);
						selection.removeAllRanges();
						selection.addRange(newrange);
					}
				}
			}
			this._checkListLater = false;
		}
		if(this._pressedEnterInBlock){
			// the new created is the original current P, so we have previousSibling below
			if(this._pressedEnterInBlock.previousSibling){
				this.removeTrailingBr(this._pressedEnterInBlock.previousSibling);
			}
			delete this._pressedEnterInBlock;
		}
	},

	// bogusHtmlContent: [private] String
	//		HTML to stick into a new empty block
	bogusHtmlContent: '&nbsp;',

	// blockNodes: [private] Regex
	//		Regex for testing if a given tag is a block level (display:block) tag
	blockNodes: /^(?:P|H1|H2|H3|H4|H5|H6|LI)$/,

	handleEnterKey: function(e){
		// summary:
		//		Handler for enter key events when blockModeForEnter is DIV or P.
		// description:
		//		Manually handle enter key event to make the behavior consistent across
		//		all supported browsers. See class description for details.
		// tags:
		//		private

		var selection, range, newrange, doc=this.editor.document,br,rs,txt;
		if(e.shiftKey){		// shift+enter always generates <br>
			var parent = dojo.withGlobal(this.editor.window, "getParentElement", dijit._editor.selection);
			var header = dijit.range.getAncestor(parent,this.blockNodes);
			if(header){
				if(header.tagName == 'LI'){
					return true; // let browser handle
				}
				selection = dijit.range.getSelection(this.editor.window);
				range = selection.getRangeAt(0);
				if(!range.collapsed){
					range.deleteContents();
					selection = dijit.range.getSelection(this.editor.window);
					range = selection.getRangeAt(0);
				}
				if(dijit.range.atBeginningOfContainer(header, range.startContainer, range.startOffset)){
					br=doc.createElement('br');
					newrange = dijit.range.create(this.editor.window);
					header.insertBefore(br,header.firstChild);
					newrange.setStartBefore(br.nextSibling);
					selection.removeAllRanges();
					selection.addRange(newrange);
				}else if(dijit.range.atEndOfContainer(header, range.startContainer, range.startOffset)){
					newrange = dijit.range.create(this.editor.window);
					br=doc.createElement('br');
					header.appendChild(br);
					header.appendChild(doc.createTextNode('\xA0'));
					newrange.setStart(header.lastChild,0);
					selection.removeAllRanges();
					selection.addRange(newrange);
				}else{
					rs = range.startContainer;
					if(rs && rs.nodeType == 3){
						// Text node, we have to split it.
						txt = rs.nodeValue;
						dojo.withGlobal(this.editor.window, function(){
							var startNode = doc.createTextNode(txt.substring(0, range.startOffset));
							var endNode = doc.createTextNode(txt.substring(range.startOffset));
							var brNode = doc.createElement("br");
							if(endNode.nodeValue == "" && dojo.isWebKit){
								endNode = doc.createTextNode('\xA0')
							}
							dojo.place(startNode, rs, "after");
							dojo.place(brNode, startNode, "after");
							dojo.place(endNode, brNode, "after");
							dojo.destroy(rs);
							newrange = dijit.range.create(dojo.gobal);
							newrange.setStart(endNode,0);
							selection.removeAllRanges();
							selection.addRange(newrange);
						});
						return false;
					}
					return true; // let browser handle
				}
			}else{
				selection = dijit.range.getSelection(this.editor.window);
				if(selection.rangeCount){
					range = selection.getRangeAt(0);
					if(range && range.startContainer){
						if(!range.collapsed){
							range.deleteContents();
							selection = dijit.range.getSelection(this.editor.window);
							range = selection.getRangeAt(0);
						}
						rs = range.startContainer;
						if(rs && rs.nodeType == 3){
							// Text node, we have to split it.
							txt = rs.nodeValue;
							dojo.withGlobal(this.editor.window, function(){
								var startNode = doc.createTextNode(txt.substring(0, range.startOffset));
								var endNode = doc.createTextNode(txt.substring(range.startOffset));
								var brNode = doc.createElement("br");
								if(endNode.nodeValue == "" && dojo.isWebKit){
									endNode = doc.createTextNode('\xA0')
								}
								dojo.place(startNode, rs, "after");
								dojo.place(brNode, startNode, "after");
								dojo.place(endNode, brNode, "after");
								dojo.destroy(rs);
								newrange = dijit.range.create(dojo.gobal);
								newrange.setStart(endNode,0);
								selection.removeAllRanges();
								selection.addRange(newrange);
							});
						}else{
							dijit._editor.RichText.prototype.execCommand.call(this.editor, 'inserthtml', '<br>');
						}
					}
				}else{
					// don't change this: do not call this.execCommand, as that may have other logic in subclass
					dijit._editor.RichText.prototype.execCommand.call(this.editor, 'inserthtml', '<br>');
				}
			}
			return false;
		}
		var _letBrowserHandle = true;

		// first remove selection
		selection = dijit.range.getSelection(this.editor.window);
		range = selection.getRangeAt(0);
		if(!range.collapsed){
			range.deleteContents();
			selection = dijit.range.getSelection(this.editor.window);
			range = selection.getRangeAt(0);
		}

		var block = dijit.range.getBlockAncestor(range.endContainer, null, this.editor.editNode);
		var blockNode = block.blockNode;

		// if this is under a LI or the parent of the blockNode is LI, just let browser to handle it
		if((this._checkListLater = (blockNode && (blockNode.nodeName == 'LI' || blockNode.parentNode.nodeName == 'LI')))){
			if(dojo.isMoz){
				// press enter in middle of P may leave a trailing <br/>, let's remove it later
				this._pressedEnterInBlock = blockNode;
			}
			// if this li only contains spaces, set the content to empty so the browser will outdent this item
			if(/^(\s|&nbsp;|\xA0|<span\b[^>]*\bclass=['"]Apple-style-span['"][^>]*>(\s|&nbsp;|\xA0)<\/span>)?(<br>)?$/.test(blockNode.innerHTML)){
				// empty LI node
				blockNode.innerHTML = '';
				if(dojo.isWebKit){ // WebKit tosses the range when innerHTML is reset
					newrange = dijit.range.create(this.editor.window);
					newrange.setStart(blockNode, 0);
					selection.removeAllRanges();
					selection.addRange(newrange);
				}
				this._checkListLater = false; // nothing to check since the browser handles outdent
			}
			return true;
		}

		// text node directly under body, let's wrap them in a node
		if(!block.blockNode || block.blockNode===this.editor.editNode){
			try{
				dijit._editor.RichText.prototype.execCommand.call(this.editor, 'formatblock',this.blockNodeForEnter);
			}catch(e2){ /*squelch FF3 exception bug when editor content is a single BR*/ }
			// get the newly created block node
			// FIXME
			block = {blockNode:dojo.withGlobal(this.editor.window, "getAncestorElement", dijit._editor.selection, [this.blockNodeForEnter]),
					blockContainer: this.editor.editNode};
			if(block.blockNode){
				if(block.blockNode != this.editor.editNode &&
					(!(block.blockNode.textContent || block.blockNode.innerHTML).replace(/^\s+|\s+$/g, "").length)){
					this.removeTrailingBr(block.blockNode);
					return false;
				}
			}else{	// we shouldn't be here if formatblock worked
				block.blockNode = this.editor.editNode;
			}
			selection = dijit.range.getSelection(this.editor.window);
			range = selection.getRangeAt(0);
		}

		var newblock = doc.createElement(this.blockNodeForEnter);
		newblock.innerHTML=this.bogusHtmlContent;
		this.removeTrailingBr(block.blockNode);
		if(dijit.range.atEndOfContainer(block.blockNode, range.endContainer, range.endOffset)){
			if(block.blockNode === block.blockContainer){
				block.blockNode.appendChild(newblock);
			}else{
				dojo.place(newblock, block.blockNode, "after");
			}
			_letBrowserHandle = false;
			// lets move caret to the newly created block
			newrange = dijit.range.create(this.editor.window);
			newrange.setStart(newblock, 0);
			selection.removeAllRanges();
			selection.addRange(newrange);
			if(this.editor.height){
				dojo.window.scrollIntoView(newblock);
			}
		}else if(dijit.range.atBeginningOfContainer(block.blockNode,
				range.startContainer, range.startOffset)){
			dojo.place(newblock, block.blockNode, block.blockNode === block.blockContainer ? "first" : "before");
			if(newblock.nextSibling && this.editor.height){
				// position input caret - mostly WebKit needs this
				newrange = dijit.range.create(this.editor.window);
				newrange.setStart(newblock.nextSibling, 0);
				selection.removeAllRanges();
				selection.addRange(newrange);
				// browser does not scroll the caret position into view, do it manually
				dojo.window.scrollIntoView(newblock.nextSibling);
			}
			_letBrowserHandle = false;
		}else{ //press enter in the middle of P/DIV/Whatever/
			if(block.blockNode === block.blockContainer){
				block.blockNode.appendChild(newblock);
			}else{
				dojo.place(newblock, block.blockNode, "after");
			}
			_letBrowserHandle = false;

			// Clone any block level styles.
			if(block.blockNode.style){
				if(newblock.style){
					if(block.blockNode.style.cssText){
						newblock.style.cssText = block.blockNode.style.cssText;
					}
				}
			}
			
			// Okay, we probably have to split.
			rs = range.startContainer;
			if(rs && rs.nodeType == 3){
				// Text node, we have to split it.
				var nodeToMove, tNode;
				txt = rs.nodeValue;
				var startNode = doc.createTextNode(txt.substring(0, range.startOffset));
				var endNode = doc.createTextNode(txt.substring(range.startOffset, txt.length));

				// Place the split, then remove original nodes.
				dojo.place(startNode, rs, "before");
				dojo.place(endNode, rs, "after");
				dojo.destroy(rs);

				// Okay, we split the text.  Now we need to see if we're
				// parented to the block element we're splitting and if
				// not, we have to split all the way up.  Ugh.
				var parentC = startNode.parentNode;
				while(parentC !== block.blockNode){
					var tg = parentC.tagName;
					var newTg = doc.createElement(tg);
					// Clone over any 'style' data. 
					if(parentC.style){
						if(newTg.style){
							if(parentC.style.cssText){
								newTg.style.cssText = parentC.style.cssText;
							}
						}
					}

					nodeToMove = endNode;
					while(nodeToMove){
						tNode = nodeToMove.nextSibling;
						newTg.appendChild(nodeToMove);
						nodeToMove = tNode;
					}
					dojo.place(newTg, parentC, "after");
					startNode = parentC;
					endNode = newTg;
					parentC = parentC.parentNode;
				}

				// Lastly, move the split out tags to the new block.
				// as they should now be split properly.
				nodeToMove = endNode;
				if(nodeToMove.nodeType == 1 || (nodeToMove.nodeType == 3 && nodeToMove.nodeValue)){
					// Non-blank text and non-text nodes need to clear out that blank space
					// before moving the contents.
					newblock.innerHTML = "";
				}
				while(nodeToMove){
					tNode = nodeToMove.nextSibling;
					newblock.appendChild(nodeToMove);
					nodeToMove = tNode;
				}
			}
			
			//lets move caret to the newly created block
			newrange = dijit.range.create(this.editor.window);
			newrange.setStart(newblock, 0);
			selection.removeAllRanges();
			selection.addRange(newrange);
			if(this.editor.height){
				dijit.scrollIntoView(newblock);
			}
			if(dojo.isMoz){
				// press enter in middle of P may leave a trailing <br/>, let's remove it later
				this._pressedEnterInBlock = block.blockNode;
			}
		}
		return _letBrowserHandle;
	},

	removeTrailingBr: function(container){
		// summary:
		//		If last child of container is a <br>, then remove it.
		// tags:
		//		private
		var para = /P|DIV|LI/i.test(container.tagName) ?
			container : dijit._editor.selection.getParentOfType(container,['P','DIV','LI']);

		if(!para){ return; }
		if(para.lastChild){
			if((para.childNodes.length > 1 && para.lastChild.nodeType == 3 && /^[\s\xAD]*$/.test(para.lastChild.nodeValue)) ||
				para.lastChild.tagName=='BR'){

				dojo.destroy(para.lastChild);
			}
		}
		if(!para.childNodes.length){
			para.innerHTML=this.bogusHtmlContent;
		}
	}
});
