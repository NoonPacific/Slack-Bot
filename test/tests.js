var fs = require('fs');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

var Store = require('../store/store.js');
var np = require('../np/noonpacific.js');

var test_db = 'test.json';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('Noon Pacific API', function() {
    it("Should return playlists", function(done) {
        np.getPlaylists().then(function(playlists) {
            expect(playlists).to.not.equal(null);
            expect(playlists).to.not.have.length(0);
            done();
        }, function(reason) {
            done(reason);
        });
    });

    it("Should return tracks for ids", function(done) {
        var testid1 = 100;
        var testid2 = 200;

        np.getTracksForPlaylist(testid1).then(function(tracks1) {
            np.getTracksForPlaylist(testid2).then(function(tracks2) {
                expect(tracks1).to.not.equal(null);
                expect(tracks1).to.not.have.length(0);

                expect(tracks2).to.not.equal(null);
                expect(tracks2).to.not.have.length(0);
                done();
            }, function(reason) {
                done(reason);
            });
        }, function(reason) {
            done(reason);
        });
    });
});

describe('Datastore', function() {

    // Fresh database each test
    beforeEach(function() {
        deleteFile(test_db);
    });

    after(function() {
        deleteFile(test_db);
    });

    it('Should be an empty database', function(done) {
        var store = new Store(test_db, true);
        store.getPlaylist({
            id: 1
        }).then(function(playlist) {
            expect(playlist).to.be.equal(null);
            expect(fs.existsSync(test_db)).to.be.equal(true);
            done();
        });
    });

    it('Should cache playlists', function(done) {
        var store = new Store(test_db, true);
        store.getAllPlaylists().then(function(results) {

            // We should not get and empty result
            expect(results).to.not.be.length(0);

            // Are the results cached in db
            var cached = store.playlists.find({});
            expect(results.length).to.equal(cached.length);
            expect(results[0]).to.equal(cached[0]);
            expect(results[results.length - 1]).to.equal(cached[cached.length - 1]);

            // do the cached versions match up with the results
            var rand_index = getRandomInt(0, results.length);
            var rand_playlist = results[rand_index];
            store.getPlaylist({
                id: rand_playlist.id
            }).then(function(p) {
                expect(p).to.equal(rand_playlist);
                done();
            });
        });
    });

    it('Should get and cache playlists tracks', function(done) {
        var store = new Store(test_db, true);
        store.getAllPlaylists().then(function(results) {
            expect(results).to.not.be.length(0);

            var latest_p = store.getLatestNoon();
            expect(latest_p).to.not.be.equal(null);
            expect(latest_p.tracks).to.be.length(0);
            store.getPlaylistWithTracks({
                playlist_number: latest_p.playlist_number
            }).then(function(tracks_p) {
                store.getPlaylist({
                    id: latest_p.id
                }).then(function(cached_p) {
                    expect(tracks_p).to.be.equal(latest_p);
                    expect(tracks_p.tracks).to.not.be.length(0);
                    expect(tracks_p).to.equal(cached_p);
                    done();
                });
            });
        });
    });
});

function deleteFile(filename) {
    if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
    }
}

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
