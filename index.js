const express = require("express");
const app = express();
const path = require("path");
const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");

// const io = new Server(server);
const io = new Server(server, {
  connectionStateRecovery: {}
});

app.get("/", (req, res) => {
  // res.send('<h1>Hello BTD</h1>');
  // req.sendFile(__dirname + '/index.html')
  res.sendFile(path.join(__dirname + "/index.html"));
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
  socket.on("chat message", (msg) => {
    console.log("message: " + msg);
    io.emit('chat message', msg);
  });
});

server.listen(3000, () => {
  console.log("listening on yport 3000");
});
