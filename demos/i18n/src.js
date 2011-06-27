dojo.provide("demos.i18n.src");

// For accessing Geonames service
dojo.require("dojo.io.script");
dojo.require("dojox.rpc.Service");

dojo.require("dijit.Tree");
dojo.require("dijit.Calendar");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.form.DateTextBox");
dojo.require("dijit.form.CurrencyTextBox");
dojo.require("dijit.form.NumberSpinner");
dojo.require("dijit.form.ComboBox");
dojo.require("dijit.ColorPalette");
dojo.require("dijit.Menu");
dojo.require("dojo.parser");

dojo.require("demos.i18n.model");

dojo.require("dojox.analytics.Urchin");
dojo.addOnLoad(function(){
	new dojox.analytics.Urchin({ 
		acct: "UA-3572741-1", 
		GAonLoad: function(){
			this.trackPageView("/demos/i18n");
		}
	});	
});