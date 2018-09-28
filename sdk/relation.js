/*
 © Copyright IBM Corp. 2017
 */

const request = require('request');

const API_KEY = process.env.API_KEY;
const KNOWLEDGE_URL = process.env.HUB_URL + 'knowledge/';

const headers = {
  'Content-type': 'application/json',
  'api_key': API_KEY
};

class KnowledgeRelation {
  /**
   *
   * @param {string} type
   * @param {Object} fromObject
   * @param {Object} toObject
   */
  constructor(type, fromObject, toObject) {
    if (!fromObject.id || !toObject.id) {
      throw {
        name: 'NotCreated',
        message: 'Objects must have IDs -- try creating first'
      };
    }
    this.type = type;
    this.from = fromObject;
    this.to = toObject;
  }

  create() {
    if (this.id) {
      throw {
        name: 'AlreadyCreated',
        message: 'KnowledgeRelation already created -- try update()'
      };
    }

    const postData = {
      fromId: this.from.id,
      toId: this.to.id,
      type: this.type
    };

    const options = {
      url: `${KNOWLEDGE_URL}relation`,
      method: 'POST',
      headers,
      json: postData
    };
    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          console.log(`Error creating relation: ${err} ${body}`);
          return reject(body);
        }

        this.id = body.results[0].id;
        console.log(`Created relation: ${this.from.id}(${this.from.type}) -[${this.type}]-> ${this.to.id}(${this.to.type})`);
        return resolve(body);
      });
    });
  };

}

module.exports = KnowledgeRelation;
