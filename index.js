const path = require("path");
const express = require('express');
const http = require("http");
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function main() {
// open the database file
const db = await open({
  filename: "chat.db",
  driver: sqlite3.Database,
});

// create our 'messages' table (you can ignore the 'client_offset' column for now)
await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    );
  `);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/index.html"));
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
//   socket.on("chat message", (msg) => {
//     console.log("message: " + msg);
//     io.emit("chat message", msg);
//   });
  socket.on('chat message', async (msg, clientOffset, callback) => {
    let result;
    try {
      result = await db.run('INSERT INTO messages (content, client_offset) VALUES (?, ?)', msg, clientOffset);
    } catch (e) {
      if (e.errno === 19 /* SQLITE_CONSTRAINT */ ) {
        // the message was already inserted, so we notify the client
        callback();
      } else {
        // nothing to do, just let the client retry
      }
      return;
    }
    io.emit('chat message', msg, result.lastID);
    // acknowledge the event
    callback();
  });

  if (!socket.recovered) {
    // if the connection state recovery was not successful
    try {
        db.each('SELECT id, content FROM messages WHERE id > ?',
        [socket.handshake.auth.serverOffset || 0],
        (_err, row) => {
          socket.emit('chat message', row.content, row.id);
        }
      )
    } catch (e) {
      // something went wrong
    }
  }

//   socket.on("request", (arg1, arg2, callback) => {
//     console.log(arg1); // { foo: 'bar' }
//     console.log(arg2); // 'baz'
//     callback({
//       status: "ok",
//     });
//   });
});

server.listen(3000, () => {
  console.log("listening on yport 3000");
});

}

main();
