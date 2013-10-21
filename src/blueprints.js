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
		/*
		
			connect to a backend warehouse and load blueprint and template containers

			then add them to the client
			
		*/
		load:function(warehouses, done){
			var self = this;
			
			var blueprintwarehouse = $digger.connect(warehouses);
	    blueprintwarehouse('>blueprint:tree')
	      .ship(function(blueprints){
	        blueprints.find('blueprint').each(function(blueprint){
	          if($digger.config.debug){
	            console.log('-------------------------------------------');
	            console.log('adding blueprint: ' + blueprint.attr('name'));
	          }
	          self.add(blueprint);
	        })
	        blueprints.find('template').each(function(template){
	          $digger.template.add(template.attr('name'), template.attr('html'));
	        })
	        blueprints.find('controller').each(function(controller){


	        	var src = controller.attr('src');

	        	if($digger.config.debug){
	            console.log('-------------------------------------------');
	            console.log('adding controller: ' + controller.attr('name'));
	            console.log(src);
	          }

	        	try{
	        		eval.call(window, src);
	        	} catch(e){
	        		console.log('-------------------------------------------');
	        		console.log('ERROR: ');
	        		console.log(e);
	        		console.log(e.stack);
	        	}
	        	
	        })
	        done && done();
	      })
		},
		reset:function(){
			blueprints = {};
			holder = $digger.create();
		},
		/*
		
			add a single blueprint container

			we process the blueprint into raw model data for digger-form-for-angular

			take the top level fields as the simple form

			take each tab which is:

			 a) a single field tab
			 b) a form within a tab

		*/
	  add:function(blueprint){

	  	// write the options
	  	function map_field(field){
	  		var ret = field.get(0);
	  		ret.options = field.find('option').map(function(o){
	  			return o.attr('value');
	  		})
	  		return ret;
	  	}

	  	// map the fields into models
	  	if(!blueprint.fields){
	  		if(typeof(blueprint.find)==='function'){
	  			var tabs = blueprint.find('tab');

	  			// only get fields at the top otherwise we suck up tab fields too
	  			var fields = blueprint.find('> field').map(map_field);

	  			/*
	  			
	  				turn the tab container into tab model with fields processed
	  				
	  			*/
	  			var tabs = blueprint.find('tab').map(function(tab){

	  				var model = tab.get(0);

	  				// the whole tab is a field
	  				if(tab.attr('type')){
	  					return model;
	  				}
	  				// the tab is a list of fields
	  				else{
	  					model.fields = tab.find('field').map(map_field);
	  				}

	  				return model;
	  			})

	  			// this is the simple flat view of all fields
	  			blueprint.fields = fields;
	  			blueprint.tabs = tabs;
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
	  get_add_children:function(for_blueprint){
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
	  get_children:function(for_blueprint){
	  	return this.get_add_children(for_blueprint);
	  },
	  get:function(name){
	    if(arguments.length<=0){
	      return blueprints;
	    }
	    return blueprints[name];
	  },
	  all_containers:function(){
	  	return holder.containers();
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