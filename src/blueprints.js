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
module.exports = function(){

	var blueprints = {};
	var holder = null;

	function ensure_holder(){
		if(!holder){
			holder = $digger.create();
		}
		return holder;
	}

	return {
		load:function(warehouses){
			var self = this;
			//'/config/demo_blueprints.xml'
			var blueprintwarehouse = $digger.connect(warehouses);
	    blueprintwarehouse('*')
	      .ship(function(blueprints){
	        blueprints.find('blueprint').each(function(blueprint){
	          if($digger.config.debug){
	            console.log('-------------------------------------------');
	            console.log('adding blueprint: ' + blueprint);
	          }
	          self.add(blueprint);
	        })
	      })
		},
	  add:function(blueprint){
	  	if(!blueprint.fields){
	  		if(typeof(blueprint.find)==='function'){
	  			blueprint.fields = blueprint.find('field').models;		
	  		}
	  		else{
	  			blueprint.fields = [];
	  		}
	  	}

	  	ensure_holder();
	  	holder.add(blueprint);
	  	blueprints[blueprint.title()] = blueprint;
	  	
	    return this;
	  },
	  has_children:function(for_blueprint){
	  	if(!for_blueprint || !for_blueprint.attr('leaf')){
	  		return true;
	  	}
	  	else{
	  		return false;
	  	}
	  },
	  // get a container that holds the blueprints that can be added to the given blueprint
	  get_children:function(for_blueprint){
	  	ensure_holder();
	  	if(!for_blueprint){
	  		return holder;
	  	}

	  	if(for_blueprint.attr('leaf')){
	  		return null;
	  	}

	  	if(for_blueprint.attr('children')){
	  		return holder.find(for_blueprint.attr('children'));
	  	}
	  	else{
	  		return holder;
	  	}
	  },
	  get:function(name){
	    if(arguments.length<=0){
	      return blueprints;
	    }
	    return blueprints[name];
	  },
	  all:function(){
	  	var ret = {};
	  	for(var prop in blueprints){
	  		ret[prop] = blueprints[prop];
	  	}
	  	return ret;
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