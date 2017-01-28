'use strict';

/*
 * Load dependencies
 */
const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/*
 * Module implementation
 *
 * use opts = { mo: {} } for mongoose Schema options
 */
function MIStruct(tpName, obj, opts)
{
	// Force MIStruct instance
	if (!(this instanceof MIStruct))
		return new MIStruct(tpName, obj, opts);

	// Generate attributes
	this.obj = obj;
	this.tpName = tpName;
	this.opts = opts || {};

	// Check opts
	this.opts.deconflict = this.opts.deconflict || this.tpName + '_';
}

const schemaAdd = (task, schema, oKey, oVal, scope, tasks, schemas, dirties,
    dirty) =>
{
	var scItem;
	var drItemNew;
	var schValeuNew;
	var tskNew;

	if (oVal instanceof MIStruct) {
		scItem = scope[oVal.tpName];
		if (scItem !== undefined) {
			schema[oKey] = scItem.objStruct;
			return false;
		}

		schValueNew = undefined;
		tskNew = oVal;
		drItemNew = [oKey, oVal.tpName];
	} else if (oVal.constructor === Array && oVal.length == 1 &&
	    oVal[0] instanceof MIStruct) {
		scItem = scope[oVal[0].tpName];
		if (scItem !== undefined) {
			schema[oKey] = [scItem.mongooseSchema];
			return false;
		}

		schValueNew = [];
		tskNew = oVal[0];
		drItemNew = [oKey, oVal[0].tpName];
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

const scopeAdd = (scope, objStruct) =>
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
		var obj = task.obj;
		var objKeys = Object.keys(obj);
		var dirty = false;

		// Fix dirty schema
		if (task === null) {
			tasks.shift();
			task = tasks[0];

			for (var drItem of dirties[task.tpName]) {
				if (schema[drItem[0]].constructor === Array)
					schema[drItem[0]].push(scope[drItem[1]]
					    .mongooseSchema);
				else
					schema[drItem[0]] = scope[drItem[1]]
					    .objStruct;
			}
		} else {
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
				mongooseSchema: new Schema(schema,
				    task.opts.mo),
			};

			tasks.shift();
			schemas.shift();
			rSchema = schema;
		}
	}

	return rSchema;
}

const mergeSchemas = (sch0, sch1, usedKeys, deconflict) =>
{
	var keys = Object.keys(sch1);

	// Looping through new schema (sch1)
	for (let key of keys) {
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

const MISchema = (objs, opts) =>
{
	// Check if objs is an Array
	if (objs.constructor !== Array)
		return undefined;

	var schema = {} // The resulting schema
	var scope = {}; // stores each compiled schema
	var usedKeys = {}; // for resolving conflicted keys

	// Generate schemas
	for (var i = 0; i < structs.length; i++)
		schemas.push({});

	// Looping through structs Array
	for (let objStruct of structs) {
		// ignore non MIStruct objects
		if (!(objStruct instanceof MIStruct))
			continue;

		mergeSchemas(schema, scopeAdd(scope, objStruct), 
		    objStruct.opts.deconflict);
	}

	return new Schema(schema, opts);
}

/*
 * Exports
 */
function MongooseMISchema()
{
	this.MIStruct = MIStruct;
	this.MISchema = MISchema;
}

module.exports = exports = new MongooseMISchema();
