var request     = require('request');
var auth        = require('../../config/auth');
var trakt       = require("node-trakt");

exports.sendPushNotification = function(messageTitle, messageText, messageSeason, messageEpisode, appIds) {

    request({
        method: 'POST',
        uri: 'https://android.googleapis.com/gcm/send',
        headers: {
            'Content-Type': 'application/json',
            'Authorization':'key=' + auth.googleCloudMessagingId
        },
        body: JSON.stringify({
            "registration_ids" : appIds,
            'data': {
                'title': messageTitle,
                'msg': messageText,
                'season': messageSeason,
                'episode_number': messageEpisode
            }
        })
    },
    function(error, response, body) {
        if (error) {
            throw error;
        }
    });
}
