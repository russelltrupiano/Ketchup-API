var express             = require('express');
var request             = require('request');
var router              = express.Router();
var auth                = require('../config/auth');
var notificationManager = require('../app/services/notifications');
var trakt               = require('../app/services/trakt');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Ketchup API' });
});

router.post('/push', function(req, res) {
    var title = req.body.title;
    var message = req.body.message;

    notificationManager.sendPushNotification(title, message);

    res.sendStatus(200);
});

router.post('/trakt', function(req, res) {
    trakt.getShowImages(6245, function(err, images) {
        if (err) {
            console.log('');
        } else {
            console.log(images.poster);
        }
    });
});

module.exports = router;
