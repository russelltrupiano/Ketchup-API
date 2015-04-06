var request = require('request');
var _ = require('lodash');
var auth = require('../../config/auth');

var baseUrl = "https://api-v2launch.trakt.tv";

var headers = {
    'Content-type': 'application/json',
    'trakt-api-version': 2,
    'trakt-api-key': auth.traktAPIKey
};

exports.getShowImages = function(id, cb) {
    var url = baseUrl + "/search?id_type=tvrage&id="+id;

    console.log(url);

    request({url: url, headers: headers}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var showData;
            var result = JSON.parse(response.body);
            for (var i = 0; i < result.length; i++) {
                console.log("OK");
                if (result[i].type === "show") {
                    showData = result[i].show.images;
                    break;
                }
            }
            cb(null, showData);
        } else {
            return cb("Request to Trakt failed", null);
        }
    });
}