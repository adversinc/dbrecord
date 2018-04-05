const
	Future = require( 'fibers/future' ),
	lodashMerge = require('lodash/merge'),
	mysql = require('mysql');

function querySync(query, values) {
	return dbh.querySync(query, values);
}

let globalConfig = {};
let globalDbh = null;

/**
 * The database processing class.
 *
 * Transaction processing
 *
 * The problem is that all queries share the same mysql connection. Thus, even
 * if we have started the transaction, other queries can intervene within it.
 *
 * To avoid this, we create a separate connection when calling code starts
 * transaction. Then we return the new database handle ("transacted") to use,
 * and commit/rollback at the end.
 *
 * var dbh = dbh.beginTransaction(); // new dbh is created here
 * ....
 * dbh.commit();
 */
class MysqlDatabase {
	constructor(config) {
		//console.log("created MysqlDatabase:", db);
		this._config = lodashMerge({}, config);
		this._db = mysql.createConnection(this._config);
		this._transacted = 0;
		this._seq = Math.random();
	}

	connect(cb) {
		this._db.connect(cb);
	}

	connectSync() {
		const future = new Future();
		this.connect((err) => {
			if(err) {
				throw err;
			}

			future.return();
		});

		return future.wait();
	}

	disconnect() {
		this._db.end();
	}

	closeAndExit() {
		trxDb.destroy();
		setTimeout(() => { process.exit(); }, 500);
	}

	query(query, values, cb) {
		return this._db.query(query, values, cb);
	}

	queryAsync(query, values) {
		return new Promise((resolve, reject) => {
			this.query(query, values, (err, res) => {
				resolve(res);
			});
		});
	}

	/**
	 * Runs a select query synchronously and returns the results
	 * @param query - query to run
	 * @param values - values to be passed to query
	 */
	querySync(query, values) {
		const future = new Future();

		// console.log("query", this._transacted?"(TRX)":"", query);

		this._db.query(query, values, (err, q) => {
			if(err) {
				throw err;
				future.return(err);
			} else {
				future.return(q);
			}
		});

		return future.wait();
	}

	/**
	 * A shortcut function to get a single rows without messing with row arrays
	 *
	 * @param query
	 * @param values
	 * @returns {Object} - the object with selected fields or {} of no rows found
	 */
	getRowSync(query, values) {
		const rows = this.querySync(query, values);
		// It is questionable: should we return {} or null below? Which is easier to use?
		// {} seems to be safer to use, no null.field error will fire
		if(rows.length === 0) { return {}; }

		return rows[0];
	}

	/**
	 * Begins the database transaction
	 * @param {Function} cb - the callback to call. Should return 'false' if
	 * 	transaction should be rolled back
	 */
	execTransaction(cb) {
		// TODO GG: port the nested trasactions code here
		if(this._transacted == 0) {
			// Create another connection
			//const trxDb = new MysqlDatabase(mysql.createConnection(Meteor.settings.mysql));
			const trxDb = this;

			trxDb.querySync("START TRANSACTION  /* from trx */");
			trxDb._transacted++;

			let res = false;
			try {
				res = cb(this);
			} catch(ex) {
				trxDb.rollback();
				throw ex;
			}

			if(res === false) {
				trxDb.rollback();
			} else {
				trxDb.commit();
			}

			return trxDb;
		}
	}

	/**
	 * Commits the current database transaction
	 */
	commit() {
		if(this._transacted > 0) {
			this._transacted--;
			this.querySync("COMMIT /* from trx */");
		}
	}

	/**
	 * Rolls back the current database transaction
	 */
	rollback() {
		if(this._transacted > 0) {
			this._transacted--;
			this.querySync("ROLLBACK /* from trx */");
		}
	}

	destroy() {
		this._db.destroy();
		this.removeHandlers();
	}


	/**
	 * The connection configuration for globalDbh
	 * @param config
	 */
	static globalConfig(config) {
		globalConfig = config;
	}

	/**
	 * The connection factory. Creates a global connection to be used by default
	 */
	static globalDbh() {
		if(!globalDbh) {
			globalDbh = new MysqlDatabase(globalConfig);
			globalDbh.connectSync();
		}

		return globalDbh;
	}
}


export default MysqlDatabase;

