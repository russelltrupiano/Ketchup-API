var db     = require('../../config/db');
var Agenda = require('agenda');
var agenda = new Agenda({db: {address: db.url}});
var notificationManager = require('./notifications');

agenda.define('greet the world', function(job, done) {
    console.log(job.attrs.data.time, 'hello world!');
    done();
});

agenda.define('tell the date', function(job, done) {
    notificationManager.sendPushNotification("Date checkup", new Date());
    done();
});

exports.start = function() {
    agenda.schedule('in 10 seconds', 'greet the world', {time: new Date()});
    agenda.every('20 seconds', 'tell the date');


    agenda.start();
}

