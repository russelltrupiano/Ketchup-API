var request = require('request');
var cheerio = require('cheerio');
var url = require('url');
var _ = require('lodash');

exports.scrapeForImage = function(show, cb) {
    request(show.link.toString(), function(err, response, html) {

        if (!err && response.statusCode == 200) {
            var $ = cheerio.load(html);

            if ($('tr div.padding_bottom_10 img').length === 0) {
                return cb(null, '');
            }

            $('tr div.padding_bottom_10 img').map(function(i, e) {
                var srcUrl = url.parse($(e).attr('src')).href;
                console.log("SCRAPED IMAGE: " + srcUrl);
                return cb(null, srcUrl);
            });
        } else {
            return cb(err, null);
        }
    });
}