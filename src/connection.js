/**
 * Created by ashish on 02/05/18.
 */
const { MongoClient } = require('mongodb');
const AbstractConnection = require('@itcutives/adapter-memory/src/abstractConnection');

class Connection extends AbstractConnection {
  static get TYPE() {
    return 'MONGO';
  }

  constructor(config) {
    super(config);
    this.connection = {};
  }

  /**
   * @returns {Promise<*>}
   */
  async openConnection(db) {
    const database = db || this.config.db;
    if (this.connection[database]) {
      return this.connection[database];
    }
    const client = await this.getClient();
    this.connection[database] = client.db(database);
    return this.connection[database];
  }

  getClient() {
    if (this.client) {
      return this.client;
    }
    return MongoClient.connect(this.config.url, { useNewUrlParser: true, useUnifiedTopology: true })
      .then((client) => {
        this.client = client;
        return this.client;
      });
  }

  /**
   * @returns {Promise<*>}
   */
  async closeConnection() {
    const conn = this.client;
    if (!conn) {
      return true;
    }
    return conn.close()
      .then(() => {
        this.client = undefined;
        this.connection = {};
        return true;
      });
  }
}

module.exports = Connection;
