/*
© Copyright IBM Corp. 2017
*/

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

app.use(bodyParser.json());

const API_KEY = process.env.API_KEY;
const AGENT_URL = process.env.HUB_URL + 'agent/';
const AGENT_HOST = process.env.AGENT_HOST;

console.log(`Agent host: ${AGENT_HOST}`);

let actions = {};
let conditions = {};

const headers = {
  'Content-type': 'application/json',
  'api_key': API_KEY
};

class Agent {
  constructor(event, conditionMethod, actionMethod) {
    this.event = event;
    this.conditionMethod = conditionMethod;
    this.actionMethod = actionMethod;
  }

  /*
  Agent subscription method.
  Event is a string and is one of:  "object-create", "object-update", "object-delete", "relation-create", "relation-delete"
  conditionMethod is a function that returns a string 'true' or 'false' depending on whether the action should be called
  actionMethod is the main function of the agent
  */
  subscribe() {
    const postData = {
      'event': this.event,
      'action': `${AGENT_HOST}/action`
    };

    if (this.conditionMethod) {
      postData.condition = `${AGENT_HOST}/condition`;
    }

    const options = {
      url: `${AGENT_URL}register_eca_agent`,
      method: 'POST',
      headers,
      json: postData
    };

    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          console.log(`Error subscribing: ${err} ${body}`)
          return reject(body);
        }

        const id = body.id;
        actions[id] = this.actionMethod;
        if (this.conditionMethod) {
          conditions[id] = this.conditionMethod;
        };

        console.log(`Created subscription to event ${this.event} and received ID ${id}`);
        this.id = id;
        return resolve(body);
      });
    });
  };

  // Agent deletion method
  delete() {
    if (!this.id) {
      throw {
        name: 'MissingID',
        message: 'No ID -- did you subscribe yet?'
      }
    }

    const options = {
      url: `${AGENT_URL}subsctiption/${this.id}/${this.event}`,
      method: 'DELETE',
      headers
    };

    return new Promise((resolve, reject) => {
      request(options, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          console.log(`Error subscribing: ${err} ${body}`);
          return reject(body);
        }

        console.log(`Deleted agent subscription ${this.id}`);
        return resolve(body);
      });
    });
  };
}

// AGENT REST API Definiton
// This is the route that will handle all the callbacks from the message broker
app.post('/condition/:var', (req, res) => {
  const subId = req.params.var;
  if (!(subId in conditions)) {
    res.status(400);
    return res.send('Bad subscription ID');
  }

  res.statusCode(200);
  const response = conditions[subId](req.body.results);
  Promise.resolve(response).then(result => {
    return res.send(result);
  });
});

app.post('/action/:var', (req, res) => {
  const subId = req.params.var;
  if (!(subId in actions)) {
    res.status(400);
    return res.send('Bad subscription ID');
  }

  res.status(200);
  const response = actions[subId](req.body.results);
  Promise.resolve(response).then(result => {
    return res.send(result);
  });
});

// Server Startup
const port = process.env.PORT || process.env.AGENT_PORT || 8080;
app.listen(port, () => {
  console.log(`Agent REST service is alive!\nListening on port ${port}\n\n`)
});

module.exports = Agent;