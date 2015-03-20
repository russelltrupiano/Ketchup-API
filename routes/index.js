var express = require('express');
var request = require('request');
var router = express.Router();

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
            'Authorization':'key=AIzaSyB02WmKTofeXRyaVpXnN8EhhAFoenOtb0s'
        },
        body: JSON.stringify({
            "registration_ids" : ["APA91bFojtpH4upZ7uIXXGwBhkh5Psp7IGoAGYWzfxt1YM0OLILb_rFF6t8c8yCFORfR8p553svLxmU9xywadnYraTxhCRmMpAPFKYZZDs8gZWKSllqSs8SEx7Vp6ZXnS4Pm3cSQ-uDto01IzuCxm_FysVxL3ESQEw"],
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
