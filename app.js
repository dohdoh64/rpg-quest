//var mongojs = require("mongojs");
var db = null;//mongojs("localhost:27017/myGame", ["account", 'progress']);
var express = require('express');
var app = express();
var serv = require('http').Server(app);
require("./Entity");
require("./client/Inventory");
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

var SOCKET_LIST = {};
var PLAYER_LIST = {};

var USERS = {
  "bob":"meme",
};

var isValidPassword = function(data, cb) {
  return cb(true);
  /*db.account.find({username:data.username,password:data.password}, function(err, res){
    if (res.length > 0) {
      cb(true);
    } else {
      cb(false);
    }
  });*/
};
var isUsernameTaken = function(data, cb) {
  return cb(false);
  /*db.account.find({username:data.username}, function(err, res){
    if (res.length > 0) {
      cb(true);
    } else {
      cb(false);
    }
  });*/
};
var addUser = function(data, cb) {
  return cb();
  /*db.account.insert({username:data.username,password:data.password});
  cb();*/
}
var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
  console.log("socket connected")
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;
  socket.on("signIn", function(data){
    isValidPassword(data, function(res){
      if (res) {
        Player.onConnect(socket, data.username);
        socket.emit("signInResponse", {success: true});
      } else {
        socket.emit("signInResponse", {success: false});
      }
    });
  });
  socket.on("signUp", function(data){
    isUsernameTaken(data, function(res){
      if (res) {
        socket.emit("signUpResponse", {success: false});
      } else {
        addUser(data, function(){
          socket.emit("signUpResponse", {success: true});
        });
      }
    });
  });
  socket.on('disconnect', function() {
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });

  socket.on("evalServer", function(data){
    var res = eval(data);
    socket.emit("evalAnswer", res);
  });

  socket.on("xUp", function(data){
    if (data.objType === "b") {
      Bullet.list[data.id].x = -9999;
      Bullet.list[data.id].y = -9999;
      Bullet.list[data.id].toRemove = true;
    } else if (data.objType === "p") {
      Player.list[data.id].x = data.x;
    }
  });
  socket.on("yUp", function(data){
    if (data.objType === "b") {
      Bullet.list[data.id].toRemove = true;
    } else if (data.objType === "p") {
      Player.list[data.id].y = data.y;
    }
  });
  socket.on("collide", function(data){
    if (data.side === "right") {
      Player.list[data.id].x = Player.list[data.id].x-10;
    } else if (data.side === "left") {
      Player.list[data.id].x = Player.list[data.id].x+10;
    } else if (data.side === "up") {
      Player.list[data.id].y = Player.list[data.id].y+10;
    } else if (data.side === "down") {
      Player.list[data.id].y = Player.list[data.id].y-10;
    }
  });
});

setInterval(function(){
  var packs = Entity.getFrameUpdateData();
  for (i in SOCKET_LIST) {
    var socket = SOCKET_LIST[i];
    socket.emit("init", packs.initPack);
    socket.emit("update", packs.updatePack);
    socket.emit("remove", packs.removePack);
  }

}, 1000/25);
var server_ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8000;

serv.listen(server_port, server_ip, function(){
  console.log("server started on " + server_ip + ":" + server_port);
});
