dojo.provide("dijit.form.SimpleTextarea");

dojo.require("dijit.form.TextBox");

dojo.declare("dijit.form.SimpleTextarea",
	dijit.form.TextBox,
	{
	// summary:
	//		A simple textarea that degrades, and responds to
	// 		minimal LayoutContainer usage, and works with dijit.form.Form.
	//		Doesn't automatically size according to input, like Textarea.
	//
	// example:
	//	|	<textarea dojoType="dijit.form.SimpleTextarea" name="foo" value="bar" rows=30 cols=40></textarea>
	//
	// example:
	//	|	new dijit.form.SimpleTextarea({ rows:20, cols:30 }, "foo");

	baseClass: "dijitTextArea",

	attributeMap: dojo.delegate(dijit.form._FormValueWidget.prototype.attributeMap, {
		rows:"textbox", cols: "textbox"
	}),

	// rows: Number
	//		The number of rows of text.
	rows: "3",

	// rows: Number
	//		The number of characters per line.
	cols: "20",

	templatePath: null,
	templateString: "<textarea name='${name}' dojoAttachPoint='focusNode,containerNode,textbox' autocomplete='off'></textarea>",

	postMixInProperties: function(){
		if(this.srcNodeRef){
			this.value = this.srcNodeRef.value;
		}
	},

	filter: function(/*String*/ value){
		if(value){
			value = value.replace(/\r/g,"");
		}
		return this.inherited(arguments);
	},

	postCreate: function(){
		this.inherited(arguments);
		if(dojo.isIE && this.cols){ // attribute selectors is not supported in IE6
			dojo.addClass(this.domNode, "dijitTextAreaCols");
		}
	},

	_previousValue: "",
	_onInput: function(e){
		if(this.maxLength){
			var maxLength = parseInt(this.maxLength);
			var value = this.textbox.value.replace(/\r/g,'');
			var overflow = value.length - maxLength;
			if(overflow > 0){
				dojo.stopEvent(e);
				var textarea = this.textbox;
				if(textarea.selectionStart){
					var pos = textarea.selectionStart;
					var cr = 0;
					if(dojo.isOpera){
						cr = (this.textbox.value.substring(0,pos).match(/\r/g)||[]).length;
					}
					this.textbox.value = value.substring(0,pos-overflow-cr)+value.substring(pos-cr);
					textarea.setSelectionRange(pos-overflow, pos-overflow);
				}else if(dojo.doc.selection){ //IE
					textarea.focus();
					var range = dojo.doc.selection.createRange();
					// delete overflow characters
					range.moveStart("character", -overflow);
					range.text = '';
					// show cursor
					range.select();
				}
			}
			this._previousValue = this.textbox.value;
		}
		this.inherited(arguments);
	}
});
