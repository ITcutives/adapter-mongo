/* eslint-disable no-param-reassign,no-unused-vars,class-methods-use-this */
/**
 * Created by ashish on 02/05/18.
 */
const Boom = require('boom');
const loForEach = require('lodash/forEach');
const loIsEmpty = require('lodash/isEmpty');
const loClone = require('lodash/clone');
const { ObjectID } = require('mongodb');
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
      loForEach(entity, (v, field) => {
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

  static convertKey(id) {
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
    let opr;
    let condition;
    let temp;
    let isFirst;
    let compiled;
    let where;

    isFirst = true;
    const sampleCondition = {
      field: '',
      operator: '=',
      value: '',
      condition: '$and',
    };
    const operators = {
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
      regexp: '$regex',
      between: 'between',
      in: '$in',
      'not in': '$nin',
    };

    compiled = {};

    loForEach(conditions, (cond, key) => {
      // for key-value pairs
      if (typeof cond !== 'object' || cond === null) {
        temp = cond;
        cond = loClone(sampleCondition);
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
      if (cond.condition && !loIsEmpty(cond.condition)) {
        condition = cond.condition.toLocaleLowerCase() === 'or' ? '$or' : '$and';
      }

      where = { [cond.field]: {} };
      switch (opr) {
        case 'between':
          where[cond.field] = {
            $gte: cond.value[0],
            $lte: cond.value[1],
          };
          break;
        case '$regex':
          where[cond.field] = {
            [opr]: new RegExp(cond.value),
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
          [condition]: [where, compiled],
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
    if (loIsEmpty(this.properties)) {
      throw new Error('invalid request (empty values)');
    }

    await this.serialise();
    const connection = await Adapter.CONN.openConnection();
    const table = this.getTableName();
    Adapter.debug(this.properties);
    return connection.collection(table).insert(this.properties);
  }

  /**
   * @return {*|promise}
   */
  async UPDATE() {
    let condition;

    if (loIsEmpty(this.original) || !this.original.get('id')) {
      throw Boom.badRequest('bad conditions');
    }

    await this.serialise();

    condition = {
      id: new ObjectID(this.original.get('id')),
    };
    const changes = this.getChanges();

    if (loIsEmpty(changes)) {
      throw new Error('invalid request (no changes)');
    }

    condition = this.conditionBuilder(condition);
    const connection = await Adapter.CONN.openConnection();
    const table = this.getTableName();

    return connection.collection(table).updateOne(condition, { $set: changes }).then(result => result.result.nModified > 0);
  }

  /**
   * @return {*|promise}
   */
  async DELETE() {
    let condition;

    if (!this.get('id')) {
      throw new Error('invalid request (no condition)');
    }

    condition = {
      id: new ObjectID(this.get('id')),
    };

    condition = this.conditionBuilder(condition);
    const table = this.getTableName();
    const connection = await Adapter.CONN.openConnection();
    return connection.collection(table).deleteOne(condition).then(result => result.deleteCount > 0);
  }
}

module.exports = Adapter;
