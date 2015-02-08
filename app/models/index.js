var config      = require('../../config/db');
var fs          = require('fs');
var lodash      = require('lodash');
var mongoose    = require('mongoose');

var db = {};

function isJavascript(file) {
    return file.slice(-3) == '.js';
}

exports.initDB = function(cb) {
    db = {};
    mongoose.connect(config.url);
    var _db = mongoose.connection;
    _db.on('error', console.error.bind(console, 'connection error:'));
    _db.once('open', function() {
        console.log("Connected to Mongo!");



        fs.readdirSync(__dirname)
            .filter(function(file) {
                return isJavascript(file) && file != "index.js";
            })
            .forEach(function(file) {
                console.log("Importing model from " + file);
                var basename = file.substr(0, file.indexOf('.'));
                require('./' + basename);
            });

        mongoose.connection.db.collectionNames(function (err, names) {
            console.log(names); // [{ name: 'dbname.myCollection' }]
            return cb(names);
        });

    });
}