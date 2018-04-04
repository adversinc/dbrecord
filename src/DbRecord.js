// import {dbh} from "./mysql-queries";

/**
 * Represents the database record class.
 *
 * INHERITING CLASSES
 *
 * Descendant classes has to provide at least following functions:
 * 	_table() { return "db-table-name"; }
 * 	_locatefield() { return "unique-id-field-name"; }
 *
 * 	Everything else is being done by this class.
 *
 * 	USAGE
 *
 * 	The instance of the class represents the database record. It can be used
 * 	in two ways: reading data and writing data (and also mixed read/write).
 *
 * 	READING RECORDS
 *
 * 	To read existing record, the unique record id has to be passed to the class
 * 	constructor: var obj = new InheritedClass({ uniqueFieldName: 11111 }). After reading
 * 	the record, class will create the required get/set functions to access
 * 	database row fields (e.g. let v = obj->some_field())
 *
 * 	WRITING RECORDS
 *
 * 	Object can be modified by passing the new field value to get/set function:
 * 	obj->some_field("new value");
 *
 * 	By default, objects save new values to the db on each call. If multiple
 * 	fields are supposed to be set, the auto-commit feature can be turned off,
 * 	and commit() method called after finishing updates:
 * 	obj->autocommit(false);
 * 	obj->some_field1("new value 1");
 * 	obj->some_field2("new value 2");
 * 	...
 * 	obj->commit();
 *
 * 	CREATING RECORDS
 *
 * 	To create the new record, the constructor is being called without
 * 	locate-field argument: let obj = InheritedClass->();
 *
 * 	The newly created object has auto-commit disabled, so setting the necessary
 * 	fields has to be ended by calling commit():
 *
 * 	let obj = InheritedClass->();
 * 	obj->some_field1("new value 1");
 * 	obj->some_field2("new value 2");
 * 	...
 * 	obj->commit();
 *
 * 	Until commit() is called, the value of locate-field of the new record is
 * 	not know (obviously). During the commit(), class reads the new record ID
 * 	from mysql and sets it accordingly:
 *
 * 	...
 * 	obj->commit();
 * 	console.log("New object ID", obj->id());
 */
class DbRecord {
	/**
	 * Creates the class instance. If options._locatefield parameter is specified,
	 * reads the data from the database and put them into the internal structures
	 * (see _init() and _read())
	 * @param {Object} dbh
	 * @param {Object} [options]
	 */
	constructor(dbh, options = {}) {
		/**
		 * The database handler to work with
		 */
		this._dbh = dbh;
		this._autocommit = true;
		this._raw = {};
		this._changes = {};

		this._tableName = this._table();
		this._locatefield = this._locatefield();

		// Use either locally provided or global database handle
		if(options.dbh) {
			this._dbh = options.dbh;
		}

		this._init(options);
	}

	/**
	 * Instructs class to either save changes to db after each field update, or
	 * accumulate the changes.
	 * @param {boolean} auto
	 */
	autocommit(auto) {
		if(auto && !this._autocommit) {
			// If there are potential unsaved changes, save them
			this.commit();
		}
		this._autocommit = auto;
	}

	/**
	 * Save accumulated changed fields, if any
	 */
	commit() {
		let sql = "";

		if(this._raw[this._locatefield] !== undefined) {
			sql = "UPDATE ";
		} else {
			sql = "INSERT INTO ";
		}

		sql += `${this._tableName} SET `;
		const fields = [];
		const values = [];
		Object.keys(this._changes).forEach((field) => {
			fields.push(field + "=?");
			values.push(this._raw[field]);
		});

		sql += fields.join(",");

		if(this._raw[this._locatefield] !== undefined) {
			sql += ` WHERE ${this._locatefield}=?`;
			values.push(this._raw[this._locatefield]);
		}

		var res = this._dbh.querySync(sql,values);
		// During the first insert the _locatefield field will be empty, and,
		// probably, generated by mysql
		if(this._raw[this._locatefield] === undefined) {
			this._raw[this._locatefield] = res.insertId;
			this._createAccessMethod(this._locatefield);
		}
	}

	/**
	 * Initializes class from the database or as an empty record.
	 *
	 * If 'options' contains a property named as _locatefield() defines, then we
	 * try to initialize from the database. Exception is thrown if there's no
	 * record found.
	 *
	 * @param options
	 * @protected
	 */
	_init(options) {
		// if "_locatefield" is set, then we need to read our data from the database
		if(options[this._locatefield]) {
			this._read(options[this._locatefield]);
		} else {
			// else create a new record: read the table info and build access methods
			this._initEmpty();
			this.autocommit(false);
		}
	}

	/**
	 * Reads values from the database, puts them into _raw and creates a function
	 * to get each value, so we can access fields as:
	 * obj.field();
	 * obj.field("new value");
	 * @protected
	 * @param {*} locateValue - the database unique id of the record
	 */
	_read(locateValue) {
		const rows = this._dbh.querySync(`SELECT * FROM ${this._tableName} WHERE ${this._locatefield}=? LIMIT 1`,
			[locateValue]);
		if(rows.length == 0) {
			throw "E_DB_NO_OBJECT";
		}

		this._raw = rows[0];

		// Create access methods for all fields
		Object.keys(this._raw).forEach((field) => { this._createAccessMethod(field); });
	}

	/**
	 * Initializes an empty object
	 * @private
	 */
	_initEmpty() {
		const rows = this._dbh.querySync(`DESCRIBE ${this._tableName}`);
		rows.forEach((field) => { this._createAccessMethod(field.Field); });
	}

	/**
	 * The template for access methods. Reads or sets the value of the object field.
	 * @param field
	 * @param value
	 * @private
	 */
	_accessField(field, value) {
		// We use the magic "\0" instead of undefined for non-set value, because we may need
		// to set NULL field: class.field(null)
		if(value !== "\0") {
			this._changes[field] = true;
			this._raw[field] = value;

			if(this._autocommit) {
				this.commit();
			}
		}

		return this._raw[field];
	}

	/**
	 * Creates a function within this class to get/set the certain field
	 * @param field
	 * @private
	 */
	_createAccessMethod(field) {
		this[field] = (value = "\0") => { return this._accessField(field, value); }
	}
}


export { DbRecord };
