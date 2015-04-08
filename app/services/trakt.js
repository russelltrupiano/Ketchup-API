var request = require('request');
var _ = require('lodash');
var auth = require('../../config/auth');

var baseUrl = "https://api-v2launch.trakt.tv";

var headers = {
    'Content-type': 'application/json',
    'trakt-api-version': 2,
    'trakt-api-key': auth.traktAPIKey
};

function SearchResult(slug, title, year, image) {
    this.result = {
        'id': slug,
        'title': title,
        'year': year,
        'background': image
    };

    return this.result;
}

function FullShowData(traktJsonObj) {
    this.data =  {
        'id': traktJsonObj.ids.slug,
        'title': traktJsonObj.title,
        'year': traktJsonObj.year,
        'airday': traktJsonObj.airs.day,
        'airtime': traktJsonObj.airs.time,
        'network': traktJsonObj.network,
        'thumbnail_image': traktJsonObj.images.poster.medium,
        'banner_image': traktJsonObj.images.fanart.medium,
        'status': traktJsonObj.status,
        'runtime': traktJsonObj.runtime
    };

    return this.data;
}

function EpisodeData(traktJsonObj) {
    this.data = {
        'id': traktJsonObj.ids.trakt,
        'airdate': traktJsonObj.first_aired,
        'season': traktJsonObj.season,
        'number': traktJsonObj.number,
        'title': traktJsonObj.title,
        'watched': false
    };

    return this.data;
}

exports.getShowImages = function(id, cb) {
    var url = baseUrl + "/search?id_type=tvrage&id="+id;
    console.log(url);

    request({url: url, headers: headers}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var showData;
            var result = JSON.parse(response.body);
            for (var i = 0; i < result.length; i++) {
                console.log("OK");
                if (result[i].type === "show") {
                    showData = result[i].show.images;
                    break;
                }
            }
            cb(null, showData);
        } else {
            return cb("Request to Trakt failed", null);
        }
    });
}

exports.getShowImagesTrakt = function(slug, cb) {
    var url = baseUrl + "/shows/"+slug+"?extended=images";
    console.log(url);

    request({url: url, headers: headers}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(response.body);
            var images = result.images;

            cb(null, images);
        } else {
            return cb("Request to Trakt failed", null);
        }
    });
}

exports.searchShow = function(query, cb) {
    var url = baseUrl + "/search?query="+query+"&type=show&extended=full";
    console.log(url);

    request({url: url, headers: headers}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var results = [];
            var result = JSON.parse(response.body);

            for (var i = 0; i < result.length; i++) {
                var imageUrl = '';
                if (typeof result[i].show.images != 'undefined' && result[i].show.images != null) {
                    if (typeof result[i].show.images.fanart != 'undefined' && result[i].show.images.fanart != null) {
                        if (result[i].show.images.fanart.thumb != null) {
                            imageUrl = result[i].show.images.fanart.thumb;
                        }
                    }
                }
                results.push(SearchResult(result[i].show.ids.slug, result[i].show.title, result[i].show.year, imageUrl));
            }


            cb(null, results);
        } else {
            return cb("Request to Trakt failed", null);
        }
    });
}

exports.getShowInfo = function(slug, cb) {
    var url = baseUrl + "/shows/"+slug+"?extended=full,images";
    console.log(url);

    request({url: url, headers: headers}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(response.body);

            cb(null, FullShowData(result));
        } else {
            return cb("Request to Trakt failed", null);
        }
    });
}

exports.getEpisodeInfo = function(slug, season, episode_number, cb) {
    var url = baseUrl + "/shows/"+slug+"/seasons/"+season+"/episodes/"+episode_number+"?extended=full";
    console.log(url);

    request({url: url, headers: headers}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(response.body);

            cb(null, EpisodeData(result));
        } else {
            return cb("Request to Trakt failed", null);
        }
    });
}

exports.getAllEpisodesForShow = function(slug, cb) {
    var url = baseUrl + "/shows/"+slug+"/seasons?extended=episodes,full";
    console.log(url);

    request({url: url, headers: headers}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(response.body);
            var results = [];

            for (var i = 0; i < result.length; i++) {
                if (result[i].number > 0 && typeof result[i].episodes != 'undefined') {
                    for (var j = 0; j < result[i].episodes.length; j++) {
                        results.push(EpisodeData(result[i].episodes[j]));
                    }
                }
            }

            cb(null, results);
        } else {
            return cb("Request to Trakt failed", null);
        }
    });
}

exports.getSeasonListForShow = function(slug, cb) {
    var url = baseUrl + "/shows/"+slug+"/seasons";
    console.log(url);

    request({url: url, headers: headers}, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(response.body);
            var results = [];

            for (var i = 0; i < result.length; i++) {
                if (result[i].number > 0) {
                    results.push(result[i].number)
                }
            }

            cb(null, results);
        } else {
            return cb("Request to Trakt failed", null);
        }
    });
}

exports.getPopularShows = function(cb) {
    var url = baseUrl + "/shows/popular?extended=images";
    console.log(url);

    request({url: url, headers: headers}, function(error, response, body) {
        if (!error && response.statusCode == 200) {

            var results = [];
            var result = JSON.parse(response.body);

            for (var i = 0; i < result.length; i++) {
                var imageUrl = '';
                if (typeof result[i].images != 'undefined' && result[i].images != null) {
                    if (typeof result[i].images.poster != 'undefined' && result[i].images.poster != null) {
                        if (result[i].images.poster.thumb != null) {
                            imageUrl = result[i].images.poster.thumb;
                        }
                    }
                }
                results.push(SearchResult(result[i].ids.slug, result[i].title, result[i].year, imageUrl));
            }


            cb(null, results);
        } else {
            return cb("Request to Trakt failed", null);
        }
    });
}