dojo.provide("dijit.tests.general-module");

try{
	var userArgs = window.location.search.replace(/[\?&](dojoUrl|testUrl|testModule)=[^&]*/g,"").replace(/^&/,"?");

	// top level widget tests
	doh.registerUrl("dijit.tests.robot.Menu_mouse", dojo.moduleUrl("dijit","tests/robot/Menu_mouse.html"+userArgs), 99999999);
	doh.registerUrl("dijit.tests.robot.Menu_a11y", dojo.moduleUrl("dijit","tests/robot/Menu_a11y.html"+userArgs), 99999999);

	doh.registerUrl("dijit.tests.robot.Dialog_mouse", dojo.moduleUrl("dijit","tests/robot/Dialog_mouse.html"+userArgs), 99999999);
	doh.registerUrl("dijit.tests.robot.Dialog_a11y", dojo.moduleUrl("dijit","tests/robot/Dialog_a11y.html"+userArgs), 99999999);

	doh.registerUrl("dijit.tests.robot.Tooltip_mouse", dojo.moduleUrl("dijit","tests/robot/Tooltip_mouse.html"+userArgs), 99999999);
	doh.registerUrl("dijit.tests.robot.Tooltip_a11y", dojo.moduleUrl("dijit","tests/robot/Tooltip_a11y.html"+userArgs), 99999999);

	doh.registerUrl("dijit.tests.robot.TooltipDialog_a11y", dojo.moduleUrl("dijit","tests/robot/TooltipDialog_a11y.html"+userArgs), 99999999);

	doh.registerUrl("dijit.tests.robot.InlineEditBox", dojo.moduleUrl("dijit","tests/robot/InlineEditBox.html"+userArgs), 99999999);

}catch(e){
	doh.debug(e);
}