const
	Future = require( 'fibers/future' ),
	mysql = require('mysql');


function querySync(query, values) {
	return dbh.querySync(query, values);
}


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
		this._db = mysql.createConnection(config);
		this._transacted = 0;
	}

	disconnect() {
		this._db.end();
	}

	closeAndExit() {
		trxDb.destroy();
		setTimeout(() => { process.exit(); }, 500);
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
	querySingleSync(query, values) {
		const rows = this.querySync(query, values);
		// It is questionable: should we return {} or null below? Which is easier to use?
		// {} seems to be safer to use, no null.field error will fire
		if(rows.length === 0) { return {}; }

		return rows[0];
	}

	/**
	 * Begins the database transaction
	 */
	beginTransaction() {
		// TODO GG: port the nested trasactions code here
		if(this._transacted == 0) {
			// Create another connection
			const trxDb = new MysqlDatabase(mysql.createConnection(Meteor.settings.mysql));

			trxDb.querySync("BEGIN");
			trxDb._transacted++;

			// Close connections on hot code push
			process.on('SIGTERM', this.closeAndExit);
			// Close connections on exit (ctrl + c)
			process.on('SIGINT', this.closeAndExit);

			return trxDb;
		}
	}

	/**
	 * Commits the current database transaction
	 */
	commit() {
		if(this._transacted > 0) {
			this._transacted--;
			this.querySync("COMMIT");
			this._db.destroy();

			this.removeHandlers();
		}
	}

	/**
	 * Rolls back the current database transaction
	 */
	rollback() {
		if(this._transacted > 0) {
			this._transacted--;
			this.querySync("ROLLBACK");
			this._db.destroy();

			this.removeHandlers();
		}
	}

	destroy() {
		this._db.destroy();
		this.removeHandlers();
	}

	removeHandlers() {
		process.removeListener('SIGTERM', this.closeAndExit);
		process.removeListener('SIGINT', this.closeAndExit);
	}
}


export default MysqlDatabase;

