The MySQL active record base class with a synchronous database access by using
Futures.

The instance of the class represents the database record. It can be used
in to reading and write data, modify fields and so on.

Important: the code has to run within a Fiber for Futures to work. This can be
archived either manually or by using Fiber-powered framework (like Meteor). The
class has been designed to use with Meteor.

#	Usage

```javascript
class MyObject extends DbRecord {
	// Mandatory
	static _table() { return "mydb.myobjects"; }
	static _locatefield() { return "id"; }
	
	// Optional
	static _keys() { return [ "secondary_id" ]; }
}

// Create record
const obj = new MyObject();
obj->some_field("value");
obj->commit();

// Use record
const obj = new MyObject({ id: 1 });
console.log(obj->some_field());

// Process records in a transaction
dbh.execTransaction((trxDbh) => {
	const obj1 = new ObjectOne();
	obj1.name("my name");
	obj1.commit();
	
	const obj2 = new ObjectTwo();
	obj2.parent(obj1->id());
	obj2.commit();
});
```

The descendant class has to be created to represent the specific database object.
Descendant classe has to provide at least following functions:

* _table() { return "db-table-name"; }
* _locatefield() { return "unique-id-field-name"; }

Optional:

* _keys() { return [ "secondary_key1", "secondary_key2", ... ]; }

## Reading records

### Records by primary key

To read existing record, the unique record id has to be passed to the class
constructor: 

```javascript
var obj = new InheritedClass({ uniqueFieldName: 11111 });
```
 
After reading the record, the class will create the required get/set functions to access
database row fields (e.g. let v = obj->some_field())

### Records by secondary keys

The record can be created by secondary key. A single field:

```javascript
class MyObject extends DbRecord {
	...
	static _keys() { return [ "short" ]; }
	...
}

var obj = new myObject({ shortname: "short" });
```

Or a complex key:

```javascript
class MyObject extends DbRecord {
	...
	static _keys() { return [ "field1,field2" ]; }
	...
}

var obj = new myObject({ field1: "one", field2: "two" });
```

The list of secondary keys is to be provided in _keys() method, which returns
the array of field names. Complex keys are being returned as a comma-separated
string.

### Missing records

The constructor will throw an exception if the record being located
is not found. 

If exception behavior is not desired, the tryCreate() static method
can be called. It accepts the same arguments as constructor and
returns either a new object created or null. 

## Creating records

To create the new record, the constructor is being called without the
locate-field argument: let obj = new InheritedClass();

The newly created object has auto-commit disabled (see below), so setting the necessary
fields has to be ended by calling commit():

```javascript
let obj = new InheritedClass();
obj->some_field1("new value 1");
obj->some_field2("new value 2");
...
obj->commit();
```

Until commit() is called, the value of locate-field of the new record is
not know (obviously). During the commit(), class receives the new 
record ID from mysql and sets it accordingly:

```javascript
...
obj->commit();
console.log("New object ID", obj->id());
```

### Creating using newRecord()

The newRecord() static function allows creating the new record within one call:

```javascript
const obj = MyObject.newRecord({
  field1: 1,
  filed2: "value 2"
});
```

newRecord() returns the just created object.

## Removing records

The record can be removed by calling deleteRecord():

```javascript
let obj = new SomeObject();
obj->deleteRecord();
```

## Accessing record fields

During initialization (both while creating an empty object and reading an
existing one) the instance of the class gets methods equal to the database
fields.

E.g. the following table structure:

* id
* name
* other_field

will result in the following access methods generated:

```javascript
obj->id();
obj->name();
obj->other_field();
```

These fields can be used to read and write database fields:

```javascript
const v = obj->other_field();
obj->name(v + 1);
```

### Committing changes to the database

By default, all changes sent to the access methods are immediately automatically
committed to the database. However, the commit can be delayed by setting the
manual commit mode:

```javascript
obj->autocommit(false);
obj->some_field1("new value 1");
obj->some_field2("new value 2");
...
obj->commit();
```

For new records, the autocommit is disabled by default (see above).

### Overriding access methods

It is possible to override an access method:

```javascript
managed_field(value) {
	console.log("managed_field called");

	// Modify value when it is going to be set
	if(value !== undefined) {
		value += " (I am managed)";
	}

	return this._super.managed_field(value);
}
```

Since access methods are generated automatically, the first-level managed fields
should call this._super.field_name(value) to access an original access method.

This relates only to the first override. If access method is overriden twice
or more, the latter overrides should use the regular JS super.field_name(value)
call format.

## Going through multiple records

To fetch records from the database table the static forEach() function 
is being used:

```javascript
const cnt = SomeObject.forEach({options}, function(itm, options) {
	...
});
```

The _options_ can contain:

1. table field names to use in selection query
1. options to tune the iteration process
1. other options to be passed to callback

The callback function receives _itm_ and _options_ arguments which
are the object being currently processed and forEach options object.

The function returns the number of objects processed (this _can_
differ from number of objects found, see COUNTER below).

### Field names for query

All _option_ entries which match the /[a-z0-9_.]/ pattern (thus, only
lower-case letters) are
being considered as query fields to use in WHERE part of the query:

```javascript
SomeObject.forEach({ name: "Some name" });
// turns to SELECT * FROM objects WHERE name="Some name"
```

Node: this is an experimental behavior.

### Options to tune the iteration

These options are supposed to be upper-case or camel-case (to
have a capital case letter and distinguish them from field names).

The following options can be used:

* whereCond - the array of string raw conditions which 
will be added to the query 
* whereParam - the array of values to replace "?" in whereCond
conditions
* WHERE - appended to the query's WHERE as is
* LIMIT - used as a query's LIMIT
* ORDERBY - used as a query's ORDER BY
* DEBUG_SQL_QUERY - output the resulting SQL query before launching it

### Options passed to the callback

The original _options_ object is being passed to the callback. Callback
is free to modify it.

During the iteration, forEach automatically sets the following keys:

* COUNTER - the number of records currently processed. This value is
being returned as a forEach result at the end. If callback
wants to affect the return value, options.COUNTER can be altered.
* TOTAL - the total number of records found in QUERY

## Transactions

DbRecord supports transactions (except the nested transactions, this
is to be done). To process operations within the SQL transaction, wrap
the code to execTransaction:

```js
dbh.execTransaction((trxDbh) => {
	const obj1 = new ObjectOne();
	obj1.name("my name");
	obj1.commit();
	
	const obj2 = new ObjectTwo();
	obj2.parent(obj1->id());
	obj2.commit();
});
```

This will either process the whole block as a single database transaction.
If any of the queries fail, or code throws an exception, the transaction
is being rolled back.

Wrap the call to try...catch to catch the exceptions in a callback.

### Object transactional lock

To lock the record for update in transaction, use forUpdate option:

```js
const locked = new SomeObject({ id, forUpdate: true });
```

### Database connection sharing 

Since NodeJS shares the same MySQL connection across all executing code 
threads, the separate db connection is required. It is passed to the 
callback as _trxDbh_ argument.

_trxDbh_ is being used internally by _DbRecord_ instances and usually is
not required within the transaction function.

### Object within the transaction

Since all objects within the transactions should use the
transacted connection, all _DbRecord_ objects should be local variables.

Also see transactionWithMe().

This code **MAY NOT** work as expected:

```js
const obj = new ObjectOne(); // obj uses dbh_1 connection
obj.name("original name")

dbh.execTransaction((dbh_2) => {
	// dbh_2 is transacted

	obj.name("new name"); // <== This still uses dbh_1, which is not transacted
	throw "Something happened!"; // Try to rollback
});

console.log(obj.name());
// > new name
// The db changes were not rolled back since they were made through dbh_1
```

The _obj_ is being created outside of transaction and may use the wrong 
database connection.

### DbRecord.transactionWithMe()

The function allows creating the transaction on object passing
the current object into transaction callback, and picking up the changes
back to the original object after the transaction:

```js
const obj = new SomeObject();
obj.name("Original name");
obj.commit();

obj.transactionWithMe((obj) => {
  // The obj is now the local one, re-created for the transaction
  obj.name("Changed name");
});

console.log(obj.name());
// prints "Changed name"
```

### Getting database handle

The database handle for the transaction can be obtained from any
DbRecord object by calling static method masterDbh():

```js
MyObject.masterDbh().execTransaction(() => {
	...;
});
```

## Helper functions

### MySQL SET field management

```js
// Add value to set
let appendedSet = DbRecord.setFieldSet(oldSet, newValue);

// Remove value from set
let shortenedSet = DbRecord.setFieldRemove(oldSet, oldValue);

// Check if value is in set
let exists = DbRecord.setFieldCheck(oldSet, value);
```


## Other

### Static access to database handle

Sometimes it is required to access the current database handle from 
within the static methods (for example, when creating db entry
from a static create()).

To get the dbh handle, the masterDbh() static function can be used.

# To be moved:
 
The MySQL connection wrapper which provides the following features:

* "master" db connection factory function
* sync queries (using Future)
* async queries (using Promises - not tested yet)
* nested transactions support (in progress)
* connection pooling for transaction
* local context of "master" db connection inside the transaction

