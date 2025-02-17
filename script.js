const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 400;

function getRandomSpeed() {
    return (Math.random() - 0.5) * 3;
}

let team1 = { x: 170, y: 200, dx: getRandomSpeed(), dy: getRandomSpeed()};
let team2 = { x: 230, y: 200, dx: getRandomSpeed(), dy: getRandomSpeed()};
let goal = { x: 200, y: 50, width: 30, height: 10, angle: 0, speed: 0.8 };
let score = [0, 0];
let time = 0;
let gameInterval;
let timeInterval;
let gameRunning = false;
let ballRadius = 20;
let goalWidth = 15;  // Kale genişliği
let goalHeight = 50; // Kale yüksekliği
let goalRadius = 180; // Kale merkezinin dönme mesafesi

function startGame() {
    if (gameRunning) return; // Eğer oyun zaten başlıyorsa tekrar başlatma

    // Takım seçimlerini al ve renkleri belirle
    let team1Selection = document.getElementById("team1-select").value;
    let team2Selection = document.getElementById("team2-select").value;
    
    let team1Name = document.getElementById("team1-select").value;
    let team2Name = document.getElementById("team2-select").value;

    team1.color = teamColors[team1Name];
    team1.initial = teamInitials[team1Name];

    team2.color = teamColors[team2Name];
    team2.initial = teamInitials[team2Name];

    document.getElementById("goal-history").innerHTML = "";

    gameRunning = true;
    score = [0, 0];
    time = 0;
    updateScore();
    document.getElementById("time").innerText = `${time}`;

    clearInterval(timeInterval);
    timeInterval = setInterval(updateTime, 500);
    gameLoop(); // Oyun döngüsünü başlat
}

const teamColors = {
    "barcelona": ["#A50044", "#004D98"],
    "real-madrid": ["#FFFFFF", "#FFFFFF"],
    "manchester-united": ["#DA291C", "#DA291C"],
    "liverpool": ["#C8102E", "#C8102E"],
    "bayern-munich": ["#004F9E", "#D50032"],
    "juventus": ["#FFFFFF", "#FFFFFF"],
    "inter-milan": ["#0033A0", "#0033A0"],
    "chelsea": ["#034694", "#FFFFFF"],
    "psg": ["#004170", "#DA291C"]
};

const teamInitials = {
    "barcelona": "B",
    "real-madrid": "R",
    "manchester-united": "M",
    "liverpool": "L",
    "bayern-munich": "BM",
    "juventus": "J",
    "inter-milan": "I",
    "chelsea": "C",
    "psg": "P"
};

function drawDualColorCircle(x, y, radius, colors, teamInitial) {
    // Üst yarıyı çiz
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI, true);
    ctx.fillStyle = colors[0];
    ctx.fill();
    
    // Alt yarıyı çiz
    ctx.beginPath();
    ctx.arc(x, y, radius, Math.PI, 2 * Math.PI, true);
    ctx.fillStyle = colors[1];
    ctx.fill();

    // Harfi çiz
    ctx.fillStyle = (colors.includes("#FFFFFF")) ? "black" : "white"; 
    ctx.font = `bold ${radius * 0.6}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(teamInitial, x, y);
}

function drawTeams() {
    drawDualColorCircle(team1.x, team1.y, ballRadius, team1.color, team1.initial);
    drawDualColorCircle(team2.x, team2.y, ballRadius, team2.color, team2.initial);
}

function drawGoal() {
    let radian = (goal.angle * Math.PI) / 180;

    // Kale merkezinin konumunu, orijinden uzaklık ve açı ile hesapla
    goal.x = 200 + Math.cos(radian) * goalRadius;
    goal.y = 200 + Math.sin(radian) * goalRadius;

    // Kaleyi çizme
    ctx.save(); // Mevcut çizim durumunu kaydet
    ctx.translate(goal.x, goal.y); // Kale merkezini hedefe yerleştir
    ctx.rotate(radian); // Kalenin döndürülmesi

    // Kaleyi çizme (kalenin uzun kenarı orijine bakacak şekilde)
    ctx.beginPath();
    ctx.rect(-goalWidth / 2, -goalHeight / 2, goalWidth, goalHeight);
    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.closePath();

    ctx.restore(); // Çizim durumunu geri al
}

function updateGoalAngle() {
    // Kaleyi her zaman orijine bakacak şekilde döndür
    let angleToOrigin = Math.atan2(goal.y - 200, goal.x - 200); 
    goal.angle = angleToOrigin * 180 / Math.PI;  // Açıyı dereceye çevir
}

function updateScore(scorer = null) {
    // Temel skor güncellemesi
    document.getElementById("score").innerText = `${score[0]} - ${score[1]}`;
    
    // Eğer golü atan belirtilmemişse sadece skoru güncelle ve çık
    if (!scorer) return;
    
    // Gol geçmişini güncelle
    const goalHistory = document.getElementById("goal-history");
    
    // Yeni gol kaydını oluştur
    const goalEntry = document.createElement("p");
    goalEntry.style.margin = "5px 0";
    goalEntry.style.textAlign = "left";
    goalEntry.style.padding = "5px 10px";
    
    // Golü atan takımın tam adını bul
    let scorerTeamName = "";
    for (let team in teamInitials) {
        if (teamInitials[team] === scorer) {
            scorerTeamName = team.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            break;
        }
    }
    
    goalEntry.innerHTML = `${time}' ${scorerTeamName} scores!`;
    
    // Yeni golü geçmişe ekle
    goalHistory.appendChild(goalEntry);
}

function updatePositions() {
    // Topların hareketini güncelliyoruz
    [team1, team2].forEach(team => {
        team.x += team.dx;
        team.y += team.dy;
        
        if (Math.random() < 0.02) { // Küçük rastgele yön sapmaları ekleyerek doğrusal hareketi kırıyoruz
            team.dx += (Math.random() - 0.5) * 0.5;
            team.dy += (Math.random() - 0.5) * 0.5;
        }

        let distance = Math.hypot(team.x - goal.x, team.y - goal.y);
        if (distance < 25 && Math.random() < 0.1) { 
            if (team === team1) {
                score[0]++;
                updateScore(team1.initial);
            } else {
                score[1]++;
                updateScore(team2.initial);
            }
            
            gameRunning = false; 

            setTimeout(() => {
                resetPositions();  
                gameRunning = true;
                gameLoop();
            }, 1000);
        }


        let distanceToCenter = Math.hypot(team.x - 200, team.y - 200);
        if (distanceToCenter >= 180) {
            let angle = Math.atan2(team.y - 200, team.x - 200);
            team.dx = -Math.cos(angle) * 2;
            team.dy = -Math.sin(angle) * 2;
        }
    });

    // Kalenin yönünü orijine bakacak şekilde güncelliyoruz
    updateGoalAngle();

    handleCollision(team1, team2);
    goal.angle += goal.speed;
}

function resetPositions() {
    team1.x = 170;
    team1.y = 200;
    team1.dx = getRandomSpeed();
    team1.dy = getRandomSpeed();

    team2.x = 230;
    team2.y = 200;
    team2.dx = getRandomSpeed();
    team2.dy = getRandomSpeed();

    goal.x = 200;
    goal.y = 50;
    goal.angle = 0;
}


function handleCollision(ball1, ball2) {
    let dx = ball2.x - ball1.x;
    let dy = ball2.y - ball1.y;
    let distance = Math.hypot(dx, dy);
    let minDistance = 30;

    if (distance < minDistance) {
        let angle = Math.atan2(dy, dx);

        // Hız vektörlerinin büyüklüğünü hesapla
        let speed1 = Math.hypot(ball1.dx, ball1.dy);
        let speed2 = Math.hypot(ball2.dx, ball2.dy);
        
        // Çarpışma sonrası her iki topun hızlarının tersine dönmesini sağla
        let newDx1 = Math.cos(angle + Math.PI) * speed1; // Ball1 tersine dönmeli
        let newDy1 = Math.sin(angle + Math.PI) * speed1;
        
        let newDx2 = Math.cos(angle) * speed2; // Ball2 tersine dönmeli
        let newDy2 = Math.sin(angle) * speed2;

        // Yeni hızları ata
        ball1.dx = newDx1;
        ball1.dy = newDy1;
        ball2.dx = newDx2;
        ball2.dy = newDy2;

        // Küçük bir rastgele sapma ekleyerek daha doğal bir hareket sağlayalım
        ball1.dx += (Math.random() - 0.5) * 0.5;
        ball1.dy += (Math.random() - 0.5) * 0.5;
        ball2.dx += (Math.random() - 0.5) * 0.5;
        ball2.dy += (Math.random() - 0.5) * 0.5;
    }
}


function updateTime() {
    if (time < 90) {
        time++;
        document.getElementById("time").innerText = `${time}`;
    } else {
        // 90. dakikada oyunu durduruyoruz
        clearInterval(timeInterval);
        gameRunning = false;
    }
}

function gameLoop() {
    if (!gameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(200, 200, 180, 0, Math.PI * 2);
    ctx.stroke();
    drawGoal();
    drawTeams();
    updatePositions();
    requestAnimationFrame(gameLoop);
}
