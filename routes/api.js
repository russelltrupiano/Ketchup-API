var _ = require('lodash');
var express = require('express');
var htmlencode = require('htmlencode');
var parseString = require('xml2js').parseString;
var request = require('request');
var tvRage = require('../app/services/tvrage');
var validator = require('validator');

var User = require('../app/models/user');

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
                return res.send({status: 200, authToken: req.user._id});
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
                return res.send({status: 200, authToken: req.user._id});
            });

        })(req, res, next);
    });

    // Logout the user
    router.post('/logout', function(req, res) {
        req.logout();
        return res.sendStatus(200);
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
            return res.sendStatus(403, "Invalid id")
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
    router.get('/:user_id/shows', function(req, res) {

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

    // Add a show to a user's subscription list. Parameters are show_id
    router.post('/:user_id/shows', authUser, function(req, res) {

        validateIntegerBodyParams(res, [req.body.show_id]);

        var showId = validator.toInt(req.body.show_id);
        var userId = req.params.user_id;

        tvRage.getShowInfo(showId, function(error, result) {

            if (error) {
                return res.sendStatus(503, error);
            }

            User.findById(userId, function(err, user) {
                if (_.findIndex(user.tvShows, {'id': showId}) != -1) {
                    // Show has already been subscribed to
                    console.log("Show is already subscribed to");
                    return res.sendStatus(200);
                }

                user.tvShows.push({
                    id: showId,
                    title: result.name,
                    imageUrl: '',
                    episodes: []
                });

                console.log("updated user data");

                user.save(function(err) {
                    if (err)
                        res.sendStatus(503, error);

                    console.log("saved user data");
                    return res.sendStatus(200);
                });
            });
        });
    });

    // Add an episode to the user's unwatched queue. Parameters are show_id, season, episode_number
    router.post('/:user_id/episodes', authUser, function(req, res) {

        validateIntegerBodyParams(res, [req.body.show_id, req.body.season, req.body.episode_number]);

        var userId = req.params.user_id;
        var episodeNumber = validator.toInt(req.body.episode_number);
        var seasonNumber = validator.toInt(req.body.season);
        var showId = req.body.show_id;

        console.log(episodeNumber, seasonNumber);

        tvRage.getEpisodeInfo(showId, seasonNumber, episodeNumber, function(error, result) {

            if (error) {
                return res.sendStatus(503, error);
            }

            User.findById(userId, function(err, user) {

                var index = _.findIndex(user.tvShows, {'id': showId});

                user.tvShows[index].episodes.push({
                    title: result.title,
                    season: result.season,
                    episodeNumber: result.episodeNumber,
                    airdate: result.airdate
                });

                user.save(function(err) {
                    if (err)
                        throw err;

                    res.sendStatus(200);
                });
            });
        });
    });

    return router;
}