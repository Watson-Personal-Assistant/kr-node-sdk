require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const actions = require('./action');
const conditions = require('./condition');
const Agent = require('./sdk/messages');

const app = express();

app.use(bodyParser.json());

var KnowledgeObject = require('./sdk/object');
var KnowledgeRelation = require('./sdk/relation');

// Create objects in local memory

var person = new KnowledgeObject('Person',
  {
    'name': 'TestBen',
    "latitude": 12.456,
    "longitude": 67.99
  }
);

var house = new KnowledgeObject('House',
  {
    "latitude": 12.345,
    "longitude": 67.890,
    "name": "home"
  }
);

var door = new KnowledgeObject('Door',
  {
    "isOpen": false,
    "name": "Front door"
  }
);

// Save them to the world model
Promise.all(
  [
    person.create(),
    house.create(),
    door.create()
  ]
).then(
  function (results) {
    console.log('All objects created\n\n');

    // Create relations in local memory
    var personToHouse = new KnowledgeRelation('ownership', person, house);
    var houseToDoor = new KnowledgeRelation('has-as-part', house, door);

    // Save them to the world model
    Promise.all(
      [
        personToHouse.create(),
        houseToDoor.create()
      ]).then(
      function (results) {
        console.log('All relations created\n\n');
        runAgent();
      }
    );
  }
);

// create the agents using the conditions and actions
var doorOpenAgent = new Agent('object-update',
  conditions.main,
  actions.main);

function runAgent() {
  Promise.all([
    doorOpenAgent.connect(),
  ]).then(function () {
    doorOpenAgent.subscribe();
    console.log('Subscription created\n\n');
  }, cleanup); //cleanup if the sub fails
}

// Delete objects from the world model
function cleanup() {
  Promise.all(
    [
      person.delete(),
      house.delete(),
      door.delete()
    ]);
}

app.get('/openDoor', function (req, res) {
  KnowledgeObject.retrieve(door.id).then((doorObj) => {
    if (!doorObj.attributes.isOpen) {
      doorObj.attributes['isOpen'] = true;
      doorObj.update();
      res.status(200);
      res.send("opened door");
    } else {
      res.status(200);
      res.send("door was already open");
    }
  });
});

app.get('/closeDoor', function (req, res) {
  KnowledgeObject.retrieve(door.id).then((doorObj) => {
    if (doorObj.attributes.isOpen) {
      doorObj.attributes['isOpen'] = false;
      doorObj.update();
      res.status(200);
      res.send("closed door");
    } else {
      res.status(200);
      res.send("door was already closed");
    }
  });
});


// Server Startup
const port = process.env.PORT || process.env.RULE_PORT || 8080;
app.listen(port, () => {
  console.log(`Agent REST service is alive!\nListening on port ${port}\n\n`)
});
module.exports.App = app;