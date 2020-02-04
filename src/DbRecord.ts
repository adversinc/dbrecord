import Fiber from 'fibers';
import Future from 'fibers/future';

import DbRecord2 from "advers-dbrecord2";
import MysqlDatabase from "./MysqlDatabase";

type TransactionCallback = (me: DbRecord) => Promise<boolean>;

/**
 * Represents the database record class.
**/
// @ts-ignorea
class DbRecord extends DbRecord2 {
	/**
	 * @inheritdoc
	 */
	constructor(options = {}) {
		super(options);

		const future = new Future();
		super.init()
			.then(res => future.return(res))
			.catch(err => { future.throw(err) });
		return future.wait();
	}

	init(): any {
		// Empty here, DbRecord does not need init
	}

	static _getDbhClass() {
		return MysqlDatabase;
	}

	/**
	 * Tries creating an object by locate field/keys. Unlike constructor, does
	 * not throw an error for non-existing record and returns null instead.
	 * @param options
	 */
	static tryCreate<T extends DbRecord>(this: { new({}): T }, options: DbRecord2.ObjectInitializer = {}): T {
		try {
			return new this(options);
		} catch(ex) {
			if(ex.message == "E_DB_NO_OBJECT") { return null; }
			else { throw ex; }
		}
	}


	/** Creates a new database record, populating it from the fields list
	 * @param {Object} fields
	 * @param {Object} [options] - options for database creation
	 * @returns {DbRecord} the newly created object
	 */
	static newRecord(fields, options = {}) {
		const future = new Future();
		super.newRecord(fields, options)
			.then(res => future.return(res))
			.catch(err => { future.throw(err) });
		return future.wait();
	}

	/**
	 * Save accumulated changed fields, if any
	 */
	commit(options = {}) {
		// If called without a fiber, fall to super
		if(Fiber.current === undefined) {
			return super.commit(options);
		}

		const future = new Future();
		super.commit()
			.then(res => future.return(res))
			.catch(err => { future.throw(err) });
		return future.wait();
	}


	/**
	 * Removes the record from the database. No verification or integrity checks
	 * are being performed, they are up to caller.
	 */
	deleteRecord() {
		const future = new Future();
		super.deleteRecord()
			.then(res => future.return(res))
			.catch(err => { future.throw(err) });
		return future.wait();
	}


	/**
	 * @inheritdoc
	 */
	static forEach(options, cb) {
		const where = [];
		const qparam = [];
		const sql = this._prepareForEach(options, where, qparam);

		//
		// Iterate
		const _dbh =  this._getDbhClassStatic().masterDbh();

		/*
		if(TARGET === "development") {
			console.log(`${_dbh._db.threadId}: will be running forEach query`);
		}
		*/

		const rows = _dbh.querySync(sql, qparam);
		options.TOTAL = rows.length;

		if(cb) {
			options.COUNTER = 0;

			for(const row of rows) {
				options.COUNTER++;

				const o = {};
				o[this._locatefield()] = row[this._locatefield()];
				const obj = new this(o);

				// Wait for iterator to end
				cb(obj, options);
			}
		} else {
			options.COUNTER = options.TOTAL;
		}

		return options.COUNTER;
	}


	static _getDbhClassStatic() {
		return MysqlDatabase;
	}
	_getDbhClass() {
		return MysqlDatabase;
	}

	// Helper functions

	/**
	 * Add value to mysql SET field
	 * @param currentValue
	 * @param newValue
	 */
	static setFieldSet(currentValue, newValue) {
		const parts = (typeof(currentValue) === "string" && currentValue !== "")?
			currentValue.split(","):
			[];
		parts.push(newValue);
		return parts.join(",");
	}

	/**
	 * Remove value from mysql SET field
	 * @param currentValue
	 * @param toRemove
	 */
	static setFieldRemove(currentValue, toRemove) {
		let parts = (typeof(currentValue) === "string")? currentValue.split(","): [];
		parts = parts.filter(v => v !== toRemove);
		return parts.join(",");
	}

	/**
	 * Check if value in in mysql SET field
	 * @param currentValue
	 * @param toRemove
	 */
	static setFieldCheck(currentValue, check) {
		const parts = (typeof(currentValue) === "string")? currentValue.split(","): [];
		return parts.includes(check);
	}

	/**
	 * @inheritdoc
	 */
	transactionWithMe(cb: TransactionCallback): any {
		const Class = this.constructor;

		// Make sure we are committed
		if(Object.keys(this._changes).length > 0) {
			throw new Error(`${Class.name}: Object has uncommitted changes before transaction`);
		}

		const dbh = (Class as any).masterDbh();
		dbh.execTransaction(() => {
			const params = {};
			params[this._locateField] = this[this._locateField]();
			const me = new (this.constructor as any)(params);

			return cb(me);
		});

		// Re-read our object after the transaction
		Future.fromPromise(
			this._read(this[this._locateField]())
		).wait();
	}

	/**
	 * Returns the current database handle
	 */
	static masterDbh(): MysqlDatabase {
		return this._getDbhClassStatic().masterDbh();
	}
}

namespace DbRecord {
	export import ObjectInitializer = DbRecord2.ObjectInitializer;
	export import ForEachOptions = DbRecord2.ForEachOptions;

	export import Column = DbRecord2.Column;
}

export = DbRecord;
