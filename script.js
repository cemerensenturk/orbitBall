const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const whistleSound = new Audio('./sounds/whistle.mp3');
const goalSound = new Audio('./sounds/goal.mp3');

canvas.width = 400;
canvas.height = 400;

function getRandomSpeed() {
    const minSpeed = 1.0;
    const speed = (Math.random() * 2 - 1) * 3;
    return Math.sign(speed) * Math.max(Math.abs(speed), minSpeed);
}

let team1 = { x: 170, y: 200, dx: getRandomSpeed(), dy: getRandomSpeed()};
let team2 = { x: 230, y: 200, dx: getRandomSpeed(), dy: getRandomSpeed()};
let goal = { x: 200, y: 50, width: 30, height: 10, angle: 0, speed: 0.8 };
let score = [0, 0];
let time = 0;
let timeInterval;
let gameRunning = false;
let ballRadius = 30;
let goalWidth = 25;  // Kale genişliği
let goalHeight = 70; // Kale yüksekliği
let goalRadius = 180; // Kale merkezinin dönme mesafesi

// Takımları yüklemek için temsili bir nesne
let teamsDatabase = {};

// Tüm JSON dosyalarını yükleyip teamsDatabase'e ekleyen fonksiyon
async function loadAllTeams() {
    const jsonFiles = [
        'premier.json',
        'laliga.json',
        'bundesliga.json',
        'seriea.json',
        'ligue1.json',
        'trendyol.json',
        'others.json'
    ];
    
    // Tüm dosyaları sırayla yükle
    for (const file of jsonFiles) {
        try {
            const response = await fetch(`./json/${file}`);
            if (!response.ok) throw new Error(`${file} yüklenemedi: ${response.status}`);
            
            const data = await response.json();
            // Her bir takımı teamsDatabase'e ekle
            for (const teamId in data) {
                teamsDatabase[teamId] = data[teamId];
            }
        } catch (error) {
            console.error(`${file} yüklenirken hata oluştu:`, error);
        }
    }
    
    // Tüm takımlar yüklendikten sonra arayüzü güncelle
    filterTeams();
}

function startGame() {
    if (gameRunning) return;

    resizeCanvas();

    let team1Name = document.getElementById("team1-select").value;
    let team2Name = document.getElementById("team2-select").value;

    // Veritabanımızdan takım özelliklerini al
    team1.color = teamsDatabase[team1Name].colors;
    team1.initial = teamsDatabase[team1Name].initial;

    team2.color = teamsDatabase[team2Name].colors;
    team2.initial = teamsDatabase[team2Name].initial;

    document.getElementById("goal-history").innerHTML = "<h3>Goal History</h3>";

    whistleSound.play();

    gameRunning = true;
    score = [0, 0];
    time = 0;
    updateScore();
    document.getElementById("time").innerText = `${time}`;

    clearInterval(timeInterval);
    timeInterval = setInterval(updateTime, 500);
    resetPositions();
    gameLoop();
}

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

function changeBackground(category) {
    const canvas = document.getElementById("gameCanvas");
    
    // Önce mevcut geçiş animasyonu tamamlansın
    canvas.style.transition = "background-image 1s ease";
    
    // Kategori/lige göre arkaplan resmini belirle
    let newBackground = "url(./img/rota.png)";
    
    switch(category) {
      case "premier-league":
        newBackground = "url(./img/pl.png)";
        break;
      case "la-liga":
        newBackground = "url(./img/ll.png)";
        break;
      case "bundesliga":
        newBackground = "url(./img/bl.png)";
        break;
      case "super-lig":
        newBackground = "url(./img/tsl.png)";
        break;
      case "serie-a":
        newBackground = "url(./img/sa.png)";
        break;
      case "ligue-1":
        newBackground = "url(./img/l1.png)";
        break;
      case "ucl":
        newBackground = "url(./img/ucl.png)";
        break;
      case "uel":
        newBackground = "url(./img/uel.png)";
        break;
      case "uecl":
        newBackground = "url(./img/uecl.png)";
        break;

      default:
        newBackground = "url(./img/rota.png)";
    }
    
    canvas.style.backgroundImage = newBackground;
  }

function filterTeams() {
    const selectedCategory = document.getElementById("filter-category").value;
    const team1Select = document.getElementById("team1-select");
    const team2Select = document.getElementById("team2-select");
    
    // Mevcut seçimleri kaydet
    const team1Current = team1Select.value;
    const team2Current = team2Select.value;
    
    // Seçim kutularını temizle
    team1Select.innerHTML = "";
    team2Select.innerHTML = "";
    
    // Filtreleme ve ekleme
    for (const teamId in teamsDatabase) {
        const team = teamsDatabase[teamId];
        
        // Tüm takımlar seçildiğinde veya takım bu kategoride ise
        if (selectedCategory === "all" || 
            team.league === selectedCategory || 
            team.competitions.includes(selectedCategory)) {
            
            // Takım 1 seçim kutusuna ekle
            const option1 = document.createElement("option");
            option1.value = teamId;
            option1.textContent = team.name;
            team1Select.appendChild(option1);
            
            // Takım 2 seçim kutusuna ekle
            const option2 = document.createElement("option");
            option2.value = teamId;
            option2.textContent = team.name;
            team2Select.appendChild(option2);
        }
    }
    
    // Önceki seçimleri korumaya çalış (eğer hala filtrelenen takımlar arasındaysa)
    if (Array.from(team1Select.options).some(opt => opt.value === team1Current)) {
        team1Select.value = team1Current;
    }
    
    if (Array.from(team2Select.options).some(opt => opt.value === team2Current)) {
        team2Select.value = team2Current;
    }

    changeBackground(selectedCategory);
}

function drawGoal() {
    let radian = (goal.angle * Math.PI) / 180;

    // Kale merkezinin konumunu hesapla
    goal.x = 200 + Math.cos(radian) * goalRadius;
    goal.y = 200 + Math.sin(radian) * goalRadius;

    ctx.save();
    ctx.translate(goal.x, goal.y);
    
    // Kalenin açısını, merkeze bakacak şekilde ayarla
    let angleToCenter = Math.atan2(200 - goal.y, 200 - goal.x);
    ctx.rotate(angleToCenter);

    // Kalenin arka plan kısmı (isteğe bağlı, ağ etkisi için)
    ctx.beginPath();
    ctx.rect(-goalWidth / 2, -goalHeight / 2, goalWidth, goalHeight);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // Yarı saydam beyaz (ağ etkisi)
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.rect(-goalWidth / 2, -goalHeight / 2, goalWidth, 3);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.rect(-goalWidth / 2, -goalHeight / 2, 3, goalHeight);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.rect(-goalWidth / 2, goalHeight / 2 - 3, goalWidth, 3);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();


    ctx.restore();
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
    // Takım veritabanından takım adını bulalım
    for (let teamId in teamsDatabase) {
        if (teamsDatabase[teamId].initial === scorer) {
            scorerTeamName = teamsDatabase[teamId].name;
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
            team.dx += (Math.random() - 0.5) * 0.2;
            team.dy += (Math.random() - 0.5) * 0.2;
        }

        let distance = Math.hypot(team.x - goal.x, team.y - goal.y);
        if (distance < 25 && Math.random() < 0.4) { 
            if (team === team1) {
                score[0]++;
                updateScore(team1.initial);
            } else {
                score[1]++;
                updateScore(team2.initial);
            }

            goalSound.play();
            
            // Oyunu duraklatıyoruz
            gameRunning = false;

            // Konumları sıfırlıyoruz
            resetPositions();

            // Kısa bir beklemeden sonra oyunu devam ettiriyoruz
            setTimeout(() => {
                if (time < 90) { // Süre bitmemişse oyunu devam ettir
                    gameRunning = true;
                    gameLoop();
                }
            }, 3000);
        }

        // Sahadan çıkmasını engelliyoruz
        let distanceToCenter = Math.hypot(team.x - 200, team.y - 200);
        if (distanceToCenter >= 180) {
            let angle = Math.atan2(team.y - 200, team.x - 200);
            team.dx = -Math.cos(angle) * 2;
            team.dy = -Math.sin(angle) * 2;

            // Duvar çarpışma efekti ekle
            let wallX = 200 + Math.cos(angle) * 180;
            let wallY = 200 + Math.sin(angle) * 180;
            addCollisionEffect(wallX, wallY, "wall");
        }
    });

    // Kalenin yönünü orijine bakacak şekilde güncelliyoruz
    updateGoalAngle();

    handleCollision(team1, team2);
    goal.angle += goal.speed;
}

function resetPositions() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    team1.x = centerX - 30;
    team1.y = centerY;
    team1.dx = getRandomSpeed();
    team1.dy = getRandomSpeed();

    team2.x = centerX + 30;
    team2.y = centerY;
    team2.dx = getRandomSpeed();
    team2.dy = getRandomSpeed();

    goal.angle = 0;
}

// Çarpışma efekti için değişkenler
let collisionEffects = [];

function addCollisionEffect(x, y, type) {
    let effect = {
        x: x,
        y: y,
        type: type, // "wall" veya "ball"
        radius: type === "wall" ? 5 : 10,
        alpha: 1.0,
        color: type === "wall" ? "#ffffff" : "#ffcc00"
    };
    collisionEffects.push(effect);
}

function updateAndDrawEffects() {
    ctx.beginPath();
    for (let i = collisionEffects.length - 1; i >= 0; i--) {
        let effect = collisionEffects[i];
        effect.radius += 0.7;
        effect.alpha -= 0.05;
        
        ctx.moveTo(effect.x + effect.radius, effect.y);
        ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        
        if (effect.alpha <= 0) {
            collisionEffects.splice(i, 1);
        }
    }
    
    if (collisionEffects.length > 0) {
        ctx.strokeStyle = `rgba(255,204,0,0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Oyun değişkenleri arasına bu değişkenleri ekleyelim
let minDeflectionAngle = 0.15;  // Minimum sapma açısı (radyan)
let maxDeflectionAngle = 0.65;  // Maksimum sapma açısı (radyan)

function handleCollision(ball1, ball2) {
    let dx = ball2.x - ball1.x;
    let dy = ball2.y - ball1.y;
    let distance = Math.hypot(dx, dy);
    let minDistance = 50;

    if (distance < minDistance) {
        // Çarpışma başına rastgele sapma açıları üret
        // Her çarpışmada farklı açılar kullanarak hareketin doğrusallığını kır
        let random1 = minDeflectionAngle + Math.random() * (maxDeflectionAngle - minDeflectionAngle);
        let random2 = minDeflectionAngle + Math.random() * (maxDeflectionAngle - minDeflectionAngle);
        
        // Açıları pozitif veya negatif yapma şansı
        random1 *= Math.random() > 0.5 ? 1 : -1;
        random2 *= Math.random() > 0.5 ? 1 : -1;
        
        // Çarpışma açısını hesapla
        let angle = Math.atan2(dy, dx);
        
        // Hızların büyüklüğünü hesapla
        let speed1 = Math.hypot(ball1.dx, ball1.dy);
        let speed2 = Math.hypot(ball2.dx, ball2.dy);
        
        // Yeni hızları ata - dinamik açı eklemeli
        ball1.dx = Math.cos(angle + Math.PI + random1) * speed1 * 1.05;
        ball1.dy = Math.sin(angle + Math.PI + random1) * speed1 * 1.05;
        
        ball2.dx = Math.cos(angle + random2) * speed2 * 1.05;
        ball2.dy = Math.sin(angle + random2) * speed2 * 1.05;
        
        // Sabit çarpışma döngüsünden kaçınmak için hafif rastgele sapma
        ball1.dx += (Math.random() - 0.5) * 0.8;
        ball1.dy += (Math.random() - 0.5) * 0.8;
        ball2.dx += (Math.random() - 0.5) * 0.8;
        ball2.dy += (Math.random() - 0.5) * 0.8;
        
        // Topları birbirinden uzaklaştır (çakışmayı önle)
        let overlap = minDistance - distance;
        let adjustX = (overlap * dx) / distance * 0.5;
        let adjustY = (overlap * dy) / distance * 0.5;
        
        ball1.x -= adjustX;
        ball1.y -= adjustY;
        ball2.x += adjustX;
        ball2.y += adjustY;
        
        // Top çarpışma efekti ekle
        let collisionX = (ball1.x + ball2.x) / 2;
        let collisionY = (ball1.y + ball2.y) / 2;
        addCollisionEffect(collisionX, collisionY, "ball");
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
        whistleSound.play();
    }
}

function gameLoop() {
    if (!gameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw field circle with dynamic radius based on canvas size
    const fieldRadius = Math.min(canvas.width, canvas.height) * 0.45;
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, fieldRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "white";
    ctx.stroke();
    
    drawGoal();
    drawTeams();
    updatePositions();
    updateAndDrawEffects(); // Efektleri çiz
    requestAnimationFrame(gameLoop);
}

// Add this new function to handle responsive canvas
function resizeCanvas() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // On mobile, make the canvas square and fit the viewport width
        const size = Math.min(window.innerWidth * 0.95, 400);
        canvas.width = size;
        canvas.height = size;
        
        // Adjust game elements for the new canvas size
        goalRadius = size * 0.45;  // 45% of canvas size
        ballRadius = size * 0.075; // 7.5% of canvas size
        goalWidth = size * 0.0625; // 6.25% of canvas size  
        goalHeight = size * 0.175; // 17.5% of canvas size
    } else {
        // On desktop, use original dimensions
        canvas.width = 400;
        canvas.height = 400;
        goalRadius = 180;
        ballRadius = 30;
        goalWidth = 25;
        goalHeight = 70;
    }
}

// Add window resize event listener
window.addEventListener('resize', function() {
    if (gameRunning) {
        // If game is running, handle resize
        resizeCanvas();
    }
});

window.addEventListener("load", function() {
    loadAllTeams().then(() => {
        console.log("Tüm takımlar yüklendi!");
    }).catch(error => {
        console.error("Takımlar yüklenirken hata oluştu:", error);
    });
});