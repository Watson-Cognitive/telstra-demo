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

var Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk
var path    = require("path");

var conversation = new Conversation({
username: 'f0d99c0e-9ce6-40ca-9493-adb1438eb482',
password: 'BQvjwoIxQYtM',
url: 'https://gateway.watsonplatform.net/conversation/api',
version_date: '2016-10-21',
version: 'v1'
});

app.post('/api/message', function(req, res) {
	var workspace = '517db3a8-4eef-4a22-8953-306c0fb84907';
	if (!workspace) {
		return res.json({
		'output': {
			'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
		}
		});
	}

	if(req != null && req.body != null && req.body.context != null && req.body.context.askName){
		var askName = req.body.context.askName;
		//console.log("Ask Name is " + askName)
	}
	if(askName == "true" && req.body.input != null){
		var today = new Date();
		var time = today.getHours();
		var greeting = "";

		if(time < 12) greeting = "Morning"
		else if(time >= 12 && time < 18) greeting = "Afternoon"
		else greeting = "Evening"

		var newContext = req.body.context;
		newContext.customerName = req.body.input.text;
		newContext.greeting = greeting;
		var payload = {
			workspace_id: workspace,
			context: newContext || {},
			input: req.body.input || {}
		}
	}else{
		var payload = {
			workspace_id: workspace,
			context: req.body.context || {},
			input: req.body.input || {}
		}
	}

	conversation.message(payload, function(err, response) {
		if (err) {
		return res.status(err.code || 500).json(err);
		}
		return res.json(updateMessage(payload, response));
	});
});
  
app.get('/download', function (req, res) {
	var filePath = "/public/pdf/file.pdf";

	fs.readFile(__dirname + filePath , function (err,data){
		console.log(err);
		//res.contentType("application/pdf");
		res.download(__dirname + filePath);
	});
});

function updateMessage(input, response) {
	console.log("************************************")
	console.log(response);
	//console.log(response.entities.length);
	//console.log(response.entities);
	//console.log(response.output.nodes_visited[0]);
	/*if(response.output.nodes_visited[0] == "Welcome"){
		storeName = true;	
	}*/
	var responseText = null;
	if(response.output.nodes_visited[0] != "Welcome"){
		if (!response.output) {
			response.output = {};
		} else {
			if(response.context.askName == "true"){
				console.log("going in to check names");
				checkName(response);
			}
			else if(response.context.invoice_status == "valid"){
				checkInvoiceStatuses(response);
			}
			else if(response.context.po_status == "valid"){
				checkPOStatuses(response);
			}else if (response.intents && response.intents[0]) {
				var intent = response.intents[0];
				if (intent.confidence < 0.75) {
					responseText = 'I am sorry I am not trained to answer that question yet. I am learning fast and will soon be able to answer all your questions.';
					response.output.text = responseText;
				}
			}
			else{
				resetContext(response);
			}
			return response;
		}
	}else{
		return response;
	}
}

var invoicePayDate = function(){
	var approvedInvoicePayDate = new Date();
	
	var weekday = new Array(7);
	weekday[0] =  "Sunday";
	weekday[1] = "Monday";
	weekday[2] = "Tuesday";
	weekday[3] = "Wednesday";
	weekday[4] = "Thursday";
	weekday[5] = "Friday";
	weekday[6] = "Saturday";
	
	var month = new Array(7);
	month[0] =  "January";
	month[1] = "February";
	month[2] = "March";
	month[3] = "April";
	month[4] = "May";
	month[5] = "June";
	month[6] = "July";
	month[7] = "August";
	month[8] = "September";
	month[9] = "October";
	month[10] = "November";
	month[11] = "December";
	
	
	
	 approvedInvoicePayDate.setDate((approvedInvoicePayDate.getDate() + 8));
	 var dateString = "" + weekday[approvedInvoicePayDate.getDay()] + "," + approvedInvoicePayDate.getDate() + " th " + month[approvedInvoicePayDate.getMonth()] + " " + approvedInvoicePayDate.getFullYear();
	 return dateString;
}

var checkName = function(response){
	if(response.input.text != null){
		var customerName = response.input.text;
		customerName = customerName.split(" ");
		console.log("Ask name in context " + customerName);
		if(customerName.length > 2){
			response.output.text = "That does not seem like a name that can I understand.Kindly provide me your First name or Last Name";
		}
		else{
			resetContext(response);
		}
	}
	return response;
}

var checkInvoiceStatuses = function(response){
	//resetContext(response);
	var outputText = [];
	var invoiceNumber = "";
	if(response.entities.length > 0){
		response.entities.forEach(function(element) {
			invoiceNumber = element.value;
			if(element.entity == "ApprovedInvNum"){
				if(element.value == "11XXX11") outputText.push("For Invoice No : " + invoiceNumber + " payment will be made on " + invoicePayDate());
			}
			else if(element.entity == "PendingInvNum"){
				if(element.value == "22XXX22") outputText.push("Invoice No : " + invoiceNumber + " is currently pending for payment due to insufficient PO funds. PO value needs to be increased");
			}
			else if(element.entity == "AwaitingGRInvNum"){
				if(element.value == "33XXX33") outputText.push("Invoice No : " + invoiceNumber + " is Awaiting GR");
			}
		});
		response.output.text = outputText;
		return response;
	}
}

var checkPOStatuses = function(response){
	//resetContext(response);
	var outputText = [];
	var invoiceNumber = "";
	if(response.entities.length > 0){
		response.entities.forEach(function(element) {
			invoiceNumber = element.value;
			if(element.entity == "PONum"){
				if(element.value == "99XXX99"){
					outputText.push("For Invoice No : " + invoiceNumber + " payment will be made on " + invoicePayDate());
					outputText.push("Invoice No : " + invoiceNumber + " is currently pending for payment due to insufficient PO funds. PO value needs to be increased");
					outputText.push("Invoice No : 23XXX22 is Awaiting GR");
				}
			}
		});
		response.output.text = outputText;
		return response;
	}
}

var resetContext = function(response){
	console.log("Clearing Context");
	response.context.invoice_status = "";
	response.context.po_status = "";
	response.context.askName = "";
	return response;
}

app.use('/api/speech-to-text/', require('./stt-token.js'));