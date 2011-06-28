define([
	"dojo/_base/kernel",
	"../../core/_Module",
	"../../core/model/Mapper",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang"
], function(dojo, _Module, Mapper){

	var module = _Module.registerModule(
	dojo.declare('demos.gridx.src.modules.filter.Filter', _Module, {
		// summary
		//		Filter Expression:
		//		A filter expression is just a function returning TRUE/FALSE.
		//		Here provides a set of useful expression tools to help construct complicated filter expressions for grid.
		//		These expressions are not bound to any specific grid instance, so they can be directly reused for many grids.
		//
		//		For example: 
		//			var expr = and(
		//					and(
		//						startWith(column('colA', 'string'), value('123abc', 'string')),
		//						greater(column('colB', 'number'), value(456, 'number'))
		//					),
		//					or(
		//						lessEqual(column('colC', 'number'), value(89, 'number')),
		//						not(
		//							endWith(column('colD', 'string'), value('xyz', 'string'))
		//						)
		//					)
		//				);
		name: 'filter',
		
		modelExtensions: [Mapper],
	
		getAPIPath: function(){
			return {
				filter: this
			};
		},
	
		load: function(args){
			this.setFilter(args.preFilter || this.grid.preFilter, true);
			this.loaded.callback();
		},
		
		//Public---------------------------------------------------------
		setFilter: function(/* Function|null */checker, /* Boolean? */skipUpdateBody){
			// summary:
			//		Apply function *checker* as the filter condition to filter every row.
			// checker: Function|null|undefined (or anything that is invalid)
			//		A function only returning TRUE or FALSE. It is used to decide whether a row should survive.
			//		If it is null (or anything invalid here), then clear the current filter.
			// skipUpdateBody: Boolean
			//		Whether to immediately update grid UI after filtering.
			// return:
			//		undefined
			// throw:
			//		If *skipUpdateBody* is not TRUE, then must not throw, else, only allowed to throw the exceptions
			//		that are generated from the *checker* function.
			//		If *checker* is not a function, or null, should not throw.
			if(checker != this._checker){
				this._checker = checker;
				this.model.filter(checker);
				if(!skipUpdateBody && this.grid.body){
					this.grid.body.refresh();
				}
			}
		},
	
		getFilter: function(){
			// summary:
			//		Return the current checker function.
			// return: Function|null|undefined (or anything that is invalid)
			//		The current checker function
			return this._checker;
		},
		
		clearFilter: function(){
			// summary:
			//	Clear the filter.
			//TODO:
			this.setFilter(function(){return true;});
			
		}
	}));
	
	var valueConvert = function(d, type, converter){
		if(dojo.isFunction(converter)){
			d = converter(d);
		}
		switch(type){
			case 'number':
				return parseFloat(d, 10);
			case 'boolean':
				return !!d;
			case 'date':
				d = new Date(d);
				d.setHours(0);
				d.setMinutes(0);
				d.setSeconds(0);
				d.setMilliseconds(0);
				return d.getTime();
			case 'time':
				d = new Date(d);
				d.setDate(1);
				d.setMonth(0);
				d.setFullYear(2000);
				return d.getTime();
			default: //string
				return String(d);
		}
	};
	
	var wrap = function(checker, op, operands, options){
		if(dojo.isArray(operands)){
			operands = dojo.map(operands, function(operand){
				return operand.expr;
			});
		}
		return dojo.mixin(checker, {
			expr: dojo.mixin({
				op: op,
				data: operands
			}, options || {})
		});
	};
	
	/*
	
	*/
	
	
	//Data
	module.column = function(/* String|Number */colId, /* String? */type, /* Function? */converter, /* Boolean? */useRawData){
		// summary:
		//		Used in filter condition expression to identify a grid column
		// colId: String|Number
		//		The id of the grid column, usually string.
		// type: String?
		//		The data type of the grid column. If omitted, default to "string".
		// converter: Function?
		//		A data type converter function, used when the default converting does not work.
		//		For date or time type, converting to a Date object is enough.
		// useRawData: Boolean?
		//		To filter the store data (raw data) or the grid data (formatted data).
		// return: Function
		//		A filter expression.
		// example:
		//		//Omitting namespace here.
		//		var c = column('ISO Date Column', 'date', function(data){
		//			return dojo.date.stamp.fromISOString(data);
		//		});
		//		//Create a filter expression to checker whether the cell data equals today's date.
		//		var expr = equal(c, value(new Date(), 'date'));
		type = String(type || 'string').toLowerCase();
		return wrap(function(row){
			return valueConvert(row[useRawData ? 'rawData' : 'data'][colId], type, converter);
		}, type, colId, {isCol: true});
	};
	
	module.value = function(v, type, converter){
		// summary:
		//		Used in filter condition expression to represent a pure value.
		// v: Anything
		//		The value to be used in the filter condition
		// type: String?
		//		The data type of the value. If omitted, this function tris to infer by itself using typeof.
		// converter: Function?
		//		A data type converter function, used when the default converting does not work.
		//		For date or time type, converting to a Date object is enough.
		// return: Function
		//		A filter expression
		type = String(type || typeof v).toLowerCase();
		v = valueConvert(v, type, converter);
		return wrap(function(){
			return v;
		}, type, v);
	};
	
	//Empty check
	module.isEmpty = function(expr, emptyValues){
		// summary:
		//		A filter condition operaton to check whether an expression's result is empty.
		// expr: Function
		//		A filter condition expression.
		// emptyValue: Array?
		//		An array of values to be regarded as empty. If omitted, default to ""(empty string), null and undefined.
		// return: Function
		//		A filter expression
		return wrap(function(){
			var v = expr.apply(0, arguments);
			if(emptyValues){
				return dojo.indexOf(emptyValues, v) >= 0;
			}else{
				return v === "" || v == null;
			}
		}, "isEmpty", [expr]);
	};
	
	//Logic operations
	module.and = function(/* filter expressions */){
		// summary:
		//		A filter operation to check whether all the filter expressions passed in have TRUE results.
		// return: Function
		//		A filter expression
		var parts = dojo.filter(arguments, function(arg){
			return dojo.isFunction(arg);
		});
		return wrap(function(){
			var args = arguments;
			return dojo.every(parts, function(part){
				return part.apply(0, args);
			});
		}, "and", parts);
	};
	
	module.or = function(){
		// summary:
		//		A filter operation to check whether any of the filter expressions passed in have TRUE result.
		// return: Function
		//		A filter expression
		var parts = dojo.filter(arguments, function(arg){
			return dojo.isFunction(arg);
		});
		return wrap(function(){
			var args = arguments;
			return dojo.some(parts, function(part){
				return part.apply(0, args);
			});
		}, "or", parts);
	};
	
	module.not = function(predicate){
		// summary:
		//		A filter operation to check whether the result of the *predicate* is FALSE.
		// predicate: Function
		//		A filter expression.
		// return: Function
		//		A filter expression.
		return wrap(function(){
			return !predicate.apply(0, arguments);
		}, "not", [predicate]);
	};
	
	//Compare operations
	module.equal = function(expr1, expr2){
		// summary:
		//		A filter operation to check whether the given two expressions have the same result.
		// expr1: Function
		//		A filter expression.
		// expr2: Function
		//		A filter expression.
		// return: Function
		//		A filter expression.
		return wrap(function(){
			return expr1.apply(0, arguments) === expr2.apply(0, arguments);
		}, "equal", [expr1, expr2]);
	};
	
	module.greater = function(expr1, expr2){
		// summary:
		//		A filter operation to check whether the result of *expr1* is greater than that of *expr2*.
		// expr1: Function
		//		A filter expression.
		// expr2: Function
		//		A filter expression.
		// return: Function
		//		A filter expression.
		return wrap(function(){
			return expr1.apply(0, arguments) > expr2.apply(0, arguments);
		}, "greater", [expr1, expr2]);
	};
	
	module.less = function(expr1, expr2){
		// summary:
		//		A filter operation to check whether the result of *expr1* is less than that of *expr2*.
		// expr1: Function
		//		A filter expression.
		// expr2: Function
		//		A filter expression.
		// return: Function
		//		A filter expression.
		return wrap(function(){
			return expr1.apply(0, arguments) < expr2.apply(0, arguments);
		}, "less", [expr1, expr2]);
	};
	
	module.greaterEqual = function(expr1, expr2){
		// summary:
		//		A filter operation to check whether the result of *expr1* is greater than or equal to that of *expr2*.
		// expr1: Function
		//		A filter expression.
		// expr2: Function
		//		A filter expression.
		// return: Function
		//		A filter expression.
		return wrap(function(){
			return expr1.apply(0, arguments) >= expr2.apply(0, arguments);
		}, "greaterEqual", [expr1, expr2]);
	};
	
	module.lessEqual = function(expr1, expr2){
		// summary:
		//		A filter operation to check whether the result of *expr1* is less than or equal to that of *expr2*.
		// expr1: Function
		//		A filter expression.
		// expr2: Function
		//		A filter expression.
		// return: Function
		//		A filter expression.
		return wrap(function(){
			return expr1.apply(0, arguments) <= expr2.apply(0, arguments);
		}, "lessEqual", [expr1, expr2]);
	};
	
	//String operations
	module.match = function(expr, regExpr){
		// summary:
		//		A filter operation to check whether the result of *expr* matches the given regular expression *regExpr*.
		// expr: Function
		//		A filter expression returning string value.
		// regExpr: RegEx
		//		A regular expression.
		// return: Function
		//		A filter expression.
		return wrap(function(){
			return String(expr.apply(0, arguments)).search(regExpr) >= 0;
		}, "match", [expr, {
			expr: {
				op: "regex",
				data: regExpr
			}
		}]);
	};
	
	var stringOperator = function(args, expr1, expr2, caseSensitive, op){
		var str1 = String(expr1.apply(0, args)),
			str2 = String(expr2.apply(0, args));
		if(!caseSensitive){
			str1 = str1.toLowerCase();
			str2 = str2.toLowerCase();
		}
		return op(str1, str2);
	};
	
	module.contain = function(expr1, expr2, caseSensitive){
		// summary:
		//		A filter operation to check wheter the string result of *expr1* contains that of *expr2*.
		// expr1: Function
		//		A filter expression.
		// expr2: Function
		//		A filter expression.
		// return: Function
		//		A filter expression.
		return wrap(function(){
			return stringOperator(arguments, expr1, expr2, caseSensitive, function(str1, str2){
				return str1.indexOf(str2) >= 0;
			});
		}, "contain", [expr1, expr2]);
	};
	
	module.startWith = function(expr1, expr2, caseSensitive){
		// summary:
		//		A filter operation to check wheter the string result of *expr1* starts with that of *expr2*.
		// expr1: Function
		//		A filter expression.
		// expr2: Function
		//		A filter expression.
		// return: Function
		//		A filter expression.
		return wrap(function(){
			return stringOperator(arguments, expr1, expr2, caseSensitive, function(str1, str2){
				return str1.substring(0, str2.length) === str2;
			});
		}, "startWith", [expr1, expr2]);
	};
	
	module.endWith = function(expr1, expr2, caseSensitive){
		// summary:
		//		A filter operation to check wheter the string result of *expr1* ends with that of *expr2*.
		// expr1: Function
		//		A filter expression.
		// expr2: Function
		//		A filter expression.
		// return: Function
		//		A filter expression.
		return wrap(function(){
			return stringOperator(arguments, expr1, expr2, caseSensitive, function(str1, str2){
				return str1.substring(str1.length - str2.length) === str2;
			});
		}, "endWith", [expr1, expr2]);
	};
	
	return module;
});