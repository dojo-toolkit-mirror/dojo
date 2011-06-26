dojo.provide("dijit.form.Textarea");

dojo.require("dijit.form.SimpleTextarea");

dojo.declare(
	"dijit.form.Textarea",
	dijit.form.SimpleTextarea,
	{
	// summary:
	//		A textarea widget that adjusts it's height according to the amount of data.
	//
	// description:
	//		A textarea that dynamically expands/contracts (changing it's height) as
	//		the user types, to display all the text without requiring a scroll bar.
	//
	//		Takes nearly all the parameters (name, value, etc.) that a vanilla textarea takes.
	//		Rows is not supported since this widget adjusts the height.
	//
	// example:
	// |	<textarea dojoType="dijit.form.TextArea">...</textarea>


	// Override SimpleTextArea.cols to default to width:100%, for backward compatibility
	cols: "",

	_previousNewlines: 0,
	_strictMode: (dojo.doc.compatMode != 'BackCompat'), // not the same as !dojo.isQuirks

	_getHeight: function(textarea){
		var newH = textarea.scrollHeight;
		if(dojo.isIE){
			newH += textarea.offsetHeight - textarea.clientHeight - ((dojo.isIE < 8 && this._strictMode)? dojo._getPadBorderExtents(textarea).h : 0);
		}else if(dojo.isMoz){
			newH += textarea.offsetHeight - textarea.clientHeight; // creates room for horizontal scrollbar
		}else if(dojo.isSafari/*NOT isWebKit*/ >= 4){
			newH += dojo._getBorderExtents(textarea).h;
		}else{
			newH += dojo._getPadBorderExtents(textarea).h;
		}
		return newH;
	},

	_estimateHeight: function(textarea){
		// summary:
		// 		Approximate the height when the textarea is invisible with the number of lines in the text.
		// 		Fails when someone calls setValue with a long wrapping line, but the layout fixes itself when the user clicks inside so . . .
		// 		In IE, the resize event is supposed to fire when the textarea becomes visible again and that will correct the size automatically.
		//
		textarea.style.maxHeight = "";
		textarea.style.height = "auto";
		// #rows = #newlines+1
		// Note: on Moz, the following #rows appears to be 1 too many.
		// Actually, Moz is reserving room for the scrollbar.
		// If you increase the font size, this behavior becomes readily apparent as the last line gets cut off without the +1.
		textarea.rows = (textarea.value.match(/\n/g) || []).length + 1;
	},

	_onInput: function(){
		// Override SimpleTextArea._onInput() to deal with height adjustment
		this.inherited(arguments);
		if(this._busyResizing){ return; }
		this._busyResizing = true;
		var textarea = this.textbox;
		var newH = this._getHeight(textarea);
		if(newH > 0){
			newH = newH + "px";
			if(textarea.style.height != newH){
				textarea.style.maxHeight = textarea.style.height = newH;
			}
		}else if(dojo.isIE){ 
			// hidden content of unknown size
			// no call to _shrink so estimate the height here
			this._estimateHeight(textarea);
		}
		if((dojo.isMoz || dojo.isSafari/*NOT isWebKit*/)){
			if(this._setTimeoutHandle){
				clearTimeout(this._setTimeoutHandle);
			}
			this._setTimeoutHandle = setTimeout(dojo.hitch(this, "_shrink"), 0); // try to collapse multiple shrinks into 1
		}
		this._busyResizing = false;
	},

	_busyResizing: false,
	_shrink: function(){
		// grow paddingBottom to see if scrollHeight shrinks (when it is unneccesarily big)
		this._setTimeoutHandle = null;
		if((dojo.isMoz || dojo.isSafari/*NOT isWebKit*/) && !this._busyResizing){
			this._busyResizing = true;
			var textarea = this.textbox;
			var empty = false;
			if(textarea.value == ''){
				textarea.value = ' '; // prevent collapse all the way back to 0
				empty = true;
			}
			var scrollHeight = textarea.scrollHeight;
			var oldPadding = textarea.style.paddingBottom;
			var padding = dojo._getPadExtents(textarea);
			textarea.style.paddingBottom = padding.h - padding.t + scrollHeight + "px";
			textarea.scrollTop = 0;
			var newH = this._getHeight(textarea) - scrollHeight + "px"; // scrollHeight is the added padding
			if(!scrollHeight){
				this._estimateHeight(textarea);
			}
			else if(textarea.style.maxHeight != newH){
				textarea.style.maxHeight = newH;
			}
			textarea.style.paddingBottom = oldPadding;
			if(empty){
				textarea.value = '';
			}
			this._busyResizing = false;
		}
	},

	resize: function(){
		// summary:
		//		Resizes the textarea vertically (should be called after a style/value change)
		this._onInput();
		this._shrink();
	},

	_setValueAttr: function(){
		this.inherited(arguments);
		this.resize();
	},

	postCreate: function(){
		this.inherited(arguments);
		// tweak textarea style to reduce browser differences
		dojo.style(this.textbox, { overflowY: 'hidden', overflowX: 'auto', boxSizing: 'border-box', MsBoxSizing: 'border-box', WebkitBoxSizing: 'border-box', MozBoxSizing: 'border-box' });
		this.connect(this.textbox, "onscroll", this._onInput);
		this.connect(this.textbox, "onresize", this._onInput);
		this.connect(this.textbox, "onfocus", this.resize); // useful when a previous estimate was off a bit
		setTimeout(dojo.hitch(this, "resize"), 0);
	}
});
