var request = require('request');
var parseString = require('xml2js').parseString;
var _ = require('lodash');

// Filter out only the data we care about
function ShowSearchResult(data) {
    var showSearchResult = {
        airday: data.airday,
        airtime: data.airtime,
        ended: data.ended,
        name: data.name,
        runtime: data.runtime,
        showid: data.showid,
        status: data.status
    }

    return showSearchResult;
}

// Because a consistent data model would be too hard for TVRage
function ShowResult(data) {
    var showSearchResult = ShowSearchResult(data);
    showSearchResult.name = data.showname;
    return showSearchResult;
}


// Takes a JSON results object and strips uneccessary data
function filterShows(results, maxShows) {

    var filteredResult = {
        shows: []
    };
    var i = 0;

    // Pull show object from results
    _.forIn(results, function(shows, key) {

        _.forIn(shows, function(show, key) {

            // Hit every show
            _.forIn(show, function(data, key) {
                if (i >= maxShows) {
                    return filteredResult;
                }
                filteredResult.shows.push(ShowSearchResult(data));
                i++;
            });
        });
    });

    return filteredResult;
}

// Takes a JSON results object and strips uneccessary data
function filterShow(results, maxShows) {

    console.log(results.Showinfo);
    return ShowResult(results.Showinfo);
}

exports.searchShow = function(query, cb) {
    var url = "http://services.tvrage.com/feeds/full_search.php?show=" + query;
    console.log(url);

    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            // JSON
            parseString(response.body, function(err, result) {
                if (err) {
                    return cb("Internal server error", null);
                }
                return cb(null, filterShows(result, 8));
            });

        } else {
            return cb("Internal server error", null);
        }
    });
}

exports.getShowInfo = function(id, cb) {
    var url = "http://services.tvrage.com/feeds/showinfo.php?sid=" + id;
    console.log(url);

    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            // JSON
            parseString(response.body, function(err, result) {
                if (err) {
                    return cb("Internal server error", null);
                }
                return cb(null, filterShow(result, 8));
            });

        } else {
            return cb("Internal server error", null);
        }
    });
}