'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _future = require('fibers/future');

var _future2 = _interopRequireDefault(_future);

var _merge = require('lodash/merge');

var _merge2 = _interopRequireDefault(_merge);

var _mysql = require('mysql');

var _mysql2 = _interopRequireDefault(_mysql);

var _continuationLocalStorage = require('continuation-local-storage');

var _continuationLocalStorage2 = _interopRequireDefault(_continuationLocalStorage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The MySQL connection wrapper which provides the following features:
 * - "master" db connection factory function
 * - sync queries (using Future)
 * - async queries (using Promises - not tested yet)
 * - nested transactions support (in progress)
 * - connection pooling for transaction
 * - local context of "master" db connection inside the transaction
 *
 */

var _masterConfig = {};
var _masterDbh = null;

// Connection pool
// If connection pool has been set up, MysqlDatabase will pick connections from it
var connectionPool = null;

// Local dbh context for transaction. Each transaction generates its own local
// context with its own "current global" dbh.
// During the transactions start, the value is populated with a transaction
// dbh, so all upcoming masterDbh() calls return the dbh actual for this transaction.
var trxContext = _continuationLocalStorage2.default.createNamespace('mysql-dbh');

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

var MysqlDatabase = function () {
	/**
  * config:
  * 	user, password, host - regular mysql connection settings
  * 	reuseConnection - during a transaction start, don't get a new connection
  * 	debugSQL - log all SQL queries (debug)
  * @param config
  */
	function MysqlDatabase(config) {
		_classCallCheck(this, MysqlDatabase);

		this._config = (0, _merge2.default)({}, config);

		this._db = null;
		this._createdFromPool = false;
		if (!connectionPool) {
			this._db = _mysql2.default.createConnection(this._config);
		}

		this._transacted = 0;
	}

	_createClass(MysqlDatabase, [{
		key: 'connect',
		value: function connect(cb) {
			var _this = this;

			if (connectionPool) {
				connectionPool.getConnection(function (err, dbh) {
					// console.log("connection taken from pool");
					_this._createdFromPool = true;
					_this._db = dbh;

					// SQL logging
					if (_this._config.debugSQL) {
						if (!_this._db._seq) {
							_this._db._seq = parseInt(Math.random() * 100000);
						}

						_this._db.on('enqueue', function (sequence) {
							console.log("QUERY (" + this._seq + "): ", sequence.sql);
						});
					}

					if (cb) {
						cb(err);
					}
				});
			} else {
				this._db.connect(cb);
			}
		}
	}, {
		key: 'connectSync',
		value: function connectSync() {
			var future = new _future2.default();
			this.connect(function (err) {
				if (err) {
					throw err;
				}

				future.return();
			});

			return future.wait();
		}
	}, {
		key: 'disconnect',
		value: function disconnect() {
			this._db.end();
		}
	}, {
		key: 'closeAndExit',
		value: function closeAndExit() {
			trxDb.destroy();
			setTimeout(function () {
				process.exit();
			}, 500);
		}
	}, {
		key: 'query',
		value: function query(_query, values, cb) {
			return this._db.query(_query, values, cb);
		}
	}, {
		key: 'queryAsync',
		value: function queryAsync(query, values) {
			var _this2 = this;

			return new Promise(function (resolve, reject) {
				_this2.query(query, values, function (err, res) {
					resolve(res);
				});
			});
		}

		/**
   * Runs a select query synchronously and returns the results
   * @param query - query to run
   * @param values - values to be passed to query
   */

	}, {
		key: 'querySync',
		value: function querySync(query, values) {
			var future = new _future2.default();

			// console.log("query", this._transacted?"(TRX)":"", query);

			this._db.query(query, values, function (err, q) {
				if (err) {
					//throw err;
					future.throw(err);
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

	}, {
		key: 'getRowSync',
		value: function getRowSync(query, values) {
			var rows = this.querySync(query, values);
			// It is questionable: should we return {} or null below? Which is easier to use?
			// {} seems to be safer to use, no null.field error will fire
			if (rows.length === 0) {
				return {};
			}

			return rows[0];
		}

		/**
   * Begins the database transaction.
   *
   * options:
   * 	reuseConnection - use the same connection (debug)
   *
   * @param {Function} cb - the callback to call. Should return 'false' if
   * 	transaction should be rolled back
   */

	}, {
		key: 'execTransaction',
		value: function execTransaction(cb) {
			// TODO GG: port the nested trasactions code here
			// Create another connection
			//const trxDb = new MysqlDatabase(mysql.createConnection(Meteor.settings.mysql));
			var trxDb = null;

			if (this._transacted > 0 || this._config.reuseConnection) {
				// In a nested transaction, don't create a new connection
				trxDb = this;
			} else {
				trxDb = new MysqlDatabase(this._config);
				trxDb._transacted = this._transacted;
				trxDb.connectSync();
			}

			// Only execute START TRANSACTION for the first-level trx
			if (trxDb._transacted++ === 0) {
				trxDb.querySync("START TRANSACTION  /* from trx */");
			}

			// console.log("before context");
			// Execute transaction and create a running context for it
			trxContext.run(function () {
				trxContext.set("dbh", trxDb);

				var res = false;
				try {
					res = cb(trxDb);
				} catch (ex) {
					trxDb.rollback();
					throw ex;
				}

				if (res === false) {
					trxDb.rollback();
				} else {
					trxDb.commit();
				}
			});

			// If we created a new connection, destroy it
			if (trxDb != this) {
				trxDb.destroy();
			}

			return trxDb;
		}

		/**
   * Commits the current database transaction
   */

	}, {
		key: 'commit',
		value: function commit() {
			if (this._transacted > 0) {
				this._transacted--;

				if (this._transacted === 0) {
					this.querySync("COMMIT /* from trx */");
				}
			}
		}

		/**
   * Rolls back the current database transaction
   */

	}, {
		key: 'rollback',
		value: function rollback() {
			if (this._transacted > 0) {
				this._transacted--;

				if (this._transacted === 0) {
					this.querySync("ROLLBACK");
				}
			}
		}
	}, {
		key: 'destroy',
		value: function destroy() {
			// Connections created from pool are to be released, direct connections destroyed
			if (this._createdFromPool) {
				this._db.release();
			} else {
				this._db.destroy();
			}

			this.removeHandlers();
		}
	}, {
		key: 'removeHandlers',
		value: function removeHandlers() {
			process.removeListener('SIGTERM', this._closeAndExit);
			process.removeListener('SIGINT', this._closeAndExit);
		}
	}, {
		key: '_closeAndExit',
		value: function _closeAndExit() {
			setTimeout(function () {
				process.exit();
			}, 500);
		}

		/**
   * The connection configuration for masterDbh
   * @param config
   */

	}], [{
		key: 'masterConfig',
		value: function masterConfig(config) {
			_masterConfig = config;
		}

		/**
   * The connection factory. Creates a global connection to be used by default
   */

	}, {
		key: 'masterDbh',
		value: function masterDbh() {
			// First try to get the local scope dbh of the current transaction
			var trxDbh = trxContext.get("dbh");
			if (trxDbh) {
				return trxDbh;
			}

			// If no global dbh exist, create it
			if (!_masterDbh) {
				_masterDbh = new MysqlDatabase(_masterConfig);
				_masterDbh.connectSync();
			}

			return _masterDbh;
		}
	}, {
		key: 'masterDbhDestroy',
		value: function masterDbhDestroy() {
			if (_masterDbh) {
				_masterDbh.destroy();
				_masterDbh = null;
			}
		}

		/**
   * Setup the mysql connection pool. All further connectionswill be
   * taken from within this pool.
   *
   * config:
   * 	user, password, host - regular mysql connection settings
   * 	connectionLimit - the size of the connection pool. Pool is used only if poolSize > 0
   * @param config
   */

	}, {
		key: 'setupPool',
		value: function setupPool(config) {
			this.masterConfig(config);
			connectionPool = _mysql2.default.createPool(config);
		}
	}]);

	return MysqlDatabase;
}();

exports.default = MysqlDatabase;
//# sourceMappingURL=MysqlDatabase.js.map