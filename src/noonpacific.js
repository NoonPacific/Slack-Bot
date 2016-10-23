var CronJob = require('cron').CronJob;
var moment = require('moment');

require('babel-polyfill');
var WhiteLabel = require('white-label-js');

var BASE_URL = 'http://noonpacific.com/#/';
var COLLECTION = 'weekly';
var SLUG_PREFIX = 'noon-';

var wl = new WhiteLabel("TSaAKdrGCkWF8erxzjc7k7wJmj0UmYPOAx2MLdPX");

// This is every Monday at 12:00 pm"
var cron_string = '0 12 * * 1';
// var cron_string = '* * * * *'; // dev testing every minute

// What is public
module.exports = {

    cron_string: cron_string,

    // Starts cron job which call callback
    // every Monday at 12:00 pm
    startNPCron: function(callback) {
        if (!callback) {
            console.log('startNPCron requires callback');
            return;
        }
        var job = new CronJob(cron_string, function() {
                callback();
            }, function() {
                // Called when job finishes
            },
            true, // start job right away
            'America/Vancouver' // timezone
        )
    },

    // Returns (Slack) formatted message of mixtape
    // Formats differently if new = true
    formatMixtape: function(mixtape, new_msg) {
        var mixtape_url = BASE_URL + COLLECTION + '/' + mixtape.slug;
        var release = moment(mixtape.release);
        var message = "";
        message += !new_msg ? "" : "_New Mixtape " + release.format("MMMM Do") + "_\n";
        message += ":ok_hand: <" + mixtape_url + "|*" + mixtape.title + "*>\n";
        message += new_msg ? "" : "_Release Date " + release.format("MMMM Do") + "_\n";
        mixtape.tracks.forEach(function(track, i) {
            message += track.order + ". ";
            message += "<" + track.permalink_url + "|*" + track.artist + "*> - ";
            message += track.title + "\n";
        });
        return message;
    },

    // Returns (Slack) formatted attachments object containing
    // Noon mixtape cover image
    createMixtapeAttachment: function(mixtape) {
        var cover_image = mixtape.artwork_url + "?w=200&h=200";
        var noon_link = BASE_URL + COLLECTION + mixtape.slug;
        var attachments = [{
            fallback: mixtape.title + " cover image",
            title_link: noon_link,
            image_url: cover_image,
            thumb_url: cover_image
        }];
        return attachments;
    },

    getLatestMixtape: function() {
        return wl.getLatestMixtape().then(getTracksForMixtape);
    },

    getMixtapeWithTracks: function(noonNumber) {
        var noonSlug = getNoonSlug(noonNumber);
        return wl.getMixtape(noonSlug).then(getTracksForMixtape);
    }
};

var getNoonSlug = function(noonNumber) {
    var noonString = noonNumber + '';
    if (noonString.length === 1) {
        noonString = '00' + noonString;
    } else if (noonString.length === 2) {
        noonString = '0' + noonString;
    }
    return SLUG_PREFIX + noonString;
};

var getTracksForMixtape = function(mixtape) {
    if (!mixtape) {
        return Promise.reject('No mixtape to get tracks for');
    }
    return wl.getMixtapeTracks(mixtape.id, {
        results: true,
        all: true
    }).then(function(tracks) {
        mixtape.tracks = tracks;
        return mixtape;
    });
};
