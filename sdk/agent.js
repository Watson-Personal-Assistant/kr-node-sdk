/*
© Copyright IBM Corp. 2017
*/

const express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
const app = express();

app.use(bodyParser.json());

var api_key = process.env.API_KEY;
var agent_url = process.env.HUB_URL + 'agent/';
var agentHost = process.env.AGENT_HOST;

console.log('Agent host:  ' + agentHost);

var actions = {};

var conditions = {};

function Agent(event, condition_method, action_method) {
  this.event = event;
  this.condition_method = condition_method;
  this.action_method = action_method;
}

/*
  Agent subscription method.
  Event is a string and is one of:  "object-create", "object-update", "object-delete", "relation-create", "relation-delete"
  condition_method is a function that returns a string 'true' or 'false' depending on whether the action should be called
  action_method is the main function of the agent
 */
Agent.prototype.subscribe = function() {
  var post_data = {
    'event': this.event,
    'action': agentHost + "/action"
  };

  if (this.condition_method) {
    post_data['condition'] = agentHost + "/condition";
  }

  var headers = {
    'Content-type': 'application/json',
    'api_key': api_key
  };

  var options = {
    url: agent_url + 'register_eca_agent',
    method: 'POST',
    headers: headers,
    body: JSON.stringify(post_data)
  };

  var self = this;
  return new Promise(function (res, rej) {
    request(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        console.log('Error subscribing: ' + err + ' ' + body);
        rej(body);
      } else {
        var id = JSON.parse(body)['id'];
        actions[id] = self.action_method;
        if (self.condition_method) {
          conditions[id] = self.condition_method;
        }
        console.log('Created subscription to event', self.event, 'and received ID', id);
        self.id = id;
        res(body);
      }
    });
  });
};

/* Agent deletion method

 */
Agent.prototype.delete = function() {
  if (!this.id) {
    throw 'No id -- did you subscribe yet?';
  }

  var headers = {
    'Content-type': 'application/json',
    'api_key': api_key
  };

  var options = {
    url: agent_url + 'subscription/' + this.id + '/' + this.event,
    method: 'DELETE',
    headers: headers,
  };

  var self = this;
  return new Promise(function (res, rej) {
    request(options, function(err, response, body) {
      if (err || response.statusCode !== 200) {
        console.log('Error subscribing: ' + err + ' ' + body);
        rej(body);
      } else {
        console.log('Deleted agent subscription', self.id);
        res(body);
      }
    });
  });
};

// This is the route that will handle all the callbacks from the message broker
app.post('/condition/:var', function (req, res) {
  var subId = req.params['var'];
  if (!(subId in conditions)) {
    res.status(400);
    res.send('Bad subscription ID');
  } else {
    res.status(200);
    var response = conditions[subId](req.body.results);

    Promise.resolve(response).then((response) => {
      res.send(response);
    });
  }
});

app.post('/action/:var', function (req, res) {
  var subId = req.params['var'];
  if (!(subId in actions)) {
    res.status(400);
    res.send('Bad subscription ID');
  } else {
    res.status(200);
    var response = actions[subId](req.body.results);
    Promise.resolve(response).then((response) => {
      res.send(response);
    });
  }
});

var port = process.env.PORT || process.env.AGENT_PORT || 8080;

app.listen(port, function () {
  console.log('Agent REST service is alive!  Listening on port', process.env.AGENT_PORT, '\n\n');
});

module.exports = Agent;
