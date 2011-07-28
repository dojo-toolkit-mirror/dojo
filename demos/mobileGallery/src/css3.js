define(["dojo/_base/kernel",
        "dojo/_base/declare",
        "dojo/_base/html",
        "dojo/_base/connect",
        "dojo/fx",
        "dojox/css3/fx"], function(dojo, declare, html, connect, fx, css3fx) {

demos.mobileGallery.src.css3 = function() {
 
 declare("CSS3Demo", null, {
        menuNode: null,
        increment: 360,
        angle: 0,
        constructor: function(){
        	html.style("css3ribbon", {
        		transform: "rotate(-45deg)"
        	});

            var effects = ["flip", "bounce", "shrink", "expand", "rotate", "puff"];
            this.increment = 360 / effects.length;
            var css3Body = html.byId('css3Boxes');
            for(var i = 0, l = effects.length; i < l; i++){
                var boxwrapper = html.create("div", {className: 'css3Boxwrapper'});
                var box = html.create("div", {
                    innerHTML: "<span>" + effects[i] + "</span>",
                    className : 'css3Box'
                }, boxwrapper);
                html.place(boxwrapper, css3Body, 'last');
                connect.connect(box, "onclick", (function(b, x){
                    return function(){
                        var anim = fx.chain([ css3fx[effects[x]]({ node: b }) ]);
                        connect.connect(anim, "onEnd", function(){
                            html.style(b, {
                                transform: "scale(1)",
                                opacity: "1"
                            });
                        });
                        anim.play();
                    };
                })(box, i));
            }
        }
    });
}();

	return {
		init: function(){
			new CSS3Demo();
		}
	};
});