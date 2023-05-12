<template>
  <div class="container">
    <div class="stage" v-if="!gameOver">
      <div class="row" v-for="(col, y) in stage" :key="y">
        <div class="col" :class="{
          wall: item.type === 'wall',
          snake: item.type === 'snake',
          food: item.type === 'food',
        }" :style="item.type === 'snake' ? `background: ${item.color}` : ''" v-for="(item, x) in col" :key="x"></div>
      </div>
    </div>
    <div class="panel" v-else>
      <div class="form-item">
        <button class="startBtn" @click="init">start</button>
      </div>
    </div>
    <div class="info" :style="{ color: socketColor }">{{ socketId }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeMount, onMounted, reactive } from "vue";
import { io } from "socket.io-client";

let socket = io('', { autoConnect: false })
// 移动Interval
let moveInterval = null;
// 移动方向
let direction = "left";
// 步控器
let step = [];
// 速度
const speed = ref(300);
// 行数 y
const row = 40;
// 列数 x
const col = 80;
// 游戏结束
const gameOver = ref(true);
// id
const socketId = ref('');
// color
const socketColor = ref('white')
// 分数
const score = ref(0);
// 地图
const map = ref([]);
// 蛇蛇
const snakes = ref({});
// 食物
const foods = ref([]);
// 场景
const stage = computed(() => {
  const renderStage = JSON.parse(JSON.stringify(map.value));
  for (const snake of Object.values(snakes.value)) {
    const snakeBody = snake.body
    const color = snake.color
    for (const bodyItem of snakeBody) {
      renderStage[bodyItem.y][bodyItem.x].type = "snake";
      renderStage[bodyItem.y][bodyItem.x].color = color;
    }
  }
  for (const foodItem of foods.value) {
    renderStage[foodItem.y][foodItem.x].type = "food";
  }
  return renderStage;
});

onBeforeMount(() => {
});

onMounted(() => {
  window.document.onkeydown = (e) => {
    const keyNum = window.event ? e.keyCode : e.which;
    // console.log(keyNum);
    switch (keyNum) {
      case 37:
      case 65:
        if (!['left', 'right'].includes(direction)) {
          direction = 'left'
          step.push('left')
        }
        break;
      case 38:
      case 87:
        if (!['top', 'bottom'].includes(direction)) {
          direction = 'top'
          step.push('top')
        }
        break;
      case 39:
      case 68:
        if (!['left', 'right'].includes(direction)) {
          direction = 'right'
          step.push('right')
        }
        break;
      case 40:
      case 83:
        if (!['top', 'bottom'].includes(direction)) {
          direction = 'bottom'
          step.push('bottom')
        }
        break;
      case 90:
        // 加速
        if (speed.value > 40) {
          speed.value -= 20
          startGame()
        }
        break;
      case 88:
        // 减速
        if (speed.value < 300) {
          speed.value += 20
          startGame()
        }
        break;
      default:
        break;
    }
  };
});

function init() {
  map.value = new Array(row).fill(null).map((_, y) =>
    new Array(col).fill(null).map((_, x) => ({
      x,
      y,
      type: x === 0 || x === col - 1 || y === 0 || y === row - 1 ? "wall" : "",
    }))
  );

  socket.connect()
  socket.on('connect', () => {
    socketId.value = socket.id

    // 连接后初始化数据
    socket.on('tc_init', data => {
      socketColor.value = data.color
      snakes.value = {...data.snakes}
      foods.value = data.foods

      // 创建自己的蛇
      snakes.value[socket.id] = {
        color: data.color,
        body: initSnake()
      }

      // 更新
      socket.emit('ts_snake_update', {
        key: socketId.value,
        value: snakes.value[socketId.value]
      })

      // 创建一块食物
      foods.value.push(createFood())
      socket.emit('ts_food_update', foods.value)

      // 开始游戏
      startGame()


      // 监听更新食物
      socket.on('tc_food_update', data => {
        foods.value = data
      })

      // 监听更新蛇蛇
      socket.on('tc_snake_update', data => {
        snakes.value[data.key] = data.value
      })

      // 监听蛇掉线
      socket.on('tc_snake_delete', data => {
        delete snakes.value[data.key]
      })
    })

  })
}

function startGame() {
  gameOver.value = false
  clearInterval(moveInterval)
  moveInterval = setInterval(moveAction, speed.value);
}

function initSnake() {
  let randonX = Math.floor(Math.random() * (col - 2)) + 1;
  let randonY = Math.floor(Math.random() * (row - 2)) + 1;

  while ([...Object.values(snakes.value).map(el => el.body).flat(), ...foods.value].find(el => el.x === randonX && el.y === randonY)) {
    randonX = Math.floor(Math.random() * (col - 2)) + 1;
    randonY = Math.floor(Math.random() * (row - 2)) + 1;
  }

  if (randonX < col / 2) {
    direction = 'right'
  }
  else {
    direction = 'left'
  }

  return [{ x: randonX, y: randonY }];
}

function createFood() {
  let randonX = Math.floor(Math.random() * (col - 2)) + 1;
  let randonY = Math.floor(Math.random() * (row - 2)) + 1;

  while ([...Object.values(snakes.value).map(el => el.body).flat(), ...foods.value].find(el => el.x === randonX && el.y === randonY)) {
    randonX = Math.floor(Math.random() * (col - 2)) + 1;
    randonY = Math.floor(Math.random() * (row - 2)) + 1;
  }

  const food = {
    x: randonX,
    y: randonY,
  }

  return food;
}

function moveAction() {
  const snake = snakes.value[socketId.value].body
  
  // 头部添加
  const currentHead = snake[snake.length - 1];
  const newHead = {
    x: currentHead.x,
    y: currentHead.y,
  };
  const d = step.length === 0 ? direction : step.shift()
  switch (d) {
    case "left":
      newHead.x = newHead.x - 1;
      break;
    case "right":
      newHead.x = newHead.x + 1;
      break;
    case "top":
      newHead.y = newHead.y - 1;
      break;
    case "bottom":
      newHead.y = newHead.y + 1;
      break;
    default:
      break;
  }

  const foodIndex = foods.value.findIndex(
    (el) => el.x === newHead.x && el.y === newHead.y
  );
  if (foodIndex < 0) {
    // 正常移动
    snake.shift();
  } else {
    // 食物被吃
    foods.value.splice(foodIndex, 1);
    foods.value.push(createFood());

    socket.emit('ts_food_update', foods.value)

    score.value++;
  }

  // 撞墙
  if (["wall", "snake"].includes(stage.value[newHead.y][newHead.x].type)) {
    clearInterval(moveInterval);
    gameOver.value = true;
    window.location.reload()
    alert('你挂了')
  }

  snake.push(newHead);

  socket.emit('ts_snake_update', {
    key: socketId.value,
    value: snakes.value[socketId.value]
  })
}
</script>

<style scoped lang="less">
.container {
  width: 100vw;
  height: 90vh;
  background: #000;
  padding-top: 10vh;
  // display: flex;
  // flex-direction: column;
  // justify-content: center;

  .stage {
    margin: 0 auto;
    width: 800px;
    height: 400px;
    // background: #fff;

    .row {
      height: 10px;
      // background: grey;
      display: flex;

      .col {
        width: 10px;
        height: 10px;
        // background: #fff;

        &.wall {
          background: grey;
        }

        &.food {
          background: #fff;
        }

        &.snake {
          background: seagreen;
        }
      }
    }
  }

  .panel {
    margin: 0 auto;
    width: 800px;
    height: 400px;
    // background: ;
    color: #fff;
    display: flex;
    // align-items: center;
    flex-direction: column;
    justify-content: center;

    .form-item {
      width: 100%;
      display: flex;
      justify-content: space-around;

      .startBtn {
        padding: 12px;
        color: #fff;
        font-size: 24px;
        font-weight: bold;
        background: none;
        border: 4px solid #fff;
        border-radius: 8px;

        &:hover {
          background: #fff;
          color: #000
        }
      }
    }
  }

  .info {
    color: #fff;
    position: absolute;
    bottom: 0px;
    left: 50%;
    transform: translateX(-50%);
  }
}
</style>
