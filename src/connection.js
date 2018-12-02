/**
 * Created by ashish on 02/05/18.
 */
const { MongoClient } = require('mongodb');
const AbstractConnection = require('@itcutives/adapter-memory/src/abstractConnection');

class Connection extends AbstractConnection {
  static get TYPE() {
    return 'MONGO';
  }

  /**
   * @returns {Promise<*>}
   */
  async openConnection() {
    if (this.connection) {
      return this.connection;
    }
    return MongoClient.connect(this.config.url)
      .then((client) => {
        this.client = client;
        this.connection = client.db(this.config.db);
        return this.connection;
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
        this.connection = undefined;
        return true;
      });
  }
}

module.exports = Connection;
