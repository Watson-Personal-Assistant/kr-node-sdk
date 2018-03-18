/*
 © Copyright IBM Corp. 2017
 */

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

app.use(bodyParser.json());

var Kafka = require('node-rdkafka');
var config = require('./config.json');

class Agent {
    constructor(event, conditionMethod, actionMethod) {
        this.event = event;
        this.conditionMethod = conditionMethod;
        this.actionMethod = actionMethod;

        // Config common options
        var driver_options = {
            //'debug': 'all',
            'metadata.broker.list': config.MESSAGE_HUB.kafka_brokers_sasl,
            'security.protocol': 'sasl_ssl',
            'ssl.ca.location': '/etc/ssl/certs',
            'sasl.mechanisms': 'PLAIN',
            'sasl.username': config.MESSAGE_HUB.user,
            'sasl.password': config.MESSAGE_HUB.password,
            'api.version.request': true,
            'broker.version.fallback': '0.10.2.1'
        };

        var consumer_opts = {
            'client.id': 'kafka-nodejs-console-sample-consumer',
            'group.id': 'kafka-nodejs-console-sample-group'
        };

        // Add the common options to client
        for (var key in driver_options) {
            consumer_opts[key] = driver_options[key];
        }

        this.options = consumer_opts;
    }

    /*
     Agent subscription method.
     Event is a string and is one of:  "object-create", "object-update", "object-delete", "relation-create", "relation-delete"
     conditionMethod is a function that returns a boolean value depending on whether the action should be called
     actionMethod is the main function of the agent
     */
    subscribe() {
        let agent = this;

        console.log("Created agent with event " + this.event);
        var stream = Kafka.KafkaConsumer.createReadStream(this.options, {}, {
            topics: [this.event]
        });
        this.stream = stream;

        stream.on('data', function(message) {
            console.log('Got event');
            var m = JSON.parse(message.value.toString());
            console.log("event data: " + JSON.stringify(m["results"]));
            agent.conditionMethod(m["results"], function(result) {
                console.log("checking condition for the event");
                if (result == true) {
                    console.log('Condition for the event was met. performing action');
                    agent.actionMethod(m["results"]);
                } else {
                    console.log('Condition for the event was not met, action not performed')
                }
            });
        });

    };
}

// Server Startup
const port = process.env.PORT || process.env.RULE_PORT || 8080;
app.listen(port, () => {
    console.log(`Agent REST service is alive!\nListening on port ${port}\n\n`)
});
module.exports = Agent;