********************************************************************************************************************************
						COMMAND FORMATS
********************************************************************************************************************************
If the command is not shown here it takes no extra input besides the command itself (!<command>)
'*' denotes that this is an optional input but also will accept if no extra parameters are passed.
Some of these commands are moderator only and will return a message to non-moderators attempting to use them stating so.

This is the format for all available commands:
!echo <message>
!doom <message>
!givepts <user>
!slap <user>
!coinflip <heads/tails>
!hug <user>
!discipline <user>
!purge <user>
!requestsong <YouTube link or Video ID>
!buyCommand <command name>
!blacklist viewer <viewer name>
!blacklist song <YouTube link or Video ID>
!givePermission <command name>

********************************************************************************************************************************
                                                 RUNNING DINGUSBOT

********************************************************************************************************************************
If you are on windows use the "ruuuuun.bat" to install and run the bot for you (must install node.js first).

Otherwise:
1. Install Node.js here https://nodejs.org/en/
2. Once installed run Node.js commmand prompt
3. Change your active directory to where GetRichTwitch is saved (cd C:\...GetRichTwitch)
4. Copy this: npm i tmi.js haikudos get-video-id googleapis google-auth-library youtube-info //this will install the js files needed to run GetRichTwitch
	And paste it into your Node.js command prompt
5. Run connect.js by typing node src/JS/connect.js while your working directory is set to the GetRichTwitch folder
6. Open a browser and go to https://www.twitch.tv/mirandacosgrovebot
7. Type !commands in the chat box to see list of available commands.

**For !playvideo and other features that require youtube API you will be required to create your own client_secrets.json file with your youtube account info
or you will be prompted to authorize MirandaCosgroveBOT to access your YouTube account data**

********************************************************************************************************************************
						SETTINGS AND SETTINGS FILES
********************************************************************************************************************************
general_settings.json- This file currently holds the abilty to change if song requests are enabled on boot or if a moderator has
to !allowrequests first (VIDEO_REQUEST_ON_BY_DEFAULT in general_settings.json) as well as the ability to change the prefix for commands
e.g. !commands (COMMAND_PREFIX in general_settings.json).

DEFAULT VALUES:
VIDEO_REQUEST_ON_BY_DEFAULT = true
COMMAND_PREFIX = !

connection_settings.json - This file holds the authentication key for the bot, the bot username, and the channel the bot will connect to.
You should probably only change the channels list unless you are a power user and understand the consequences of changing the others

FORMAT FOR CONNECTION SETTINGS:
{
    "identity": {
        "username": "Bot_Username",
        "password": "oauth:<key>"
    },
    "channels": [
        "Channel1",
	"Channel2",
	"Channel3"
    ]
}

To connect to multiple channels at a time simply add the name where Channel1, Channel2, Channel3 are in that format example, default value
before being changed is to connect to the bot's own channel (twitch.tv/MirandaCosgroveBot). Make sure you are separating each channel name with a comma
and leaving the name of the channel in quotes or you could run into errors loading which would force it to go to the default channel (Keep an eye on the console for errors).
