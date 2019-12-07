"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _future = _interopRequireDefault(require("fibers/future"));

var _MysqlDatabase = _interopRequireDefault(require("advers-dbrecord2/lib/MysqlDatabase2"));

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
class MysqlDatabase extends _MysqlDatabase.default {
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
    return _future.default.fromPromise(super.connect()).wait();
  }
  /**
   * Runs a select query synchronously and returns the results
   * @param query - query to run
   * @param values - values to be passed to query
   */


  querySync(query, values) {
    return _future.default.fromPromise(this.queryAsync(query, values)).wait();
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
   * @inheritdoc
   */


  execTransaction(cb) {
    const wrapper = async dbh => {
      return _future.default.task(() => {
        return cb(dbh);
      }).promise();
    };

    return _future.default.fromPromise(super.execTransaction(wrapper)).wait();
  }
  /**
   * @inheritdoc
   */


  commit() {
    return _future.default.fromPromise(super.commit()).wait();
  }
  /**
   * @inheritdoc
   */


  rollback() {
    return _future.default.fromPromise(super.rollback()).wait();
  }
  /**
   * @inheritdoc
   */


  static masterDbh() {
    return _future.default.fromPromise(super.masterDbh()).wait();
  }

}

var _default = MysqlDatabase;
exports.default = _default;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9NeXNxbERhdGFiYXNlLmpzIl0sIm5hbWVzIjpbIk15c3FsRGF0YWJhc2UiLCJNeXNxbERhdGFiYXNlMiIsImNvbnN0cnVjdG9yIiwiY29uZmlnIiwiY29ubmVjdFN5bmMiLCJGdXR1cmUiLCJmcm9tUHJvbWlzZSIsImNvbm5lY3QiLCJ3YWl0IiwicXVlcnlTeW5jIiwicXVlcnkiLCJ2YWx1ZXMiLCJxdWVyeUFzeW5jIiwiZ2V0Um93U3luYyIsInJvd3MiLCJsZW5ndGgiLCJleGVjVHJhbnNhY3Rpb24iLCJjYiIsIndyYXBwZXIiLCJkYmgiLCJ0YXNrIiwicHJvbWlzZSIsImNvbW1pdCIsInJvbGxiYWNrIiwibWFzdGVyRGJoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBRUE7Ozs7QUFFQTs7Ozs7Ozs7Ozs7QUFXQTs7Ozs7Ozs7Ozs7Ozs7OztBQWdCQSxNQUFNQSxhQUFOLFNBQTRCQyxzQkFBNUIsQ0FBMkM7QUFDMUM7Ozs7Ozs7QUFPQUMsRUFBQUEsV0FBVyxDQUFDQyxNQUFELEVBQVM7QUFDbkIsVUFBTUEsTUFBTjtBQUNBOztBQUVEQyxFQUFBQSxXQUFXLEdBQUc7QUFDYixXQUFPQyxnQkFBT0MsV0FBUCxDQUFtQixNQUFNQyxPQUFOLEVBQW5CLEVBQW9DQyxJQUFwQyxFQUFQO0FBQ0E7QUFFRDs7Ozs7OztBQUtBQyxFQUFBQSxTQUFTLENBQUNDLEtBQUQsRUFBUUMsTUFBUixFQUFnQjtBQUN4QixXQUFPTixnQkFBT0MsV0FBUCxDQUNOLEtBQUtNLFVBQUwsQ0FBZ0JGLEtBQWhCLEVBQXVCQyxNQUF2QixDQURNLEVBRUxILElBRkssRUFBUDtBQUdBO0FBRUQ7Ozs7Ozs7OztBQU9BSyxFQUFBQSxVQUFVLENBQUNILEtBQUQsRUFBUUMsTUFBUixFQUFnQjtBQUN6QixVQUFNRyxJQUFJLEdBQUcsS0FBS0wsU0FBTCxDQUFlQyxLQUFmLEVBQXNCQyxNQUF0QixDQUFiLENBRHlCLENBRXpCO0FBQ0E7O0FBQ0EsUUFBR0csSUFBSSxDQUFDQyxNQUFMLEtBQWdCLENBQW5CLEVBQXNCO0FBQUUsYUFBTyxFQUFQO0FBQVk7O0FBRXBDLFdBQU9ELElBQUksQ0FBQyxDQUFELENBQVg7QUFDQTtBQUVEOzs7OztBQUdBRSxFQUFBQSxlQUFlLENBQUNDLEVBQUQsRUFBSztBQUNuQixVQUFNQyxPQUFPLEdBQUcsTUFBTUMsR0FBTixJQUFjO0FBQzdCLGFBQU9kLGdCQUFPZSxJQUFQLENBQVksTUFBTTtBQUN4QixlQUFPSCxFQUFFLENBQUNFLEdBQUQsQ0FBVDtBQUNBLE9BRk0sRUFFSkUsT0FGSSxFQUFQO0FBR0EsS0FKRDs7QUFNQSxXQUFPaEIsZ0JBQU9DLFdBQVAsQ0FBbUIsTUFBTVUsZUFBTixDQUFzQkUsT0FBdEIsQ0FBbkIsRUFBbURWLElBQW5ELEVBQVA7QUFDQTtBQUVEOzs7OztBQUdBYyxFQUFBQSxNQUFNLEdBQUc7QUFDUixXQUFPakIsZ0JBQU9DLFdBQVAsQ0FBbUIsTUFBTWdCLE1BQU4sRUFBbkIsRUFBbUNkLElBQW5DLEVBQVA7QUFDQTtBQUVEOzs7OztBQUdBZSxFQUFBQSxRQUFRLEdBQUc7QUFDVixXQUFPbEIsZ0JBQU9DLFdBQVAsQ0FBbUIsTUFBTWlCLFFBQU4sRUFBbkIsRUFBcUNmLElBQXJDLEVBQVA7QUFDQTtBQUVEOzs7OztBQUdBLFNBQU9nQixTQUFQLEdBQW1CO0FBQ2xCLFdBQU9uQixnQkFBT0MsV0FBUCxDQUFtQixNQUFNa0IsU0FBTixFQUFuQixFQUFzQ2hCLElBQXRDLEVBQVA7QUFDQTs7QUEzRXlDOztlQStFNUJSLGEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRnV0dXJlIGZyb20gJ2ZpYmVycy9mdXR1cmUnO1xuXG5pbXBvcnQgTXlzcWxEYXRhYmFzZTIgZnJvbSBcImFkdmVycy1kYnJlY29yZDIvbGliL015c3FsRGF0YWJhc2UyXCI7XG5cbi8qKlxuICogVGhlIE15U1FMIGNvbm5lY3Rpb24gd3JhcHBlciB3aGljaCBwcm92aWRlcyB0aGUgZm9sbG93aW5nIGZlYXR1cmVzOlxuICogLSBcIm1hc3RlclwiIGRiIGNvbm5lY3Rpb24gZmFjdG9yeSBmdW5jdGlvblxuICogLSBzeW5jIHF1ZXJpZXMgKHVzaW5nIEZ1dHVyZSlcbiAqIC0gYXN5bmMgcXVlcmllcyAodXNpbmcgUHJvbWlzZXMgLSBub3QgdGVzdGVkIHlldClcbiAqIC0gbmVzdGVkIHRyYW5zYWN0aW9ucyBzdXBwb3J0IChpbiBwcm9ncmVzcylcbiAqIC0gY29ubmVjdGlvbiBwb29saW5nIGZvciB0cmFuc2FjdGlvblxuICogLSBsb2NhbCBjb250ZXh0IG9mIFwibWFzdGVyXCIgZGIgY29ubmVjdGlvbiBpbnNpZGUgdGhlIHRyYW5zYWN0aW9uXG4gKlxuICovXG5cbi8qKlxuICogVGhlIGRhdGFiYXNlIHByb2Nlc3NpbmcgY2xhc3MuXG4gKlxuICogVHJhbnNhY3Rpb24gcHJvY2Vzc2luZ1xuICpcbiAqIFRoZSBwcm9ibGVtIGlzIHRoYXQgYWxsIHF1ZXJpZXMgc2hhcmUgdGhlIHNhbWUgbXlzcWwgY29ubmVjdGlvbi4gVGh1cywgZXZlblxuICogaWYgd2UgaGF2ZSBzdGFydGVkIHRoZSB0cmFuc2FjdGlvbiwgb3RoZXIgcXVlcmllcyBjYW4gaW50ZXJ2ZW5lIHdpdGhpbiBpdC5cbiAqXG4gKiBUbyBhdm9pZCB0aGlzLCB3ZSBjcmVhdGUgYSBzZXBhcmF0ZSBjb25uZWN0aW9uIHdoZW4gY2FsbGluZyBjb2RlIHN0YXJ0c1xuICogdHJhbnNhY3Rpb24uIFRoZW4gd2UgcmV0dXJuIHRoZSBuZXcgZGF0YWJhc2UgaGFuZGxlIChcInRyYW5zYWN0ZWRcIikgdG8gdXNlLFxuICogYW5kIGNvbW1pdC9yb2xsYmFjayBhdCB0aGUgZW5kLlxuICpcbiAqIHZhciBkYmggPSBkYmguYmVnaW5UcmFuc2FjdGlvbigpOyAvLyBuZXcgZGJoIGlzIGNyZWF0ZWQgaGVyZVxuICogLi4uLlxuICogZGJoLmNvbW1pdCgpO1xuICovXG5jbGFzcyBNeXNxbERhdGFiYXNlIGV4dGVuZHMgTXlzcWxEYXRhYmFzZTIge1xuXHQvKipcblx0ICogY29uZmlnOlxuXHQgKiBcdHVzZXIsIHBhc3N3b3JkLCBob3N0IC0gcmVndWxhciBteXNxbCBjb25uZWN0aW9uIHNldHRpbmdzXG5cdCAqIFx0cmV1c2VDb25uZWN0aW9uIC0gZHVyaW5nIGEgdHJhbnNhY3Rpb24gc3RhcnQsIGRvbid0IGdldCBhIG5ldyBjb25uZWN0aW9uXG5cdCAqIFx0ZGVidWdTUUwgLSBsb2cgYWxsIFNRTCBxdWVyaWVzIChkZWJ1Zylcblx0ICogQHBhcmFtIGNvbmZpZ1xuXHQgKi9cblx0Y29uc3RydWN0b3IoY29uZmlnKSB7XG5cdFx0c3VwZXIoY29uZmlnKTtcblx0fVxuXG5cdGNvbm5lY3RTeW5jKCkge1xuXHRcdHJldHVybiBGdXR1cmUuZnJvbVByb21pc2Uoc3VwZXIuY29ubmVjdCgpKS53YWl0KCk7XG5cdH1cblxuXHQvKipcblx0ICogUnVucyBhIHNlbGVjdCBxdWVyeSBzeW5jaHJvbm91c2x5IGFuZCByZXR1cm5zIHRoZSByZXN1bHRzXG5cdCAqIEBwYXJhbSBxdWVyeSAtIHF1ZXJ5IHRvIHJ1blxuXHQgKiBAcGFyYW0gdmFsdWVzIC0gdmFsdWVzIHRvIGJlIHBhc3NlZCB0byBxdWVyeVxuXHQgKi9cblx0cXVlcnlTeW5jKHF1ZXJ5LCB2YWx1ZXMpIHtcblx0XHRyZXR1cm4gRnV0dXJlLmZyb21Qcm9taXNlKFxuXHRcdFx0dGhpcy5xdWVyeUFzeW5jKHF1ZXJ5LCB2YWx1ZXMpXG5cdFx0KS53YWl0KCk7XG5cdH1cblxuXHQvKipcblx0ICogQSBzaG9ydGN1dCBmdW5jdGlvbiB0byBnZXQgYSBzaW5nbGUgcm93cyB3aXRob3V0IG1lc3Npbmcgd2l0aCByb3cgYXJyYXlzXG5cdCAqXG5cdCAqIEBwYXJhbSBxdWVyeVxuXHQgKiBAcGFyYW0gdmFsdWVzXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IC0gdGhlIG9iamVjdCB3aXRoIHNlbGVjdGVkIGZpZWxkcyBvciB7fSBvZiBubyByb3dzIGZvdW5kXG5cdCAqL1xuXHRnZXRSb3dTeW5jKHF1ZXJ5LCB2YWx1ZXMpIHtcblx0XHRjb25zdCByb3dzID0gdGhpcy5xdWVyeVN5bmMocXVlcnksIHZhbHVlcyk7XG5cdFx0Ly8gSXQgaXMgcXVlc3Rpb25hYmxlOiBzaG91bGQgd2UgcmV0dXJuIHt9IG9yIG51bGwgYmVsb3c/IFdoaWNoIGlzIGVhc2llciB0byB1c2U/XG5cdFx0Ly8ge30gc2VlbXMgdG8gYmUgc2FmZXIgdG8gdXNlLCBubyBudWxsLmZpZWxkIGVycm9yIHdpbGwgZmlyZVxuXHRcdGlmKHJvd3MubGVuZ3RoID09PSAwKSB7IHJldHVybiB7fTsgfVxuXG5cdFx0cmV0dXJuIHJvd3NbMF07XG5cdH1cblxuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdGV4ZWNUcmFuc2FjdGlvbihjYikge1xuXHRcdGNvbnN0IHdyYXBwZXIgPSBhc3luYyhkYmgpID0+IHtcblx0XHRcdHJldHVybiBGdXR1cmUudGFzaygoKSA9PiB7XG5cdFx0XHRcdHJldHVybiBjYihkYmgpO1xuXHRcdFx0fSkucHJvbWlzZSgpO1xuXHRcdH07XG5cblx0XHRyZXR1cm4gRnV0dXJlLmZyb21Qcm9taXNlKHN1cGVyLmV4ZWNUcmFuc2FjdGlvbih3cmFwcGVyKSkud2FpdCgpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBpbmhlcml0ZG9jXG5cdCAqL1xuXHRjb21taXQoKSB7XG5cdFx0cmV0dXJuIEZ1dHVyZS5mcm9tUHJvbWlzZShzdXBlci5jb21taXQoKSkud2FpdCgpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBpbmhlcml0ZG9jXG5cdCAqL1xuXHRyb2xsYmFjaygpIHtcblx0XHRyZXR1cm4gRnV0dXJlLmZyb21Qcm9taXNlKHN1cGVyLnJvbGxiYWNrKCkpLndhaXQoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0c3RhdGljIG1hc3RlckRiaCgpIHtcblx0XHRyZXR1cm4gRnV0dXJlLmZyb21Qcm9taXNlKHN1cGVyLm1hc3RlckRiaCgpKS53YWl0KCk7XG5cdH1cbn1cblxuXG5leHBvcnQgZGVmYXVsdCBNeXNxbERhdGFiYXNlO1xuXG4iXX0=