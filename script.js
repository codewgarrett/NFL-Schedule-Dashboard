async function loadSchedule() {
  const gamesContainer = document.getElementById("gamesContainer");
  const weekSelect = document.getElementById("weekSelect");

  try {
    // Create an array of fetch promises for weeks 1-18
    const weekPromises = [];
    for (let week = 1; week <= 18; week++) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}`;
      weekPromises.push(fetch(url).then(res => res.json()));
    }

    // Wait for all fetches to complete
    const allWeekData = await Promise.all(weekPromises);

    // Parse each week's data
    const allWeeks = allWeekData.map((data, index) => parseEspnScoreboard(data, index + 1));

    // Populate week dropdown
    allWeeks.forEach(weekData => {
      const option = document.createElement("option");
      option.value = weekData.week;
      option.textContent = `Week ${weekData.week}`;
      weekSelect.appendChild(option);
    });

    // Render first week by default
    renderGames(allWeeks[0].games);

    // Week selection
    weekSelect.addEventListener("change", (e) => {
      const selectedWeek = parseInt(e.target.value);
      const weekData = allWeeks.find(w => w.week === selectedWeek);
      renderGames(weekData.games);
    });

    // Team search
    document.getElementById("teamSearch").addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const allGamesFlat = allWeeks.flatMap(w => w.games);
      const filtered = allGamesFlat.filter(
        g => g.homeTeam.toLowerCase().includes(searchTerm) || g.awayTeam.toLowerCase().includes(searchTerm)
      );
      renderGames(filtered);
    });

    // Render function
    function renderGames(games) {
      gamesContainer.innerHTML = "";

      games.forEach(game => {
        const card = document.createElement("div");
        card.className = `game-card ${game.status}`;

        const gameDate = new Date(game.date).toLocaleString();

        if (game.status === "completed") {
          let homeClass = "";
          let awayClass = "";

          if (game.homeScore > game.awayScore) homeClass = "winner";
          else if (game.awayScore > game.homeScore) awayClass = "winner";

          card.innerHTML = `
            <h3>
              <span class="${awayClass}">${game.awayTeam}</span> @ 
              <span class="${homeClass}">${game.homeTeam}</span>
            </h3>
            <p><strong>Date:</strong> ${gameDate}</p>
            <p><strong>Final Score:</strong> 
              <span class="${awayClass}">${game.awayScore}</span> - 
              <span class="${homeClass}">${game.homeScore}</span>
            </p>
          `;
        } else {
          card.innerHTML = `
            <h3>${game.awayTeam} @ ${game.homeTeam}</h3>
            <p><strong>Date:</strong> ${gameDate.toLocaleString()}</p>
            <p><em>Starts in: <span class="countdown">Loading...</span></em></p>
          `;
            const countdownSpan = card.querySelector(".countdown");

      // Update countdown every second
      const interval = setInterval(() => {
        const now = new Date();
        const diff = game.date - new Date();

        if (diff <= 0) {
          countdownSpan.textContent = "Starting now!";
          clearInterval(interval);
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / (1000 * 60)) % 60);
          const seconds = Math.floor((diff / 1000) % 60);

          countdownSpan.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
      }, 1000);

        }

        gamesContainer.appendChild(card);
      });
    }
  } catch (error) {
    console.error("Error loading schedule:", error);
  }
}

// Transform ESPN API data into your week/game structure
function parseEspnScoreboard(apiData, weekNumber) {
  const games = apiData.events.map(event => {
    const competition = event.competitions[0];
    const home = competition.competitors.find(c => c.homeAway === "home");
    const away = competition.competitors.find(c => c.homeAway === "away");
    const status = competition.status.type.name; // STATUS_FINAL or STATUS_SCHEDULED

    return {
      homeTeam: home.team.displayName,
      awayTeam: away.team.displayName,
      homeScore: status === "STATUS_FINAL" ? parseInt(home.score) : null,
      awayScore: status === "STATUS_FINAL" ? parseInt(away.score) : null,
      status: status === "STATUS_FINAL" ? "completed" : "upcoming",
      date: new Date(event.date)
    };
  });

  return { week: weekNumber, games };
}

// Run on page load
loadSchedule();
