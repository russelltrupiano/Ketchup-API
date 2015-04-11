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
    var message = req.body.msg;
    var slug = req.body.slug;
    var season = req.body.season;
    var number = req.body.number;
    notificationManager.sendPushNotification(title, message, slug, season, number, [auth.applicationRegId]);

    res.sendStatus(200);
});

module.exports = router;
