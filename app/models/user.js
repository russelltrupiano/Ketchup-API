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
            imageUrl: String,
            link: String,
            runtime: String,
            status: String,
            title: String,
            network: String,
            episodes: [
                {
                    airdate: String,
                    episodeNumber: Number,
                    season: Number,
                    title: String,
                    watched: Boolean
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