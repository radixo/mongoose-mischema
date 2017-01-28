'use strict';

const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

function MIStruct(tpName, obj, opts)
{
	// Force MIStruct instance
	if (!(this instanceof MIStruct))
		return new MIStruct(tpName, obj, opts);

	// Generate attributes
	this.obj = obj;
	this.tpName = tpName;
	this.opts = {};

	// Check opts
	this.opts.unique_prefix = obj.unique_prefix || this.tpName + '_';
}
