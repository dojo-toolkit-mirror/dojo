define([], function() {
	var readFileSync= function(filename, encoding) {
		if (encoding=="utf8") {
			// convert node.js idiom to rhino idiom
			encoding= "utf-8";
		}
		return readFile(filename, encoding || "utf-8");
	};

	return {
		statSync: function(filename) {
			return new java.io.File(filename);
		},

		mkdirSync: function(filename) {
			var dir= new java.io.File(filename);
			if (!dir.exists()) {
				dir.mkdirs();
			}
		},

		readFileSync: readFileSync,

		readdirSync: function(path) {
			// java returns the complete path with each filename in listFiles; node returns just the filename
			// the item+"" is necessary because item is a java object that doesn't have the substring method
			var l= path.length + 1;
			return (new java.io.File(path)).listFiles().map(function(item){ return (item+"").substring(l); });
		},

		readFile: function(filename, encoding, cb) {
			var result= readFileSync(filename, encoding);
			if (cb) {
				cb(0, result);
			}
		},

		writeFile: function(filename, contents, encoding, cb) {
			if (arguments.length==3 && typeof encoding!="string") {
				cb= encoding;
				encoding= 0;
			}
			var
				outFile = new java.io.File(filename),
				outWriter;
			if(encoding){
				outWriter = new java.io.OutputStreamWriter(new java.io.FileOutputStream(outFile), encoding);
			}else{
				outWriter = new java.io.OutputStreamWriter(new java.io.FileOutputStream(outFile));
			}

			var os = new java.io.BufferedWriter(outWriter);
			try{
				os.write(contents);
			}finally{
				os.close();
			}
			if (cb) {
				cb(0);
			};
		}

	};
});
