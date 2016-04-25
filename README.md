# Noon Pacific Slack Bot

[![Build Status](https://drone.io/github.com/coffee-cup/noon-pacific-bot/status.png)](https://drone.io/github.com/coffee-cup/noon-pacific-bot/latest)

This is the start of a Slack bot for Noon Pacific.

The bot will notify all teams it has been invited to of the latest [Noon Pacific playlist](http://noonpacific.com/#/).
It also allows you to query and get the tracks for any playlist.

_Commands can either be a direct message or direct mention_

| Command | Action |
|:---|:---|
|`latest`| Get the latest playlist |
|`{number}`| Get _Noon // {number}_|
|`help`| Show bot help |

## Installation

This bot was created to run on the [BeepBoop](https://beepboophq.com) platform.

1. Fork this repo and `cd` into it
2. Run `npm install`
4. Go to the [BeepBoop projects page](https://beepboophq.com/0_o/my-projects) and create a new bot from forked Github repo.
5. Make sure the bot is a multi-team bot on the BeepBoop settings page with Slack client id and secret.
6. Start the bot on BeepBoop.
7. _To run Locally, run `npm run dev` for dev mode or `npm run prod` for a production environment._
