// map data object that contains min and max grid values, blocked spaces for future game implementation
const mapData = {
  minX: 0,
  maxX: 20,
  minY: 0,
  maxY: 16,
  blockedSpaces: {
    //   "7x4": true,
    //   "1x11": true,
    //   "12x10": true,
    //   "4x7": true,
    //   "5x7": true,
    //   "6x7": true,
    //   "8x6": true,
    //   "9x6": true,
    //   "10x6": true,
    //   "7x9": true,
    //   "8x9": true,
    //   "9x9": true,
  },
};

// Options for player ship colors
const playerColors = ["beige", "blue", "green", "pink", "yellow"];
// options for star shapes and colors
const starSprites = [
  "star_sprite01",
  "star_sprite02",
  "star_sprite03",
  "star_sprite04",
  "star_sprite05",
  "star_sprite06",
  "star_sprite07",
  "star_sprite08",
  "star_sprite09",
  "star_sprite10",
  "star_sprite11",
  "star_sprite12",
];


//some nifty helpers
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getKeyString(x, y) {
  return `${x}x${y}`;
}

// auto generate a user name when they join
function createName() {
  const prefix = randomFromArray([
    "COOL",
    "SUPER",
    "HIP",
    "SMUG",
    "COOL",
    "SILKY",
    "GOOD",
    "SAFE",
    "DEAR",
    "DAMP",
    "WARM",
    "RICH",
    "LONG",
    "DARK",
    "SOFT",
    "BUFF",
    "DOPE",
  ]);
  const animal = randomFromArray([
    "BEAR",
    "DOG",
    "CAT",
    "FOX",
    "LAMB",
    "LION",
    "BOAR",
    "GOAT",
    "VOLE",
    "SEAL",
    "PUMA",
    "MULE",
    "BULL",
    "BIRD",
    "BUG",
  ]);
  return `${prefix} ${animal}`;
}

// logic to check if grid square is accessible
function isSolid(x, y) {
  // const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  return (
    // blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  );
}

// random grid selectory for player and star placement
function getRandomSafeSpot() {
  return {
    x: Math.floor(Math.random() * mapData.maxX),
    y: Math.floor(Math.random() * mapData.maxY),
  };
}


// anonymous function that fires when file is loaded
// contains game instance logic
// big and nasty, but works
(function () {

  // reassignable variables
  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let stars = {};
  let starElements = {};
  let highScoreName;
  let highScore;

  // constant variables
  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");

  // array of possible star values
  const starValuesArray = [1, 1, 2, 3, 5, 8, 13, 25, -1, -1, -2, -3, -13];

  // function to place a star with assigned coordinates, value, and database refernce
  function placeStar() {
    const { x, y } = getRandomSafeSpot();
    const value = randomFromArray(starValuesArray);
    const starRef = firebase.database().ref(`stars/${getKeyString(x, y)}`);
    starRef.set({
      x,
      y,
      value,
    });

    // random timeout before placing next star
    const starTimeouts = [1000, 3000, 10000, 5000, 700];
    setTimeout(() => {
      placeStar();
    }, randomFromArray(starTimeouts));
  }

  // logic to grab a star and update players realtime score
  function attemptGrabStar(x, y) {
    const key = getKeyString(x, y);
    if (stars[key]) {
      // update player score
      playerRef.update({
        stars: players[playerId].stars + stars[key].value,
      });
      // Remove this key from data
      firebase.database().ref(`stars/${key}`).remove();
    }
  }

  // helper to check highscore
  function checkHighScore(highScore, playerScore) {
    return playerScore > highScore;
  }

  // logic to move, change current direction, and attempt to grab any stars on new coordinates
  function handleArrowPress(xChange = 0, yChange = 0) {
    const newX = players[playerId].x + xChange;
    const newY = players[playerId].y + yChange;
    if (!isSolid(newX, newY)) {
      //move to the next space
      players[playerId].x = newX;
      players[playerId].y = newY;
      if (xChange === 1) {
        players[playerId].direction = "right";
      }
      if (xChange === -1) {
        players[playerId].direction = "left";
      }
      playerRef.set(players[playerId]);
      attemptGrabStar(newX, newY);
    }
  }

  // function to init directional event listeners and database references
  function initGame() {
    // keyboard directional event listeners
    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1));
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1));
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0));
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0));

    // database reference objects
    const allPlayersRef = firebase.database().ref(`players`);
    const allStarsRef = firebase.database().ref(`stars`);
    const highScoreRef = firebase.database().ref(`high-score`);

    // check if highscore exists in database reference, update with existing values or init default values
    highScoreRef.get().then((snapshot) => {
      if (snapshot.exists()) {
        score = snapshot.val();
        highScoreName = score.name;
        highScore = score.score;
        document.querySelector("#highScoreName").textContent = highScoreName;
        document.querySelector("#highScore").textContent = highScore;
      } else {
        highScoreRef.set({
          name: '',
          score: 0,
        });
      }
    })
    
    // update players data whenever a change occurs 
    allPlayersRef.on("value", (snapshot) => {
      //Fires whenever a change occurs
      players = snapshot.val() || {};

      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];
        // Now update the DOM
        el.querySelector(".Character_name").innerText = characterState.name;
        el.querySelector(".Character_stars").innerText = characterState.stars;
        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);
        const left = 16 * characterState.x + "px";
        const top = 16 * characterState.y - 4 + "px";
        el.style.transform = `translate3d(${left}, ${top}, 0)`;

        // check if new high score has been achieved
        if (checkHighScore(highScore, characterState.stars)) {
          console.log("new high score");
          highScoreName = characterState.name;
          highScore = characterState.stars;

          highScoreRef.update({
            name: highScoreName,
            score: highScore,
          });
          // update ui
          document.querySelector("#highScoreName").textContent = highScoreName;
          document.querySelector("#highScore").textContent = highScore;
        }
      });
    });

    // update players data when a new player joins
    allPlayersRef.on("child_added", (snapshot) => {
      //create new node on the tree and add ui elements
      const addedPlayer = snapshot.val();
      const characterElement = document.createElement("div");

      characterElement.classList.add("Character", "grid-cell");

      if (addedPlayer.id === playerId) {
        characterElement.classList.add("you");
      }

      characterElement.innerHTML = `
          <div class="Character_shadow grid-cell"></div>
          <div class="Character_sprite grid-cell"></div>
          <div class="Character_name-container">
            <span class="Character_name"></span>
            <span class="Character_stars">0</span>
          </div>
          <div class="Character_you-arrow"></div>
        `;
      playerElements[addedPlayer.id] = characterElement;

      //initial state
      characterElement.querySelector(".Character_name").innerText =
        addedPlayer.name;
      characterElement.querySelector(".Character_stars").innerText =
        addedPlayer.stars;
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);

      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";

      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      gameContainer.appendChild(characterElement);
    });

    //remove character DOM node after they exit
    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
    });

    // update stars data on all changes
    allStarsRef.on("value", (snapshot) => {
      stars = snapshot.val() || {};
    });
    

    // add new stars to database
    allStarsRef.on("child_added", (snapshot) => {
      // create new star nodes info for the tree
      const star = snapshot.val();
      const key = getKeyString(star.x, star.y);
      stars[key] = true;
      const starImage = randomFromArray(starSprites);

      // new DOM node
      const starElement = document.createElement("div");
      starElement.classList.add("star", "grid-cell");
      starElement.innerHTML = `
          <div class="${starImage} grid-cell"></div>
        `;

      // position the node
      const left = 16 * star.x + "px";
      const top = 16 * star.y - 4 + "px";
      starElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // update gamecontainer
      starElements[key] = starElement;
      gameContainer.appendChild(starElement);
    });

    // remove star nodes
    allStarsRef.on("child_removed", (snapshot) => {
      const { x, y } = snapshot.val();
      const keyToRemove = getKeyString(x, y);
      gameContainer.removeChild(starElements[keyToRemove]);
      delete starElements[keyToRemove];
    });

    //update player name on DOM and db
    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      playerRef.update({
        name: newName,
      });
    });

    //update player color on DOM and db
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color: nextColor,
      });
    });

    //place that first star
    placeStar();
  }


  // create new defaults each login
  // TODO: modify to allow anon players to return with same info from last login
  firebase.auth().onAuthStateChanged((user) => {
    console.log(user);
    if (user) {
      // logged in
      // update db
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);

      const name = createName();
      playerNameInput.value = name;

      const { x, y } = getRandomSafeSpot();

      // auto generate defaults for new player
      playerRef.set({
        id: playerId,
        name,
        direction: "right",
        color: randomFromArray(playerColors),
        x,
        y,
        stars: 0,
      });

      //remove from firebase db on disconnect, saves usage
      playerRef.onDisconnect().remove();

      // init the game for new player
      initGame();
    } else {
      //not logged in, nothingness
    }
  });

  // anon sign in logic
  firebase
    .auth()
    .signInAnonymously()
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      // ...
      console.log(errorCode, errorMessage);
    });
})();
