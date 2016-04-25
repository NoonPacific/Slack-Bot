// example
'use strict'

var Botkit = require('botkit');
var BeepBoop = require('beepboop-botkit');
var _ = require('underscore');

var np = require('./np/noonpacific.js');
var Store = require('./store/store.js');
var store = new Store('NoonPacific.json');

var NOON_URL = "http://noonpacific.com/";

// Bot responds to these types of messages
var to_bot = ["direct_message", "direct_mention"];

// THIS IS NEEDED TO MAKE API CALLS TO NP API
// PROBABLY A GOOD IDEA TO FIX THIS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var controller = Botkit.slackbot({
    json_file_store: './db_slackbutton_bot/',
});

var beepboop = BeepBoop.start(controller, {
    // debug: true
});

// This is called when a new playlist is released
// More specifically, Every Monday at 12:00 pm
np.startNPCron(function() {
    console.log('Noon Cron');
    newNoon(true);
});

function update() {
    // Make sure we have all playlists in cache
    store.getAllPlaylists().then(function(playlists) {});
}

// Ensure cache file of playlists on each container
beepboop.on('add_resource', function(message) {
    update();
});

// Listen for botkit events
// controller.on('bot_channel_join', function(bot, message) {
//     bot.reply(message, 'I\'m here!');
// });

controller.hears(['hi', 'hello'], to_bot, function(bot, message) {
    sendMessageToChannel(bot, message.channel, 'Hello! Checkout the latest Noon Pacific mixtape at ' + NOON_URL)
});

// controller.hears('all teams', ['direct_message'], function(bot, message) {
//     sendMessageToAllTeams("Hello!");
// });

// controller.hears(['config'], to_bot, function(bot, evt) {
//     bot.reply(evt, 'CUSTOM_CONFIG_ITEM: ' + bot.config.CUSTOM_CONFIG_ITEM)
// });

// NP

controller.hears('noon', to_bot, function(bot, message) {
    if (process.env.NODE_ENV === 'dev') {
        newNoon(true);
    }
});

controller.hears('update', ['direct_message'], function(bot, message) {
    store.getAllPlaylists().then(function(playlists) {
        var latest = playlists[0];
        var reply = "Fetched all playlists: " + latest.name;
        sendMessageToChannel(bot, message.channel, reply);
    });
});

controller.hears('latest', to_bot, function(bot, message) {
    var latest = store.getLatestNoon();
    if (!latest) {
        bot.reply(message, 'Could not find latest Noon');
    } else {
        store.getPlaylistWithTracks({
            id: latest.id
        }).then(function(playlist) {
            var reply = np.formatPlaylist(playlist);
            var attachments = np.createPlaylistAttachment(playlist);
            sendMessageToChannel(bot, message.channel, reply, attachments);
        });
    }
});

controller.hears('^\\d+$', to_bot, function(bot, message) {
    var noon_id = parseInt(message.text);
    store.getPlaylistWithTracks({
        playlist_number: noon_id
    }).then(function(playlist) {
        if (!playlist) {
            bot.reply(message, "_Sorry, Noon " + noon_id + " is not available_");
        } else {
            var reply = np.formatPlaylist(playlist);
            var attachments = np.createPlaylistAttachment(playlist);
            // bot.reply(message, reply);
            sendMessageToChannel(bot, message.channel, reply, attachments);
        }
    });
});

controller.hears('help', to_bot, function(bot, message) {
    var reply = "";
    reply += "*Hi* I'm NoonBot!. _This is what I can do_\n";
    reply += "Every Monday I notify all channels I'm in on the latest Noon Pacific\n";
    reply += "`latest`           : Get the latest playlist\n";
    reply += "`{integer}`     : Get Noon // {number}\n";
    reply += "`help`              : _Show this_";
    sendMessageToChannel(bot, message.channel, reply)
});

// Updates all teams with latest noon
// when optional alays is false  or empty (default) it will
// only notifiy teams when there was a new playlist
function newNoon(always) {
    var latest = store.getLatestNoon();
    var latest_id = -1;
    if (latest) {
        latest_id = latest.id;
    }

    store.getAllPlaylists().then(function(playlists) {
        // The Noon Pacific is new
        var new_latest = store.getLatestNoon();
        if (always || latest_id !== new_latest.id) {
            console.log('New Noon! ' + new_latest.id);
            store.getPlaylistWithTracks({
                id: new_latest.id
            }).then(function(playlist) {
                var reply = np.formatPlaylist(playlist, true);
                var attachments = np.createPlaylistAttachment(playlist);
                sendMessageToAllTeams(reply, attachments);
            });
        } else {
            console.log('Noon ' + latest_id + ' is the latest playlist');
        }
    });
}

// Sends a message to a channel
// Token identifies the team
function sendMessageToChannel(bot, channel_id, text, attachments) {
    var message = {
        token: bot.config.token,
        channel: channel_id,
        text: text,
        as_user: true
    };
    if (attachments !== undefined) {
        message.attachments = JSON.stringify(attachments);
    }
    var s_message = JSON.stringify(message);
    console.log('Sending message to: ' + channel_id);
    bot.api.chat.postMessage(message, function(err) {
        if (err) {
            console.log('\nERROR posting message to slack');
            console.log(err);
        }
    });
}

// Sends a message using Slack chat.postMessage API
// Message is sent to all channels in a team that the bot is a member of
function sendMessageToAllTeams(message, attachments) {
    console.log('Sending message to all teams');

    Object.keys(beepboop.workers).forEach(function(id) {
        var bot = beepboop.workers[id].worker;

        var gotChannels = function(err, channels) {
            if (err) {
                console.log('Error getting channels');
                console.log(err);
                return;
            }
            _.each(channels.channels, function(channel) {
                if (channel.is_member && !channel.is_archived) {
                    sendMessageToChannel(bot, channel.id, message, attachments);
                }
            });
        };

        // groups are Slack private channels
        var gotGroups = function(err, groups) {
            if (err) {
                console.log('Error getting groups');
                console.log(err);
                return;
            }
            _.each(groups.groups, function(group) {
                if (!group.is_archived) {
                    sendMessageToChannel(bot, group.id, message, attachments);
                }
            });
        };

        // console.log(bot);
        bot.api.channels.list({}, gotChannels);
        bot.api.groups.list({}, gotGroups);
    });
}
