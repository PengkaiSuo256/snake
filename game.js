const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const menuOverlay = document.getElementById('menu-overlay');
const startBtn = document.getElementById('start-btn');
const finalScoreEl = document.getElementById('final-score');
const tipsEl = document.getElementById('tips');
const shareBtn = document.getElementById('share-btn');
const toastEl = document.getElementById('toast');

// 游戏配置
const GRID_SIZE = 20; // 每个格子的像素大小
const GAME_SPEED = 100; // 蛇移动的间隔(ms)

// 游戏状态
let tileCountX = 20;
let tileCountY = 20;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameInterval = null;
let lastTime = 0;
let isGameRunning = false;
let animationFrameId = null;

// 蛇的状态
let snake = [];
let velocity = { x: 0, y: 0 };
let nextVelocity = { x: 0, y: 0 };
let baseHue = 0; // 用于颜色变化

// 食物
let food = { x: 5, y: 5 };

// 初始化最高分显示
highScoreEl.textContent = highScore;

// 自适应 Canvas 大小
function resizeCanvas() {
    // 获取窗口宽高
    const w = window.innerWidth;
    const h = window.innerHeight;

    // 计算能容纳多少个格子
    tileCountX = Math.floor(w / GRID_SIZE);
    tileCountY = Math.floor(h / GRID_SIZE);

    // 设置 Canvas 实际大小（确保是 GRID_SIZE 的整数倍）
    canvas.width = tileCountX * GRID_SIZE;
    canvas.height = tileCountY * GRID_SIZE;

    // 如果游戏没在运行，重绘一次背景
    if (!isGameRunning) {
        draw();
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // 初始化调用

// 输入处理 - 键盘
document.addEventListener('keydown', keyDownEvent);

function keyDownEvent(e) {
    if (!isGameRunning) return;

    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (velocity.x !== 1) nextVelocity = { x: -1, y: 0 };
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (velocity.y !== 1) nextVelocity = { x: 0, y: -1 };
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (velocity.x !== -1) nextVelocity = { x: 1, y: 0 };
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (velocity.y !== -1) nextVelocity = { x: 0, y: 1 };
            break;
    }
}

// 输入处理 - 触摸
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

document.addEventListener('touchmove', function(e) {
    // 阻止默认滚动
    e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', function(e) {
    if (!isGameRunning) return;

    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // 判断滑动方向，取绝对值较大的一方
    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平滑动
        if (dx > 0) {
            if (velocity.x !== -1) nextVelocity = { x: 1, y: 0 };
        } else {
            if (velocity.x !== 1) nextVelocity = { x: -1, y: 0 };
        }
    } else {
        // 垂直滑动
        if (dy > 0) {
            if (velocity.y !== -1) nextVelocity = { x: 0, y: 1 };
        } else {
            if (velocity.y !== 1) nextVelocity = { x: 0, y: -1 };
        }
    }
}, { passive: false });

// 游戏逻辑
function startGame() {
    // 重置状态
    snake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]; // 初始长度3
    velocity = { x: 0, y: -1 }; // 初始向上
    nextVelocity = { x: 0, y: -1 };
    score = 0;
    baseHue = 0;
    scoreEl.textContent = score;
    isGameRunning = true;

    // 隐藏菜单
    menuOverlay.classList.add('hidden');
    
    // 生成第一个食物
    placeFood();

    // 启动循环
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    isGameRunning = false;
    cancelAnimationFrame(animationFrameId);
    
    // 更新最高分
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }

    // 显示菜单
    finalScoreEl.style.display = 'block';
    finalScoreEl.textContent = `最终得分: ${score}`;
    startBtn.textContent = '再玩一次';
    menuOverlay.classList.remove('hidden');
}

function placeFood() {
    // 随机位置，确保不在蛇身上
    let valid = false;
    while (!valid) {
        food.x = Math.floor(Math.random() * tileCountX);
        food.y = Math.floor(Math.random() * tileCountY);
        
        valid = true;
        for (let part of snake) {
            if (part.x === food.x && part.y === food.y) {
                valid = false;
                break;
            }
        }
    }
}

function update() {
    // 应用缓冲的输入
    velocity = nextVelocity;

    // 计算新蛇头位置
    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

    // 1. 死亡检测 - 撞墙
    // 如果需要穿墙，可以在这里修改逻辑。这里实现为撞墙死亡。
    if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
        gameOver();
        return;
    }

    // 2. 死亡检测 - 撞自己
    for (let part of snake) {
        if (head.x === part.x && head.y === part.y) {
            gameOver();
            return;
        }
    }

    // 移动蛇：加入新头
    snake.unshift(head);

    // 3. 吃食物检测
    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        placeFood();
        // 吃食物不移除尾巴，蛇变长
    } else {
        // 没吃到，移除尾巴
        snake.pop();
    }
}

function draw() {
    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制蛇
    // 需求：颜色根据存活（时间/帧）和吃的多少（长度）变化
    // 实现：baseHue 随时间增加，每一节身体在此基础上偏移
    
    // 每一帧 baseHue 增加一点，产生流动效果（存活的体现）
    if (isGameRunning) {
        baseHue += 1; 
    }

    snake.forEach((part, index) => {
        // 蛇头颜色稍亮，或者不同
        // 蛇身颜色渐变：Hue = baseHue + index * step
        // index 0 是头
        const hue = (baseHue + index * 10) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        
        // 绘制矩形，留一点间隙
        ctx.fillRect(part.x * GRID_SIZE + 1, part.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        
        // 简单的光泽效果
        ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
        ctx.fillRect(part.x * GRID_SIZE + 4, part.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8);
    });

    // 绘制食物
    ctx.fillStyle = '#fff';
    // 食物可以闪烁
    const foodScale = 0.8 + 0.2 * Math.sin(Date.now() / 200);
    const offset = (GRID_SIZE * (1 - foodScale)) / 2;
    ctx.fillRect(
        food.x * GRID_SIZE + offset, 
        food.y * GRID_SIZE + offset, 
        GRID_SIZE * foodScale, 
        GRID_SIZE * foodScale
    );
}

function gameLoop(timestamp) {
    if (!isGameRunning) return;

    const deltaTime = timestamp - lastTime;

    if (deltaTime >= GAME_SPEED) {
        lastTime = timestamp;
        update();
    }
    
    // 无论是否更新逻辑，都要绘制（为了平滑的颜色动画）
    draw();

    if (isGameRunning) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// 按钮事件
startBtn.addEventListener('click', startGame);

// 初始绘制一次背景
resizeCanvas();

// 分享按钮逻辑
function showToast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2000);
}

async function handleShare() {
    const url = location.href;
    try {
        if (navigator.share) {
            await navigator.share({
                title: '七彩贪吃蛇',
                text: '一起玩七彩贪吃蛇！',
                url
            });
            return;
        }
    } catch (e) {
        // 忽略分享异常，降级复制
    }
    try {
        await navigator.clipboard.writeText(url);
        showToast('链接已复制，去微信粘贴分享');
    } catch (e) {
        showToast('复制失败，请长按地址栏复制');
    }
}

shareBtn.addEventListener('click', handleShare);
