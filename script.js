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
let timeInterval;
let gameRunning = false;
let ballRadius = 20;
let goalWidth = 15;  // Kale genişliği
let goalHeight = 50; // Kale yüksekliği
let goalRadius = 180; // Kale merkezinin dönme mesafesi

// Kategorileri tanımlayalım
const categories = {
    // Ligler
    "premier-league": "Premier League",
    "la-liga": "La Liga",
    "bundesliga": "Bundesliga",
    "serie-a": "Serie A",
    "ligue-1": "Ligue 1",
    "super-lig": "Trendyol Süper Lig",
    
    // Turnuvalar
    "ucl": "UEFA Champions League",
    "uel": "UEFA Europa League",
    "uecl": "UEFA Conference League",
    
    // Özel kategoriler
    "all": "All Teams"
};

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

    let team1Name = document.getElementById("team1-select").value;
    let team2Name = document.getElementById("team2-select").value;

    // Veritabanımızdan takım özelliklerini al
    team1.color = teamsDatabase[team1Name].colors;
    team1.initial = teamsDatabase[team1Name].initial;

    team2.color = teamsDatabase[team2Name].colors;
    team2.initial = teamsDatabase[team2Name].initial;

    document.getElementById("goal-history").innerHTML = "<h3>Goal History</h3>";

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

    //changeBackground(selectedCategory);
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
    ctx.fillStyle = "white";
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
            }, 1000);
        }

        // Sahadan çıkmasını engelliyoruz
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
/*
function changeBackground(category) {
    const body = document.body;
    
    // Önce mevcut geçiş animasyonu tamamlansın
    body.style.transition = "background-image 1s ease";
    
    // Kategori/lige göre arkaplan resmini belirle
    let newBackground = "url(./img/photo1.jpg)";
    
    switch(category) {
      case "premier-league":
        newBackground = "url(./img/premier_league.jpg)";
        break;
      case "la-liga":
        newBackground = "url(./img/la_liga.jpg)";
        break;
      case "bundesliga":
        newBackground = "url(./img/bundesliga.jpg)";
        break;
      case "serie-a":
        newBackground = "url(./img/serie-a.jpg)";
        break;
      case "ligue-1":
        newBackground = "url(./img/ligue_1.jpg)";
        break;
      case "super-lig":
        newBackground = "url(./img/superlig.jpg)";
        break;
      case "ucl":
        newBackground = "url(./img/ucl.jpg)";
        break;
      case "uel":
        newBackground = "url(./img/uel.jpg)";
        break;
      case "uecl":
        newBackground = "url(./img/uecl.jpg)";
        break;
      // ... diğer ligler ve turnuvalar için
      default:
        newBackground = "url(./img/photo1.jpg)";
    }
    
    body.style.backgroundImage = newBackground;
  }
*/
// Sayfa yüklendiğinde tüm takımları yükle ve ilk filtrelemeyi yap
window.addEventListener("load", function() {
    loadAllTeams().then(() => {
        console.log("Tüm takımlar yüklendi!");
    }).catch(error => {
        console.error("Takımlar yüklenirken hata oluştu:", error);
    });
});