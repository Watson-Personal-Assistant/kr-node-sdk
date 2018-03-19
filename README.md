# kr-sdk-node
An object-oriented SDK for developing K+R proactivity in Node

## Introduction

The Knowledge and Reasoning (K&R) functionality of Sagan enables developers to add proactive insights to their cognitive applications in a modular fashion.

This is enabled by two core functionalities provided by the framework:

1. A **publish/subscribe** mechanism which is an enabler for proactivity.
2. A **shared data store**

The above are accessible at:

1. the publish/subscribe mechanism used is ibm message-hub: https://console.bluemix.net/catalog/services/message-hub
2. https://personal-assistant-toolkit.mybluemix.net/knowledge/apidocs/?api_key= (Add your personal api_key to the address line)

We call the modular insight components which use the publish subscribe and data store **Rules**.

There are also input agents - code that updates the Knowledge store with data from external sources, i.e. not Skills or Rules.

## Example Scenario (AKA: The door demo)

In the following, we will walk through the creation of a simple home security scenario using the Knowledge and Reasoning component.

In this scenario, the user would like to be notified if their house's entrance door is opened while he/she is away.

This scenario is implemented using the following:
1. **Door Sensor Input Agent**: An agent that interprets the raw sensor data received by the door and updates the door status accordingly.
2. **Door Alert Generation Rule**: A rule that, for each door status change, checks if the door has been opened while the relevant house owners are away.
If so, this rule inserts a "SecurityAlert" object  into the common data store.
3. **Notification Rule**: A rule that notifies a user when a relevant alert has been added to the data store.

NOTE:  only (2) and (3) are connected to the message-hub in the example code, because (1) does not need to listen for world model changes.

NOTE2: in this example, all the components are within the same repository (for simplicity). in real scenario, you can split these components.

The end to end flow is enabled by the rules communicating with each other through the shared data store and publish/subscribe mechanism. In the data store, two types of data can be stored: **Objects**, such as door, house, notification, person, and the **Relations**
between these objects. Therefore the data model of the scenario must be defined in terms of these objects and relations.

### Scenario data model

The diagram below provides an overview of the data model, where the circles depict objects, and the edges depict the relations:

![Object relation diagram](./DoorDemoObjectRelations.png)

Note that some of the data (e.g., the status of the door) is stored as attributes within the objects.

#### Inserting the data for the sample scenario
Prior to an open or close event, we want to make sure that the door, home, and person objects are present in the Sagan knowledge repository.  They will also need to be connected by the appropriate relations.

##### Creating the objects

**Adding the door:** We will create three objects, a house, a door and a person.  These are created as KnowledgeObject type js objects, and take as parameters their type and a dictionary of attributes.

   ```javascript
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

   ```

At this point, we have three variables for each of the objects in our data model.  However, they only currently live in memory.  We have to tell Watson about them!  To do this, we call the create() methods on each of them, which return a promise.

```javascript
Promise.all(
    [
      person.create(),
      house.create(),
      door.create()
    ]
).then(() => {
  //whatever you want to do next
}
```

Now these objects will be in the blackboard and be able to be "seen" by agents.  Also, each object will have its id field filled out with a reference to its representation in the blackboard.  e.g. `person.id`
#### Tying objects together with relations:
Now that we have objects, we can tie them together with relations.  These relations will give the objects a common context to live in, granting them richer meaning.

```javascript
var personToHouse = new KnowledgeRelation('ownership', person, house);
var houseToDoor = new KnowledgeRelation('has-as-part', house, door);
```
Now we have modeled the fact that the door is a part of the house, and the house is owned by the person.  As with objects, these relations are not available to agents until they are created on the blackboard as follows:
```javascript
Promise.all(
  [
    personToHouse.create(),
    houseToDoor.create()
  ]).then(
  function (results) {
    console.log('All relations created\n\n');
    //do next step
  }
);
```

### The door sensor input agent

While not a "proper" agent in this example, the sensor agent will simply change the status of the door from closed to open, which should trigger the rules.  To do this, we will change the attribute in-memory and then update that change in the blackboard:

```javascript
 door.attributes['isOpen'] = true;
 door.update();
```

NOTE:  This code should not run until the rules specified below are created and subscribed to changes in the blackboard.  If you do this update before they are subscribed, they won't see the door change state!

### Door Alert Generation Rule

In our system, agents are represented as rules.  Rules are Event-Condition-Action (ECA) triplets. A rule should wait for an event in the data model to occur, and to do an action according to the change (most of the times, a condition check is made before the action, to act only when the event is relevant to the user).
in this example, when creating the rules, we declare all the 3 parts, and save them inside an agent object -
1. *A CRUD operation*:  The data change event in the blackboard at the create, delete, and update levels.  The current available list is: object-create, object-update, object-delete, relation-create, relation-delete
2. *A condition function*:  A function that takes an event (an object or relation that was created, updated or deleted) and determines whether it is of interest to the agent.  If omitted, it is assumed that the agent is interested in all of the CRUD events specified.
3. *An action*:  A function which carries out some action based on the event sent to the agent.

The role of the Door Alert Generation Rule is to generate an alert whenever the door is opened and the owner is not an home. Therefore, this rule must carry out the following:

#### Subscribing to Door Status Updates
Whenever the door status is updated by the Door Sensor Input Agent - an update is published to the "object-update" topic of the pub/sub mechanism. The content of this update includes  the type of object for which the update occurred, as well as the object ID.
Therefore, this rule must subscribe to this topic:

```javascript
var doorOpenAgent = new Agent('object-update',
    function (event, callback) {
      ...
      callback(checkType(event, 'Door'));
      ...
    },
    createSecurityNotification);
```

Note that the topic of the subscription is `object-update`, which fires whenever any object is updated in the data store. In future versions of the K&R component, these topics will be greatly refined to allow rules to receive published events that are much more focused - e.g. subscribing to door updates, subscribing to door updates that are connected to a specific house, etc.

`checkType()` is a function that checks the type of an object or relation from an event against a specified string.  So, our condition function is checking to see if a door is being updated.

Lastly, the action is the function `createSecurityNotification`, which we discuss the implementation of in the next section.

Like objects and relations, this agent is only available in memory until we call a function to "attach" it to the blackboard:
```javascript
doorOpenAgent.subscribe().then(() => {
  // do something next
}
```
#### Evaluating the condition: Is there an open door?

The rule must now check whether the update is to the Door object and resulted in the door being opened. Let's take a closer look at the condition function that was implemented for the subscription.  But first, we'll examing a helper function `getHouseAndPersonForDoor()`.  This function will be called with a single parameter `doorId`, the id for the door. It then will find the home and owner related to that door id:

```javascript
    // Extract the door id from the event
      var doorId = event[0]['id'];
      // Pull the door from the db (I could have constructed it from the event
      // but I'm lazy)
      KnowledgeObject.retrieve(doorId).then((door) => {
        console.log('Door id', door.id);
        ...
      }
```

The `retrieve` function returns a promise with the object created from the requested item from the blackboard.  Now that we have the door, we want to see what house it is connected to.
```javascript
KnowledgeObject.retrieve(doorId).then((door) => {
    console.log('Door id', door.id);
    // Get the house of the door
    return door.both('has-as-part');
  }).then((parts) => {
    var house = parts[0];
    console.log('House', house.id);
    // Get the owner of the house
    return house.both('ownership');
  })
}
```

`both()` is a function on object which returns a list of objects connected to that object on the specified relation.  In other words, we're asking the blackboard: "Hey, give me a list of things that this door is either a part of or are a part of this door."

You can see that we call `both()` again to get the owner of the house.

Now we have all we need from the blackboard -- a home that the opened door is part of, and the owner of the door.  Now we are going to see if the owner is at home:

```javascript
if (checkType(event, 'Door')) {
        return getHouseAndPersonForDoor(doorId).then((objects) => {
          // compare long lats
          var door = objects[0];
          var house = objects[1];
          var owner = objects[2];
          if (door.attributes.isOpen && (owner.attributes['longitude'] != house.attributes['longitude'] ||
              owner.attributes['latitude'] != house.attributes['latitude'])) {
            callback(true);
          } else {
            callback(false);
          }
        });
      } else {
        callback(false);
      }
```

In the action function of this agent, we create a notification object that connects the user to the door.  This will be picked up by our other agent which specializes in notifying users.

### The User Notification Rule

The notification agent is going to be looking for creations of relations.  Why not objects?  Well, we only want to activate when the notification is tied to a user.  It isn't helpful to us to "wake up" if the notification object is just hanging out in space without being connected to a particular user.

Here is what the Agent object init looks like:
```javascript
var notificationAgent = new Agent('relation-create',
    function (event, callback) {
      callback(checkType(event, 'notificationTarget'));
    },
    alertUser);
```

Similarly to the door agent, this agent just checks the type of the event for its condition.  The action for the event is `alertUser`, implemented as follows:

```javascript
function alertUser(event) {
  var personId = event[0].inV;
  KnowledgeObject.retrieve(personId).then((person) => {
    console.log("Hey, " + person.attributes.name + " someone might be in your house!");
  });
}
```

The event is a list of relations, which contain inV and outV, for the objects that are being pointed at, and doing the pointing (respectively).  These are blackboard ids, so we have to retrieve the Person object for the inV in order to get their contact info.  Because we're not implementing any messaging sophistication in this example, we just write out a message to the console customized with their name.
