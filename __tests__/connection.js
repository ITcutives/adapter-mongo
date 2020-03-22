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
      obj.getClient = jest.fn().mockResolvedValue({ db: () => ({ connected: 'Connection' }) });
    });

    it('should call MongoClient.connect if it is not already connected', async () => {
      const connection = await obj.openConnection();
      expect(obj.getClient).toHaveBeenCalled();
      expect(connection).toEqual({ connected: 'Connection' });
    });

    it('should return connection if it is already connected', async () => {
      obj.connection.test = { connected: 'Connection' };
      const connection = await obj.openConnection();
      expect(connection).toEqual({ connected: 'Connection' });
      expect(obj.getClient).not.toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    let obj;

    beforeEach(() => {
      obj = new Connection({ db: 'test' });
    });

    afterEach(() => {
      MongoClient.connect.mockReset();
    });

    it('should call MongoClient.connect if it is not already connected', async () => {
      const cl = { client: { connected: 'Connection' } };
      MongoClient.connect.mockResolvedValue(cl);

      const client = await obj.getClient();
      expect(client).toEqual(cl);
    });

    it('should return connection if it is already connected', async () => {
      obj.client = { connected: 'Connection' };
      const client = await obj.getClient();
      expect(client).toEqual({ connected: 'Connection' });
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
      expect(obj.connection).toEqual({});
    });
  });
});
