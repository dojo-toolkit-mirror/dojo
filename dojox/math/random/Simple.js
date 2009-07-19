dojo.provide("dojox.math.random.Simple");

dojo.declare("dojox.math.random.Simple", null, {
	// summary:
	//	Super simple implementation of a random number generator,
	//	which relies on Math.random().
	nextBytes: function(/* Array */ byteArray){
		// summary:
		//	Fills in an array of bytes with random numbers
		// byteArray: Array:
		//	array to be filled in with random numbers, only existing
		//	elements will be filled.
		for(var i = 0, l = byteArray.length; i < l; ++i){
			byteArray[i] = Math.floor(256 * Math.random());
		}
	}
});
