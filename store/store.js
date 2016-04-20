// var JsonDB = require('node-json-db');
var loki = require('lokijs');
var Promise = require('promise');
var objectMerge = require('object-merge');
var np = require('../np/noonpacific.js');

var PLAYLISTS = "playlists";

var DB_NAME = 'NoonPacific.json';

var Store = function(db_name, dont_autoload) {
    var _this = this;
    this.db = new loki(db_name, {
        autoload: !dont_autoload,
        autosave: true,
        autosaveInterval: 1000 * 60 * 5, // 5 minutes
        autoloadCallback: function() {
            _this.playlists = _this.db.getCollection(PLAYLISTS);
            if (!_this.playlists) {
                _this.playlists = _this.db.addCollection(PLAYLISTS);
            }

            console.log('Database Loaded: ' + db_name);
            console.log(_this.db.listCollections());
        }
    });
    if (dont_autoload) {
        this.playlists = this.db.addCollection(PLAYLISTS);
        this.db.saveDatabase();
        console.log('Database Loaded: ' + db_name);
        console.log(_this.db.listCollections());
    }
};

// Returns id of latest cached playlist
// -1 if none cached
Store.prototype.getLatestNoon = function() {
    var latest = this.playlists.chain()
        .find()
        .simplesort('id')
        .data();
    return latest[latest.length - 1];
};

// Tries to get cached version of playlists
// If not cached, fetches from NP API
// Fetches and caches all playlists from NP API
Store.prototype.getAllPlaylists = function() {
    var _this = this;
    var promise = new Promise(function(resolve, reject) {
        np.getPlaylists().then(function(playlists) {
            for (var i = 0; i < playlists.length; i++) {
                var p = playlists[i];
                p.tracks = [];
                p.playlist_number = parseInt(p.name.replace(/[^0-9\.]/g, ''));
                _this.savePlaylist(p);
            }
            _this.db.saveDatabase();
            resolve(playlists);
        });
    });
    return promise;
};

// Returns promise with playlist
// null if not found in cache
Store.prototype.getPlaylist = function(query) {
    var _this = this;
    var promise = new Promise(function(resolve, reject) {
        resolve(_this.playlists.findOne(query));
    });
    return promise;
};

// Gets a playlist for query but ensures the tracks are present
// Returns promise
Store.prototype.getPlaylistWithTracks = function(query) {
    var _this = this;
    var promise = new Promise(function(resolve, reject) {
        var playlist = _this.playlists.findOne(query);
        if (!playlist) {
            resolve(null);
        }

        if (!playlist.tracks || playlist.tracks.length === 0) {
            np.getTracksForPlaylist(playlist.id).then(function(tracks) {
                playlist.tracks = tracks;
                _this.playlists.update(playlist);
                _this.db.saveDatabase();
                console.log('Playlist with tracks: ' + playlist.id + ' - FROM API');
                resolve(playlist);
            });
        } else {
            console.log('Playlist with tracks: ' + playlist.id + ' - FROM CACHE');
            resolve(playlist);
        }
    });
    return promise;
};

// Update or create a new playlist document
Store.prototype.savePlaylist = function(playlist) {
    var p = this.playlists.findOne({
        id: playlist.id
    });
    if (!p) {
        // Create new playlist
        // console.log('Created a new playlist: ' + playlist.id);
        this.playlists.insert(playlist);
    } else {
        // Update playlist
        // console.log('Updated Playlist with new data: ' + p.id);
        var new_p = objectMerge(p, playlist);
        this.playlists.update(new_p);
    }
};

module.exports = Store;
