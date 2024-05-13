import { Server } from "socket.io"
import express from 'express'
import { createServer } from 'node:http';
import cors from 'cors'

const app = express();
const server = createServer(app) //create server

app.use(cors()) //wtf is this, setting up server
const io = new Server(server, {
    cors: {
        //origin: 'add api url', //url orgin, comment out for local
        method: ["GET", "POST"], //get and post ugh
    },
})

const SUITS = ["S", "C", "D", "H"]
const VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']

var rooms = {} //just remember all rooms, as they are sharing a deck (replace when we do coin flip)

function fresh_deck() //fresh deck 
  {
    var deck = []
    for (var i of SUITS){
      for (var j of VALUES)
      {
        deck.push(i + j)
      }
    }
    deck.push('JR')
    deck.push('JB')
    return deck;
  }

function shuffle_deck(deck){
  for (let i = deck.length - 1; i>0; i--) //for every card in deck
    {
        const newIndex = Math.floor(Math.random() * (i + 1)) //get random index card
        const oldValue = deck[newIndex] //store the current card
        deck[newIndex] = deck[i] //make the current card the previous card
        deck[i] = oldValue //make the previous card the old card
    }
  return deck
}

//ummmmmm we make every deck remembered in a room

io.on("connection", (socket) => { //uh are connection stuff here???
  socket.on("join_room", (data) => { //join room, rememberrrrr
      if (!io.sockets.adapter.rooms.get(data)) {//room don't exist
          rooms[data] = {'players': [socket.id], 'deck': shuffle_deck(fresh_deck())}
          socket.join(data)
          //console.log(rooms[data]['deck'])
          socket.emit('isPlayerA', rooms[data]['deck'].slice(0,13)) //send to that user only?
      }
      else{ //room exists
          if(io.sockets.adapter.rooms.get(data).size === 1) {//no player2, only 1 player
              rooms[data]['players'].push(socket.id)
              socket.join(data)
              socket.emit('isPlayerB', rooms[data]['deck'].slice(13, 26)) //send to that user only?
              socket.to(data).emit('playerBjoined')//notifiy the other user joined
          }
          else{ //room full
              socket.emit('deny')
          }
      }
  })

  socket.on('play_cards', (room, number, playedcards, skip, rev) => {
    socket.to(room).emit('update_game', number, playedcards, skip, rev) //to other person
  })

  socket.on('next_round', (room) => { //new game for next round
    rooms[room]['deck'] = shuffle_deck(fresh_deck()) //new deck!!!!
    socket.emit('new_round', rooms[room]['deck'].slice(0,13), true) //to user, goes first
    socket.to(room).emit('new_round', rooms[room]['deck'].slice(13,26), false) //to other person, goes second
  })

  socket.on('quitgame', (room) => { //the opponent quit the game
    delete rooms[room] //delete room from array
    socket.to(room).emit('disconnected', true)//alert the rest saying a quit game
    socket.to(room).emit('reset_game_state') //to other person, reset everyone's game state
    io.socketsLeave(room); //make everyone in that room also leave, or delete the actual room
  })

  socket.on('disconnecting', () => { //player disconnecting (diff from disconnect, this remembers room)
    const room = [...socket.rooms][1] //sets suck, get room socket left
    if (room){ //if there were in a room
      delete rooms[room] //delete room from array
      socket.to(room).emit('disconnected', false)//alert the rest saying a disconnect, game ends
      socket.to(room).emit('reset_game_state') //to other person, reset everyone's game state
      io.socketsLeave(room); //make everyone in that room also leave, or delete the actual room
    }
  });
})

server.listen(3001, () => { //running serverrrrr
    console.log("Server is running") //server listeningggg
})
