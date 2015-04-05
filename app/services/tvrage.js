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
        status: data.status,
        link: data.showlink,
        network: data.network ? data.network[0]["_"] : data.network
    }

    return showSearchResult;
}

// Because a consistent data model would be too hard for TVRage
function ShowResult(data) {
    var showSearchResult = ShowSearchResult(data);
    showSearchResult.name = data.showname;
    console.log(showSearchResult);
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
function filterShow(results) {

    console.log(results.Showinfo);
    return ShowResult(results.Showinfo);
}

function filterEpisodeArray(xmlEpisodeArr) {
    console.log(xmlEpisodeArr);
    console.log("\n\n----\n\n");
    console.log(xmlEpisodeArr.Show);
}

// Filter out only the data we care about
function EpisodeSearchResult(data) {
    var episodeSearchResult = {
        title: data.title,
        airdate: data.airdate,
        season: deconstructSeasonEpisodeString(data.number.toString())[0],
        episodeNumber: deconstructSeasonEpisodeString(data.number.toString())[1],
    }

    return episodeSearchResult;
}

function deconstructSeasonEpisodeString(str) {
    return str.split('x');
}

function filterEpisode(result) {

    console.log(result.show.episode);
    return EpisodeSearchResult(result.show.episode[0]);
}

exports.searchShow = function(query, cb) {
    var url = "http://services.tvrage.com/feeds/full_search.php?show=" + query;
    console.log(url);

    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            // JSON
            parseString(response.body, function(err, result) {
                if (err) {
                    return cb("Error parsing xml into json", null);
                }
                return cb(null, filterShows(result, 8));
            });

        } else {
            return cb("Request to TVRage failed", null);
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
                    return cb("Error parsing xml into json", null);
                }
                return cb(null, filterShow(result));
            });

        } else {
            return cb("Request to TVRage failed", null);
        }
    });
}

exports.getEpisodeInfo = function(id, season, episode_number, cb) {
    var url = "http://services.tvrage.com/feeds/episodeinfo.php?sid=" + id + "&ep=" + season + "x" + episode_number;
    console.log(url);

    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            // JSON
            parseString(response.body, function(err, result) {
                if (err) {
                    return cb("Error parsing xml into json", null);
                }
                return cb(null, filterEpisode(result));
            });

        } else {
            return cb("Request to TVRage failed", null);
        }
    });
}

exports.getAllEpisodesForShow = function(showId, cb) {
    var url = "http://services.tvrage.com/feeds/full_show_info.php?sid=" + showId;
    console.log(url);

    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            //JSON
            parseString(response.body, function(err, result) {
                if (err) {
                    return cb("Error parsing xml into json", null);
                }
                return cb(null, result.Show.Episodelist[0].Season);
            });
        } else {
            return cb("Request to TVRage failed", null);
        }
    })
}