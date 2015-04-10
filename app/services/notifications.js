var request     = require('request');
var auth        = require('../../config/auth');
var trakt       = require("node-trakt");

exports.sendPushNotification = function(messageTitle, messageText, appIds) {

    request({
        method: 'POST',
        uri: 'https://android.googleapis.com/gcm/send',
        headers: {
            'Content-Type': 'application/json',
            'Authorization':'key=' + auth.googleCloudMessagingId
        },
        body: JSON.stringify({
            "registration_ids" : [auth.applicationRegId],
            'data': {
                'title': messageTitle,
                'msg': messageText
            }
        })
    },
    function(error, response, body) {
        console.log({'response': "Success"});
    });
}
