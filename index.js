'use strict';

/*
 * Load dependencies
 */
const util = require('util'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema;

function schemaAdd(task, schema, oKey, oVal, scope, tasks, schemas, dirties,
    dirty)
{
	var scItem;
	var drItemNew;
	var schValueNew;
	var tskNew;

	if (oVal instanceof MISchema) {
		scItem = scope[oVal.tpName];
		if (scItem !== undefined) {
			schema[oKey] = scItem.objStruct;
			return false;
		}

		schValueNew = undefined;
		tskNew = oVal;
		drItemNew = [oKey, oVal.tpName];
	} else if (oVal.constructor === Array && oVal.length == 1 &&
	    oVal[0] instanceof MISchema) {
		scItem = scope[oVal[0].tpName];
		if (scItem !== undefined) {
			schema[oKey] = [scItem.getMongooseSchema()];
			return false;
		}

		schValueNew = [];
		tskNew = oVal[0];
		drItemNew = [oKey, oVal[0].tpName];
	} else {
		schema[oKey] = oVal;
		return false;
	}

	// Set values
	schema[oKey] = schValueNew;
	if (!dirty) // was not dirty before this call
		tasks.unshift(null);
	// Checks to not include the same task (auto-reference)
	if (tskNew !== task) {
		tasks.unshift(tskNew);
		schemas.unshift({});
	}

	// Creates dirty entry
	var drItem = dirties[task.tpName] || [];
	dirties[task.tpName] = drItem;
	drItem.push(drItemNew);

	return true; // It is dirty
}

function scopeAdd(scope, objStruct)
{
	var scItem = scope[objStruct.tpName];

	// if the scope already has the schema
	if (scItem !== undefined)
		return scItem.objStruct;

	var tasks = [objStruct];
	var schemas = [{}];
	var dirties = {};
	var rSchema;

	while (tasks.length > 0) {
		var task = tasks[0];
		var schema = schemas[0];
		var obj, objKeys;
		var dirty = false;

		// Fix dirty schema
		if (task === null) {
			tasks.shift();
			task = tasks[0];
			obj = task.obj;
			objKeys = Object.keys(obj);

			for (var drItem of dirties[task.tpName]) {
				if (schema[drItem[0]].constructor === Array) {
					schema[drItem[0]].push(scope[drItem[1]]
					    .getMongooseSchema());
				} else {
					schema[drItem[0]] = scope[drItem[1]]
					    .objStruct;
				}
			}
		} else {
			obj = task.obj;
			objKeys = Object.keys(obj);

			// Looping through struct key, value
			for (let oKey of objKeys) {
				var oVal = obj[oKey];

				// Add to schema or set dirty
				if (schemaAdd(task, schema, oKey, oVal, scope,
				    tasks, schemas, dirties, dirty))
					dirty = true;
			}
		}

		if (!dirty) {
			scope[task.tpName] = {
				objStruct: schema,
				amso: task.opts.amso,
				getMongooseSchema: function() {
					return new Schema(this.objStruct,
					    this.amso);
				},
			};

			tasks.shift();
			schemas.shift();
			rSchema = schema;
		}
	}

	return rSchema;
}

function mergeSchemas(sch0, sch1, usedKeys, deconflict)
{
	var keys = Object.keys(sch1);

	// Looping through new schema (sch1)
	for (let key of keys) {
		if (key === '_kinds' || key === '_kind')
			continue;

		let val = sch1[key];

		// Checks for key been used conflict
		if (usedKeys[key] === undefined) {
			usedKeys[key] = deconflict;
			sch0[key] = val;
		} else {
			if (usedKeys[key] !== null) {
				sch0[usedKeys[key] + key] = sch0[key];
				delete sch0[key];
				usedKeys[key] = null;
			}

			sch0[deconflict + key] = sch1[key];
		}
	}
}

function mergeImplementeds(imps0, imps1)
{
	var keys1 = Object.keys(imps1);

	for (let key of keys1)
		imps0[key] = true;
}

function genMISchema(objs, implementeds)
{
	var schema = {} // The resulting schema
	var scope = {}; // stores each compiled schema
	var usedKeys = {}; // for resolving conflicted keys

	// Looping through objs Array
	for (let objStruct of objs) {
		// ignore non MISchema objects
		if (!(objStruct instanceof MISchema))
			continue;

		var topImplemented = {};
		topImplemented[objStruct.tpName] = true;

		mergeSchemas(schema, scopeAdd(scope, objStruct), 
		    usedKeys, objStruct.opts.deconflict);
		mergeImplementeds(implementeds, objStruct.implementeds);
		mergeImplementeds(implementeds, topImplemented);
	}

	return schema;
}

function genKinds(implementeds)
{
	var keys = Object.keys(implementeds);
	var rArr = []

	for (let key of keys)
		rArr.push(key);

	return { type: Array, 'default': rArr };
}

function extendMongooseSchema(ms)
{
	
	// setRequired Extention
	ms.setRequired = function(paths, val) {
		if (val === undefined) val = true; // Default val to true

		if (paths.constructor !== Array)
			paths = [paths];

		paths.forEach(function (pathName) {
			let path = this.path(pathName);

			if (!path)
				throw new Error(util.format(
				    'Path "%s" not found.', pathName));
			path.required(val);
		}, this);
	};
}

/*
 * Module implementation
 *
 * opts:
 * 	deconflict: String, for deconflict key names
 * 	mso: {}, for mongoose Schema options
 * 	amso: {}, for auto-generated mongoose options
 */
function MISchema()
{
	// Declare arguments
	var argc = 0;
	var tpName, inherits, obj, opts;

	// Arguments assert
	tpName = arguments[argc++];
	if (arguments[argc].constructor === Array)
		inherits = arguments[argc++];
	obj = arguments[argc++];
	opts = arguments[argc++];

	// Force MISchema instance
	if (!(this instanceof MISchema)) {
		if (inherits)
			return new MISchema(tpName, inherits, obj, opts);
		else
			return new MISchema(tpName, obj, opts);
	}

	// Generate attributes
	this.tpName = tpName;
	this.implementeds = {};
	if (inherits)
		this.obj = Object.assign(genMISchema(inherits,
		    this.implementeds), obj);
	else
		this.obj = obj;
	this.obj._kinds = genKinds(this.implementeds);
	this.obj._kind = { type: String, 'default': this.tpName };
	this.opts = opts || {};
	this.mongooseSchema = undefined;

	// Check opts
	this.opts.deconflict = this.opts.deconflict || this.tpName + '_';
	this.opts.amso = this.opts.amso || { _id: false };

	// Getters
	Object.defineProperty(this, 'Schema', {
		get: function() {
			if (!this.mongooseSchema) {
				this.mongooseSchema = new Schema(this.obj,
				    this.opts.mso);
				extendMongooseSchema(this.mongooseSchema);
			}

			return this.mongooseSchema;
		},
	});
}

/*
 * Register plugin
 */
mongoose.plugin(function MISchemaPlugin(schema, options)
{
	var ofKind = function(inst, obj, kind) {
		var kindName;
		var arr, attr;

		if (kind instanceof MISchema)
			kindName = kind.tpName;
		else
			kindName = kind;

		if (inst) {
			arr = obj._kinds;
			attr = obj._kind;
		} else {
			arr = obj.schema.path('_kinds').options['default'];
			attr = obj.schema.path('_kind').options['default'];
		}

		return (attr == kind || arr.indexOf(kindName) != -1);
	}

	// Instance method
	schema.methods.ofKind = function(kind) {
		return ofKind(true, this, kind);
	};

	// Static method
	schema.statics.ofKind = function(kind) {
		return ofKind(false, this, kind);
	}
});

function model(name, schema, collection, skipInit)
{
	if (schema instanceof MISchema)
		schema = schema.Schema;

	return mongoose.model(name, schema, collection, skipInit);
}

/*
 * Exports
 */
function MongooseMISchema()
{
	this.MISchema = MISchema;
	this.model = model;
}

module.exports = exports = new MongooseMISchema();
