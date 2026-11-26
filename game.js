"use strict";

// =====================================================
// DODGE GAME - COMPLETE VERSION
// =====================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// ================= HTML ELEMENTS =================

const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const timeElement = document.getElementById("time");
const livesElement = document.getElementById("lives");
const dashElement = document.getElementById("dash");
const bestScoreElement = document.getElementById("bestScore");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const difficultySelect = document.getElementById("difficulty");

// ================= GAME VARIABLES =================

let player;

let obstacles = [];
let particles = [];
let warnings = [];

let score = 0;
let level = 1;
let lives = 3;
let elapsedTime = 0;

let running = false;
let gameOver = false;

let lastTime = 0;
let obstacleTimer = 0;
let animationId = null;

let dashCooldown = 0;
let dashDuration = 0;
let invincibleTime = 0;

// Biểu cảm
let hurtFaceTime = 0;
let happyFaceTime = 0;

let screenShake = 0;
let flashTime = 0;

let bestScore = Number(localStorage.getItem("dodgeBest")) || 0;

bestScoreElement.textContent = bestScore;

// ================= DIFFICULTY =================

const difficultySettings = {
    easy: {
        speed: 3,
        spawnRate: 950,
        maxObstacles: 7
    },

    normal: {
        speed: 5,
        spawnRate: 700,
        maxObstacles: 10
    },

    hard: {
        speed: 7,
        spawnRate: 500,
        maxObstacles: 14
    }
};

function getSettings() {
    return difficultySettings[difficultySelect.value]
        || difficultySettings.normal;
}

// ================= PLAYER =================

function createPlayer() {
    return {
        x: WIDTH / 2 - 20,
        y: HEIGHT - 90,
        width: 40,
        height: 45,
        speed: 8,
        color: "#61f6ff"
    };
}

// ================= KEYBOARD =================

const keys = {
    left: false,
    right: false
};

document.addEventListener("keydown", function(event) {

    if (
        event.code === "ArrowLeft" ||
        event.code === "ArrowRight" ||
        event.code === "Space"
    ) {
        event.preventDefault();
    }

    if (event.code === "ArrowLeft" || event.code === "KeyA") {
        keys.left = true;
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
        keys.right = true;
    }

    if (event.code === "Space" && !event.repeat) {
        useDash();
    }
});

document.addEventListener("keyup", function(event) {

    if (event.code === "ArrowLeft" || event.code === "KeyA") {
        keys.left = false;
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
        keys.right = false;
    }
});

window.addEventListener("blur", function() {
    keys.left = false;
    keys.right = false;
});

// ================= MOUSE CONTROL =================

canvas.addEventListener("mousemove", function(event) {

    if (!running || dashDuration > 0) return;

    const rect = canvas.getBoundingClientRect();

    const mouseX =
        (event.clientX - rect.left) * WIDTH / rect.width;

    player.x = mouseX - player.width / 2;

    player.x = Math.max(
        0,
        Math.min(WIDTH - player.width, player.x)
    );
});

// ================= TOUCH CONTROL =================

canvas.addEventListener("touchmove", function(event) {

    if (!running || dashDuration > 0) return;

    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];

    const touchX =
        (touch.clientX - rect.left) * WIDTH / rect.width;

    player.x = touchX - player.width / 2;

    player.x = Math.max(
        0,
        Math.min(WIDTH - player.width, player.x)
    );

}, { passive: false });

// ================= DASH =================

function useDash() {

    if (!running || dashCooldown > 0) return;

    dashDuration = 200;
    dashCooldown = 1800;

    invincibleTime = Math.max(invincibleTime, 350);

    let direction = 0;

    if (keys.left) {
        direction = -1;
    } else if (keys.right) {
        direction = 1;
    } else {
        direction = player.x < WIDTH / 2 ? 1 : -1;
    }

    player.x += direction * 140;

    player.x = Math.max(
        0,
        Math.min(WIDTH - player.width, player.x)
    );

    createParticles(
        player.x + player.width / 2,
        player.y + player.height / 2,
        "#61f6ff",
        20
    );
}

// ================= PLAYER MOVEMENT =================

function movePlayer(deltaTime) {

    if (dashDuration > 0) return;

    const moveAmount = player.speed * deltaTime / 16.67;

    if (keys.left) player.x -= moveAmount;
    if (keys.right) player.x += moveAmount;

    player.x = Math.max(
        0,
        Math.min(WIDTH - player.width, player.x)
    );
}

// ================= CREATE OBSTACLES =================

function createObstacle() {

    const settings = getSettings();

    if (obstacles.length >= settings.maxObstacles + Math.floor(level / 2)) {
        return;
    }

    const chance = Math.random();

    let type = "normal";
    let width = 40;
    let height = 40;
    let speed = 1;
    let color = "#ff4d6d";

    if (level >= 4 && chance < 0.25) {
        type = "moving";
        width = 45;
        height = 35;
        color = "#a855f7";
    }
    else if (level >= 7 && chance < 0.45) {
        type = "fast";
        width = 25;
        height = 30;
        speed = 3;
        color = "#ff9f43";
    }
    else if (level >= 10 && chance < 0.60) {
        type = "large";
        width = 75;
        height = 60;
        color = "#ef4444";
    }

    obstacles.push({
        x: Math.random() * (WIDTH - width),
        y: -height,
        width,
        height,
        speed,
        color,
        type,
        direction: Math.random() < 0.5 ? -1 : 1,
        moveSpeed: Math.random() * 3 + 2
    });
}

// ================= UPDATE OBSTACLES =================

function updateObstacles(deltaTime) {

    const settings = getSettings();

    obstacleTimer += deltaTime;

    const spawnRate = Math.max(
        180,
        settings.spawnRate - level * 40
    );

    if (obstacleTimer >= spawnRate) {
        createObstacle();
        obstacleTimer = 0;

        if (level >= 8 && Math.random() < 0.15) {
            createWarning();
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {

        const o = obstacles[i];

        const movement =
            (settings.speed + level * 0.35 + o.speed)
            * deltaTime / 16.67;

        o.y += movement;

        if (o.type === "moving") {

            o.x += o.direction * o.moveSpeed * deltaTime / 16.67;

            if (o.x <= 0) {
                o.x = 0;
                o.direction = 1;
            }

            if (o.x + o.width >= WIDTH) {
                o.x = WIDTH - o.width;
                o.direction = -1;
            }
        }

        if (o.y > HEIGHT) {
            obstacles.splice(i, 1);
            score += 15;
        }
    }
}

// ================= WARNING =================

function createWarning() {
    warnings.push({
        x: Math.random() * (WIDTH - 80),
        width: 80,
        timer: 700
    });
}

function updateWarnings(deltaTime) {

    for (let i = warnings.length - 1; i >= 0; i--) {

        warnings[i].timer -= deltaTime;

        if (warnings[i].timer <= 0) {

            const w = warnings[i];

            for (let j = 0; j < 4; j++) {

                obstacles.push({
                    x: w.x + Math.random() * w.width,
                    y: -Math.random() * 150,
                    width: 25,
                    height: 30,
                    speed: 4,
                    color: "#ff355e",
                    type: "fast",
                    direction: 1,
                    moveSpeed: 0
                });
            }

            warnings.splice(i, 1);
        }
    }
}

// ================= COLLISION =================

function checkCollision(a, b) {

    return (
        a.x + 5 < b.x + b.width - 5 &&
        a.x + a.width - 5 > b.x + 5 &&
        a.y + 5 < b.y + b.height - 5 &&
        a.y + a.height - 5 > b.y + 5
    );
}

function checkGameCollision() {

    if (invincibleTime > 0) return;

    for (let i = obstacles.length - 1; i >= 0; i--) {

        if (checkCollision(player, obstacles[i])) {

            obstacles.splice(i, 1);

            lives--;

            screenShake = 15;
            flashTime = 150;
            invincibleTime = 1200;

            // Bị va chạm: khóc
            hurtFaceTime = 1200;

            // Tắt biểu cảm vui khi bị thương
            happyFaceTime = 0;

            createParticles(
                player.x + player.width / 2,
                player.y + player.height / 2,
                "#ff4d6d",
                30
            );

            if (lives <= 0) {
                endGame();
            }

            break;
        }
    }
}

// ================= PARTICLES =================

function createParticles(x, y, color, amount) {

    for (let i = 0; i < amount; i++) {

        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 5 + 2,
            life: 1,
            color
        });
    }
}

function updateParticles(deltaTime) {

    for (let i = particles.length - 1; i >= 0; i--) {

        const p = particles[i];

        p.x += p.vx * deltaTime / 16.67;
        p.y += p.vy * deltaTime / 16.67;

        p.life -= deltaTime / 600;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {

    for (const p of particles) {

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

// ================= BACKGROUND =================

function drawBackground() {

    ctx.fillStyle = "#0a1020";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "rgba(50, 100, 160, 0.12)";
    ctx.lineWidth = 1;

    for (let x = 0; x < WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
    }

    for (let y = 0; y < HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }
}

// ================= DRAW PLAYER =================

function drawPlayer() {

    ctx.save();

    // Nhấp nháy khi bất tử
    if (
        invincibleTime > 0 &&
        Math.floor(invincibleTime / 100) % 2 === 0
    ) {
        ctx.globalAlpha = 0.35;
    }

    // Thân
    ctx.shadowBlur = 25;
    ctx.shadowColor = player.color;
    ctx.fillStyle = player.color;

    ctx.beginPath();
    ctx.roundRect(
        player.x,
        player.y,
        player.width,
        player.height,
        10
    );
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#07111d";

    // =====================================
    // MẶT KHÓC - ƯU TIÊN CAO NHẤT
    // =====================================

    if (hurtFaceTime > 0) {

        ctx.strokeStyle = "#07111d";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        // Mắt trái buồn
        ctx.beginPath();
        ctx.moveTo(player.x + 7, player.y + 15);
        ctx.lineTo(player.x + 14, player.y + 11);
        ctx.stroke();

        // Mắt phải buồn
        ctx.beginPath();
        ctx.moveTo(player.x + 26, player.y + 11);
        ctx.lineTo(player.x + 33, player.y + 15);
        ctx.stroke();

        // Miệng mếu
        ctx.beginPath();
        ctx.arc(
            player.x + 20,
            player.y + 34,
            6,
            Math.PI,
            0
        );
        ctx.stroke();

        // Nước mắt trái
        ctx.fillStyle = "#4da6ff";
        ctx.beginPath();
        ctx.ellipse(
            player.x + 8,
            player.y + 21,
            3,
            5,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Nước mắt phải
        ctx.beginPath();
        ctx.ellipse(
            player.x + 32,
            player.y + 21,
            3,
            5,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    // =====================================
    // MẶT CƯỜI - KHI QUA LEVEL
    // =====================================

    else if (happyFaceTime > 0) {

        ctx.strokeStyle = "#07111d";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        // Mắt trái cười
        ctx.beginPath();
        ctx.arc(
            player.x + 11,
            player.y + 15,
            5,
            Math.PI,
            0
        );
        ctx.stroke();

        // Mắt phải cười
        ctx.beginPath();
        ctx.arc(
            player.x + 29,
            player.y + 15,
            5,
            Math.PI,
            0
        );
        ctx.stroke();

        // Miệng cười
        ctx.beginPath();
        ctx.arc(
            player.x + 20,
            player.y + 25,
            9,
            0,
            Math.PI
        );
        ctx.fillStyle = "#07111d";
        ctx.fill();

        // Má hồng
        ctx.fillStyle = "#ff8fa3";

        ctx.beginPath();
        ctx.arc(
            player.x + 5,
            player.y + 25,
            4,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.beginPath();
        ctx.arc(
            player.x + 35,
            player.y + 25,
            4,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Hạt sáng
        ctx.fillStyle = "#ffffff";

        ctx.beginPath();
        ctx.arc(
            player.x + 3,
            player.y + 3,
            3,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.beginPath();
        ctx.arc(
            player.x + 37,
            player.y + 3,
            3,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    // =====================================
    // MẶT BÌNH THƯỜNG
    // =====================================

    else {

        // Mắt
        ctx.fillRect(
            player.x + 8,
            player.y + 10,
            7,
            7
        );

        ctx.fillRect(
            player.x + 25,
            player.y + 10,
            7,
            7
        );

        // Miệng
        ctx.fillRect(
            player.x + 13,
            player.y + 28,
            14,
            4
        );
    }

    // =====================================
    // HIỆU ỨNG DASH
    // =====================================

    if (dashDuration > 0) {

        ctx.fillStyle = "#ffffff";

        ctx.fillRect(
            player.x - 15,
            player.y + 10,
            8,
            25
        );
    }

    ctx.restore();
}

// ================= DRAW OBSTACLES =================

function drawObstacles() {

    for (const o of obstacles) {

        ctx.save();

        ctx.shadowBlur = 18;
        ctx.shadowColor = o.color;
        ctx.fillStyle = o.color;

        ctx.beginPath();
        ctx.roundRect(
            o.x,
            o.y,
            o.width,
            o.height,
            7
        );
        ctx.fill();

        ctx.restore();
    }
}

// ================= DRAW WARNING =================

function drawWarnings() {

    for (const w of warnings) {

        ctx.fillStyle = "#ff355e";

        ctx.globalAlpha =
            Math.sin(performance.now() / 70) * 0.5 + 0.5;

        ctx.fillRect(w.x, 0, w.width, 8);
    }

    ctx.globalAlpha = 1;
}

// ================= UPDATE UI =================

function updateUI() {

    scoreElement.textContent = score;
    levelElement.textContent = level;
    timeElement.textContent = Math.floor(elapsedTime) + "s";
    livesElement.textContent = lives;

    if (dashCooldown <= 0) {

        dashElement.textContent = "READY";
        dashElement.style.color = "#61f6ff";

    } else {

        dashElement.textContent =
            (dashCooldown / 1000).toFixed(1) + "s";

        dashElement.style.color = "#ff9f43";
    }
}

// ================= DRAW GAME =================

function draw() {

    ctx.save();

    // Rung màn hình
    if (screenShake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * screenShake,
            (Math.random() - 0.5) * screenShake
        );
    }

    drawBackground();
    drawWarnings();
    drawObstacles();

    if (player) {
        drawPlayer();
    }

    drawParticles();

    ctx.restore();

    // Flash khi va chạm
    if (flashTime > 0) {
        ctx.fillStyle = "rgba(255, 50, 80, 0.15)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
}

// ================= GAME OVER =================

function endGame() {

    if (gameOver) return;

    running = false;
    gameOver = true;

    keys.left = false;
    keys.right = false;

    hurtFaceTime = 999999;
    happyFaceTime = 0;

    createParticles(
        player.x + player.width / 2,
        player.y + player.height / 2,
        "#ff4d6d",
        40
    );

    draw();

    // Lưu điểm cao
    if (score > bestScore) {

        bestScore = score;

        localStorage.setItem("dodgeBest", bestScore);

        bestScoreElement.textContent = bestScore;
    }

    overlay.style.display = "flex";

    overlayTitle.textContent = "GAME OVER";

    overlayText.innerHTML =
        "Điểm: <strong>" + score + "</strong><br>" +
        "Thời gian: " + Math.floor(elapsedTime) + " giây<br>" +
        "Level: " + level + "<br>" +
        "Mạng còn: " + lives;

    startBtn.textContent = "CHƠI LẠI";
}

// ================= START GAME =================

function startGame() {

    cancelAnimationFrame(animationId);

    player = createPlayer();

    obstacles = [];
    particles = [];
    warnings = [];

    keys.left = false;
    keys.right = false;

    score = 0;
    level = 1;
    lives = 3;

    elapsedTime = 0;
    obstacleTimer = 0;

    dashCooldown = 0;
    dashDuration = 0;
    invincibleTime = 0;

    hurtFaceTime = 0;
    happyFaceTime = 0;

    screenShake = 0;
    flashTime = 0;

    running = true;
    gameOver = false;

    overlay.style.display = "none";

    lastTime = performance.now();

    updateUI();

    animationId = requestAnimationFrame(gameLoop);
}

// ================= GAME LOOP =================

function gameLoop(currentTime) {

    if (!running) return;

    const deltaTime = Math.min(currentTime - lastTime, 50);

    lastTime = currentTime;

    elapsedTime += deltaTime / 1000;

    // Kiểm tra lên level
    const newLevel = Math.floor(elapsedTime / 10) + 1;

    if (newLevel > level) {

        level = newLevel;

        // Cười trong 2 giây khi qua level
        happyFaceTime = 2000;

        // Không giữ biểu cảm khóc cũ
        hurtFaceTime = 0;

        // Hiệu ứng chúc mừng
        createParticles(
            player.x + player.width / 2,
            player.y + player.height / 2,
            "#ffff66",
            25
        );
    }

    // Điểm theo thời gian
    score += Math.floor(deltaTime / 100);

    // Di chuyển
    movePlayer(deltaTime);

    // Vật cản
    updateObstacles(deltaTime);
    updateWarnings(deltaTime);

    // Hạt hiệu ứng
    updateParticles(deltaTime);

    // Hồi dash
    dashCooldown = Math.max(0, dashCooldown - deltaTime);
    dashDuration = Math.max(0, dashDuration - deltaTime);

    // Bất tử
    invincibleTime = Math.max(0, invincibleTime - deltaTime);

    // Thời gian khóc
    hurtFaceTime = Math.max(0, hurtFaceTime - deltaTime);

    // Thời gian cười
    happyFaceTime = Math.max(0, happyFaceTime - deltaTime);

    // Hiệu ứng
    screenShake = Math.max(0, screenShake - deltaTime * 0.05);
    flashTime = Math.max(0, flashTime - deltaTime);

    // Va chạm
    checkGameCollision();

    // Cập nhật UI
    updateUI();

    // Vẽ game
    draw();

    if (running) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// ================= BUTTON =================

startBtn.addEventListener("click", startGame);

// ================= INITIALIZE =================

player = createPlayer();

updateUI();

draw();