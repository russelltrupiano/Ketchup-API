var mongoose    = require('mongoose');
var bcrypt      = require('bcrypt-nodejs');
var _           = require('lodash');

var jsonSchema = {

    local            : {
        email        : String,
        password     : String,
        name         : String,
        passwordResetToken: String,
        passwordTokenExpires: Date,
    },
    facebook         : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    },
    google           : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    },

    tvShows: [
        {
            id: String,
            airday: String,
            airtime: String,
            ended: String,
            image_url: String,
            banner_url: String,
            link: String,
            runtime: String,
            status: String,
            title: String,
            network: String,
            episodes: [
                {
                    id: Number,
                    airdate: String,
                    number: Number,
                    season: Number,
                    title: String,
                    watched: Boolean
                }
            ]
        }
    ],

    sessionId: String,
    sessionExpires: Date,
    appId: String
}

var userSchema = mongoose.Schema(jsonSchema);

userSchema.methods.getSchema = function() {
    var keys = [];
    for (key in jsonSchema) {
        keys.push(key);
    }
    return keys;
}

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
}

module.exports = mongoose.model('User', userSchema);