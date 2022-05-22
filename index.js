const fs = require('fs');
const express = require("express");
const req = require("express/lib/request");
const res = require("express/lib/response");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

function hostIndex(hostName) {
    var idx = 0;
    if (hostName.includes('localhost')) idx = 1;
    if (hostName.includes('heroku')) idx = 2;
    return idx;
}

//initilize express
const app = express();

app.get("/", async(req, res) => {
    const host = req.headers.host;
    res.send(hostIndex(host).toString());
    return;
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
        if (err) return res.json({"status": "Error", "message": "App parameter is not ready."});
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), continueFlow);
    });
    function authorize(credentials, callback) {
        const {client_secret, client_id, redirect_uris} = credentials.web;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
      
        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, (err, token) => {
          if (err) return getNewToken(oAuth2Client, callback);
          oAuth2Client.setCredentials(JSON.parse(token));
          callback(oAuth2Client);
        });
    }
    // get new token if we don't have any token stored.
    function getNewToken(oAuth2Client, callback) {
        const authUrl = oAuth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: SCOPES,
        });
        res.redirect(authUrl);
    }
    function continueFlow(auth) {
        res.json({"status" : "Ok", "token" : "Using existing token."});
    }
    
})

app.get("/forceNewToken", async(req, res) => {
    fs.readFile('credentials.json', (err, content) => {
        if (err) return res.json({"status": "Error", "message": "App parameter is not ready"});
        // Authorize a client with credentials.
        const authUrl = reAuthorize(JSON.parse(content));
        callbackRedirect(authUrl);
    });
    function reAuthorize(credentials) {
        const {client_secret, client_id, redirect_uris} = credentials.web;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
        return oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            });
    }
    function callbackRedirect(authUrl) {
        res.redirect(authUrl);
    }
      
})

app.get("/updateToken", async(req, res) => {
    // Save submitted token
    const token = req.query.code;
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return res.send(err);
        res.json({"status" : "Ok", "token": token});
    });
})

app.get("/data", async(req, res) => {
    // List available API
    const api_list = ["unit_pe", "ibe", "ibp"];
    if (!api_list.includes(req.query.name)) 
        return res.json({"status": "Error", "Message": "Invalid data requested."});
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
        if (err) return res.json({"status": "Error", "message": "App parameter is not ready."});
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), readSheet);
    });
    function authorize(credentials, callback) {
        const {client_secret, client_id, redirect_uris} = credentials.web;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
      
        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, (err, token) => {
          if (err) return res.json({"status": "Error", "message": "Invalid Authentication."});
          oAuth2Client.setCredentials(JSON.parse(token));
          callback(oAuth2Client);
        });
    }
    //function get data dynamic according to request
    /**
     * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
     */
    function readSheet(auth) {
        const sheets = google.sheets({version: 'v4', auth});
        sheets.spreadsheets.values.get({
            // spreadsheetId from Google Sheet URL
            spreadsheetId: '1fILdYOl-OtO6BLcHdCo_mXni1VaBOTi1aXB1U_W-Bvo',
            range: 'Sheet1!A2:B',
        }, (err, sheetdata) => {
            if (err) return console.log(err);
            //res.json({"status": "Error", "message": 'The API returned an error: ' + err});
            const rows = sheetdata.data.values;
            if (rows.length) {
                    var resp = {"Status" : "Ok"};
                    resp["Data"] = [];
                    rows.map((row) => {
                        var data = {
                            "title" : `${row[0]}`,
                            "author" : `${row[1]}`
                        };
                        resp.Data.push(data);
                        res.json(resp);
                });
            } else {
                res.json({"status": "Error", "message": 'No data found.'});
            }
        }
    );
    }

})

const port = 3000;
app.listen(port, ()=>{
    console.log(`server started on ${port}`);
});