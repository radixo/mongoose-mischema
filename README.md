# mongoose-mischema

[![npm](https://img.shields.io/npm/v/npm.svg?style=flat-square)](https://www.npmjs.com/package/mongoose-mischema)
[![Github Releases](https://img.shields.io/github/downloads/atom/atom/latest/total.svg?style=flat-square)](https://github.com/radixo/mongoose-mischema)

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

// We provide a copy of mongoose.model, and you need to use the [type].Schema to get mongoose Schema
var Person = mischema.model('Person', tpPerson.Schema);
var ChuckNorris = new Person({
    name: "Chuck Norris",
    birthDate: Date.now() + 1000*60*60*24, // He was born tomorrow :O
    archived: true,
});
ChuckNorris.save(function(err) {
    if (err) return handleErr(err);
});
/*
 * MongoDB shell: db.People.find().pretty()
 *
 * {
 *         "_id" : ObjectId("588f2843d698af74e7129e06"),
 *         "name" : "Chuck Norris",
 *         "birthDate" : ISODate("2017-01-30T11:49:23.322Z"),
 *         "_kinds" : [
 *                 "tpLog",
 *                 "tpPerson"
 *         ],
 *         "archived" : true,
 *         "__v" : 0
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

var Employee = mischema.model('Employee', tpEmployee.Schema);
var ChuckNorris = new Employee({
        name: "Chuck Norris",
        birthDate: Date.now() + 1000*60*60*24, // He was born tomorrow :O
        addresses: [{ street: 'Maniacs Street', street2: '-1',
            postalCode: 'XXX' }]
});
ChuckNorris.save(function(err) {
    if (err) return handleErr(err);
});
/*
 * MongoDB shell: db.employees.find().pretty()
 *
 * {
 *	"_id" : ObjectId("588f44dc5cf2bd7bb8231f2b"),
 *	"name" : "Chuck Norris",
 *	"birthDate" : ISODate("2017-01-30T13:51:24.388Z"),
 *	"_kinds" : [
 *		"tpOccupation",
 *		"tpPerson",
 *		"tpEmployee"
 *	],
 *	"addresses" : [
 *		{
 *			"street" : "Maniacs Street",
 *			"street2" : "-1",
 *			"postalCode" : "XXX",
 *			"_kinds" : [
 *				"tpAddress"
 *			]
 *		}
 *	],
 *	"__v" : 0
 * }
 */
```

## Conclusion

With mongoose-schema you have a powerfull tool to deal with your schemas, take care to use multiple inheritence only with orthogonal situations, that's all for now folks! Enjoy!

## Author
Walter Neto (@wneto)

