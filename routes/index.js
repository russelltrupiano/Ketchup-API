var express = require('express');
var request = require('request');
var router = express.Router();
var auth = require('../config/auth');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Ketchup API' });
});

router.post('/push', function(req, res) {
    var text = req.body.message;

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
                'message': text
            }
        })
    },
    function(error, response, body) {
        console.log({'response': "Success"});
    });

    res.sendStatus(200);
});

module.exports = router;
