var express             = require('express');
var request             = require('request');
var router              = express.Router();
var auth                = require('../config/auth');
var notificationManager = require('../app/services/notifications');
var scheduler           = require('../app/services/scheduler');

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

module.exports = router;
