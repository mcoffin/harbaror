const minimist = require('minimist');
const Lazy = require('lazy.js');
const bodyParser = require('body-parser');
const { readConfig } = require('./output/Harbaror.Config');
const { doRequest } = require('./output/Harbaror.Main');
var app = require('express')();
const _ = require('lodash');

app.use(bodyParser.json());

new Promise(readConfig)
    .then((config) => {
        config.webhooks.forEach(webhook => {
            app[webhook.incomingMethod](webhook.incomingPath, (req, res) => {
                const view = _.merge(req.body, req.query);
                new Promise(doRequest(webhook)(view))
                    .then(r => res.status(200).json(r.toString()))
                    .catch(e => res.status(500).json({error: e.toString()}));
            });
        });
        app.listen(config.port);
    })
    .catch(console.err);
