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
var obj = new InheritedClass({ uniqueFieldName: 11111 }).
```
 
After reading
the record, class will create the required get/set functions to access
database row fields (e.g. let v = obj->some_field())

### Records by secondary keys

The record can be created by secondary key. The list of secondary keys is to
be provided in _keys() method, which returns the array of field names.

### Missing records

The constructor will throw an exception if the record being located
is not found. 

If exception behavior is not desired, the tryCreate() static method
can be called. It accepts the same arguments as constructor and
returns either a new object created or null. 

## Writing records

Object can be modified by passing the new field value to get/set function:

 obj->some_field("new value");

By default, objects save new values to the db on each call. If multiple
fields are supposed to be set, the auto-commit feature can be turned off,
and commit() method called after finishing updates:

obj->autocommit(false);
obj->some_field1("new value 1");
obj->some_field2("new value 2");
...
obj->commit();

## Creating records

To create the new record, the constructor is being called without the
locate-field argument: let obj = new InheritedClass();

The newly created object has auto-commit disabled, so setting the necessary
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

## Removing records

The record can be removed by calling deleteRecord():

```javascript
let obj = new SomeObject();
obj->deleteRecord();
```

## Fetching records

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

## Field names for query

All _option_ entries which match the /[a-z0-9_.]/ pattern are
being considered as query fields to use in WHERE part of the query:

```javascript
SomeObject.forEach({ name: "Some name" });
// turns to SELECT * FROM objects WHERE name="Some name"
```

Node: this is an experimental behavior.

## Options to tune the iteration

The following options can be used:

* WHERE - appended to the query's WHERE as is
* LIMIT - used as a query's LIMIT
* ORDERBY - used as a query's ORDER BY
* DEBUG_SQL_QUERY - output the resulting SQL query before launching it

## Options passed to the callback

The original _options_ object is being passed to the callback. Callback
is free to modify it.

During the iteration, forEach automatically sets the following keys:

* COUNTER - the number of records currently processed. This value is
being returned as a forEach result at the end. If callback
wants to affect the return value, options.COUNTER can be altered.
* TOTAL - the total number of records found in QUERY

# To be moved:
 
The MySQL connection wrapper which provides the following features:

* "master" db connection factory function
* sync queries (using Future)
* async queries (using Promises - not tested yet)
* nested transactions support (in progress)
* connection pooling for transaction
* local context of "master" db connection inside the transaction

