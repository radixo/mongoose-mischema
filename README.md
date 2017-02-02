# mongoose-mischema

Downloads:
[![npm](https://img.shields.io/npm/dt/mongoose-mischema.svg?label=npm&style=flat-square)](https://www.npmjs.com/package/mongoose-mischema)
[![Github All Releases](https://img.shields.io/github/downloads/radixo/mongoose-mischema/total.svg?label=Github%20All%20Releases&style=flat-square)](https://github.com/radixo/mongoose-mischema)

## Synopsys

Now it is easy to write inheritable and multi-inheritable schemas for your MongoDB database. mongoose-mischema depends on mongoose, which is an amazing and powerfull MongoDB object modeling for node.js.

## Installation

```sh
npm install mongoose-mischema
```

## Usage

**MISchema constructor:**

**`MISchema(`** typeName[, inheritances], constructor[, options] **`)`**
- **typeName** - \<String\> - Name of the "class" (schema)
- **inheritances** - \<MISchema Array\> - Array of parent schemas
- **constructor** - \<Object\> - Mongoose-like schema
- **options** - \<Object\> - Options

  - **deconflict** - \<String\> - String that solve sabe attribute name, default set to typeName + '_'
  - **mso** - \<Object\> - Mongoose Schema Options, will be used when generating mongoose Schema
  - **amso** - \<Object\> - Auto-generated Mongoose Schema Options, will be used when generating mongoose schemas for SubDocuments arrays, the default value is { _id: false }, which elimintes auto-generated ObjectIdS for SubDocuments arrays

**Single inheritance:**

```js
const mischema = require('mongoose-mischema'),
    MISchema = mischema.MISchema;

var tpLog = new MISchema('tpLog', {
    archived: { type: Boolean, 'default': false },
});

// Inherits from tpLog
var tpPerson = new MISchema('tpPerson', [tpLog], {
    name: String,
    birthDate: Date,
});

// Get mongoose Schema
var personSchema = tpPerson.Schema;

// We provide a copy of mongoose.model
var Person = mischema.model('Person', personSchema);
var ChuckNorris = new Person({
    name: "Chuck Norris",
    birthDate: Date.now() + 1000*60*60*24, // He was born tomorrow :O
    archived: true,
});
ChuckNorris.save(function(err) {
    if (err) return handleErr(err);
});
/*
 * > db.people.find().pretty()
 * {
 * 	"_id" : ObjectId("589349eb0b26cad4cf2ba238"),
 * 	"name" : "Chuck Norris",
 * 	"birthDate" : ISODate("2017-02-03T15:02:03.866Z"),
 * 	"_kind" : "tpPerson",
 * 	"_kinds" : [
 * 		"tpLog"
 * 	],
 * 	"archived" : true,
 * 	"__v" : 0
 * } 
 */
```

It was automatically created an attribute called **"_kinds"** that automatically stores all schemas used in the compilation process, and can easely be checked with **ofKind** instance and static methods.

**Using the ofKind:**

**`ofKind(`** type **`)`**
- **type** - \<String\>/\<MISchema\> - Type name or MISchema object
```js
if (Person.ofKind('tpAddress') // false
    console.log(':(');  // Do not log it
if (ChuckNorris.ofKind(tpLog)) // true
    console.log('\o/');
```

**Complex Example:**

```js
const mischema = require('mongoose-mischema'),
    MISchema = mischema.MISchema;

var tpAddress = new MISchema('tpAddress', {
        street: { type: String, required: true },
        street2: String,
        street3: String,
        postalCode: { type: String, required: true },
});

var tpOccupation = new MISchema('tpOccupation', {
        occupation: { type: String, 
            enum: ['onSeller', 'onTechnician', 'onTeacher'] },
});

var tpPerson = new MISchema('tpPerson', {
        name: String,
        birthDate: Date,
        addresses: [tpAddress],
});

var tpEmployee = new MISchema('tpEmployee', [tpOccupation, tpPerson]);

// Create mongoose Schema
var employeeSchema = tpEmployee.Schema;

// We have an helper to set required, awesome for big different projects that
// uses the same base model
employeeSchema.setRequired(['name', 'birthDate', 'subdoc.attr0'], true);

// Create model
var Employee = mischema.model('Employee', employeeSchema);
var ChuckNorris = new Employee({
	name: "Chuck Norris",
	birthDate: Date.now() + 1, // He was born tomorrow :O
	addresses: [{ street: 'Maniacs Street', street2: '-1',
	    postalCode: 'XXX' }]
});
ChuckNorris.save(function(err) {
    if (err) return console.log(err.message);
}).then(function() {
    ChuckNorris.subdoc.attr0 = 'value';
    ChuckNorris.save(function(err) {
        if (err) return console.log(err.message);
	console.log('success now');
    })
});
/*
 * Console:
 * Employee validation failed
 * sccess now
 *
 * Mongo Shell:
 * > db.employees.find().pretty()
 * {
 * 	"_id" : ObjectId("5893514dd20b54d607fe58b9"),
 * 	"name" : "Chuck Norris",
 * 	"birthDate" : ISODate("2017-02-02T15:33:33.772Z"),
 * 	"_kind" : "tpEmployee",
 * 	"_kinds" : [
 * 		"tpOccupation",
 * 		"tpPerson"
 * 	],
 * 	"addresses" : [
 * 		{
 * 			"street" : "Maniacs Street",
 * 			"street2" : "-1",
 * 			"postalCode" : "XXX",
 * 			"_kind" : "tpAddress",
 * 			"_kinds" : [ ]
 * 		}
 * 	],
 * 	"subdoc" : {
 * 		"attr0" : "value"
 * 	},
 * 	"__v" : 0
 * }
 */
```

## Conclusion

With mongoose-mischema you have a powerfull tool to deal with your schemas, take care to use multiple inheritence only with orthogonal situations, that's all for now folks! Enjoy!

## Author
Walter Neto (@wneto)

