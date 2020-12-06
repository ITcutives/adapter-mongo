/**
 * Created by ashish on 17/5/17.
 */
const path = require('path');
const { ObjectID } = require('mongodb');
const loCloneDeep = require('lodash/cloneDeep');
const Model = require('../models/model');

describe('AbstractModelInstance - MongoDB', () => {
  describe('constructor', () => {
    it('should leave properties as empty object if nothing is provided', () => {
      const model = new Model();
      expect(model.properties).toEqual({});
    });

    it('should set properties that matches field names', () => {
      const model = new Model({ a: 1, b: 2, c: 3 });
      expect(model.properties).toEqual({ a: 1, b: 2 });
    });

    it('should set _id field as id if id field is not provided', () => {
      const model = new Model({ a: 1, _id: 2 });
      expect(model.properties).toEqual({ a: 1, id: 2 });
    });

    it('should not use _id field if id field is also provided', () => {
      const model = new Model({ a: 1, _id: 2, id: 3 });
      expect(model.properties).toEqual({ a: 1, id: 3 });
    });

    it('should set nested properties (json-object) correctly', () => {
      const model = new Model({ a: 1, b: { c: 2 } });
      expect(model.properties).toEqual({ a: 1, b: { c: 2 } });
    });
  });

  describe('setContext', () => {
    let model;

    beforeEach(() => {
      model = new Model({});
    });

    it('should set correct context', () => {
      model.setContext({ uuid: '1111' });
      expect(model.context).toEqual({ uuid: '1111' });
    });
  });

  describe('getContext', () => {
    let model;

    beforeEach(() => {
      model = new Model({});
    });

    it('should get correct context', () => {
      model.context = { uuid: '1111' };
      expect(model.getContext()).toEqual({ uuid: '1111' });
    });
  });

  describe('getTableName', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({});
    });

    it('should only return table', () => {
      Model.TABLE = 'table1';
      expect(model.getTableName()).toBe('table1');
    });
  });

  describe('setOriginal', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({});
    });

    it("should not set original if object type doesn't match", () => {
      model.setOriginal({ a: 1 });
      expect(model.original).toBe(undefined);
    });

    it("should set original if object type doesn't match", () => {
      const obj = new Model({ a: 1 });
      model.setOriginal(obj);
      expect(model.original).toBe(obj);
    });
  });

  describe('set', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({});
    });

    it('should not set value if field is invalid', () => {
      model.set('c', 10);
      expect(model.properties).toEqual({});
    });

    it('should set value if field is valid', () => {
      model.set('a', 10);
      expect(model.properties.a).toBe(10);
    });

    it('should set `properties` as empty object and set property', () => {
      model.properties = undefined;
      model.set('a', 10);
      expect(model.properties.a).toBe(10);
    });
  });

  describe('get', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({ a: 10 });
    });

    it('should return undefined for invalid field name', () => {
      expect(model.get('c')).toBe(undefined);
    });

    it('should return field value for valid', () => {
      expect(model.get('a')).toBe(10);
    });
  });

  describe('processSerialised', () => {
    let model;

    beforeEach(() => {
      model = new Model({});
    });

    it('should return field and value as it is if field is not in serialised list', () => {
      expect(model.processSerialised('name', 'ashish')).toEqual({ field: 'name', value: 'ashish' });
    });

    it('should return field and serialised value (objectId)', () => {
      expect(model.processSerialised('objectIdField', '5d4aae08f61692ad5f01294d')).toEqual({
        field: 'objectIdField',
        value: new ObjectID('5d4aae08f61692ad5f01294d'),
      });
    });

    it('should return field and serialised value (array of objectId)', () => {
      expect(model.processSerialised('objectIdField', ['5d4aae08f61692ad5f01294d', '5d4ab4c9f61692ad5f01294e'])).toEqual({
        field: 'objectIdField',
        value: [new ObjectID('5d4aae08f61692ad5f01294d'), new ObjectID('5d4ab4c9f61692ad5f01294e')],
      });
    });
  });

  describe('conditionBuilder', () => {
    let mongo;
    const conditions = [
      {
        description: 'should build aggregate query comparing two fields',
        input: [{
          field: '$a',
          value: '$b',
        }],
        output: [{
          $match: {
            $eq: [
              '$a',
              '$b',
            ],
          },
        }],
      },
      {
        description: 'should build aggregate query with $lookup with related table',
        input: [{
          field: 'id',
          operator: 'in',
          value: {
            class: require('../models/relatives'),
            select: 'a_id',
            condition: { a_id: 'abc' },
          },
        }],
        output: [
          {
            $lookup: {
              from: 'related',
              let: {
                id: '$_id',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$a_id',
                            '$$id',
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'links.related',
            },
          },
          {
            $match: {
              'links.related': {
                $elemMatch: {
                  a_id: 'abc',
                },
              },
            },
          },
          {
            $addFields: {
              'links.related': {
                $map: {
                  input: '$links.related',
                  as: 'el',
                  in: '$$el._id',
                },
              },
            },
          },
        ]
        ,
      },
      {
        description: 'should build aggregate query with $lookup with self',
        input: [{
          field: 'id',
          operator: 'in',
          value: {
            select: 'a_id',
            condition: { a_id: 'abc' },
          },
        }],
        output: [
          {
            $lookup: {
              from: 'table1',
              let: {
                id: '$_id',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$a_id',
                            '$$id',
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'links.table1',
            },
          },
          {
            $match: {
              'links.table1': {
                $elemMatch: {
                  a_id: 'abc',
                },
              },
            },
          },
          {
            $addFields: {
              'links.table1': {
                $map: {
                  input: '$links.table1',
                  as: 'el',
                  in: '$$el._id',
                },
              },
            },
          },
        ]
        ,
      },
      {
        description: 'should build aggregate query with $lookup with table name provided',
        input: [{
          field: 'id',
          operator: 'in',
          value: {
            select: 'a_id',
            table: 'table2',
            condition: { a_id: 'abc' },
          },
        }],
        output: [
          {
            $lookup: {
              from: 'table2',
              let: {
                id: '$_id',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$a_id',
                            '$$id',
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'links.table2',
            },
          },
          {
            $match: {
              'links.table2': {
                $elemMatch: {
                  a_id: 'abc',
                },
              },
            },
          },
          {
            $addFields: {
              'links.table2': {
                $map: {
                  input: '$links.table2',
                  as: 'el',
                  in: '$$el._id',
                },
              },
            },
          },
        ]
        ,
      },
    ];

    beforeEach(() => {
      Model.TABLE = 'table1';
      mongo = new Model({});
    });

    afterEach(() => {
      Model.TABLE = undefined;
    });

    conditions.forEach((condition) => {
      it(condition.description, () => {
        expect(mongo.conditionBuilder(condition.input)).toEqual(condition.output);
      });
    });
  });

  describe('remove', () => {
    let model = null;

    it('should remove valid field', () => {
      model = new Model({ a: 10, b: 20 });
      model.remove('a');
      expect(model.properties).toEqual({ b: 20 });
    });

    it('should return undefined for invalid field name', () => {
      model = new Model({ a: 10 });
      model.remove('c');
      expect(model.properties).toEqual({ a: 10 });
    });

    it('should return undefined if property is not set', () => {
      model = new Model();
      delete model.properties;
      model.remove('c');
      expect(model.properties).toBe(undefined);
    });
  });

  describe('query', () => {
    let mongo;
    let conn;
    let object;
    let condition;

    beforeEach(() => {
      conn = {
        aggregate: jest.fn(),
        collection: jest.fn(),
        toArray: jest.fn(),
      };
      conn.collection.mockReturnValue(conn);
      conn.aggregate.mockReturnValue(conn);
      object = {
        a: 10,
        b: 20,
      };
      conn.toArray.mockResolvedValue([object]);
      condition = [{ field: 'a', value: '10' }];
      Model.CONN = {};
      Model.CONN.openConnection = jest.fn().mockResolvedValue(conn);
      mongo = new Model();
    });

    it('should run aggregate function without conditions', async () => {
      await expect(mongo.query('table1')).resolves.toEqual([object]);
      expect(conn.aggregate).toHaveBeenCalledWith([]);
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });

    it('should run aggregate function with conditions', async () => {
      await expect(mongo.query('table1', condition)).resolves.toEqual([object]);
      expect(conn.aggregate).toHaveBeenCalledWith([{ $match: { a: '10' } }]);
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });

    it('should run aggregate function with selected fields to project', async () => {
      await expect(mongo.query('table1', condition, ['a', 'b'])).resolves.toEqual([object]);
      expect(conn.aggregate).toHaveBeenCalledWith([{ $match: { a: '10' } }, { $project: { a: 1, b: 1 } }]);
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });

    it('should run aggregate function with selected fields to project (join table)', async () => {
      condition = [{
        field: 'id',
        operator: 'in',
        value: {
          class: require('../models/relatives'),
          select: 'a_id',
          condition: { a_id: 'abc' },
        },
      }];
      await expect(mongo.query('table1', condition, ['a', 'b'])).resolves.toEqual([object]);
      expect(conn.aggregate).toHaveBeenCalledWith([
        {
          $lookup: {
            from: 'related',
            let: {
              id: '$_id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          '$a_id',
                          '$$id',
                        ],
                      },
                    ],
                  },
                },
              },
            ],
            as: 'links.related',
          },
        },
        {
          $match: {
            'links.related': {
              $elemMatch: {
                a_id: 'abc',
              },
            },
          },
        },
        {
          $addFields: {
            'links.related': {
              $map: {
                input: '$links.related',
                as: 'el',
                in: '$$el._id',
              },
            },
          },
        },
        { $project: { a: 1, b: 1, links: 1 } },
      ]);
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });

    it('should run aggregate function with sort fields', async () => {
      await expect(mongo.query('table1', condition, ['a', 'b'], ['a', '-b'])).resolves.toEqual([object]);
      expect(conn.aggregate).toHaveBeenCalledWith([
        { $match: { a: '10' } },
        { $project: { a: 1, b: 1 } },
        { $sort: { a: 1, b: -1 } },
      ]);
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });

    it('should run aggregate function with from and limit fields', async () => {
      await expect(mongo.query('table1', condition, ['a', 'b'], ['a', '-b'], 10, 100)).resolves.toEqual([object]);
      expect(conn.aggregate).toHaveBeenCalledWith([
        { $match: { a: '10' } },
        { $project: { a: 1, b: 1 } },
        { $sort: { a: 1, b: -1 } },
        { $skip: 10 },
        { $limit: 100 },
      ]);
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });

    it('should run aggregate function without from and limit fields when from is not provided', async () => {
      await expect(mongo.query('table1', condition, ['a', 'b'], ['a', '-b'], undefined, 100)).resolves.toEqual([object]);
      expect(conn.aggregate).toHaveBeenCalledWith([
        { $match: { a: '10' } },
        { $project: { a: 1, b: 1 } },
        { $sort: { a: 1, b: -1 } },
      ]);
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });

    it('should throw error when query fails to execute', async () => {
      const err = new Error('mongo aggregate error');
      conn.toArray.mockRejectedValue(err);
      await expect(mongo.query('table1')).rejects.toEqual(err);
      expect(conn.aggregate).toHaveBeenCalledWith([]);
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });
  });

  describe('SELECT', () => {
    let mongo;
    const sampleCondition = { a: 1, b: '2' };
    const sampleSelect1 = ['a', 'b'];
    const sampleSelect2 = 'a';
    const sampleOrderby1 = ['a', 'b'];
    const sampleOrderby2 = 'a';
    const output = [{ a: 1, b: '1' }, { a: 1, b: '2' }];

    const expectation = [
      new Model(output[0]),
      new Model(output[1]),
    ];
    expectation[0].setOriginal(new Model(output[0]));
    expectation[1].setOriginal(new Model(output[1]));

    beforeEach(() => {
      mongo = new Model({});
      mongo.query = jest.fn();
    });

    it('should select all rows of table', async () => {
      mongo.query.mockResolvedValue(output);
      Model.TABLE = 'table1';

      await expect(mongo.SELECT()).resolves.toEqual(expectation);
      expect(mongo.query).toHaveBeenCalledWith('table1', undefined, undefined, undefined, undefined, 100);
    });

    it('should select all fields where it matches condition', async () => {
      mongo.query.mockResolvedValue([output[1]]);
      Model.TABLE = 'table2';

      await expect(mongo.SELECT(sampleCondition)).resolves.toEqual([expectation[1]]);
      expect(mongo.query).toHaveBeenCalledWith('table2', sampleCondition, undefined, undefined, undefined, 100);
    });

    it('should select some fields where it matches condition', async () => {
      mongo.query.mockResolvedValue([output[1]]);
      Model.TABLE = 'table3';
      await expect(mongo.SELECT(sampleCondition, sampleSelect1)).resolves.toEqual([expectation[1]]);
      expect(mongo.query).toHaveBeenCalledWith('table3', sampleCondition, sampleSelect1, undefined, undefined, 100);
    });

    it('should select some fields where it matches condition and order by multiple fields', async () => {
      mongo.query.mockResolvedValue([output[1]]);
      Model.TABLE = 'table4';
      await expect(mongo.SELECT(sampleCondition, sampleSelect2, sampleOrderby1)).resolves.toEqual([expectation[1]]);
      expect(mongo.query).toHaveBeenCalledWith('table4', sampleCondition, sampleSelect2, sampleOrderby1, undefined, 100);
    });

    it('should select some fields where it matches condition and order by one field', async () => {
      mongo.query.mockResolvedValue([output[1]]);
      Model.TABLE = 'table5';
      await expect(mongo.SELECT(sampleCondition, sampleSelect2, sampleOrderby2)).resolves.toEqual([expectation[1]]);
      expect(mongo.query).toHaveBeenCalledWith('table5', sampleCondition, sampleSelect2, sampleOrderby2, undefined, 100);
    });

    it('query throws exception', async () => {
      const err = new Error('mongo select error');
      mongo.query.mockRejectedValue(err);
      Model.TABLE = 'table6';
      await expect(mongo.SELECT(sampleCondition)).rejects.toEqual(err);
    });
  });

  describe('COUNT', () => {
    let mongo;
    let conn;
    const sampleCondition = { a: 1, b: '2' };
    const sampleCondition2 = [{
      field: 'id',
      operator: 'in',
      value: {
        class: require('../models/relatives'),
        select: 'a_id',
        condition: { a_id: 'abc' },
      },
    }];

    beforeEach(() => {
      mongo = new Model({});

      conn = {
        aggregate: jest.fn(),
        collection: jest.fn(),
        toArray: jest.fn(),
      };
      conn.collection.mockReturnValue(conn);
      conn.aggregate.mockReturnValue(conn);

      Model.CONN = {};
      Model.CONN.openConnection = jest.fn().mockResolvedValue(conn);
    });

    it('should count all rows of table', async () => {
      conn.toArray.mockResolvedValue([{ _id: null, n: 500 }]);
      Model.TABLE = 'table1';

      await expect(mongo.COUNT()).resolves.toEqual(500);
      expect(conn.aggregate).toHaveBeenCalledWith([{ $group: { _id: null, n: { $sum: 1 } } }]);
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });

    it('should count all records where it matches condition', async () => {
      conn.toArray.mockResolvedValue([{ _id: null, n: 5 }]);
      Model.TABLE = 'table2';

      await expect(mongo.COUNT(sampleCondition)).resolves.toEqual(5);
      expect(conn.aggregate).toHaveBeenCalledWith([{
        $match: {
          $and: [{ b: '2' }, { a: 1 }],
        },
      }, {
        $group: {
          _id: null,
          n: { $sum: 1 },
        },
      }]);
      expect(conn.collection).toHaveBeenCalledWith('table2');
    });

    it('should select some fields where it matches condition (m2m)', async () => {
      conn.toArray.mockResolvedValue([{ _id: null, n: 5 }]);
      Model.TABLE = 'table3';
      await expect(mongo.COUNT(sampleCondition2)).resolves.toEqual(5);
      expect(conn.aggregate).toHaveBeenCalledWith([
        {
          $lookup: {
            from: 'related',
            let: {
              id: '$_id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          '$a_id',
                          '$$id',
                        ],
                      },
                    ],
                  },
                },
              },
            ],
            as: 'links.related',
          },
        },
        {
          $match: {
            'links.related': {
              $elemMatch: {
                a_id: 'abc',
              },
            },
          },
        },
        {
          $addFields: {
            'links.related': {
              $map: {
                input: '$links.related',
                as: 'el',
                in: '$$el._id',
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            n: {
              $sum: 1,
            },
          },
        },
      ]);
      expect(conn.collection).toHaveBeenCalledWith('table3');
    });
    //
    it('should return 0 when query returns nothing', async () => {
      conn.toArray.mockResolvedValue([]);
      Model.TABLE = 'table4';
      await expect(mongo.COUNT(sampleCondition)).resolves.toEqual(0);
      expect(conn.aggregate).toHaveBeenCalledWith([{
        $match: {
          $and: [{ b: '2' }, { a: 1 }],
        },
      }, {
        $group: {
          _id: null,
          n: { $sum: 1 },
        },
      }]);
      expect(conn.collection).toHaveBeenCalledWith('table4');
    });

    it('query throws exception', async () => {
      const err = new Error('mongo select error');
      conn.toArray.mockRejectedValue(err);
      Model.TABLE = 'table6';
      await expect(mongo.COUNT(sampleCondition)).rejects.toEqual(err);
      expect(conn.collection).toHaveBeenCalledWith('table6');
    });
  });

  describe('INSERT', () => {
    let mongo;
    let conn;

    beforeEach(() => {
      conn = {
        insertOne: jest.fn(),
        collection: jest.fn(),
      };
      conn.collection.mockReturnValue(conn);
      Model.CONN = {};
      Model.CONN.openConnection = jest.fn().mockResolvedValue(conn);
      mongo = new Model({});
    });

    it('insert operation responds success', async () => {
      conn.insertOne.mockResolvedValue({ insertedId: '5d7c67fd217ffe92f90b1b1b' });
      Model.TABLE = 'table';
      mongo.set('a', 1);
      mongo.set('b', 2);
      await expect(mongo.INSERT()).resolves.toEqual('5d7c67fd217ffe92f90b1b1b');
      expect(conn.insertOne).toHaveBeenCalledWith({ a: 1, b: 2 });
      expect(conn.collection).toHaveBeenCalledWith('table');
    });

    it('insert operation throws exception', async () => {
      const err = new Error('mongo insert error');
      conn.insertOne.mockRejectedValue(err);
      Model.TABLE = 'table2';
      mongo.set('a', 1);
      mongo.set('b', 2);
      await expect(mongo.INSERT()).rejects.toEqual(err);
      expect(conn.insertOne).toHaveBeenCalledWith({ a: 1, b: 2 });
      expect(conn.collection).toHaveBeenCalledWith('table2');
    });

    it("INSERT throws exception 'invalid request (empty values)'", async () => {
      Model.TABLE = 'table2';
      await expect(mongo.INSERT()).rejects.toEqual(new Error('invalid request (empty values)'));
    });
  });

  describe('UPDATE', () => {
    let mongo;
    let object;
    let conn;

    beforeEach(() => {
      conn = {
        updateOne: jest.fn(),
        collection: jest.fn(),
      };
      conn.collection.mockReturnValue(conn);
      Model.CONN = {};
      Model.CONN.openConnection = jest.fn().mockResolvedValue(conn);
      object = {
        id: '5d7c67fd217ffe92f90b1b1b',
        a: 1,
        b: '2',
        jsonField: {
          name: 'ashish',
          address: { street: '21b baker st' },
        },
      };
      mongo = new Model(object);
      mongo.setOriginal(new Model(loCloneDeep(object)));
    });

    it('should throw error if original is not set', async () => {
      delete mongo.original;
      await expect(mongo.UPDATE()).rejects.toEqual(new Error('bad conditions'));
    });

    it('should throw error if original.id is not set', async () => {
      mongo.original.remove('id');
      await expect(mongo.UPDATE()).rejects.toEqual(new Error('bad conditions'));
    });

    it('should throw error if there are no changes', async () => {
      await expect(mongo.UPDATE()).rejects.toEqual(new Error('invalid request (no changes)'));
    });

    it('should prepare the changes and execute updateOne', async () => {
      conn.updateOne.mockResolvedValue({ result: { nModified: 1 } });
      Model.TABLE = 'table1';
      mongo.set('a', 10);
      await expect(mongo.UPDATE()).resolves.toEqual(true);
      expect(conn.updateOne).toHaveBeenCalledWith({ _id: new ObjectID(object.id) }, { $set: { a: 10 } });
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });

    it('should prepare the changes and execute updateOne (mongo specific feature)', async () => {
      conn.updateOne.mockResolvedValue({ result: { nModified: 1 } });
      Model.TABLE = 'table3';
      mongo.set('a', { $inc: { a: 1 } });
      mongo.set('b', { $inc: { b: 11 } });
      mongo.set('jsonField.address.postcode', 222);
      await expect(mongo.UPDATE()).resolves.toEqual(true);
      expect(conn.updateOne).toHaveBeenCalledWith({ _id: new ObjectID(object.id) }, {
        $inc: { a: 1, b: 11 },
        $set: {
          'jsonField.address.postcode': 222,
        },
      });
      expect(conn.collection).toHaveBeenCalledWith('table3');
    });

    it('should prepare the changes (just $inc, without normal changes) and execute updateOne (mongo specific feature)', async () => {
      conn.updateOne.mockResolvedValue({ result: { nModified: 1 } });
      Model.TABLE = 'table3';
      mongo.set('a', { $inc: { a: 1 } });
      await expect(mongo.UPDATE()).resolves.toEqual(true);
      expect(conn.updateOne).toHaveBeenCalledWith({ _id: new ObjectID(object.id) }, {
        $inc: { a: 1 },
      });
      expect(conn.collection).toHaveBeenCalledWith('table3');
    });
  });

  describe('DELETE', () => {
    let mongo;
    let conn;
    const sampleCondition = { id: '5d7c67fd217ffe92f90b1b1b', a: 1, b: '2' };

    beforeEach(() => {
      conn = {
        deleteOne: jest.fn(),
        collection: jest.fn(),
      };
      conn.collection.mockReturnValue(conn);
      Model.CONN = {};
      Model.CONN.openConnection = jest.fn().mockResolvedValue(conn);
      mongo = new Model(sampleCondition);
    });

    it('deleteOne responds success', async () => {
      conn.deleteOne.mockResolvedValue({ deleteCount: 1 });
      Model.TABLE = 'table1';
      await expect(mongo.DELETE()).resolves.toBe(true);
      expect(conn.deleteOne).toHaveBeenCalledWith({ _id: new ObjectID(sampleCondition.id) });
      expect(conn.collection).toHaveBeenCalledWith('table1');
    });

    it('deleteOne throws exception', async () => {
      const err = new Error('mongo delete error');
      conn.deleteOne.mockRejectedValue(err);
      Model.TABLE = 'table2';
      await expect(mongo.DELETE()).rejects.toEqual(err);
      expect(conn.deleteOne).toHaveBeenCalledWith({ _id: new ObjectID(sampleCondition.id) });
      expect(conn.collection).toHaveBeenCalledWith('table2');
    });

    it('delete throws exception (no condition)', async () => {
      Model.TABLE = 'table2';
      delete mongo.properties;
      await expect(mongo.DELETE()).rejects.toEqual(new Error('invalid request (no condition)'));
    });
  });

  describe('serialise', () => {
    let model = null;

    it('should not make any difference if there is no property that needs serialisation', async () => {
      const props = {
        a: 10,
        b: 20,
      };
      model = new Model(props);
      await model.serialise();
      expect(model.properties).toEqual(props);
    });

    describe('objectId', () => {
      it('should not modify serialised property', async () => {
        const input = {
          a: 10,
          objectIdField: new ObjectID('5d7c67fd217ffe92f90b1b1b'),
        };
        model = new Model(input);
        await model.serialise();
        expect(model.properties).toEqual(input);
      });

      it('should convert property from string to objectId', async () => {
        const input = {
          a: 10,
          objectIdField: '5d7c67fd217ffe92f90b1b1b',
        };
        const expectation = {
          a: 10,
          objectIdField: new ObjectID('5d7c67fd217ffe92f90b1b1b'),
        };
        model = new Model(input);
        await model.serialise();
        expect(model.properties).toEqual(expectation);
      });
    });

    describe('jsonString', () => {
      it('should not modify serialised property', async () => {
        const input = {
          a: 10,
          jsonStringField: '{"$schema":"#/test"}',
        };
        model = new Model(input);
        await model.serialise();
        expect(model.properties).toEqual(input);
      });

      it('should convert property from string to jsonString', async () => {
        const input = {
          a: 10,
          jsonStringField: {
            $schema: '#/test',
          },
        };
        const expectation = {
          a: 10,
          jsonStringField: '{"$schema":"#/test"}',
        };
        model = new Model(input);
        await model.serialise();
        expect(model.properties).toEqual(expectation);
      });
    });
  });

  describe('deserialise', () => {
    let model = null;

    it('should not make any difference if there is no property that needs deserialisation', async () => {
      const input = {
        a: 10,
        b: 20,
      };
      model = new Model(input);
      await model.deserialise();
      expect(model.properties).toEqual(input);
    });

    describe('objectId', () => {
      it('should not modify string', async () => {
        const input = {
          a: 10,
          objectIdField: '5d7c67fd217ffe92f90b1b1b',
        };
        model = new Model(input);
        await model.deserialise();
        expect(model.properties).toEqual(input);
      });

      it('should convert property from objectId to string', async () => {
        const expectation = {
          a: 10,
          objectIdField: '5d7c67fd217ffe92f90b1b1b',
        };
        const input = {
          a: 10,
          objectIdField: new ObjectID('5d7c67fd217ffe92f90b1b1b'),
        };
        model = new Model(input);
        await model.deserialise();
        expect(model.properties).toEqual(expectation);
      });
    });

    describe('jsonString', () => {
      it('should not modify string', async () => {
        const input = {
          a: 10,
          jsonStringField: {
            $schema: '#/test',
          },
        };
        model = new Model(input);
        await model.deserialise();
        expect(model.properties).toEqual(input);
      });

      it('should convert property from string to object', async () => {
        const expectation = {
          a: 10,
          jsonStringField: {
            $schema: '#/test',
          },
        };
        const input = {
          a: 10,
          jsonStringField: '{"$schema":"#/test"}',
        };
        model = new Model(input);
        await model.deserialise();
        expect(model.properties).toEqual(expectation);
      });
    });
  });

  describe('FINDLINKS', () => {
    let mongo;
    const output = [{ user_id: 1 }, { user_id: 2 }];

    beforeEach(() => {
      mongo = new Model({});
    });

    it('should return raw results', async () => {
      mongo.query = jest.fn().mockResolvedValue(output);
      const result = await mongo.FINDLINKS('user_role', { role_id: 1 }, 'user_id');
      expect(mongo.query).toHaveBeenCalledWith('user_role', { role_id: 1 }, 'user_id');
      expect(result).toEqual(output);
    });

    it('should return raw results (use default value)', async () => {
      mongo.query = jest.fn().mockResolvedValue(output);
      const result = await mongo.FINDLINKS('user_role', undefined, 'user_id');
      expect(mongo.query).toHaveBeenCalledWith('user_role', [], 'user_id');
      expect(result).toEqual(output);
    });

    it('should forward error thrown by query', async () => {
      const error = new Error('mongo findlinks error');
      mongo.query = jest.fn().mockRejectedValue(error);
      expect(mongo.FINDLINKS('user_role', { user_id: 1 }, 'role_id')).rejects.toEqual(error);
      expect(mongo.query).toHaveBeenCalledWith('user_role', { user_id: 1 }, 'role_id');
    });
  });

  describe('toLink', () => {
    let mongo;
    let Related;

    beforeEach(() => {
      mongo = new Model({
        id: 1,
        name: 'test',
        plan_id: '3',
      });
      Model.LINKS = [
        {
          PLURAL: 'gateways',
          LINK: 'gateway_id',
          CHILD: 'organisation_id',
          JOIN: 'credit',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'users',
          LINK: 'user_id',
          CHILD: 'organisation_id',
          JOIN: 'permission',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'relatives',
          LINK: 'organisation_id',
          TYPE: '1TOM',
          CANMODIFY: false,
        },
        {
          PLURAL: 'plans',
          LINK: 'plan_id',
          TYPE: '1TO1',
          CANMODIFY: false,
        },
      ];
      Related = require('../models/relatives');
      Related.prototype.SELECT = jest.fn().mockResolvedValue([new Related({ id: 300 })]);
      mongo.FINDLINKS = jest.fn().mockRejectedValue(new Error('BAD Table'));
    });

    afterEach(() => {
      Model.LINKS = [];
    });

    it('should correctly process link details and handle errors when requested', async () => {
      const result = await mongo.toLink(['relatives', 'plans', 'gateways'], path.join(__dirname, '..'));
      expect(Related.prototype.SELECT).toHaveBeenCalled();
      expect(mongo.FINDLINKS).toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        name: 'test',
        links: {
          plans: 3,
          relatives: [300],
        },
      });
    });

    it('should not do anything if link fields argument is undefined', async () => {
      const result = await mongo.toLink(undefined, path.join(__dirname, '..'));
      expect(Related.prototype.SELECT).not.toHaveBeenCalled();
      expect(mongo.FINDLINKS).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        name: 'test',
        links: {
          plans: 3,
        },
      });
    });

    it('should not do anything if link fields argument is empty', async () => {
      const result = await mongo.toLink([], path.join(__dirname, '..'));
      expect(Related.prototype.SELECT).not.toHaveBeenCalled();
      expect(mongo.FINDLINKS).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        name: 'test',
        plan_id: '3',
        links: {},
      });
    });
  });

  describe('fromLink', () => {
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'test',
        links: {
          plans: 3,
          relatives: [300],
        },
      };
      Model.LINKS = [
        {
          PLURAL: 'gateways',
          LINK: 'gateway_id',
          CHILD: 'organisation_id',
          JOIN: 'credit',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'users',
          LINK: 'user_id',
          CHILD: 'organisation_id',
          JOIN: 'permission',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'relatives',
          LINK: 'organisation_id',
          TYPE: '1TOM',
          CANMODIFY: false,
        },
        {
          PLURAL: 'plans',
          LINK: 'plan_id',
          TYPE: '1TO1',
          CANMODIFY: false,
        },
      ];
    });

    afterEach(() => {
      Model.LINKS = [];
    });

    it('should create class instance with correct fields populated from links object', async () => {
      const expectation = new Model({ id: 1, name: 'test', plan_id: 3 });
      expectation.setContext({ uuid: '1111' });
      expectation.relationships = {
        plans: 3,
        relatives: [300],
      };
      const result = await Model.fromLink(Model, { uuid: '1111' }, object);
      expect(result).toEqual(expectation);
    });

    it('should just create class instance without links populated if there is no links field', async () => {
      Model.LINKS = [];
      const expectation = new Model({ id: 1, name: 'test' });
      expectation.setContext({ uuid: '1111' });
      expectation.relationships = {
        plans: 3,
        relatives: [300],
      };
      const result = await Model.fromLink(Model, { uuid: '1111' }, object);
      expect(result).toEqual(expectation);
    });
  });
});
