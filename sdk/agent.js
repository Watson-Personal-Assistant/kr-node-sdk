/*
 IBM Confidential
 OCO Source Materials
 © Copyright IBM Corp. 2017
 */
/*
const express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
const app = express();
require('dotenv').config();
app.use(bodyParser.json());

const uuidv1 = require('uuid/v1');
var myapp = require('../app');
var cache = require('./storage-memory');
const url = require('url');


var api_key = process.env.API_KEY;
var agent_url = process.env.HUB_URL;

var agentHost = process.env.AGENT_HOST;

var actions = {};

var conditions = {};

function Agent(event, condition_method, action_method, request_key) {
    this.event = event;
    this.condition_method = condition_method;
    this.action_method = action_method;
    this.request_key = request_key;
}
*/
/*
 Agent subscription method.
 Event is a string and is one of:  "object-create", "object-update", "object-delete", "relation-create", "relation-delete"
 condition_method is a function that returns a string 'true' or 'false' depending on whether the action should be called
 action_method is the main function of the agent
 */
/*
Agent.prototype.subscribe = function () {
    var post_data = {
        'event': this.event,
        'action': agentHost + "/action"
    };
    post_data.action = post_data.action.replace("//action", "/action");

    if (this.condition_method) {
        //post_data['condition'] = agentHost + "/condition";
        post_data['condition'] = "";
    }


    var headers = {
        'Content-type': 'application/json',
        'api_key': app.get("api_key") || api_key
    };

    var options = {
        url: (app.get("hub_url") || agent_url) + 'agent/register_eca_agent',
        method: 'POST',
        headers: headers,
        body: JSON.stringify(post_data)
    };

    var self = this;
    return new Promise(function (res, rej) {
        request(options, function (err, response, body) {
            if (err || response.statusCode !== 200) {
                console.log('Error subscribing: ' + err + ' ' + body);
                rej(body);
            } else {
                var id = JSON.parse(body)['id'];
                actions[id] = self.action_method;
                actions["request_key"] = self.request_key;
                if (self.condition_method) {
                    conditions[id] = self.condition_method;
                }
                console.log('Created subscription to event', self.event, 'and received ID', id);

                cache.read("data", self.request_key).then(function (result) {

                    if (result) {

                        result.subscriptionid = id;
                        cache.write("data", self.request_key, result);
                    } else {

                        var result = {};
                        result.subscriptionid = id;
                        cache.write("data", self.request_key, result);
                    }
                }, function (err) {
                    console.log("err ", err);
                });
                self.id = id;
                res(body);
            }
        });
    });
};
*/
/* Agent deletion method

 */
/*
Agent.prototype.delete = function () {
    if (!this.id) {
        throw 'No id -- did you subscribe yet?';
    }

    var headers = {
        'Content-type': 'application/json',
        'api_key': app.get("api_key") || api_key
    };

    var options = {
        //url: (app.get("hub_url") || agent_url) + 'agent/subscription/' + this.id + '/' + this.event,
        url: (app.get("hub_url") || agent_url) + 'agent/subscription/' + this.id,
        method: 'DELETE',
        headers: headers,
    };

    var self = this;
    return new Promise(function (res, rej) {
        request(options, function (err, response, body) {
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
        var key = actions["request_key"];
        var response = actions[subId](req.body.results, key);
        Promise.resolve(response).then((response) => {
            res.send(response);
        });
    }
});


app.get('/execute', function (req, res) {
    var api_key = req.query["api_key"];
    var hub_url = req.query["hub_url"];
    app.set("api_key", api_key);
    console.log("===>>hub_url ", hub_url)
    if (hub_url) {
        hub_url = url.parse(hub_url).href;
        app.set("hub_url", hub_url);
    }
    console.log("===>>parsed hub_url ", hub_url)

    var key = uuidv1();
    var trans_id = myapp.execute(key);
    var obj = {};
    obj.message = "In Progress";
    cache.write("data", key, obj);
    res.status(200);
    res.send(key);
});

app.get('/execute/:trans_id', function (req, res) {
    var trans_id = req.params['trans_id'];
    console.log("trans_id >>", trans_id);
    cache.read("data", trans_id).then(function (result) {
        res.status(200);
        res.send(result);
    }, function (err) {
        console.log("err ", err);
        res.status(400);
        res.send(err);
    });

});


app.get('/execute', function (req, res) {
  var api_key = req.query["api_key"];
  var hub_url = req.query["hub_url"];
  app.set("api_key", api_key);
  console.log("===>>hub_url ", hub_url)
  if (hub_url) {
    hub_url = url.parse(hub_url).href;
    app.set("hub_url", hub_url);
  }
  console.log("===>>parsed hub_url ", hub_url)

  var key = uuidv1();
  var trans_id = myapp.execute(key);
  var obj = {};
  obj.message = "In Progress";
  cache.write("data", key, obj);
  res.status(200);
  res.send(key);
});

app.get('/execute/:trans_id', function (req, res) {
  var trans_id = req.params['trans_id'];
  console.log("trans_id >>", trans_id);
  cache.read("data", trans_id).then(function (result) {
    res.status(200);
    res.send(result);
  }, function (err) {
    console.log("err ", err);
    res.status(400);
    res.send(err);
  });

});

var port = process.env.PORT || process.env.AGENT_PORT || 8080;

app.listen(port, function () {
    console.log('Agent REST service is alive!  Listening on port', process.env.AGENT_PORT, '\n\n');
});

module.exports.Agent = Agent;
module.exports.App = app;
*/