var db      = require('../../config/db');
var auth    = require('../../config/auth');
var async   = require('async');
var Agenda  = require('agenda');
var agenda  = new Agenda({db: {address: db.url}});
var notificationManager = require('./notifications');
var Server  = require('../models/server');
var request = require('request');
var trakt   = require('./trakt');
var _       = require('lodash');
var request = require('request');

agenda.define('schedule notification', function(job, done) {
    var data = job.attrs.data;

    var title = data.show.show_title + " is airing!";
    var message = data.show.title + "(" + data.show.season + "x" + data.show.number + ") is airing in 15 minutes!";

    notificationManager.sendPushNotification(title, message, data.show.season, data.show.number, data.subscribers);
    done();
});

agenda.define('check airings', function(job, done) {
    runSchedulingSetup(function(shows) {
        done();
    });
})

function schedule15MinNotification(show, subscribers) {
    trakt.getTitleFromSlug(show.show_id, function(err, title) {
        show.show_title = title;
        var notifTime = Math.round(show.time_until - 15);
        var timeStr = 'in ' + notifTime + ' minutes';
        console.log(timeStr + ", schedule notification " + show.show_title);
        agenda.schedule(timeStr, 'schedule notification', {show: show, subscribers: subscribers});
    });

}

function sameDay(date1, date2) {
    // Time difference in days
    var timeDiff = (date1.getTime() - date2.getTime())/86400000;
    return timeDiff >= 0.0 && timeDiff <= 1.0;
}

function minutesBetween(date1, date2) {
    var timeDiff = (date1.getTime() - date2.getTime())/60000;
    return timeDiff;
}

function getAllShowsWithin24h(subscriptions, cb) {
    var shows = [];
    var today = new Date();

    // var j = 1;

    async.each(subscriptions, function(show, callback) {
        trakt.getAllEpisodesForShow(show.id, function(error, seasonEpisodeArr) {
            if (error) {
                callback(error);
            }

            // array of episodes airing today
            var todayShows = _.filter(seasonEpisodeArr, function(e) {
                return sameDay(new Date(e.airdate), today);
            });

            for (var i = 0; i < todayShows.length; i++) {
                todayShows[i].time_until = minutesBetween(new Date(todayShows[i].airdate), today);
                // todayShows[i].time_until = 15 + j;
                // j++;
                todayShows[i].show_id = show.id;
                shows.push(todayShows[i]);
            }

            callback();

        });
    }, function(err) {
        if (err) {
            cb(null);
        }
        cb(shows);
    });
}

// Set up all scheduling alerts for subscribed shows
function runSchedulingSetup(cb) {

    var today = new Date();

    Server.findOne({serverKey: auth.serverKey}, function(err, server) {
        // For each show collect all shows that have airdates within 24 hours
        getAllShowsWithin24h(server.subscriptions, function(shows) {
            // For every show, construct notifs for all subscribers
            for (var i = 0; i < shows.length; i++) {
                // Get all subscribers for show
                var index = _.findIndex(server.subscriptions, {id: shows[i].show_id});
                if (index !== -1) {
                    schedule15MinNotification(shows[i], server.subscriptions[index].appIds);
                    // for (var j = 0; j < server.subscriptions[index].appIds.length; j++) {
                    //     schedule15MinNotification(shows[i]);
                    // }
                }
            }

            agenda.start();
            cb(shows);
        });
    });
}

exports.start = function(cb) {
    agenda.schedule('1 second', 'check airings', null);
    agenda.every('24 hours', 'check airings');
    agenda.start();
}

exports.addSubscription = function(userAppId, showId, cb) {
    // TODO: Verify showId validity
    Server.findOne({serverKey: auth.serverKey}, function(err, server) {
        if (err) {
            return cb(err);
        }
        if (!server) {
            server = new Server();
            server.serverKey = auth.serverKey;
            server.subscriptions = [];
        }
        // See if showId in queue
        var showIndex = _.findIndex(server.subscriptions, {id: showId});
        // Show not subscribed to
        if (showIndex === -1) {
            server.subscriptions.push({
                id: showId,
                appIds: [userAppId]
            });
        }
        // Show is subscribed to
        else {
            var appIdIndex = _.findIndex(server.subscriptions[showIndex].appIds, userAppId);
            // Add subscriber to show, otherwise do nothing
            if (appIdIndex === -1) {
                server.subscriptions[showIndex].appIds.push(userAppId);
            }
        }
        server.save(function(err) {
            if (err) {
                return cb(err);
            }
            return cb(null);
        });
    });
}

exports.removeSubscription = function(userAppId, showId, cb) {
    // TODO: Verify showId validity
    Server.findOne({serverKey: auth.serverKey}, function(err, server) {
        if (err) {
            return cb(err);
        }

        // See if showId in queue
        var showIndex = _.findIndex(server.subscriptions, {id: showId});
        // Make sure show subscribed to
        if (showIndex !== -1) {
            _.pull(server.subscriptions[showIndex].appIds, userAppId);
            server.markModified('subscriptions')
        }

        server.save(function(err) {
            if (err) {
                return cb(err);
            }
            return cb(null);
        });
    });
}