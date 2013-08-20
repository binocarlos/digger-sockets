/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*

	BLUEPRINTS
	
*/
var blueprints = {};

module.exports = function(){
	return {
	  add:function(name, print){
	  	if(arguments.length==1 && typeof(arguments[0])==='object'){
	  		for(var i in prints){
		      blueprints[i] = prints[i];
		    }	
	  	}
	  	else if(arguments.length==2){
	  		blueprints[name] = print;
	  	}
	    return this;
	  },
	  get:function(name){
	    if(arguments.length<=0){
	      return blueprints;
	    }
	    return blueprints[name];
	  },
	  create:function(name){
			var blueprint = this.get(name);
			if(!blueprint){
				return $digger.create(name, {});
			}
			var data = blueprint ? {
				_digger:{
					tag:blueprint.attr('tag') || blueprint.attr('name'),
					class:blueprint.attr('class') || []
				}
			} : {}

			blueprint.find('field').each(function(field){
				var name = field.attr('name');
				var def = field.attr('default');

				if(def){
					data[name] = def;
				}
			})

			var container = $digger.create([data]);
			container.data('new', true);

			return container;
	  }
	}
}