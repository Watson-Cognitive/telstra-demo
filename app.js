var express = require('express');
var watson = require('watson-developer-cloud');
var fs     = require('fs');
var cfenv = require('cfenv');
var app = express();
app.set('title','Early Warning System');
app.set('view engine','ejs');
app.use(express.static(__dirname + '/public'));
var ibmdb = require('ibm_db');
var appEnv = cfenv.getAppEnv();
var storeName = false;
var customerName ="";

//
var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var MAX_PAGES_TO_VISIT=10;
var numPagesVisited = 0;
var pagesVisited = {};
var pagesToVisit = [];
var url = " ";
var baseUrl = " ";
var SEARCH_WORD =" ";
var START_URL=" ";
var CP_ID =" ";
var DOMAIN_NAME=" ";
var max_seq_no=" ";
var client_id =  "";
var login_client = "";

var param = new Object();

var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.listen(appEnv.port, '0.0.0.0', function() {
  console.log("server starting on " + appEnv.url);
});

app.get('/',function(req,res){
	res.render('chat');
});

app.get('/chat',function(req,res){
	res.render('home');
});

//Chat
var Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk
var path    = require("path");

// Create the service wrapper
var conversation = new Conversation({
// If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
// After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
username: 'f0d99c0e-9ce6-40ca-9493-adb1438eb482',
password: 'BQvjwoIxQYtM',
url: 'https://gateway.watsonplatform.net/conversation/api',
version_date: '2016-10-21',
version: 'v1'
});

// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
var workspace = '517db3a8-4eef-4a22-8953-306c0fb84907';
if (!workspace) {
	return res.json({
	'output': {
		'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
	}
	});
}

app.get('/download', function (req, res) {
	var filePath = "/public/pdf/file.pdf";

	fs.readFile(__dirname + filePath , function (err,data){
		console.log(err);
		//res.contentType("application/pdf");
		res.download(__dirname + filePath);
	});
});

var today = new Date();
var time = today.getHours();

if(time)

console.log(time);

if(storeName == true && req.body.input != null){
	storeName = false;
	var newContext = req.body.context;
	newContext.customerName = req.body.input.text;
	var payload = {
		workspace_id: workspace,
		context: req.body.context || {},
		input: req.body.input || {}
	}
}else{
	var payload = {
		workspace_id: workspace,
		context: req.body.context || {},
		input: req.body.input || {}
	}
}

// Send the input to the conversation service
conversation.message(payload, function(err, data) {
	if (err) {
	return res.status(err.code || 500).json(err);
	}
	return res.json(updateMessage(payload, data));
});
});
  
/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response) {
console.log(response);
console.log(response.output.nodes_visited[0]);
if(response.output.nodes_visited[0] == "Welcome"){
	storeName = true;	
}
var responseText = null;
if (!response.output) {
	response.output = {};
} else {
	return response;
}
if (response.intents && response.intents[0]) {
	var intent = response.intents[0];
	// Depending on the confidence of the response the app can return different messages.
	// The confidence will vary depending on how well the system is trained. The service will always try to assign
	// a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
	// user's intent . In these cases it is usually best to return a disambiguation message
	// ('I did not understand your intent, please rephrase your question', etc..)
	if (intent.confidence >= 0.75) {
	responseText = 'I understood your intent was ' + intent.intent;
	} else if (intent.confidence >= 0.5) {
	responseText = 'I think your intent was ' + intent.intent;
	} else {
	responseText = 'I did not understand your intent';
	}
}
response.output.text = responseText;
return response;
}

app.use('/api/speech-to-text/', require('./stt-token.js'));