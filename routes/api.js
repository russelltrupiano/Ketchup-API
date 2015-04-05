var _ = require('lodash');
var express = require('express');
var htmlencode = require('htmlencode');
var parseString = require('xml2js').parseString;
var request = require('request');
var tvRage = require('../app/services/tvrage');
var scraper = require('../app/services/scraper');
var validator = require('validator');
var sync = require('sync');
var async = require('async');

var User = require('../app/models/user');
var ImageCache = require('../app/models/imagecache');

function sanitizeString(str) {
    return validator.toString(str);
}

// Given a list of params to check
function validateIntegerBodyParams(res, params) {

    var badIndex = _.findIndex(params, function(param) {
        return !validator.isInt(param);
    });

    if (badIndex != -1) {
        console.log("Bad parameter " + params[badIndex]);
        return res.sendStatus(400, "Invalid episode_id");
    }
}

function authUser(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.sendStatus(401);
    }

    if (req.user._id == req.params.user_id) {
        return next();
    } else {
        return res.sendStatus(401);
    }
}



module.exports = function(app, passport) {

    var router = express.Router();

    router.get('/',  function(req, res) {
        res.redirect('/');
    });

    router.post('/signup', function(req, res, next) {
        passport.authenticate('local-signup', function(err, user, info) {

            if (err)
                return next(err); //500 error
            if (!user) {
                return res.send({status: 400, message: "User already exists"});
            }

            req.logIn(user, function() {
                return res.send({status: 200, authToken: req.user._id, email: req.user.local.email});
            });

        })(req, res, next);
    });

    // Login the user. Parameters are email and password
    router.post('/login', function(req, res, next) {
        passport.authenticate('local-login', function(err, user, info) {

            if (err) {
                return next(err); //500 error
            }
            if (!user) {
                return res.send({status: 400, message: "User doesn't exist"});
            }

            req.logIn(user, function() {
                return res.send({status: 200, authToken: req.user._id, email: req.user.local.email});
            });

        })(req, res, next);
    });

    // Logout the user
    router.post('/logout', function(req, res) {
        req.logout();
        return res.send({status: 200});
    });

    // Login via facebook
    router.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

    // Callback after facebook authentication
    router.get('/auth/facebook/callback', function(req, res) {
        console.log("Calling facebook callback");
    });

    // Login via google
    router.get('/auth/google', function(req, res) {

    });

    // Callback after google authentication
    router.get('/auth/google/callback', function(req, res) {

    });

    // Search for a show using the TVRage API
    router.get('/search', function(req, res) {

        var show = sanitizeString(req.query.query);
        show = htmlencode.htmlEncode(show);

        tvRage.searchShow(show, function(error, result) {

            if (error) {
                console.log("api.js: " + error);
                return res.sendStatus(503, error);
            }

            res.setHeader('content-type', 'text/json');
            res.send(result);
        });
    });

    // Get the info about any show
    router.get('/shows/:showid', function(req, res) {

        var id = req.params.showid;
        if (!validator.isInt(id)) {
            return res.sendStatus(403, "Invalid id");
        }

        tvRage.getShowInfo(id, function(error, result) {
            if (error) {
                return res.sendStatus(503, error);
            }

            res.setHeader('content-type', 'text/json');
            res.send(result);
        });
    });

    // Get all subscribed shows for a user
    router.get('/:user_id/shows', /*authUser,*/ function(req, res) {
        var userId = req.params.user_id;

        User.findById(userId, function(err, user) {
            res.setHeader('content-type', 'text/json');
            return res.send({"shows": user.tvShows});
        });
    });

    // Get a particular subscribed show for a user
    router.get('/:user_id/shows/:show_id', function(req, res) {

    });

    // Get all episodes for a subscribed show for a user
    router.get('/:user_id/shows/:show_id/episodes', function(req, res) {

    });

    // Get a particular episode from a subscribed show for a user
    router.get('/:user_id/shows/:show_id/episodes/:episode_id', function(req, res) {

    });

    // Get all unwatched episodes for a user
    router.get('/:user_id/episodes', function(req, res) {

    });

    router.get('/test', function(req, res) {
        scraper.scrapeForImage({link: 'http://www.tvrage.com/better-call-saul'}, function(err, result) {
            return res.send('<img src=\'' + result + '\'>');
        });
    });

    // Add a show to a user's subscription list. Parameters are show_id
    router.post('/:user_id/subscribe', /*authUser,*/ function(req, res) {

        validateIntegerBodyParams(res, [req.body.show_id]);

        var showId = validator.toInt(req.body.show_id);
        var userId = req.params.user_id;

        async.waterfall([
            function getShowInfo(cb) {
                tvRage.getShowInfo(showId, function(err, result) {
                    cb(err, result);
                });
            },
            function getUser(showData, cb) {
                User.findById(userId, function(err, user) {
                    if (_.findIndex(user.tvShows, {'id': showId.toString()}) != -1) {
                        // Show has already been subscribed to
                        console.log("Show is already subscribed to");
                        res.send({status: 200, title: ""});
                    } else {
                        cb(err, user, showData);
                    }
                });
            },
            function checkImageCache(user, showData, cb) {
                ImageCache.findOne({'showId': showId}, function(err, show) {
                    if (err) return cb(err, null, null);

                    var url = '';
                    var tvshow = {
                            id: showId,
                            airday: showData.airday,
                            airtime: showData.airtime,
                            ended: showData.ended,
                            imageUrl: '',
                            link: showData.link,
                            runtime: showData.runtime,
                            status: showData.status,
                            title: showData.name,
                            network: showData.network,
                            episodes: []
                        };

                    // The image is cached
                    if (show) {
                        tvshow.imageUrl = show.imageUrl;
                    }
                    // Scrape for the image and add to cache
                    else {
                        var newShow = new ImageCache();

                        sync(function() {
                            scraper.scrapeForImage({link: showData.link}, function(error, resultUrl) {

                                newShow.showId = showId;
                                newShow.imageUrl = resultUrl;

                                newShow.save(function(err) {
                                    if (err) {
                                        return cb(err, null, null);
                                    }
                                    tvshow.link = newShow.imageUrl;
                                });
                            });
                        });

                    }
                    cb(null, user, tvshow);
                });
            },
            function updateUserShowData(user, tvshow, cb) {
                user.tvShows.push(tvshow);
                user.save(function(err) {
                    if (err) {
                        return cb(err);
                    }
                    console.log("Successfully saved user data");
                    res.send({status: 200, title: tvshow.title[0]});
                })

            }
        ], function done(err) {
            if (err) {
                console.log("ERROR: " + err);
            } else {
                // import episodes for show
                console.log("User data updated");
            }
        });
    });

    // This function should be able to do imitial import as well as
    // incrementally add shows as the show object is updated
    function importShowEpisodes(user, showId, response) {
        tvRage.getAllEpisodesForShow(showId, function(error, result) {
            if (error) {
                return response.sendStatus(503, error);
            }
            response.send({status: 200, response: result});
            // User.findById(user._id, function(err, user) {
            //     var index = _.findIndex(user.tvShows, {'id': showId});

            //     for (var i = 0; i < result.length; i++) {
            //         // Check if result is in episode array
            //         if (!isEpisodeAdded(user.tvShows[index].episodes, result[i])) {
            //             user.tvShows[index].episodes.push({
            //                 airdate: result.airdate,
            //                 episodeNumber: result.episodeNumber,
            //                 season: result.season,
            //                 title: result.title,
            //                 watched: false
            //             });
            //         }
            //     }
            // });
        });
    }

    function isEpisodeAdded(episodesArr, jsonResult) {
        return _.findIndex(episodesArr, function(episode) {
            return  episode.season === jsonResult.season &&
                    episode.episodeNumber === jsonResult.episodeNumber
        });
    }

    router.post('/:user_id/episodes/:show_id', /*authUser,*/ function(req, res) {
        var userId = req.params.user_id;
        var showId = req.params.show_id;
        importShowEpisodes(userId, showId, res);
    });


    // Add an episode to the user's unwatched queue. Parameters are show_id, season, episode_number
    // router.post('/:user_id/episodes', authUser, function(req, res) {

    //     validateIntegerBodyParams(res, [req.body.show_id, req.body.season, req.body.episode_number]);

    //     var userId = req.params.user_id;
    //     var episodeNumber = validator.toInt(req.body.episode_number);
    //     var seasonNumber = validator.toInt(req.body.season);
    //     var showId = req.body.show_id;

    //     console.log(episodeNumber, seasonNumber);

    //     tvRage.getEpisodeInfo(showId, seasonNumber, episodeNumber, function(error, result) {

    //         if (error) {
    //             return res.sendStatus(503, error);
    //         }

    //         User.findById(userId, function(err, user) {

    //             var index = _.findIndex(user.tvShows, {'id': showId});

    //             user.tvShows[index].episodes.push({
    //                 title: result.title,
    //                 season: result.season,
    //                 episodeNumber: result.episodeNumber,
    //                 airdate: result.airdate
    //             });

    //             user.save(function(err) {
    //                 if (err)
    //                     throw err;

    //                 return res.send({status: 200});
    //             });
    //         });
    //     });
    // });

    router.post('/:user_id/unsubscribe', /*authUser,*/ function(req, res) {
        validateIntegerBodyParams(res, [req.body.show_id]);

        var userId = req.params.user_id;
        var showId = req.body.show_id;

        console.log("Unsubscribing from id " + showId);

        User.findById(userId, function(err, user) {

            var index = _.findIndex(user.tvShows, {'id': showId.toString()});

            console.log("Deleting from index " + index);

            var theRemoved = user.tvShows.splice(index, 1);
            var removedTitle = theRemoved[0].title;
            console.log("api.js: unsubscribing from " + removedTitle + "\n");

            user.save(function(err) {
                if (err) {
                    throw err;
                }
                return res.send({status: 200, title: [removedTitle]});
            });

        });
    });

    /*
    body content in the form of

    {
        "shows": [
            {
                "id": String,
                "episodes": [
                    "season": Number,
                    "episode_number": Number,
                    "watched": Boolean
                ]
            }
        ]
    }

    Example:

    {

        "shows": [
            {
                "id": 37780,
                "episodes": [
                    {
                        "season": 1,
                        "episode_number": 8,
                        "watched": false
                    }
                ]
            }
        ]
    }


     */
    router.post('/:user_id/episodes', /*authUser,*/ function(req, res) {

        var episodeData = req.body.shows;

        return res.send({"shows": JSON.parse(episodeData)});

    });

    return router;
};