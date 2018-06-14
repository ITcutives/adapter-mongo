/**
 * Created by ashish on 02/05/18.
 */
const Boom = require('boom');
const _forEach = require('lodash/forEach');
const _isEmpty = require('lodash/isEmpty');
const _clone = require('lodash/clone');
const {ObjectID} = require('mongodb');
const AbstractAdapter = require('./abstract');

class Adapter extends AbstractAdapter {
  /**
   * @return {string}
   */
  static get DATABASE() {
    return '';
  }

  /**
   * @return {{}}
   */
  static get SERIALIZED() {
    return {};
  }

  /**
   * @return {string}
   */
  static get PLURAL() {
    return '';
  }

  /**
   * @return {string}
   */
  static get TABLE() {
    return '';
  }

  /**
   * @return {Array}
   */
  static get FIELDS() {
    return [];
  }

  /**
   * @return {Array}
   */
  static get LINKS() {
    return [];
  }

  constructor(entity) {
    super();
    if (entity) {
      _forEach(entity, (v, field) => {
        if (this.constructor.FIELDS.indexOf(field) !== -1) {
          this.properties[field] = v;
        }
      });
    }
  }

  serialise() {
    return Promise.resolve(this);
  }

  deserialise() {
    return Promise.resolve(this);
  }

  convertKey(id) {
    if (typeof id === 'string' && id.length === 24) {
      return new ObjectID(id);
    }
    return id;
  }

  /**
   *
   * @param conditions
   * @return {*}
   */
  conditionBuilder(conditions) {
    let opr,
      condition,
      temp,
      isFirst,
      sampleCondition,
      operators,
      compiled,
      where;
    isFirst = true;
    sampleCondition = {
      field: '',
      operator: '=',
      value: '',
      condition: '$and'
    };
    operators = {
      '=': '$eq',
      '<': '$lt',
      '>': '$gt',
      '<=': '$lte',
      '>=': '$gte',
      '<>': '$ne',
      '!=': '$ne',
      // 'like': ,
      // 'not like',
      // 'ilike',
      'regexp': '$regex',
      'between': 'between',
      'in': '$in',
      'not in': '$nin'
    };

    compiled = {};

    _forEach(conditions, (cond, key) => {
      // for key-value pairs
      if (typeof cond !== 'object' || cond === null) {
        temp = cond;
        cond = _clone(sampleCondition);
        cond.field = key;
        cond.value = temp;
      }

      // Operator
      opr = '=';
      if (cond.operator && operators[cond.operator]) {
        opr = cond.operator;
      }
      opr = operators[opr];
      // condition
      condition = '$and';
      if (cond.condition && !_isEmpty(cond.condition)) {
        condition = cond.condition.toLocaleLowerCase() === 'or' ? '$or' : '$and';
      }

      where = {[cond.field]: {}};
      switch (opr) {
        case 'between':
          where[cond.field] = {
            '$gte': cond.value[0],
            '$lte': cond.value[1]
          };
          break;
        case '$regex':
          where[cond.field] = {
            [opr]: new RegExp(cond.value)
          };
          break;
        case '$eq':
          where[cond.field] = cond.value;
          break;
        case '$in':
        case '$nin':
          if (!Array.isArray(cond.value)) {
            cond.value = [cond.value];
          }
        // falls through
        default:
          where[cond.field][opr] = cond.value;
      }
      if (isFirst === true) {
        compiled = where;
      } else {
        compiled = {
          [condition]: [where, compiled]
        };
      }
      isFirst = false;
    });
    return compiled;
  }

  /**
   *
   * @param condition
   * @param select
   * @param order
   * @param from
   * @param limit
   * @return {*|promise}
   */
  SELECT(condition, select, order, from, limit) {
    throw Boom.badImplementation('[adapter] `SELECT` method not implemented');
  }

  /**
   * @param values
   * @return {*|promise}
   */
  async INSERT(values) {
    let table,
      connection;

    if (_isEmpty(this.properties)) {
      throw new Error('invalid request (empty values)');
    }

    await this.serialise();
    connection = await Adapter.CONN.openConnection();
    table = this.getTableName();
    Adapter.debug(this.properties);
    return connection.collection(table).insert(this.properties);
  }

  /**
   * @return {*|promise}
   */
  async UPDATE() {
    let changes,
      condition,
      connection,
      table;

    if (_isEmpty(this.original) || !this.original.get('id')) {
      throw Boom.badRequest('bad conditions');
    }

    await this.serialise();

    condition = {
      'id': new ObjectID(this.original.get('id'))
    };
    changes = this.getChanges();

    if (_isEmpty(changes)) {
      throw new Error('invalid request (no changes)');
    }

    condition = this.conditionBuilder(condition);
    connection = await Adapter.CONN.openConnection();
    table = this.getTableName();

    return connection.collection(table).updateOne(condition, {$set: changes}).then(result => result.result.nModified > 0);

  }

  /**
   * @return {*|promise}
   */
  async DELETE() {
    let table,
      sql,
      condition,
      connection;

    if (!this.get('id')) {
      throw new Error('invalid request (no condition)');
    }

    condition = {
      'id': new ObjectID(this.get('id'))
    };

    condition = this.conditionBuilder(condition);
    table = this.getTableName();
    connection = await Adapter.CONN.openConnection();
    return connection.collection(table).deleteOne(condition).then(result => result.deleteCount > 0);
  }
}

module.exports = Adapter;
