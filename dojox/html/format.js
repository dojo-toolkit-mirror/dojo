dojo.provide("dojox.html.format");

dojo.require("dojox.html.entities");

(function(){
	dojox.html.format.prettyPrint = function(html/*String*/, indentBy /*Integer?*/, maxLineLength /*Integer?*/, map/*Array?*/){
		// summary:
		//		Function for providing a 'pretty print' version of HTML content from
		//		the provided string.  It's nor perfect by any means, but it does
		//		a 'reasonable job'.
		// html: String
		//		The string of HTML to try and generate a 'pretty' formatting.
		// indentBy:  Integer
		//		Optional input for the number of spaces to use when indenting.  
		//		If not defined, zero, negative, or greater than 10, will just use tab 
		//		as the indent.
		// maxLineLength: Integer
		//		Optional input for the number of characters a text line should use in 
		//		the document, not including the indent.
		// map:	Array
		//		Optional array of entity mapping characters to use when processing the 
		//		HTML Text content.  By default it uses the default set used by the 
		//		dojox.html.entities.encode function.
		var content = [];
		var indentDepth = 0;
		var closeTags = [];
		var iTxt = "\t";
		var textContent = "";
		var inlineStyle = [];

		// Check to see if we want to use spaces for indent instead
		// of tab.
		if(indentBy && indentBy > 0 && indentBy < 10){
			var i;
			iTxt = "";
			for(i = 0; i < indentBy; i++){
				iTxt += " ";
			}
		}

		//Build the content outside of the editor so we can walk 
		//via DOM and build a 'pretty' output.
		var contentDiv = dojo.doc.createElement("div");
		contentDiv.innerHTML = html;

		//Local alias to our entity encoder.
		var encode = dojox.html.entities.encode;
		var decode = dojox.html.entities.decode;

		/** Define a bunch of formatters to format the output. **/

		var isInlineFormat = function(tag){
			// summary:
			//		Function to determine if the current tag is an inline
			//		element that does formatting, as we don't want to 
			//		break/indent around it, as it can screw up text.
			// tag:
			//		The tag to examine
			switch(tag){
				case "a":
				case "b":
				case "strong":
				case "s":
				case "strike":
				case "i":
				case "u":
				case "em":
				case "sup":
				case "sub":
				case "span":
				case "font":
				case "big":
				case "cite":
				case "q":
				case "small":
					return true;
				default:
					return false;
			}
		};

		var outerHTML =  function(node){
			// summary:
			//		Function to return the outer HTML of a node.
			//		Yes, IE has a function like this, but using cloneNode
			//		allows avoiding looking at any child nodes, because in this
			//		case, we don't want them.
			var clone = node.cloneNode(false);
			var div = dojo.doc.createElement("div");
			div.appendChild(clone);
			return div.innerHTML;
		};

		var indent = function(){
			// summary:
			//		Function to handle indent depth.
			var i;
			for(i = 0; i < indentDepth; i++){
				content.push(iTxt);
			}
		};
		var newline = function(){
			// summary:
			//		Function to handle newlining.
			content.push("\n");
		};

		var processTextNode = function(n){
			// summary:
			//		Function to process the text content for doc
			//		insertion
			// n:
			//		The text node to process.
			textContent += encode(n.nodeValue, map);
		};

		var formatText = function(txt){
			// summary:
			//		Function for processing the text content encountered up to a
			//		point and inserting it into the formatted document output.
			// txt:
			//		The text to format.
			var i;
			var _iTxt;

			// Clean up any indention organization since we're going to rework it
			// anyway.
			var _lines = txt.split("\n");
			for(i = 0; i < _lines.length; i++){
				_lines[i] = dojo.trim(_lines[i]);
			}
			txt = _lines.join(" ");
			txt = dojo.trim(txt);
			if(txt !== ""){
				var lines = [];
				if(maxLineLength && maxLineLength > 0){
					while(txt){
						if(txt.length > maxLineLength){
							for(i = maxLineLength; (i < txt.length && txt.charAt(i) !== " "); i++){
								// Do nothing, we're just looking for a space to split at.
							}
							var line = txt.substring(0, i);
							line = dojo.trim(line);
							// Shift up the text string to the next chunk.
							txt = dojo.trim(txt.substring((i == txt.length)?txt.length:i + 1, txt.length));
							if(line){
								_iTxt = "";
								for(i = 0; i < indentDepth; i++){
									_iTxt += iTxt;
								}
								line = _iTxt + line + "\n";
							}
							lines.push(line);
						}else{
							// Line is shorter than out desired length, so use it.
							// as/is
							_iTxt = "";
							for(i = 0; i < indentDepth; i++){
								_iTxt += iTxt;
							}
							txt = _iTxt + txt + "\n";
							lines.push(txt);
							txt = null;
						}
					}
					return lines.join("");
				}else{
					_iTxt = "";
					for(i = 0; i < indentDepth; i++){
						_iTxt += iTxt;
					}
					txt = _iTxt + txt + "\n";
					return txt;
				}
			}else{
				return "";
			}
		};

		var processScriptText = function(txt){
			// summary:
			//		Function to clean up potential escapes in the script code.
			if(txt){
				txt = txt.replace(/&quot;/gi, "\"");
				txt = txt.replace(/&gt;/gi, ">");
				txt = txt.replace(/&lt;/gi, "<");
				txt = txt.replace(/&amp;/gi, "&");
			}
			return txt;
		};

		var formatScript = function(txt){
			// summary:
			//		Function to rudimentary formatting of script text.
			//		Not perfect, but it helps get some level of organization 
			//		in there.
			// txt:
			//		The script text to try to format a bit.
			if(txt){
				txt = processScriptText(txt);
				var i, t, c, _iTxt;
				var indent = 0;
				var scriptLines = txt.split("\n");
				var newLines = [];
				for (i = 0; i < scriptLines.length; i++){
					var line = scriptLines[i];
					var hasNewlines = (line.indexOf("\n") > -1);
					line = dojo.trim(line);
					if(line){
						var iLevel = indent;
						// Not all blank, so we need to process.
						for(c = 0; c < line.length; c++){
							var ch = line.charAt(c);
							if(ch === "{"){
								indent++;
							}else if(ch === "}"){
								indent--;
								// We want to back up a bit before the 
								// line is written.
								iLevel = indent;
							}
						}
						_iTxt = "";
						for(t = 0; t < indentDepth + iLevel; t++){
							_iTxt += iTxt;
						}
						newLines.push(_iTxt + line + "\n");
					}else if(hasNewlines && i === 0){
						// Just insert a newline for blank lines as 
						// long as it's not the first newline (we 
						// already inserted that in the openTag handler)
						newLines.push("\n");
					}

				}
				// Okay, create the script text, hopefully reasonably 
				// formatted.
				txt = newLines.join("");
			}
			return txt;
		};

		var openTag = function(node){
			// summary:
			//		Function to open a new tag for writing content.

			var name = node.nodeName.toLowerCase();
			// Generate the outer node content (tag with attrs)
			var nText = dojo.trim(outerHTML(node));
			var tag = nText.substring(0, nText.indexOf(">") + 1);
			
			// Okay, there's a chance the casing will be off (thanks, IE!)
			// so we need to 'fix' it.
			tag = tag.replace(new RegExp("<" + name, "i"), "<" + name);

			// Also thanks to IE, we need to check for quotes around 
			// attributes and insert if missing.
			tag = tag.replace(new RegExp("=[^\"']\\S+(\\s|>)", "g"), function(match){
				var endChar = match.length - 1;
				match = "=\"" + match.substring(1, endChar) + 
					"\"" + match.charAt(endChar);
				return match;
			});

			// And lastly, thanks IE for changing style casing and end
			// semi-colon.
			tag = tag.replace(/style=("|').+\1/gi, function(match){
				match = match.substring(0,7) + 
					match.substring(7, match.length).toLowerCase();
				if(match.charAt(match.length - 2) !== ";"){
					match = match.substring(0,match.length - 1) + 
						";" + match.charAt(match.length - 1);
				}
				return match;
			});

			var inline = isInlineFormat(name);
			inlineStyle.push(inline); 
			if(textContent && !inline){
				// Process any text content we have that occurred 
				// before the open tag of a non-inline.
				content.push(formatText(textContent));
				textContent = "";
			}
			
			// Determine if this has a closing tag or not!
			if(nText.indexOf("</") != -1){
				closeTags.push(name);
			}else{
				closeTags.push(false);
			}

			if(!inline){
				indent();
				content.push(tag);
				newline();
				indentDepth++;
			}else{
				textContent += tag;
			}
			
		};
		
		var closeTag = function(){
			// summary:
			//		Function to close out a tag if necessary.
			var inline = inlineStyle.pop();
			if(textContent && !inline){
				// Process any text content we have that occurred 
				// before the close tag.
				content.push(formatText(textContent));
				textContent = "";
			}
			var ct = closeTags.pop();
			if(ct){
				ct = "</" + ct + ">";
				if(!inline){
					indentDepth--;
					indent();
					content.push(ct);
					newline();
				}else{
					textContent += ct;
				}
			}else{
				indentDepth--;	
			}
		};

		var processCommentNode = function(n){
			// summary:
			//		Function to handle processing a comment node.
			// n:
			//		The comment node to process.

			//Make sure contents aren't double-encoded.
			var commentText = decode(n.nodeValue, map);
			indent();
			content.push("<!--");
			newline();
			indentDepth++;
			content.push(formatText(commentText));
			indentDepth--;
			indent();
			content.push("-->");
			newline();
		};

		var processNode = function(node) {
			// summary:
			//		Entrypoint for processing all the text!
			var children = node.childNodes;
			if(children){
				var i;
				for(i = 0; i < children.length; i++){
					var n = children[i];
					if(n.nodeType === 1){
						if(dojo.isIE && n.parentNode != node){
							// IE is broken.  DOMs are supposed to be a tree.  
							// But in the case of malformed HTML, IE generates a graph
							// meaning one node ends up with multiple references 
							// (multiple parents).  This is totally wrong and invalid, but
							// such is what it is.  We have to keep track and check for 
							// this because otherwise the source output HTML will have dups.
							continue;
						}

						
						//Process non-dup elements!
						openTag(n);
						if(n.tagName.toLowerCase() === "script"){
							content.push(formatScript(n.innerHTML));
						}else if(n.tagName.toLowerCase() === "pre"){
							var preTxt = n.innerHTML;
							if(dojo.isMoz){
								//Mozilla screws this up, so fix it up.
								preTxt = preTxt.replace("<br>", "\n");
								preTxt = preTxt.replace("<pre>", "");
								preTxt = preTxt.replace("</pre>", "");
							}
							// Add ending newline, if needed.
							if(preTxt.charAt(preTxt.length - 1) !== "\n"){
								preTxt += "\n";
							}
							content.push(preTxt);
						}else{
							processNode(n);
						}
						closeTag();
					}else if(n.nodeType === 3 || n.nodeType === 4){
						processTextNode(n);
					}else if(n.nodeType === 8){
						processCommentNode(n);
					}
				}
			}
		};

		//Okay, finally process the input string.
		processNode(contentDiv);
		return content.join(""); //String
	};
})();

