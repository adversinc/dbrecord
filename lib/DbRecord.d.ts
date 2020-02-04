import DbRecord2 from "advers-dbrecord2";
import MysqlDatabase from "./MysqlDatabase";
declare type TransactionCallback = (me: DbRecord) => Promise<boolean>;
/**
 * Represents the database record class.
**/
declare class DbRecord extends DbRecord2 {
    /**
     * @inheritdoc
     */
    constructor(options?: {});
    init(): any;
    static _getDbhClass(): typeof MysqlDatabase;
    /**
     * Tries creating an object by locate field/keys. Unlike constructor, does
     * not throw an error for non-existing record and returns null instead.
     * @param options
     */
    static tryCreate<T extends DbRecord>(this: {
        new ({}: {}): T;
    }, options?: DbRecord2.ObjectInitializer): T;
    /** Creates a new database record, populating it from the fields list
     * @param {Object} fields
     * @param {Object} [options] - options for database creation
     * @returns {DbRecord} the newly created object
     */
    static newRecord(fields: any, options?: {}): any;
    /**
     * Save accumulated changed fields, if any
     */
    commit(options?: {}): any;
    /**
     * Removes the record from the database. No verification or integrity checks
     * are being performed, they are up to caller.
     */
    deleteRecord(): any;
    /**
     * @inheritdoc
     */
    static forEach(options: any, cb: any): any;
    static _getDbhClassStatic(): typeof MysqlDatabase;
    _getDbhClass(): typeof MysqlDatabase;
    /**
     * Add value to mysql SET field
     * @param currentValue
     * @param newValue
     */
    static setFieldSet(currentValue: any, newValue: any): string;
    /**
     * Remove value from mysql SET field
     * @param currentValue
     * @param toRemove
     */
    static setFieldRemove(currentValue: any, toRemove: any): string;
    /**
     * Check if value in in mysql SET field
     * @param currentValue
     * @param toRemove
     */
    static setFieldCheck(currentValue: any, check: any): boolean;
    /**
     * @inheritdoc
     */
    transactionWithMe(cb: TransactionCallback): any;
    /**
     * Returns the current database handle
     */
    static masterDbh(): MysqlDatabase;
}
declare namespace DbRecord {
    export import ObjectInitializer = DbRecord2.ObjectInitializer;
    export import ForEachOptions = DbRecord2.ForEachOptions;
    export import Column = DbRecord2.Column;
}
export = DbRecord;
