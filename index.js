'use strict'

var Botkit = require('botkit');
var BeepBoop = require('beepboop-botkit');

var controller = Botkit.slackbot();

Beepboop.start(controller, {
    debug: true
});

// listen for botkit controller events
controller.on('bot_channel_join', function(bot, message) {
    bot.reply(message, 'I\'m here!')
})
