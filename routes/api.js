var _           = require('lodash');
var express     = require('express');
var htmlencode  = require('htmlencode');
var parseString = require('xml2js').parseString;
var request     = require('request');
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

// This function should be able to do initial import as well as
// incrementally add shows as the show object is updated
function importShowEpisodes(userId, showId, cb) {
    trakt.getAllEpisodesForShow(showId, function(error, seasonEpisodeArr) {
        if (error) {
            return cb(error);
        }
        User.findById(userId, function(err, user) {

            if (err) {
                cb(err);
            } else if (!user) {
                console.log("No user found");
                return cb("No user found");
            }

            console.log(user.tvShows);
            console.log(showId);

            var index = _.findIndex(user.tvShows, {'id': showId.toString()});
            // This shouldn't ever really happen
            if (index === -1) {
                console.log("Show not subbed to");
                return cb("Show is not subscribed to");
            }


            // Iterate through every episode
            for (var i = 0; i < seasonEpisodeArr.length; i++) {
                if (!isEpisodeAdded(user.tvShows[index], seasonEpisodeArr[i])) {
                    user.tvShows[index].episodes.push(seasonEpisodeArr[i]);
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
        number: episodenum,
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
    if (jsonResult.airdate == null) {
        return true;
    }
    var idx = _.findIndex(episodesArr, function(episode) {
        return  episode.season === jsonResult.season &&
                episode.number === jsonResult.number;
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

    // Search for a show using the Trakt API
    router.get('/search', function(req, res) {

        var show = sanitizeString(req.query.query);
        show = htmlencode.htmlEncode(show);

        trakt.searchShow(show, function(error, result) {

            if (error) {
                console.log("api.js: " + error);
                return res.sendStatus(503, error);
            }

            res.send({status: 200, result: result});
        });
    });

    // Get the info about any show
    router.get('/shows/:slug', function(req, res) {

        var slug = sanitizeString(req.params.slug);
        slug = htmlencode.htmlEncode(slug);

        trakt.getShowInfo(slug, function(error, result) {
            if (error) {
                return res.sendStatus(503, error);
            }

            res.send({status: 200, result: result});
        });
    });

    // Get the info about any show
    router.get('/images/:slug', function(req, res) {

        var slug = sanitizeString(req.params.slug);
        slug = htmlencode.htmlEncode(slug);

        trakt.getShowImagesTrakt(slug, function(error, result) {
            if (error) {
                return res.sendStatus(503, error);
            }

            res.send(result);
        });
    });

    router.get('/episodes/:slug/:season/:number', function(req, res) {

        var slug = sanitizeString(req.params.slug);
        slug = htmlencode.htmlEncode(slug);

        var season = req.params.season;
        if (!validator.isInt(season)) {
            return res.sendStatus(403, "Invalid season");
        }

        var number = req.params.number;
        if (!validator.isInt(number)) {
            return res.sendStatus(403, "Invalid number");
        }

        trakt.getEpisodeInfo(slug, season, number, function(error, result) {
            if (error) {
                return res.sendStatus(503, error);
            }

            res.send(result);
        });
    });

    // Get all episodes for a show
    router.get('/episodes/:slug', function(req, res) {

        var slug = sanitizeString(req.params.slug);
        slug = htmlencode.htmlEncode(slug);

        trakt.getAllEpisodesForShow(slug, function(error, result) {
            if (error) {
                return res.sendStatus(503, error);
            }

            res.send(result);
        });
    });

    // get all seasons of show
    router.get('/seasons/:slug', function(req, res) {

        var slug = sanitizeString(req.params.slug);
        slug = htmlencode.htmlEncode(slug);

        trakt.getSeasonListForShow(slug, function(error, result) {
            if (error) {
                return res.sendStatus(503, error);
            }

            res.send(result);
        });
    });

    // Get all subscribed shows for a user
    router.get('/:user_id/shows', /*authUser,*/ function(req, res) {
        var userId = req.params.user_id;

        User.findById(userId, function(err, user) {
            return res.send({status: 200, shows: user.tvShows.sort(function(a, b) {
                var nameA = a.title.toLowerCase(), nameB = b.title.toLowerCase()
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            })});
        });
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

        var userId = sanitizeString(req.params.user_id);
        userId = htmlencode.htmlEncode(userId);

        var showId = sanitizeString(req.body.show_id);
        showId = htmlencode.htmlEncode(showId);

        async.waterfall([
            function getShowInfo(cb) {
                trakt.getShowInfo(showId, function(err, result) {
                    cb(err, result);
                });
            },
            function getUser(showData, cb) {
                User.findById(userId, function(err, user) {

                    if (err) {
                        cb(err, null, null);
                    } else if (!user) {
                        cb("No user with " + userId + " found", null, null);
                    }

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
                var tvshow = {
                    id: showData.id,
                    airday: showData.airday,
                    airtime: showData.airtime,
                    image_url: showData.thumbnail_image,
                    banner_url: showData.banner_image,
                    runtime: showData.runtime,
                    status: showData.status,
                    title: showData.title,
                    network: showData.network,
                    episodes: []
                };

                cb(null, user, tvshow);
            },
            function updateUserShowData(user, tvshow, cb) {
                user.tvShows.push(tvshow);
                user.save(function(err) {
                    if (err) {
                        return cb(err);
                    }
                    console.log("Successfully saved user data");
                    res.send({status: 200, title: tvshow.title});
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
                importShowEpisodes(userId, showId, function(err) {
                    if (err) {
                        console.log("ERROR: " + err);
                        return res.sendStatus(503, err);
                    }
                    console.log("Episodes imported");
                });
            }
        });
    });

    // Update episode catalog for a show for a user
    router.post('/:user_id/episodes/:show_id', /*authUser,*/ function(req, res) {
        var userId = req.params.user_id;
        var showId = req.params.show_id;
        importShowEpisodes(userId, showId, function(err) {
            if (err) {
                return res.send({status: 503, message: err});
            }
            res.send({status: 200});
        });
    });

    router.post('/:user_id/unsubscribe', /*authUser,*/ function(req, res) {

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
                    console.log(episodeData.shows[i].episodes[j].number);

                    var episodeIndex = _.findIndex(user.tvShows[subbedShowIndex].episodes, {
                        'season': episodeData.shows[i].episodes[j].season,
                        'number': episodeData.shows[i].episodes[j].number
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