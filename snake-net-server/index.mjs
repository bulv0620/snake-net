import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: true });

app.use(express.static('public'))
const color = [
  'blue',
  'seagreen',
  'red',
  'orange',
  'purple',
  'salmon',
]

let snakes = {}
let foods = []

let cur = 0

// io绑定事件 connection建立连接 断开链接 disconnected
io.on('connection', socket => {
  console.log('一个用户建立链接' + io.engine.clientsCount);
  
  socket.emit('tc_init', { 
    color: color[cur++],
    snakes: snakes,
    foods: foods
  })

  if(cur >= 6) {
    cur = 0
  }

  socket.on('ts_food_update', data => {
    console.log('食物更新')
    foods = data
    // 广播
    socket.broadcast.emit('tc_food_update', foods)
  })

  socket.on('ts_snake_update', data => {
    console.log('蛇更新')
    snakes[data.key] = data.value
    // 广播
    socket.broadcast.emit('tc_snake_update', data)
  })

  
  socket.conn.on("close", (reason) => {
    console.log(`断开连接:${socket.id}`)
    delete snakes[socket.id]
    socket.broadcast.emit('tc_snake_delete', {
      key: socket.id
    })
    // called when the underlying connection is closed
  });
})


httpServer.listen(3000, () => {
  console.log('server on 3000');
});

// snakes = {
//   'xxqq11': {
//       color: 'white',
//       body: [{x, y}]
//   }
// }

// foods = [{x, y}]