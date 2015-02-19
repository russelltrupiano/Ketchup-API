var mongoose    = require('mongoose');
var bcrypt      = require('bcrypt-nodejs');

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
    twitter          : {
        id           : String,
        token        : String,
        displayName  : String,
        username     : String
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
            title: String,
            imageUrl: String,
            episodes: [
                {
                    id: String,
                    title: String
                }
            ]
        }
    ],

    sessionId: String,
    sessionExpires: Date
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