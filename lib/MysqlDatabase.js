"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const future_1 = __importDefault(require("fibers/future"));
const MysqlDatabase2_1 = __importDefault(require("advers-dbrecord2/lib/MysqlDatabase2"));
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
class MysqlDatabase extends MysqlDatabase2_1.default {
    /**
     * config:
     * 	user, password, host - regular mysql connection settings
     * 	reuseConnection - during a transaction start, don't get a new connection
     * 	debugSQL - log all SQL queries (debug)
     * @param config
     */
    constructor(config) {
        super(config);
    }
    connectSync() {
        return future_1.default.fromPromise(super.connect()).wait();
    }
    /**
     * Runs a select query synchronously and returns the results
     * @param query - query to run
     * @param values - values to be passed to query
     */
    querySync(query, values) {
        return future_1.default.fromPromise(this.queryAsync(query, values)).wait();
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
        if (rows.length === 0) {
            return {};
        }
        return rows[0];
    }
    /**
     * @inheritdoc
     */
    execTransaction(cb) {
        const wrapper = async (dbh) => {
            return future_1.default.task(() => {
                return cb(dbh);
            }).promise();
        };
        return future_1.default.fromPromise(super.execTransaction(wrapper)).wait();
    }
    /**
     * @inheritdoc
     */
    commit() {
        return future_1.default.fromPromise(super.commit()).wait();
    }
    /**
     * @inheritdoc
     */
    rollback() {
        return future_1.default.fromPromise(super.rollback()).wait();
    }
    /**
     * @inheritdoc
     */
    static masterDbh() {
        return future_1.default.fromPromise(super.masterDbh()).wait();
    }
}
exports.default = MysqlDatabase;
