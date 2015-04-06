var mongoose    = require('mongoose');

var jsonSchema = {

    showId: String,
    imageUrl: String,
    headerUrl: String
}

var imageCacheSchema = mongoose.Schema(jsonSchema);

imageCacheSchema.methods.getSchema = function() {
    var keys = [];
    for (key in jsonSchema) {
        keys.push(key);
    }
    return keys;
}

module.exports = mongoose.model('ImageCache', imageCacheSchema);