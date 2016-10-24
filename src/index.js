'use strict'

var Botkit = require('botkit');
var BeepBoop = require('beepboop-botkit');
var _ = require('underscore');
var np = require('./noonpacific.js');

var NOON_URL = "http://noonpacific.com";

// Bot responds to these types of messages
var to_bot = ["direct_message", "direct_mention"];

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

// Listen for botkit events

controller.hears(['^hi$', '^hello$'], to_bot, function(bot, message) {
    sendMessageToChannel(bot, message.channel, 'Hello! Checkout the latest Noon Pacific mixtape at ' + NOON_URL)
});

// NP

controller.hears('noon', to_bot, function(bot, message) {
    if (process.env.NODE_ENV === 'dev') {
        newNoon(true);
    }
});

controller.hears(['latest', '^l$'], to_bot, function(bot, message) {
    np.getLatestMixtape().then(function(mixtape) {
        if (!mixtape) {
            sendMessageToChannel(bot, message.channel, '_Could not find latest Noon_');
        }

        var reply = np.formatMixtape(mixtape);
        var attachments = np.createMixtapeAttachment(mixtape);
        sendMessageToChannel(bot, message.channel, reply, attachments);
    });
});

controller.hears('^\\d+$', to_bot, function(bot, message) {
    var noonNumber = parseInt(message.text);
    np.getMixtapeWithTracks(noonNumber).then(function(mixtape) {
        var reply = np.formatMixtape(mixtape);
        var attachments = np.createMixtapeAttachment(mixtape);
        sendMessageToChannel(bot, message.channel, reply, attachments);
    }).catch(function(err) {
        sendMessageToChannel(bot, message.channel, '_Mixtape not available_');
    });
});

controller.hears('search (.+)', to_bot, function(bot, message) {
    if (message.match.length < 2) {
        return;
    }
    var query = message.match[1];
    np.searchTracksWithQuery(query).then(function(tracks) {
        if (!tracks || tracks.length === 0) {
            sendMessageToChannel(bot, message.channel, '_Could not find any tracks for search query *' + query + '*_');
            return;
        }

        var reply = np.formatTracksForSearch(query, tracks);
        sendMessageToChannel(bot, message.channel, reply);
    }).catch(function(err) {
        sendMessageToChannel(bot, message.channel, '_Search for ' + query + ' failed_');
    });
});

controller.hears(['help', '^h$'], to_bot, function(bot, message) {
    var reply = "";
    reply += "*Hi* I'm NoonBot! _This is what I do._\n";
    reply += "Every Monday I will notify all channels I belong to of the new Noon Pacific mixtape.\n";
    reply += "You can also *pm* or *direct message* me any of these commands.\n";
    reply += "`latest`:\tGet the latest playlist\n";
    reply += "`{number}`:\tGet Noon // {number}\n";
    reply += "`search {query}`:\tSearch track titles and artists for a matching substring _(first 20 results)_\n";
    reply += "`help`:\t_Show this_";
    sendMessageToChannel(bot, message.channel, reply)
});

// Updates all teams with latest noon
// when optional alays is false  or empty (default) it will
// only notifiy teams when there was a new playlist
function newNoon(always) {
    np.getLatestMixtape().then(function(mixtape) {
        if (!mixtape) {
            console.log('Could not get latest mixtape for new noon');
            return;
        }

        var reply = np.formatMixtape(mixtape, true);
        var attachments = np.createMixtapeAttachment(mixtape);
        sendMessageToAllTeams(reply, attachments);
    }).catch(function(err) {
        console.log(err);
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

        // Slack public channels
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

        // Groups are Slack private channels
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
