var _           = require('lodash');
var express     = require('express');
var htmlencode  = require('htmlencode');
var parseString = require('xml2js').parseString;
var request     = require('request');
var tvRage      = require('../app/services/tvrage');
var trakt       = require('../app/services/trakt');
var scraper     = require('../app/services/scraper');
var validator   = require('validator');
var sync        = require('sync');
var async       = require('async');

var User        = require('../app/models/user');
var ImageCache  = require('../app/models/imagecache');

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

// This function should be able to do imitial import as well as
// incrementally add shows as the show object is updated
function importShowEpisodes(userId, showId, res, cb) {
    tvRage.getAllEpisodesForShow(showId, function(error, seasonEpisodeArr) {
        if (error) {
            return cb(error);
        }
        User.findById(userId, function(err, user) {

            if (err) {
                cb(err);
            } else if (!user) {
                return cb("No user found");
            }

            var index = _.findIndex(user.tvShows, {'id': showId.toString()});
            // This shouldn't ever really happen
            if (index === -1) {
                return cb("Show is not subscribed to");
            }

            // Iterate through each season
            for (var i = 1; i <= seasonEpisodeArr.length; i++) {
                // Iterate over every episode for that season
                // i is the season index, j is the episode index
                var seasonEpisodes = seasonEpisodeArr[i-1].episode;
                for (var j = 1; j <= seasonEpisodes.length; j++) {

                    var epData = filterEpisodeData(i, j, seasonEpisodes[j-1]);

                    // Check if result is in episode array
                    if (!isEpisodeAdded(user.tvShows[index].episodes, epData)) {
                        user.tvShows[index].episodes.push(epData);
                    }
                }
            }

            user.save(function(err) {
                if (err) {
                    return cb(err);
                }
                // Done successfully
                cb(null);
            });
        });
    });
}

function filterEpisodeData(season, episodenum, xmlToJsonEpisodeData) {
    return {
        airdate: parseDataIfArray(xmlToJsonEpisodeData.airdate),
        episodeNumber: episodenum,
        season: season,
        title: parseDataIfArray(xmlToJsonEpisodeData.title),
        watched: false
    };
}

function parseDataIfArray(arr) {
    if (_.isArray(arr)) {
        return arr[0];
    } else {
        return arr;
    }
}

function isEpisodeAdded(episodesArr, jsonResult) {
    var idx = _.findIndex(episodesArr, function(episode) {
        return  episode.season === jsonResult.season &&
                episode.episodeNumber === jsonResult.episodeNumber;
    });
    return idx !== -1;
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
            return res.send({"shows": user.tvShows.sort(function(a, b) {
                var nameA = a.title.toLowerCase(), nameB = b.title.toLowerCase()
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            })});
        });
    });

    // Get a particular subscribed show for a user
    router.get('/:user_id/shows/:show_id', function(req, res) {

    });

    // Get all episodes for a subscribed show for a user
    router.get('/:user_id/shows/:show_id/episodes', /*authUser,*/ function(req, res) {

        validateIntegerBodyParams(res, [req.params.show_id]);

        var showId = validator.toInt(req.params.show_id);
        var filterUnwatched = validator.toBoolean(req.query.filter_unwatched);

        var userId = req.params.user_id;
        var episodes = [];

        User.findById(userId, function(err, user) {
            if (err) {
                return res.sendStatus(503, err);
            } else if (!user) {
                return res.sendStatus(503, "No user found");
            }

            var idx = _.findIndex(user.tvShows, {'id': showId.toString()});
            if (idx == -1) {
                // Not subscribed to show
                return res.send({status: 400, episodes: null});
            }

            // Iterate through every episode
            for (var i = 0; i < user.tvShows[idx].episodes.length; i++) {
                console.log(user.tvShows[idx].episodes[i]);

                // Only return unwatched episodes
                if (filterUnwatched) {
                    if (!user.tvShows[idx].episodes[i].watched) {
                        episodes.push(user.tvShows[idx].episodes[i]);
                    }
                } else {
                    episodes.push(user.tvShows[idx].episodes[i]);
                }
            }
            return res.send({status: 200, episodes: episodes});
        });
    });

    // Get a particular episode from a subscribed show for a user
    router.get('/:user_id/shows/:show_id/episodes/:episode_id', function(req, res) {

    });

    // Get all unwatched episodes for a user
    router.get('/:user_id/unwatched', function(req, res) {
        var userId = req.params.user_id;
        var episodes = [];

        User.findById(userId, function(err, user) {
            if (err) {
                return res.sendStatus(503, err);
            } else if (!user) {
                return res.sendStatus(503, "No user found");
            }
            console.log(user.tvShows);
            // Iterate through every show
            for (var i = 0; i < user.tvShows.length; i++) {
                // Iterate through every episode
                for (var j = 0; j < user.tvShows[i].episodes.length; j++) {
                    console.log(user.tvShows[i].episodes[j]);
                    if (!user.tvShows[i].episodes[j].watched) {
                        episodes.push(user.tvShows[i].episodes[j]);
                    }
                }
            }

            return res.send({status: 200, episodes: episodes});
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
                        return res.send({status: 200, title: ""});
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
                        console.log("IMAGE IN CACHE");
                        tvshow.imageUrl = show.imageUrl;
                        tvshow.headerUrl = show.headerUrl;
                        cb(null, user, tvshow);
                    }
                    // Scrape for the image and add to cache
                    else {
                        console.log("NEED TO FETCH IMAGE");
                        var newShow = new ImageCache();

                        sync(function() {

                            trakt.getShowImages(showId, function(err, images) {
                                if (err) {
                                    console.log("ERROR GETTING IMAGE URL");
                                    newShow.imageUrl = '';
                                    newShow.headerUrl = '';
                                // If there is an image and poster move on
                                } else if (typeof images != 'undefined' && typeof images.poster != 'undefined') {
                                    newShow.showId = showId;
                                    newShow.imageUrl = images.poster.medium;
                                    if (typeof images.fanart != 'undefined' && images.fanart.medium != null) {
                                        newShow.headerUrl = images.fanart.medium;
                                    } else {
                                        newShow.headerUrl = newShow.imageUrl;
                                    }
                                    console.log("GOT IMAGE URLS:\n\t" + newShow.imageUrl + "\n\t" + newShow.headerUrl);
                                    newShow.save(function(err) {
                                        if (err) {
                                            return cb(err, null, null);
                                        }
                                        tvshow.imageUrl = newShow.imageUrl;
                                        tvshow.headerUrl = newShow.headerUrl;
                                        cb(null, user, tvshow);
                                    });
                                } else {
                                    console.log("RESORTING TO SCRAPING");
                                    sync(function() {
                                        scraper.scrapeForImage({link: showData.link}, function(error, resultUrl) {
                                            newShow.showId = showId;
                                            newShow.imageUrl = resultUrl;
                                            newShow.headerUrl = resultUrl;

                                            newShow.save(function(err) {
                                                if (err) {
                                                    return cb(err, null, null);
                                                }
                                                tvshow.imageUrl = newShow.imageUrl;
                                                tvshow.headerUrl = newShow.headerUrl;
                                                cb(null, user, tvshow);
                                            });
                                        });
                                    });
                                }
                            });
                        });
                    }
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
                    cb(null);
                });
            }
        ], function done(err) {
            if (err) {
                console.log("ERROR: " + err);
                return res.sendStatus(503, err);
            } else {
                // import episodes for show
                console.log("User data updated");
                importShowEpisodes(userId, showId, res, function(err) {
                    if (err) {
                        console.log("ERROR: " + err);
                        return res.sendStatus(503, err);
                    }
                    console.log("Episodes imported");
                });
            }
        });
    });

    router.post('/:user_id/episodes/:show_id', /*authUser,*/ function(req, res) {
        var userId = req.params.user_id;
        var showId = req.params.show_id;
        importShowEpisodes(userId, showId, res, function(err) {
            if (err) {
                return res.send({status: 503, message: err});
            }
            res.send({status: 200});
        });
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

            if (err) {
                return res.sendStatus(503, err);
            } else if (!user) {
                return res.sendStatus(503, "No user found");
            }

            var index = _.findIndex(user.tvShows, {'id': showId.toString()});
            if (index == -1) {
                return res.send({status: 503, message: "Show not found"});
            }

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
                    "episodeNumber": Number,
                    "watched": Boolean
                ]
            }
        ]
    }

    Example:

    {

        "shows": [
            {
                "id": "37780",
                "episodes": [
                    {
                        "season": 1,
                        "episodeNumber": 8,
                        "watched": false
                    }
                ]
            }
        ]
    }
     */
    router.post('/:user_id/episodes', /*authUser,*/ function(req, res) {

        var userId = req.params.user_id;
        var episodeData = JSON.parse(req.body.shows);

        User.findById(userId, function(err, user) {
            if (err) {
                return res.sendStatus(503, err);
            } else if (!user) {
                return res.sendStatus(503, "No user found");
            }

            // Iterate through each POSTed show
            for (var i = 0; i < episodeData.shows.length; i++) {
                var subbedShowIndex = _.findIndex(user.tvShows, {'id': episodeData.shows[i].id.toString()});
                // Show not found
                if (subbedShowIndex == -1) {
                    console.log("Show not found");
                    break;
                }

                // Iterate through each episode for that show
                for (var j = 0; j < episodeData.shows[i].episodes.length; j++) {

                    // console.log(user.tvShows[subbedShowIndex].episodes);
                    console.log(episodeData.shows[i].episodes[j]);
                    console.log(episodeData.shows[i].episodes[j].season);
                    console.log(episodeData.shows[i].episodes[j].episodeNumber);

                    var episodeIndex = _.findIndex(user.tvShows[subbedShowIndex].episodes, {
                        'season': episodeData.shows[i].episodes[j].season,
                        'episodeNumber': episodeData.shows[i].episodes[j].episodeNumber
                    });

                    if (episodeIndex == -1) {
                        console.log("Episode not found");
                        break;
                    }

                    console.log("Updating episode data");
                    user.tvShows[subbedShowIndex].episodes[episodeIndex].watched = episodeData.shows[i].episodes[j].watched;
                }
            }

            user.save(function(err) {
                if (err) {
                    return res.sendStatus(503, err);
                }
                return res.send({status: 200});
            });
        });
    });

    return router;
};