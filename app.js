// Modules ----------------------------------------------------------

var express         = require('express');
var path            = require('path');
var favicon         = require('serve-favicon');
var logger          = require('morgan');
var mongoose        = require('mongoose');
var cookieParser    = require('cookie-parser');
var session         = require('express-session');
var passport        = require('passport');
var bodyParser      = require('body-parser');

var config          = require('./config/db');
var routes          = require('./routes/index');

var app             = express();

// Configuration ----------------------------------------------------

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
require('./config/passport')(passport);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: config.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    key: "session",
    store: require('mongoose-session')(mongoose, {ttl: 7889230}),
    cookie: {
        maxAge: 7889230000,
    }
}));

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

// Load the api routes and give it fully initialized passport
var api = require('./routes/api')(app, passport);

app.use('/', routes);
app.use('/api/v1', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
