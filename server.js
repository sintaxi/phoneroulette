// core libs
var fs = require('fs');
var qs = require('querystring');

// dependencies
var express = require("express");
var sessionStore = require('connect-redis')(express);
var request = require('request');
var redis = require("redis")

// local goods
var log = fs.createWriteStream(__dirname + '/log/development.log', {'flags': 'a'});
var logger = function(message) { log.write(message + "\n"); }
var config = JSON.parse(fs.readFileSync(__dirname + '/config/development.json', 'utf8'));
var port = process.env.PORT || 4000;

// redis client
var client = redis.createClient()

// get the game
var game = require("./lib/game")(client)

var app = express.createServer(
  // express.logger(),
  express.bodyParser(),
  express.cookieParser(),
  express.session({ store: new sessionStore, secret: 'keyboard cat' })  
);

app.configure(function(){
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(app.router);
});

app.set("view options", { layout: "layouts/layout" });

// Twilio Send Message Call
var sendMessage = function(options, callback) {
  var options = {
    method:'POST',
    url : 'https://'+ config.sid + ':' + config.atoken +'@api.twilio.com/2010-04-01/Accounts/' + config.sid + '/SMS/Messages.json',
    headers : {'content-type':'application/x-www-form-urlencoded'},
    body : qs.stringify({
      'Body': options.body,
      'From': config.fromNumber,
      'To': options.phone
    })
  }
  request(options, function (error, response, body) {
    if (!error && response.statusCode == 201) {
      if (callback) {
        callback(201, body)
      }
    } 
    if (error) {
      if (callback) {
        callback(response.statusCode, error)
      }
    }
  })
}

// splash page
app.get('/', function(req, res){
  res.render('index.ejs', { layout: 'layout' });
});

// twilio endpoint
app.post('/twilio', function(req, res){
  game.inbound({ phone: req.body.From, body: re.body.Body }, function(err, messages){
    messages.forEach(function(msg){
      sendMessage({phone: msg.phone, body: msg.body});
    })
  });
  res.send('\n', 204);
});


// Test Method
app.get('/test',function(req,res){
  sendMessage({body:'test',phone:'+17789879239'}, function(status){
    console.log("GO")
    res.send("DONE");
  })
  res.send("DONE");
})

app.listen(port);
console.log("Server Running on Port",  port);
