const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Mongo = require('../src/adapter');

chai.use(chaiAsPromised);
chai.should();

describe('adapter', () => {
  describe('conditionBuilder', () => {
    let mongo,
      conditions;
    mongo = null;
    conditions = [
      {
        input: {
          a: 1,
          b: 2,
          c: {
            field: 'c',
            operator: 'in',
            value: [3, '4', 'x']
          }
        },
        output: {
          $and: [
            {c: {$in: [3, '4', 'x']}},
            {
              $and: [
                {b: 2},
                {a: 1}
              ]
            }
          ]
        }
      },
      {
        input: {
          'a': 1,
          'b.c': 2,
          'c': {
            field: 'c.d',
            operator: 'in',
            value: [3, '4', 'x']
          }
        },
        output: {
          $and: [
            {'c.d': {$in: [3, '4', 'x']}},
            {
              $and: [
                {'b.c': 2},
                {a: 1}
              ]
            }
          ]
        }
      },
      {
        input: {
          a: 1,
          b: 2,
          c: {
            field: 'c',
            operator: 'in',
            value: 'a'
          }
        },
        output: {
          $and: [
            {'c': {'$in': ['a']}},
            {
              $and: [
                {b: 2},
                {a: 1}
              ]
            }
          ]
        }
      },
      {
        input: {
          a: 1,
          b: 2,
          c: {
            field: 'c',
            operator: 'not in',
            value: 'a'
          }
        },
        output: {
          $and: [
            {'c': {'$nin': ['a']}},
            {
              $and: [
                {b: 2},
                {a: 1}
              ]
            }
          ]
        }
      },
      {
        input: [
          {
            field: 'a',
            value: 1
          },
          {
            field: 'b',
            operator: '!=',
            value: '2',
            condition: 'OR'
          }
        ],
        output: {
          '$or': [
            {b: {'$ne': '2'}},
            {a: 1}
          ]
        }
      },
      {
        input: [
          {
            field: 'c',
            operator: '=',
            value: null
          },
          {
            field: 'd',
            operator: '!=',
            value: null,
            condition: 'AND'
          }
        ],
        output: {
          '$and': [
            {'d': {'$ne': null}},
            {'c': null}
          ]
        }
      },
      {
        input: [
          {
            field: 'x',
            operator: 'between',
            value: [10, 20]
          },
          {
            field: 'y',
            operator: 'regexp',
            value: '/find/',
            condition: 'OR'
          }
        ],
        output: {
          '$or': [
            {'y': {'$regex': new RegExp('/find/')}},
            {'x': {'$gte': 10, '$lte': 20}}
          ]
        }
      },
      {
        input: null,
        output: {}
      }
    ];

    beforeEach(() => {
      mongo = new Mongo({});
    });

    conditions.forEach((condition) => {
      it(`should build - ${JSON.stringify(condition.output)}`, () => {
        mongo.conditionBuilder(condition.input).should.be.deep.eql(condition.output);
      });
    });
  });
});
