/* eslint-disable no-param-reassign,no-unused-vars,class-methods-use-this */
/**
 * Created by ashish on 02/05/18.
 */
const Boom = require('boom');
const loForEach = require('lodash/forEach');
const loIsEmpty = require('lodash/isEmpty');
const loReduce = require('lodash/reduce');
const loClone = require('lodash/clone');
const { ObjectID } = require('mongodb');
const AbstractAdapter = require('@itcutives/adapter-memory/src/abstract');
const Link = require('./link');

const reflect = promise => promise.then(v => ({ v, status: 'resolved' })).catch(e => ({ e, status: 'rejected' }));

class Adapter extends AbstractAdapter {
  static get LINKELEMENT() {
    return 'links';
  }

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
      // eslint-disable-next-line no-underscore-dangle
      if (entity._id && !entity.id) {
        // eslint-disable-next-line no-underscore-dangle
        this.properties.id = entity._id;
      }

      this.relationships = entity[Adapter.LINKELEMENT] || {};
    }
  }

  serialise() {
    loForEach(this.constructor.SERIALIZED, (v, k) => {
      let value = this.get(k);
      if (value) {
        if (v === 'objectId') {
          value = new ObjectID(value);
        }
        this.properties[k] = value;
      }
    });
    return Promise.resolve(this);
  }

  deserialise() {
    return Promise.resolve(this);
  }

  static isIdField(field) {
    return (field === 'id' || field.indexOf('_id') !== -1);
  }

  static fixIdField(field) {
    return field === 'id' ? '_id' : field;
  }

  static convertKey(id) {
    if (Array.isArray(id)) {
      id = id.map(i => new ObjectID(i));
    } else if (typeof id === 'string' && id.length === 24) {
      id = new ObjectID(id);
    }
    return id;
  }

  /**
   *
   * @param conditions
   * @return {*}
   */
  conditionBuilder(conditions = []) {
    let opr;
    let condition;
    let temp;
    let isFirst;
    let compiled;
    let where;
    const lookups = [];
    const addFields = [];

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

      if (Adapter.isIdField(cond.field)) {
        cond.value = Adapter.convertKey(cond.value);
        cond.field = Adapter.fixIdField(cond.field);
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
          // for joins
          if (cond.field.indexOf('$') === 0) {
            where.$eq = [cond.field, cond.value];
          } else {
            where[cond.field] = cond.value;
          }
          break;
        case '$in':
        case '$nin':
          if (cond.value.condition) {
            let parentTable;
            if (cond.value.class) {
              const ClassConstructor = cond.value.class;
              const instance = new ClassConstructor();
              parentTable = instance.getTableName();
            } else if (cond.value.table) {
              // eslint-disable-next-line prefer-destructuring
              parentTable = cond.value.table;
            }
            lookups.push({
              $lookup: {
                from: `${parentTable}`,
                let: {
                  id: `$${cond.field}`,
                },
                pipeline: [{
                  $match: {
                    $expr: {
                      $and: [{
                        $eq: [`$${cond.value.select}`, '$$id'],
                      }],
                    },
                  },
                }],
                as: `${Adapter.LINKELEMENT}.${parentTable}`,
              },
            });
            addFields.push({
              $addFields: {
                [`${Adapter.LINKELEMENT}.${parentTable}`]: {
                  $map: {
                    input: `$${Adapter.LINKELEMENT}.${parentTable}`,
                    as: 'el',
                    in: '$$el._id',
                  },
                },
              },
            });
            where = { [`${Adapter.LINKELEMENT}.${parentTable}`]: { $elemMatch: this.conditionBuilder(cond.value.condition)[0].$match } };
          } else if (!Array.isArray(cond.value)) {
            cond.value = [cond.value];
            where[cond.field][opr] = cond.value;
          } else {
            where[cond.field][opr] = cond.value;
          }
          break;
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

    let final = [];

    if (lookups.length) {
      final = final.concat(lookups);
    }

    final.push({ $match: compiled });

    if (addFields) {
      final = final.concat(addFields);
    }

    return final;
  }

  /**
   *
   * @param order
   * @returns {*}
   */
  static getOrderByFields(order = []) {
    if (!order || order.length <= 0) {
      return {};
    }
    const orderBy = {};
    // order
    if (Array.isArray(order) === true) {
      order.forEach((o) => {
        if (o.indexOf('-') === 0) {
          orderBy[o] = -1;
        } else {
          orderBy[o] = 1;
        }
      });
    } else if (typeof order === 'object') {
      loForEach(order, (value, key) => {
        if (value.toLowerCase() === 'desc') {
          orderBy[key] = -1;
        } else {
          orderBy[key] = 1;
        }
      });
    } else {
      orderBy[order] = 1;
    }

    return orderBy;
  }

  async toLink(fields, ModelPath) {
    let link;
    const links = this.constructor.LINKS;
    const promises = [];
    const object = this.properties;

    object.links = {};
    links.forEach((l) => {
      if (fields && fields.indexOf(l.PLURAL) === -1) {
        return;
      }
      link = new Link(this, l, this.relationships);
      promises.push(link.toLink(object, ModelPath));
    });
    if (promises.length > 0) {
      let results = await Promise.all(promises.map(reflect));
      results = results.filter(x => x.status === 'resolved').map(x => x.v);
      return Object.assign.apply({}, results);
    }
    return this.properties;
  }

  static async fromLink(Cls, object) {
    let link;

    const links = Cls.LINKS;
    const promises = [];
    const o = new Adapter();

    links.forEach((l) => {
      link = new Link(o, l);
      promises.push(link.fromLink(object));
    });

    if (promises.length > 0) {
      let results = await Promise.all(promises.map(reflect));
      results = results.filter(x => x.status === 'resolved').map(x => x.v);
      const result = Object.assign.apply({}, results);
      return new Cls(result);
    }
    return new Cls(object);
  }

  /**
   *
   * @param select [] | * | ""
   * @returns {*}
   */
  static getSelectFields(select = '*') {
    let selected;
    // check fields
    if (Array.isArray(select)) {
      selected = {};
      select.forEach((s) => {
        selected[s] = 1;
      });
    } else if (loIsEmpty(select) || select === '*') {
      // default value
      selected = undefined;
    } else {
      selected = { [select]: 1 };
    }
    return selected;
  }

  /**
   *
   * @returns {string}
   */
  getTableName() {
    return this.constructor.TABLE;
  }

  async query(table, condition, select, order, from, limit) {
    condition = await this.conditionBuilder(condition);
    select = Adapter.getSelectFields(select);
    order = Adapter.getOrderByFields(order);
    let query = [];
    if (!loIsEmpty(condition)) {
      query = query.concat(condition);
    }

    if (select) {
      if (JSON.stringify(condition).indexOf('"$lookup"') !== -1) {
        select[Adapter.LINKELEMENT] = 1;
      }
      query.push({ $project: select });
    }

    if (!loIsEmpty(order)) {
      query.push({ $sort: order });
    }

    if (from) {
      query.push({ $skip: from });
    }

    if (limit) {
      query.push({ $limit: limit });
    }

    Adapter.debug(JSON.stringify(query));
    const connection = await Adapter.CONN.openConnection();
    return connection.collection(table).aggregate(query).toArray();
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
  async SELECT(condition, select, order, from, limit) {
    const table = this.getTableName();
    limit = limit || this.constructor.PAGESIZE;
    const result = await this.query(table, condition, select, order, from, limit);
    const Cls = this.constructor;
    return Promise.all(result.map(v => new Cls(v)).map(v => v.deserialise()));
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
    Adapter.debug('INSERT:', JSON.stringify(this.properties));
    return connection.collection(table).insert(this.properties).then(r => r.insertedIds['0']);
  }

  /**
   * @return {*|promise}
   */
  async UPDATE() {
    let condition;
    let chg = [];
    const set = {};

    if (loIsEmpty(this.original) || !this.original.get('id')) {
      throw Boom.badRequest('bad conditions');
    }

    await this.serialise();

    condition = {
      id: this.original.get('id').toString(),
    };
    const changes = this.getChanges();

    if (loIsEmpty(changes)) {
      throw new Error('invalid request (no changes)');
    }

    loForEach(changes, (value, key) => {
      const o = Object.keys(value)[0];
      if (o && o.indexOf('$') === 0) {
        chg.push(value);
      } else {
        set[key] = value;
      }
    });
    if (!loIsEmpty(set)) {
      chg.push({ $set: set });
    }
    chg = loReduce(chg, (obj, n) => {
      const k = Object.keys(n)[0];
      if (obj[k]) {
        obj[k] = Object.assign(obj[k], n[k]);
      } else {
        obj = Object.assign(obj, n);
      }
      return obj;
    });

    condition = this.conditionBuilder(condition)[0].$match;
    Adapter.debug('UPDATE:', JSON.stringify({ condition, changes: chg }));
    const connection = await Adapter.CONN.openConnection();
    const table = this.getTableName();
    return connection.collection(table).updateOne(condition, chg).then(result => result.result.nModified > 0);
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
      id: this.get('id'),
    };

    condition = this.conditionBuilder(condition)[0].$match;
    const table = this.getTableName();
    const connection = await Adapter.CONN.openConnection();
    return connection.collection(table).deleteOne(condition).then(result => result.deleteCount > 0);
  }
}

module.exports = Adapter;
