var express = require('express');

module.exports = function(app, passport) {

    var router = express.Router();

    router.get('/',  function(req, res) {
        res.redirect('/');
    });

    // Login the user. Parameters are email and password
    router.post('/login', function(req, res) {

    });

    // Logout the user
    router.post('/logout', function(req, res) {

    });

    // Login via facebook
    router.get('/auth/facebook', function(req, res) {

    });

    // Callback after facebook authentication
    router.get('/auth/facebook/callback', function(req, res) {

    });

    // Login via google
    router.get('/auth/google', function(req, res) {

    });

    // Callback after google authentication
    router.get('/auth/google/callback', function(req, res) {

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
    router.post('/:user_id/shows', function(req, res) {

    });

    // Add an episode to the user's unwatched queue. Parameters are episode_id
    router.post('/:user_id/episodes', function(req, res) {

    });

    return router;
}