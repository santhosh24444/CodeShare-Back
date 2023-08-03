const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const axios = require("axios");
const app1 = express();
const server = http.createServer(app1);
const io = socketIO(server, {
  cors: {
    origin: "*",
  },
});

const port2 = 8000;
server.listen(port2, () => {
  console.log(`WebSocket server is running on port ${port2}`);
});

const rooms = {};
const users = {};
function getRandomNumberNotInRooms() {
  let randomNumber;
  do {
    randomNumber = Math.floor(Math.random() * 1000000);
  } while (rooms.hasOwnProperty(randomNumber.toString()));

  return randomNumber;
}

//connection

io.on("connection", (socket) => {
  socket.emit("newuserid", socket.id);
  socket.on("codechange", (value, roomId) => {
    try {
      if (roomId === "") return;
      else {
        rooms[roomId].forEach((element) => {
          socket.to(element).emit("updatecode", value);
        });
      }
    } catch (err) {}
  });
  socket.on("join", (jroomid) => {
    if (users[socket.id] == jroomid) {
      return;
    }
    if (rooms[jroomid].length >= 5) {
      socket.emit("roomfull");
      return;
    }
    if (rooms[jroomid] == null || rooms[jroomid] == undefined) {
      socket.emit("roomnotfounderror");
    } else {
      if (users[socket.id] == null || users[socket.id] == undefined) {
        users[socket.id] = jroomid;
        rooms[jroomid].push(socket.id);
        socket.emit("joined", jroomid);
        rooms[jroomid].forEach((element) => {
          socket.to(element).emit("members", rooms[jroomid]);
        });
        socket.emit("members", rooms[jroomid]);
        return;
      } else {
        const roomid = users[socket.id];
        users[socket.id] = jroomid;
        if (rooms[roomid]) {
          const index = rooms[roomid].indexOf(socket.id);
          if (index !== -1) {
            rooms[roomid].splice(index, 1);
            if (rooms[roomid].length === 0) {
              delete rooms[roomid];
            }
          }
          rooms[jroomid].push(socket.id);
        } else {
          rooms[jroomid].push(socket.id);
        }
        rooms[jroomid].forEach((element) => {
          socket.to(element).emit("members", rooms[jroomid]);
        });
        socket.emit("members", rooms[jroomid]);
        socket.emit("joined", jroomid);
      }
    }
  });
  socket.on("createroom", () => {
    try {
      const roomid = "" + getRandomNumberNotInRooms();
      rooms[roomid] = [socket.id];
      console.log(rooms);
      console.log(rooms[roomid][0]);
      users[socket.id] = roomid;
      console.log(users);
      socket.emit("roomno", roomid);
      socket.emit("members", rooms[roomid]);
    } catch (err) {
      console.log(err);
    }
  });
  socket.on("quit", () => {
    try {
      console.log("hii");
      if (users[socket.id] == null || users[socket.id] == undefined) {
        return;
      }
      const roomid = users[socket.id];
      delete users[socket.id];

      if (rooms[roomid]) {
        const index = rooms[roomid].indexOf(socket.id);
        if (index !== -1) {
          rooms[roomid].splice(index, 1);
          if (rooms[roomid].length === 0) {
            delete rooms[roomid];
          }
        }
      }
      socket.emit("quitdone");
      socket.emit("members", rooms[roomid]);
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("disconnect", () => {
    try {
      if (users[socket.id] == null || users[socket.id] == undefined) {
        return;
      }
      const roomid = users[socket.id];
      delete users[socket.id];

      if (rooms[roomid]) {
        const index = rooms[roomid].indexOf(socket.id);
        if (index !== -1) {
          rooms[roomid].splice(index, 1);
          if (rooms[roomid].length === 0) {
            delete rooms[roomid];
          }
        }
      }
      rooms[roomid].forEach((element) => {
        socket.to(element).emit("members", rooms[roomid]);
      });
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("run", async (language, code, input) => {
    try {
      
      if(language==="python")
         language+=3;
      const options = {
        method: "POST",
        url: "https://online-code-compiler.p.rapidapi.com/v1/",
        headers: {
          "content-type": "application/json",
          "X-RapidAPI-Key":
            "266572d747msh12680302bc5ac18p11d425jsn85e431c9e73c",
          "X-RapidAPI-Host": "online-code-compiler.p.rapidapi.com",
        },
        data: {
          language: language,
          version: "latest",
          code: code,
          input: input,
        },
      };
      try {
        const response = await axios.request(options);
        socket.emit("output", response.data);
        console.log(response.data);
        const roomid = users[socket.id];
        if (roomid === undefined || roomid === null) return;
        rooms[roomid].forEach((element) => {
          socket.to(element).emit("output", response.data);
        });
      } catch (error) {
        console.log(error);
        socket.emit("runtimeerror");
      }
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("inputchange", (value) => {
    try {
      const roomid = users[socket.id];
      if (roomid === undefined || roomid === null) return;
      rooms[roomid].forEach((element) => {
        socket.to(element).emit("input", value);
      });
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("languagechange", (value) => {
    try {
      const roomid = users[socket.id];
      if (roomid === undefined || roomid === null) return;
      rooms[roomid].forEach((element) => {
        socket.to(element).emit("language", value);
      });
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("messagechange", (value) => {
    try {
      const roomid = users[socket.id];
      if (roomid === undefined || roomid === null) return;
      rooms[roomid].forEach((element) => {
        socket.to(element).emit("message", value);
      });
    } catch (error) {
      console.log(error);
    }
  });
});
