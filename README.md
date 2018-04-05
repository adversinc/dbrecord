The MySQL active record base class

# Inheriting classes

Descendant classes has to provide at least following functions:

* _table() { return "db-table-name"; }
* _locatefield() { return "unique-id-field-name"; }

All other db integration is being performed by this class;

#	USAGE

The instance of the class represents the database record. It can be used
in two ways: reading data and writing data (and also mixed read/write).

## READING RECORDS

To read existing record, the unique record id has to be passed to the class
constructor: var obj = new InheritedClass({ uniqueFieldName: 11111 }). After reading
the record, class will create the required get/set functions to access
database row fields (e.g. let v = obj->some_field())

## WRITING RECORDS

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

## CREATING RECORDS

To create the new record, the constructor is being called without the
locate-field argument: let obj = InheritedClass->();

The newly created object has auto-commit disabled, so setting the necessary
fields has to be ended by calling commit():

```
let obj = InheritedClass->();
obj->some_field1("new value 1");
obj->some_field2("new value 2");
...
obj->commit();
```

Until commit() is called, the value of locate-field of the new record is
not know (obviously). During the commit(), class reads the new record ID
from mysql and sets it accordingly:

```
...
obj->commit();
console.log("New object ID", obj->id());
```

# To be moved:
 
The MySQL connection wrapper which provides the following features:

* "master" db connection factory function
* sync queries (using Future)
* async queries (using Promises - not tested yet)
* nested transactions support (in progress)
* connection pooling for transaction
* local context of "master" db connection inside the transaction

