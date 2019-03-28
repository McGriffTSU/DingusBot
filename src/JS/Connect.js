

const tmi = require('tmi.js');
const haikudos = require('haikudos');
const getVideoId = require('get-video-id');
const fs = require('fs');
const {google} = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const readline = require('readline');
const fetchVideoInfo = require('youtube-info');

let datetime = new Date();

//channel variables
let currUsers = [ 'DingusRobotnus' ];
let userData =  {};
let black_list = {users: [], songID: []};
let session_playlist_id = ''; //Holds playlist ID for this session
let VIDEO_ALLOWED;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/google-apis-nodejs-quickstart.json
let SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
let TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
let TOKEN_PATH = TOKEN_DIR + 'google-apis-nodejs-quickstart.json';

// Valid commands start with:
let commandPrefix;
// Define configuration options for connection:
let opts = {
    identity: {
        username: '',
        password: ''
    },
    channels: [
        ''
    ]
};

// These are the commands the bot knows (defined below):
let knownCommands = { echo, haiku, doom, givepts, takepts, slap, coinflip, hug, showchats, showhugs, discipline, gamble, purge, commands,
    clear, showpts, trade, stats, requestsong, allowrequests, blockrequests, shopMenu, buyCommand, blacklist}; //add new commands to this list

let purchasedCommands = {haiku, slap};

let client;

initAuth();

function bootLoader()
{
    exitListen();
    readUserData();
}

function readUserData()
{
    //Read user viewer data into memory
    fs.readFile("src/JSON/userData.json", 'utf8', function (err, data) {
        if (err)
        {
            console.log("ERROR READING BLACKLIST - REMOVING CURRENT LIST")
        }
        else{
            if(!(Object.keys(data).length === 0))
            {
                userData = JSON.parse(data);
            }
            console.log(userData);
        }
    });

    //Read song blacklist into memory
    fs.readFile("src/JSON/blacklist.json", 'utf8', function (err, data) {
        if (err)
        {
            console.log("ERROR READING BLACKLIST - REMOVING CURRENT LIST")
        }
        else{
            if(!(Object.keys(data).length === 0))
            {
                black_list = JSON.parse(data);
            }
        }
    });

    //Read bot login details and channel target into memory
    fs.readFile("src/JSON/connection_settings.json" , 'utf8' , function(err, data){
       if(err)
       {
           console.log(err);
           console.log("Error reading settings, defaulting to test channel (DingusRobotnus)");
           opts = {
               "identity": {
                   "username": "DingusRobotnus",
                   "password": "oauth:wg9ob3qiubygap9xbnxie3mo5wz7kk"
               },
               "channels": [
                   "DingusRobotnus"
               ]
           };
           //Start client through TMI using login from settings file
           client  = new tmi.client(opts);
           client.on('message', onMessageHandler);
           client.on("subscription", onSubHandler);
           client.on('connected', onConnectedHandler);
           client.on('disconnected', onDisconnectedHandler);
           client.connect()
       }
       else
       {
           if(!(Object.keys(data).length === 0))
           {
               //Set login details
               opts = JSON.parse(data);
               //Start client through TMI using login from settings file
               client  = new tmi.client(opts);
               client.on('message', onMessageHandler);
               client.on("subscription", onSubHandler);
               client.on('connected', onConnectedHandler);
               client.on('disconnected', onDisconnectedHandler);
               client.connect()
           }
           else
           {
               console.log("Settings file empty, please check README 'Settings' section for format and add src/JSON/connection_settings.json");
           }

       }
    });

    //Read general settings into memory
    fs.readFile("src/JSON/general_settings.json", 'utf8', function (err, data) {
        if (err)
        {
            console.log("ERROR READING SETTINGS - GOING TO DEFAULTS (see README 'Settings' section for defaults)");
            VIDEO_ALLOWED = false;
            commandPrefix = '!';
        }
        else{
            if(!(Object.keys(data).length === 0))
            {
                let settings = JSON.parse(data);
                console.log(settings);
                VIDEO_ALLOWED = settings['VIDEO_REQUEST_ON_BY_DEFAULT']
                commandPrefix = settings['COMMAND_PREFIX'];
            }
        }
    });




}

function exitListen()
{
    let stdin = process.openStdin();
    stdin.addListener("data", function (d) {
        // note:  d is an object, and when converted to a string it will
        // end with a linefeed.  so we (rather crudely) account for that
        // with toString() and then trim()
        if(d.toString().trim() == "exit")
        {
            /**
            INSERT CODE TO STORE DATA YOU WANT TO KEEP BETWEEN SESSIONS HERE
            ALL FILE WRITES/READS SHOULD BE SYNCHRONIZED VERSION OR THEY WILL NOT COMPLETE CORRECTLY
            PLEASE LEAVE COMMENTS FOR WHAT IS BEING STORED TO DISK AT EXIT TIME
             */

            let userOutput = JSON.stringify(userData, null, 2);
            fs.writeFileSync('src/JSON/userData.json', userOutput, 'utf8', function (err){
                if(err)
                    console.log(err);
                else
                    console.log("SUCCESSFULLY STORED USERDATA");
            });

            let data = JSON.stringify(black_list,  null, 2);
            fs.writeFileSync('src/JSON/blacklist.json', data, 'utf8', function (err) {
                if (err){
                    console.log("ERROR STORING BLACKLIST TO FILE");
                }
                console.log('BLACKLIST STORED TO DISK');
            });

            process.exit();
        }
    });
}

// Called every time a message comes in:
function onMessageHandler (target, context, msg, self) {
    if (self) { return } // Ignore messages from the bot
    console.log("message type: " + context['message-type']);
    // This isn't a command since it has no prefix:
    if (msg.substr(0, 1) !== commandPrefix) {
        console.log(`[${target} (${context['message-type']})] ${context.username}: ${msg}`)
        return
    }

    let viewer = context.username.toString().toLowerCase();

    if (viewer in userData) {
        userData[viewer].chats += 1;
        userData[viewer].points += 1;
    }
    else{
        userData[viewer] = {
            userName: viewer,
            points: 1,
            coins: 0,
            hugs: 0,
            disciplines: 0,
            purchases: [],
            chats: 1
        };
    }

    // Split the message into individual words:
    const parse = msg.slice(1).split(' ');
    // The command name is the first (0th) one:
    const commandName = parse[0];
    // The rest (if any) are the parameters:
    const params = parse.splice(1);

    // If the command is known, let's execute it:
    if (commandName in knownCommands) {
        // Retrieve the function by its name:
        const command = knownCommands[commandName];
        // Then call the command with parameters:
        command(target, context, params);
        console.log(`* Executed ${commandName} command for ${context.username}`)
    } else {
        console.log(`* Unknown command ${commandName} from ${context.username}`)
    }
}

function onSubHandler() {
    console.log(`/*/*/*/*/*Subscriber has been detected/*/*/*/*/*`)
}

// Called every time the bot connects to Twitch chat:
function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`)
}

// Called every time the bot disconnects from Twitch:
function onDisconnectedHandler (reason) {
    console.log(`Disconnected: ${reason}`);
    process.exit(1);
}

// Function called when the "echo" command is issued:
//Echos string into private message - possibly broken by TwitchAPIv5 and needs update? Need to test more first
function echo (target, context, params) {
    // If there's something to echo:
    if (params.length) {
        // Join the params into a string:
        const msg = params.join(' ');
        // Send it back to the correct place:
        sendMessage(target, context, msg)
    } else { // Nothing to echo
        console.log(`* Nothing to echo`)
    }
}

// Function called when the "haiku" command is issued:
// Prints random haiku into chat
function haiku(target, context) {
    let viewer = context.username.toString().toLowerCase();
    if(viewer in userData)
    {
        let purch_arr = userData[context.username.toString().toLowerCase()].purchases;
        for(let key in purch_arr) {
            if(purch_arr[key] === 'haiku'){
                // Generate a new haiku:
                haikudos((newHaiku) => {
                    // Split it line-by-line:
                    newHaiku.split('\n').forEach((h) => {
                        // Send each line separately:
                        sendMessage(target, context, h)
                    })
                })
            }
        }
    }

}

// Function called when the "hug" command is issued:
// Adds one hug to target viewer if valid
function hug(target, context, huggee) {
    let hugged_viewer = huggee.toString().toLowerCase();
    if(huggee.length < 1)
    {
        client.say(target, "@" + context.username + " You must enter a user to hug in this command.");
        return;
    }
    else if(hugged_viewer === context.username.toString().toLowerCase())
    {
        client.say(target, "@" + context.username + " You can't hug yourself nerd");
    }
    else if (hugged_viewer in userData) {
        userData[hugged_viewer].hugs += 1;
        sendMessage(target, context, huggee + ' has ' + ' been HUGGED!');
    }
}


//Function called when "showhugs" command is issued:
//Shows amount of hugs received by
function showhugs(target, context) {
    let viewer = context.username;
    if (viewer in userData) {
        sendMessage(target, context, context.username + ' has ' + userData[viewer].hugs + ' total  hugs!');
    }
    else{
        console.log(viewer + " is not in array");
        sendMessage(target, context, context.username + ' has no hugs!');
    }
}

//Adds one discipline to the user, if they reach 10 or more disciplines they will be banned temporarily for 10 minutes
function discipline(target, context, disciplinee) {
    if(context['mod'] === true || badge === "broadcaster/1") {
        let viewer = disciplinee.toString().toLowerCase();
        if (viewer in userData) {
            if (userData[viewer].disciplines > 9) {
                userData[viewer].disciplines = 0;
                client.say(target, "/timeout " + userData[viewer].userName + " 600 discipline_overflow_punishment");
            }
            else
            {
                userData[viewer].disciplines += 1;
            }
        }
    }
    else
        client.say(target, "Discipline command is moderator only");
}


//Shows amount of times user has chatted in the channel
function showchats(target, context) {
    let viewer = context.username.toString().toLowerCase();

    if(viewer in userData)
    {
        sendMessage(target, context, context.username + ' has chatted ' + userData[viewer].chats + ' times!');
    }
}

// Function called when the "gamble" command is issued:
// Flips a coin, win or lose the amount of points the viewer chooses
function gamble(target, context, stake) {
    let bet = parseInt(stake, 10);
    if(isNaN(bet) || !(bet > 0))
        return;

    let coin = Math.floor(Math.random() * 2);
    let viewer = context.username.toLowerCase();

    if(coin > 1)
    {
        if(viewer in userData)
        {
            userData[viewer].points += bet;
        }
    }
    else
    {
        if(viewer in userData)
        {
            userData[viewer].points -= bet;
        }
    }
}

// Function called when the "coinflip" command is issued:
// Flips a coin and returns side landed on - not connected to user points just for indecisive people on yes/no questions
function coinflip(target, context) {
    let coin = Math.floor(Math.random() * 2);

    // Print coin;
    if (coin == 0)
        sendMessage(target, context, 'The coin landed on Tails');
    else if (coin == 1)
        sendMessage(target, context, 'The coin landed on Heads');
}

// Function called when the "slap" command is issued:
// Purchased command - slaps target viewer if valid
function slap(target, context, slapee) {
    let viewer = slapee.toString().toLowerCase();
    if(viewer in userData)
    {
        let purch_arr = userData[context.username.toString().toLowerCase()].purchases;
        for(let key in purch_arr) {
            if(purch_arr[key] === 'slap'){
                client.say(target, "@" + slapee + " has been publicly disrespected by the backhand of @" + context.username);
            }
        }
    }
}

//Function called when the "doom" command is issued:
//takes one or more strings as input, prints goofy message about how Doom runs on anything
function doom(target, context, params) {
    if(params.length) {
        let msg = params.toString().replace(/,/g, ' ');
        sendMessage(target, context, 'Yes, Doom will run on anything, even on a ' + msg);
    }
}

//Function called when "givepts" command is issued:
//Mod only command - gives points to viewer specified if viewer
function givepts(target, context, parameters) {
    let badge = context['badges-raw'].split(",")[0];
    if(context['mod'] === true || badge === "broadcaster/1") {
        let viewer = parameters[0].toString().toLowerCase();
        let points = parseInt(parameters[1], 10);
        if (viewer in userData) {
            userData[viewer].points += points;
            sendMessage(target, context, context.username + ' got ' + points + ' points. Welfare queen.');
        }
    }
    else
    {
        client.say(target, "givepts command is moderator only")
    }
}

//Moderator only command - removes points from user specified if it is valid
function takepts(target, context, parameters) {
    let badge = context['badges-raw'].split(",")[0];
    if(context['mod'] === true || badge === "broadcaster/1") {
        let viewer = parameters[0].toString().toLowerCase();
        let points = parseInt(parameters[1], 10);
        if (viewer in userData) {
            userData[viewer].points -= points;
            sendMessage(target, context, context.username + ' was penalized ' + points + ' points.');
        }
    }
    else
    {
        client.say(target, "givepts command is moderator only")
    }

}

//Function called when "showpts" command is issued:
//Shows current amount of points for user that calls command
function showpts(target, context) {
    let viewer = context.username.toLowerCase();

    if(viewer in userData)
    {
        client.say(target, "@" + viewer + " You have " + userData[viewer].points + " points and " + userData[viewer].coins + " coins");
    }
    else
        sendMessage(target, context, context.username + ' has no points!');

}

//Function called when "trade" command is issued:
//Trades points for coins
function trade(target, context) {
    let viewer = context.username.toString().toLowerCase();
    if(viewer in userData)
    {
        let coinbuy = Math.floor(userData[viewer].points/10);
        let remainpts = userData[viewer].points%10;
        userData[viewer].coins += coinbuy;
        userData[viewer].points = remainpts;
    }
}

// Helper function to send the correct type of message:
// Know that Commands do not run in Whisper
function sendMessage (target, context, message) {
    if (context['message-type'] === 'whisper') {
        client.whisper(target, message)
    } else {
        client.say(target, message)
    }
}

//Bans and then unbans user to purge their messages from chat
function purge(target, context, purgedUser)
{
    let badge = context['badges-raw'].split(",")[0];
    if(context['mod'] === true || badge === "broadcaster/1"){
        if (purgedUser.toString().length > 2) {
            client.say(target, "/timeout " + purgedUser + " 1");
            client.say(target, "Not just the " + purgedUser + " but the women and children too...");
        }
    }
    else if(context['mod'] === false)
    {
        client.say(target, context['display-name'] + " your magic holds no power here.")
    }
}
//Clears chat, basically a shameless macro for /clear to test moderator permissions check
function clear(target, context)
{
    let badge = context['badges-raw'].split(",")[0];
    if(context['mod'] === true || badge === "broadcaster/1") {
        client.say(target, "/clear");
        client.say(target, "Alright ya'll gettin' a little too nasty.")
    }
    else
    {
        client.say(target, "You do not have access to this command because your clothes are out of style.");
    }
}
//Prints all known commands as a string into chat
function commands(target, context)
{
    let cmdStrings = [];

    for(let commandName in knownCommands)
        cmdStrings[cmdStrings.length] = " " + commandPrefix + commandName.toString() + " ";

    client.say(target, "@" + context.username + " Commands known:" + cmdStrings);
}

/**
 * Add song to request queue if song requests have been activated
 * @param target - channel info
 * @param context - user info
 * @param videoID - String of requested URL
 //  */

function requestsong(target, context, videoID) {
    if(VIDEO_ALLOWED === true) {
        if(session_playlist_id == '') //If playlist ID is empty, create new playlist to enter playlist item
        {
            fs.readFile('src/JSON/most_recent_playlist.json', function (err, data)
            {
                if (err)
                {//If you get an error on the read, create a new playlist and overwrite previous file
                    console.log(err + "\nError fetching playlist, discarding data in most_recent_playlist.json");
                    fs.readFile('src/JSON/client_secret.json', function processClientSecrets(err, content) {
                        if (err) {
                            console.log('Error loading client secret file: ' + err);
                            return;
                        }
                        console.log("Playlist does not exist, creating new playlist");
                        // Authorize a client with the loaded credentials, then call the YouTube API to create a playlist
                        authorize(JSON.parse(content), {
                                        'params': {
                                            'part': 'snippet,status',
                                            'onBehalfOfContentOwner': ''
                                        }, 'properties': {
                                            'snippet.title': 'STREAM ' + datetime.toString(),
                                            'snippet.description': '',
                                            'snippet.tags[]': '',
                                            'snippet.defaultLanguage': '',
                                            'status.privacyStatus': ''
                                        }
                                    }, playlistsInsert);
                                });
                                return;
                }
                //Otherwise check time to see if a recent playlist exists, otherwise create a new one and overwrite file
                data = (data.toString()).split(' ');
                let time_created = parseInt(data[1], 10);
                let last_ID = data[0];
                let current_time = datetime.getTime();
                console.log(last_ID);
                if ((current_time - time_created) < 86700000) //recent playlist exists, do not create new one to avoid playlist pollution
                {//86700000 is 24hrs, change to fit your needs, playlists can be added to for an indefinite amount of time
                    console.log("Playlist from within 24 hours found, grabbing playlist ID: " + last_ID);
                    session_playlist_id = last_ID;
                }
                else{ //No recent one found, make a new playlist
                    console.log("Playlist does not exist, creating new playlist");
                    // Authorize a client with the loaded credentials, then call the YouTube API to create a playlist
                    fs.readFile('src/JSON/client_secret.json', function processClientSecrets(err, content) {
                        if (err) {
                            console.log('Error loading client secret file: ' + err);
                            return;
                        }
                        authorize(JSON.parse(content), {
                                'params': {
                                            'part': 'snippet,status',
                                            'onBehalfOfContentOwner': ''
                                        }, 'properties': {
                                            'snippet.title': 'STREAM ' + datetime.toString(),
                                            'snippet.description': '',
                                            'snippet.tags[]': '',
                                            'snippet.defaultLanguage': '',
                                            'status.privacyStatus': ''
                                        }
                                    }, playlistsInsert);
                                });
                            }
                        });
        }
        let ID = getVideoId(videoID.toString());
        console.log(ID);
        if(checkBlacklist(context.username) || checkBlacklist(ID['id']))
        {
            client.say(target, "@" + context.username + " song or viewer has been blocked from song requests");
            return;
        }
        if(Object.keys(ID).length === 0 && ID.constructor === Object) {
            client.say(target, "@" + context.username + " That ID is not a valid youtube URL")
        }
        else {
            let requestinfo = {SongID: ID, Name: context['username'], UserID: context['user-id']};
            let data = JSON.stringify(requestinfo, null, 2);
            fs.writeFile('src/JSON/song-request-update.json', data, 'utf8', function (err) {
                if (err) throw err;
                console.log('complete');
            });
            console.log("Playlist ID: " + session_playlist_id);
            playlistItemInsertNow(ID['id'], target);
        }
    }
    else {
        client.say(target, "Song requests are not currently allowed, get a moderator to use !allowrequests");
    }
}

/**
 *Turns on song request functionality for all users, only usable by moderators, also creates a playlist
 */
function allowrequests(target, context)
{
    //only allow mods to turn requests on
    let badge = context['badges-raw'].split(",")[0];
    if(context['mod'] === true || badge === "broadcaster/1")
    {
        if(session_playlist_id == '') //If playlist ID is empty, create a new playlist
        {
            fs.readFile('src/JSON/most_recent_playlist.json', function (err, data)
            {
                if (err)
                {//If you get an error on the read, create a new playlist and overwrite previous file
                    console.log(err + "\nError fetching playlist, discarding data in most_recent_playlist.json");
                    fs.readFile('src/JSON/client_secret.json', function processClientSecrets(err, content) {
                        if (err) {
                            console.log('Error loading client secret file: ' + err);
                            return;
                        }
                        console.log("Playlist does not exist, creating new playlist");
                        // Authorize a client with the loaded credentials, then call the YouTube API to create a playlist
                        authorize(JSON.parse(content), {
                            'params': {
                                'part': 'snippet,status',
                                'onBehalfOfContentOwner': ''
                            }, 'properties': {
                                'snippet.title': 'STREAM ' + datetime.toString(),
                                'snippet.description': '',
                                'snippet.tags[]': '',
                                'snippet.defaultLanguage': '',
                                'status.privacyStatus': ''
                            }
                        }, playlistsInsert);
                    });
                    return;
                }
                //Otherwise check time to see if a recent playlist exists, otherwise create a new one and overwrite file
                data = (data.toString()).split(' ');
                let time_created = parseInt(data[1], 10);
                let last_ID = data[0];
                let current_time = datetime.getTime();
                console.log(last_ID);
                if ((current_time - time_created) < 86700000)
                {
                    console.log("Playlist from within 24 hours found, grabbing playlist ID: " + last_ID);
                    session_playlist_id = last_ID;
                }
                else{
                    console.log("Playlist does not exist, creating new playlist");
                    // Authorize a client with the loaded credentials, then call the YouTube API to create a playlist
                    fs.readFile('src/JSON/client_secret.json', function processClientSecrets(err, content) {
                        if (err) {
                            console.log('Error loading client secret file: ' + err);
                            return;
                        }
                        authorize(JSON.parse(content), {
                            'params': {
                                'part': 'snippet,status',
                                'onBehalfOfContentOwner': ''
                            }, 'properties': {
                                'snippet.title': 'STREAM ' + datetime.toString(),
                                'snippet.description': '',
                                'snippet.tags[]': '',
                                'snippet.defaultLanguage': '',
                                'status.privacyStatus': ''
                            }
                        }, playlistsInsert);
                    });
                }
                VIDEO_ALLOWED = true;
            });
        }
        else
        {
            VIDEO_ALLOWED = true;
        }

    }
    else {
        client.say(target, "Command !allowrequests is only available to moderators");
    }

}

/**
 * Block playlist requests by turning the boolean to false, should be checked in requestsong function
 * and block any more videos going into the queue or creation of a playlist
 */
function blockrequests(target, context)
{
    let badge = context['badges-raw'].split(",")[0];
    if(context['mod'] === true || badge === "broadcaster/1") {
        VIDEO_ALLOWED = false;
    }
    else
    {
        client.say(target, "@" + context.username + " Only moderators can use this command");
    }
}


/**
 * Adds a new playlist to insert data into using the requestData to get channel and playlist ID
 * Also sets session playlist ID
 */
function playlistsInsert(auth, requestData) {
    let service = google.youtube('v3');
    let parameters = removeEmptyParameters(requestData['params']);
    parameters['auth'] = auth;
    parameters['resource'] = createResource(requestData['properties']);
    service.playlists.insert(parameters, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        console.log(response.data.id);
        session_playlist_id = response.data.id.toString();
        fs.writeFile('src/JSON/most_recent_playlist.json', session_playlist_id + " " + datetime.getTime(), function()
        {
            console.log("Playlist created at " + datetime.getTime());
        });
    });

}


/**
 * Create an OAuth2 approval with the given credentials, and then execute the
 * given callback function.
 */
function authorize(credentials, requestData, callback) {
    let clientSecret = credentials.installed.client_secret;
    let clientId = credentials.installed.client_id;
    let redirectUrl = credentials.installed.redirect_uris[0];
    let oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client);
            console.log("New token had to be authorized, command not processed");
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client, requestData);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 */
function getNewToken(oauth2Client) {
    let authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });t
    console.log('Authorize this app by visiting this url: ', authUrl);
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
        });
    });
}

/**
 * Store token to disk
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST')
            throw err;
    }

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
    bootLoader();
}

/**
 * Remove parameters that do not have values.
 */
function removeEmptyParameters(params) {
    for (let p in params) {
        if (!params[p] || params[p] == 'undefined') {
            delete params[p];
        }
    }
    return params;
}

/**
 * Create a JSON object, representing an API resource, from a list of
 * properties and their values.
 */
function createResource(properties) {
    let resource = {};
    let normalizedProps = properties;
    for (let p in properties) {
        let value = properties[p];
        if (p && p.substr(-2, 2) == '[]') {
            let adjustedName = p.replace('[]', '');
            if (value) {
                normalizedProps[adjustedName] = value.split(',');
            }
            delete normalizedProps[p];
        }
    }
    for (let p in normalizedProps) {
        // Leave properties that don't have values out of inserted resource.
        if (normalizedProps.hasOwnProperty(p) && normalizedProps[p]) {
            let propArray = p.split('.');
            let ref = resource;
            for (let pa = 0; pa < propArray.length; pa++) {
                let key = propArray[pa];
                if (pa == propArray.length - 1) {
                    ref[key] = normalizedProps[p];
                } else {
                    ref = ref[key] = ref[key] || {};
                }
            }
        };
    }
    return resource;
}

//Shows user statistics - definitely needs some new stuff to jazz it up
function stats(target, context) {
    client.say(target, context['display-name'] + " Here's your status");
    if (context['mod'] === true) {
        client.say(target, context['display-name'] + " is a mod")
    }
    else
    {
        client.say(target, context['display-name'] + " is not a mod")
    }
}

/**
 * Insert playlist item into playlist, both given in requestData from calling function
 */
function playlistItemsInsert(auth, requestData) {
    let service = google.youtube('v3');
    let parameters = removeEmptyParameters(requestData['params']);
    parameters['auth'] = auth;
    parameters['resource'] = createResource(requestData['properties']);
    service.playlistItems.insert(parameters, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            console.log('PLAYLIST ITEM REQUEST NOT PROCESSED');
            return;
        }
    });

}

/**
 * Parent function for playlist requests, gets video ID and sets up playlist ID to add to and passes it to
 * the insert function
 */
function playlistItemInsertNow(id, target)
{
// Load client secrets from a local file.
    fs.readFile('src/JSON/client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        console.log(id);

        fetchVideoInfo(id).then(function (videoInfo) {
            if(videoInfo.duration < 400)
            {
                authorize(JSON.parse(content), {'params': {'part': 'snippet',
                        'onBehalfOfContentOwner': ''}, 'properties': {'snippet.playlistId': session_playlist_id,
                        'snippet.resourceId.kind': 'youtube#video',
                        'snippet.resourceId.videoId': id,
                        'snippet.position': ''
                    }}, playlistItemsInsert);
                client.say(target, videoInfo.title + " has been added to the request queue");
            }
            else
            {
                client.say(target, "Hey jabroni your video is too long");
            }
        });
        // Authorize a client with the loaded credentials, then call the YouTube API.

    });
}

function playlistItemsDelete(auth, requestData) {
    let service = google.youtube('v3');
    let parameters = removeEmptyParameters(requestData['params']);
    parameters['auth'] = auth;
    service.playlistItems.delete(parameters, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        console.log(response);
    });
}

/**
 * Block target song or user from requesting songs
 *
 * Implementation is not efficient... checks both halves of blacklist when we only have to check one half and have the
 * data to know which half - need to fix
 * @param target
 * @param context
 * @param parameters
 */
function blacklist(target, context, parameters)
{
    let x = parameters.slice(' ');
    let type = x[0];
    let content = x[1];
    //only allow mods to turn requests on
    let badge = context['badges-raw'].split(",")[0];
    if(context['mod'] === true || badge === "broadcaster/1")
    {
        if(type === "viewer")
        {
            if(checkBlacklist(content))
            {
                client.say(target, "@" + context['username'] + " viewer already blocked from requests");
            }
            else
            {
                black_list.users.push(content);
                console.log(black_list);
            }

        }
        else if(type === "song")
        {
            let ID = getVideoId(content.toString());
            if(Object.keys(ID).length === 0 && ID.constructor === Object) {
                client.say(target, "@" + context.username + " That is not a valid blacklist song")
            }
            else if(checkBlacklist(ID['id']))
            {
                client.say(target, "@" + context.username + " song already blocked");
            }
            else
            {
                black_list.songID.push(ID);
                console.log(ID['id'] + " has been blocked from requests");
            }
        }
        else
        {
            client.say(target, "@" + context.username + " incorrect command format")
        }
    }
    else
    {
        client.say(target, "@" + context.username + " this command is moderator only.")
    }
}

//Checks for blacklist entry in users and song ID
function checkBlacklist(name)
{
    for(let i in black_list.users)
    {
        if(black_list.users[i] === name)
        {
            return true;
        }
    }
    for(let i in black_list.songID)
    {
        if(black_list.songID[i].id === name)
        {
            return true;
        }
    }
    return false;
}


/**
 * Start google auth process, ask for new AuthKey if it is not saved
 * Once auth key is saved connect to chat and listen for exit command
 */
function initAuth() {
    let credentials;
    fs.readFile('src/JSON/client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        credentials = JSON.parse(content);
        let clientSecret = credentials.installed.client_secret;
        let clientId = credentials.installed.client_id;
        let redirectUrl = credentials.installed.redirect_uris[0];
        let oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);
        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, function(err, token) {
            if (err) {
                getNewToken(oauth2Client);
            } else {
                oauth2Client.credentials = JSON.parse(token);
                bootLoader();
            }
        });
    });
}

function shopMenu(target)
{
    let finalstring = 'SPECIAL FUNCTIONS 5 COINS EACH: ';
    client.say(target, "***WELCOME TO THE FUNCTION SHOP MENU***");
    for(let commandName in purchasedCommands)
        finalstring += "!" + commandName.toString() + ", ";
    client.say(target, finalstring);
}
//Adds command to viewer's purchased command permissions if they have the coins necessary
function buyCommand(target, context, commandToBuy)
{
    let command_name = commandToBuy.toString().toLowerCase();
    if (command_name in purchasedCommands){
        let viewer = context.username.toLowerCase();
        if(viewer in userData)
        {
            if(userData[viewer].coins >= 10)
            {
                userData[viewer].coins -= 10;
                userData[viewer].purchases.push(command_name);
            }
            else
            {
                client.say(target, "@" + viewer + " Not enough coins, try !trade to exchange points");
            }
        }
    }
    else
        client.say(target, "You did not enter a correct command name. Use !shopMenu to see them available commands.");
}

