import MysqlDatabase2 from "advers-dbrecord2/lib/MysqlDatabase2";
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
declare class MysqlDatabase extends MysqlDatabase2 {
    /**
     * config:
     * 	user, password, host - regular mysql connection settings
     * 	reuseConnection - during a transaction start, don't get a new connection
     * 	debugSQL - log all SQL queries (debug)
     * @param config
     */
    constructor(config: MysqlDatabase2.DbConfig);
    connectSync(): any;
    /**
     * Runs a select query synchronously and returns the results
     * @param query - query to run
     * @param values - values to be passed to query
     */
    querySync(query: string, values?: MysqlDatabase2.FieldValue[]): any;
    /**
     * A shortcut function to get a single rows without messing with row arrays
     *
     * @param query
     * @param values
     * @returns {Object} - the object with selected fields or {} of no rows found
     */
    getRowSync(query: string, values?: MysqlDatabase2.FieldValue[]): any;
    /**
     * @inheritdoc
     */
    execTransaction(cb: any): any;
    /**
     * @inheritdoc
     */
    commit(): any;
    /**
     * @inheritdoc
     */
    rollback(): any;
    /**
     * @inheritdoc
     */
    static masterDbh(): any;
}
declare namespace MysqlDatabase {
}
export = MysqlDatabase;
