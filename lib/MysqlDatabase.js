"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fibers = _interopRequireDefault(require("fibers"));

var _future = _interopRequireDefault(require("fibers/future"));

var _merge = _interopRequireDefault(require("lodash/merge"));

var _mysql = _interopRequireDefault(require("mysql"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
let masterConfig = {};
let masterDbh = null; // Connection pool
// If connection pool has been set up, MysqlDatabase will pick connections from it

let connectionPool = null;
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
  /**
   * config:
   * 	user, password, host - regular mysql connection settings
   * 	reuseConnection - during a transaction start, don't get a new connection
   * 	debugSQL - log all SQL queries (debug)
   * @param config
   */
  constructor(config) {
    this._config = (0, _merge.default)({}, config);
    this._db = null;
    this._createdFromPool = false;

    if (!connectionPool) {
      this._db = _mysql.default.createConnection(this._config);
    }

    this._transacted = 0;
  }

  connect(cb) {
    if (connectionPool) {
      connectionPool.getConnection((err, dbh) => {
        // console.log("connection taken from pool");
        this._createdFromPool = true;
        this._db = dbh; // SQL logging

        if (this._config.debugSQL) {
          if (!this._db._seq) {
            this._db._seq = parseInt(Math.random() * 100000);
          }

          this._db.on('enqueue', function (sequence) {
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

  connectSync() {
    const future = new _future.default();
    this.connect(err => {
      if (err) {
        throw err;
      }

      console.log(`${this._db.threadId}: mysql connected`);
      future.return();
    });
    return future.wait();
  }

  disconnect() {
    console.log(`${this._db.threadId}: closing mysql threadId`);

    this._db.end();
  }

  closeAndExit() {
    trxDb.destroy();
    setTimeout(() => {
      process.exit();
    }, 500);
  }

  query(query, values, cb) {
    return this._db.query(query, values, cb);
  }

  queryAsync(query, values) {
    return new Promise((resolve, reject) => {
      this.query(query, values, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }
  /**
   * Runs a select query synchronously and returns the results
   * @param query - query to run
   * @param values - values to be passed to query
   */


  querySync(query, values) {
    const future = new _future.default(); // console.log("query", this._transacted?"(TRX)":"", query);

    this._db.query(query, values, (err, q) => {
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


  getRowSync(query, values) {
    const rows = this.querySync(query, values); // It is questionable: should we return {} or null below? Which is easier to use?
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


  execTransaction(cb) {
    // TODO GG: port the nested trasactions code here
    let trxDb = null;

    if (this._transacted > 0 || this._config.reuseConnection) {
      // In a nested transaction, don't create a new connection
      trxDb = this;
    } else {
      console.log(`Old ${this._db.threadId} is creating transaction connection`);
      trxDb = new MysqlDatabase(this._config);
      trxDb._transacted = this._transacted;
      trxDb.connectSync();
    } // Only execute START TRANSACTION for the first-level trx


    if (trxDb._transacted++ === 0) {
      trxDb.querySync("START TRANSACTION  /* from trx */");
    } // Execute transaction and create a running context for it


    console.log("T:", JSON.stringify(_fibers.default.current));

    _future.default.task(() => {
      _fibers.default.current._dbh = trxDb;
      let res = false;

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
    }).wait(); // If we created a new connection, destroy it


    if (trxDb != this) {
      console.log(`${trxDb._db.threadId}: destroying trxDb`);
      trxDb.destroy();
    }

    return trxDb;
  }
  /**
   * Commits the current database transaction
   */


  commit() {
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


  rollback() {
    if (this._transacted > 0) {
      this._transacted--;

      if (this._transacted === 0) {
        this.querySync("ROLLBACK");
      }
    }
  }

  destroy() {
    // Connections created from pool are to be released, direct connections destroyed
    if (this._createdFromPool) {
      this._db.release();
    } else {
      this._db.destroy();
    }

    this.removeHandlers();
  }

  removeHandlers() {
    process.removeListener('SIGTERM', this._closeAndExit);
    process.removeListener('SIGINT', this._closeAndExit);
  }

  _closeAndExit() {
    setTimeout(() => {
      process.exit();
    }, 500);
  }
  /**
   * The connection configuration for masterDbh
   * @param config
   */


  static masterConfig(config) {
    masterConfig = config;
  }
  /**
   * The connection factory. Creates a global connection to be used by default.
   *
   * @returns {MysqlDatabase} current mysql database connection class
   */


  static masterDbh() {
    // First try to get the local scope dbh of the current transaction
    const trxDbh = _fibers.default.current ? _fibers.default.current._dbh : null;
    console.log(`call for masterDbh(), trxDbh: ${trxDbh}`);
    console.trace();

    if (trxDbh) {
      return trxDbh;
    } // If no global dbh exist, create it


    if (!masterDbh) {
      masterDbh = new MysqlDatabase(masterConfig);
      masterDbh.connectSync();
    }

    return masterDbh;
  }

  static masterDbhDestroy() {
    if (masterDbh) {
      masterDbh.destroy();
      masterDbh = null;
    }

    this.destroyPoll();
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


  static setupPool(config) {
    this.masterConfig(config);
    connectionPool = _mysql.default.createPool(config);
  }

  static destroyPoll() {
    if (connectionPool) {
      connectionPool.end(err => {
        // console.log("connectionPool destroyed");
        connectionPool = null;
      });
    }
  }

}

var _default = MysqlDatabase;
exports.default = _default;
module.exports = exports.default;