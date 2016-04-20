var CronJob = require('cron').CronJob;
var request = require('request');
var Promise = require('promise');
var moment = require('moment');

var NOON_API = "http://api.colormyx.com/v1/noon-pacific/";
var PLAYLISTS = "playlists/";
var TRACKS = "/tracks/?detail=true";
var MIX = "http://noonpacific.com/#/mix/";

var ID_OFFSET = 44;
var NOON_OFFSET = 65

// This is every Monday at 12:05 pm"
var cron_string = '0 20 * * 1';
// var cron_string = '* * * * *'; // dev testing every minute

// What is public
module.exports = {

    cron_string: cron_string,
    ID_OFFSET: ID_OFFSET,

    // Starts cron job which call callback
    // every Monday at 12:05 pm
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

    // Returns promise with all NP playlists
    getPlaylists: function() {
        return getJSON(NOON_API + PLAYLISTS);
    },

    // Returns promise tracks from Playlist {playlist_id}
    getTracksForPlaylist: function(playlist_id) {
        return getJSON(NOON_API + PLAYLISTS + playlist_id + TRACKS);
    },

    // Returns (Slack) formatted message of playlist
    // Formats differently if new = true
    formatPlaylist: function(playlist, new_msg) {
        var playlist_url = MIX + playlist.id;
        var release = moment(playlist.release_date);
        var message = "";
        message += !new_msg ? "" : "_New Mixtape " + release.format("MMMM Do") + "_\n";
        message += ":sunrise: <" + playlist_url + "|*" + playlist.name + "*>\n";
        message += new_msg ? "" : "_Release Date " + release.format("MMMM Do") + "_\n";
        playlist.tracks.forEach(function(track, i) {
            message += track.track_number + ". ";
            message += "<" + track.soundcloud_permalink_url + "|*" + track.artist_description + "*> - ";
            message += track.title + "\n";
        });
        return message;
    },

    // Returns (Slack) formatted attachments object containing
    // Noon playlist cover image
    createPlaylistAttachment: function(playlist) {
        var cover_image = playlist.cover_large + "?w=200&h=200";
        var noon_link = MIX + playlist.id;
        var attachments = [{
            fallback: playlist.name + " cover image",
            title_link: noon_link,
            image_url: cover_image,
            thumb_url: cover_image
        }];
        return attachments;
    }
};

// makes GET request to url and returns promise
// with JSON body
function getJSON(url) {
    console.log('Making request to ' + url);
    var promise = new Promise(function(resolve, reject) {
        request(url, function(error, response, body) {
            if (!error && response.statusCode === 200 && body) {
                console.log('Success: ' + url);
                var json = JSON.parse(body);
                resolve(json);
            } else {
                reject(error);
            }
        });
    });
    return promise;
}
