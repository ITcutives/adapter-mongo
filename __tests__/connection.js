jest.mock('mongodb');
const { MongoClient } = require('mongodb');
const Connection = require('../src/connection');

describe('Connection', () => {
  it('should have type MONGO', () => {
    expect(Connection.TYPE).toBe('MONGO');
  });

  describe('constructor', () => {
    let obj;

    beforeEach(() => {
      obj = new Connection({ db: 'serverless' });
    });

    it('should assign the config variable', () => {
      expect(obj.config).toEqual({ db: 'serverless' });
    });
  });

  describe('openConnection', () => {
    let obj;

    beforeEach(() => {
      obj = new Connection({ db: 'test' });
    });

    afterEach(() => {
      MongoClient.connect.mockReset();
    });

    it('should call MongoClient.connect if it is not already connected', async () => {
      const db = jest.fn().mockReturnValue({ connected: 'Connection' });
      MongoClient.connect.mockResolvedValue({ db });
      const connection = await obj.openConnection();
      expect(db).toHaveBeenCalledWith('test');
      expect(connection).toEqual({ connected: 'Connection' });
    });

    it('should return connection if it is already connected', async () => {
      obj.connection = { connected: 'Connection' };
      const connection = await obj.openConnection();
      expect(connection).toEqual({ connected: 'Connection' });
      expect(MongoClient.connect).not.toHaveBeenCalled();
    });
  });

  describe('closeConnection', () => {
    let obj;

    beforeEach(() => {
      obj = new Connection({});
    });

    it('should resolve with true if there is no connection', async () => {
      const result = await obj.closeConnection();
      expect(result).toBe(true);
    });

    it('should call end method on connection to close it', async () => {
      const close = jest.fn().mockResolvedValue(true);
      obj.client = { close };
      const result = await obj.closeConnection();
      expect(close).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
