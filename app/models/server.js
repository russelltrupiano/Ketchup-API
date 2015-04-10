var mongoose    = require('mongoose');
var bcrypt      = require('bcrypt-nodejs');
var _           = require('lodash');

var jsonSchema = {

    serverKey: String,
    subscriptions: [
        {
            id: String,
            appIds: [ String ]
        }
    ]
}

var serverScheme = mongoose.Schema(jsonSchema);

serverScheme.methods.getSchema = function() {
    var keys = [];
    for (key in jsonSchema) {
        keys.push(key);
    }
    return keys;
}

module.exports = mongoose.model('Server', serverScheme);