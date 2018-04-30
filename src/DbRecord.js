import MysqlDatabase from "./MysqlDatabase";

/**
 * Represents the database record class.
**/
export default class DbRecord {
	_keys() { return []; }

	/**
	 * Creates the class instance. If options.${_locatefield()} parameter is specified,
	 * reads the data from the database and put them into the internal structures
	 * (see _init() and _read())
	 * @param {Object} [options]
	 */
	constructor(options = {}) {
		/**
		 * The database handler to work with
		 */
		this._autocommit = true;
		this._raw = {};
		this._changes = {};

		this._tableName = this._table();
		this._locateField = this._locatefield();

		// Use either locally provided or database handler factory
		if(options.dbh) {
			this._dbh = options.dbh;
		} else {
			this._dbh = MysqlDatabase.masterDbh();
		}

		this._init(options);
	}


	/**
	 * Tries creating an object by locate field/keys. Unlike constructor, does
	 * not throw an error for non-existing record and returns null instead.
	 * @param options
	 */
	static tryCreate(options = {}) {
		try {
			return new this(options);
		} catch(ex) {
			if(ex.message == "E_DB_NO_OBJECT") { return null; }
			else { throw ex; }
		}
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

		if(this._raw[this._locateField] !== undefined) {
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

		if(this._raw[this._locateField] !== undefined) {
			sql += ` WHERE ${this._locateField}=?`;
			values.push(this._raw[this._locateField]);
		}

		var res = this._dbh.querySync(sql, values);
		// During the first insert the ${_locatefield()} field will be empty, and,
		// probably, generated by mysql
		if(this._raw[this._locateField] === undefined) {
			this._raw[this._locateField] = res.insertId;
			this._createAccessMethod(this._locateField);
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
		let byKey = null;
		this._keys().forEach((k) => {
			if(options[k]) { byKey = k; }
		});

		// if "_locateField" is set, then we need to read our data from the database
		if(options[this._locateField]) {
			this._read(options[this._locateField]);
		}
		else if(byKey) {
			this._read(options[byKey], byKey);
		}
		else {
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
	 * @param {String} byKey - the field to search on. $_locateField by default.
	 */
	_read(locateValue, byKey) {
		let field = byKey || this._locateField;

		const rows = this._dbh.querySync(`SELECT * FROM ${this._tableName} WHERE ${field}=? LIMIT 1`,
			[locateValue]);
		if(rows.length == 0) {
			throw new Error("E_DB_NO_OBJECT");
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


	/**
	 * Removes the record from the database. No verification or integrity checks
	 * are being performed, they are up to caller.
	 */
	deleteRecord() {
		this._dbh.querySync(`DELETE FROM ${this._table()} WHERE ${this._locatefield()} = ?`,
			[ (this[this._locatefield()])() ]);
	}
}

