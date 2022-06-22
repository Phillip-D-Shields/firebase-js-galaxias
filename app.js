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

// Options for Player Colors... these are in the same order as our sprite sheet
const playerColors = ["beige", "blue", "green", "pink", "yellow"];
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

let highScoreName = "";
let highScore = 0;

//Misc Helpers
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getKeyString(x, y) {
  return `${x}x${y}`;
}

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

function getRandomSafeSpot() {
  return {
    x: Math.floor(Math.random() * mapData.maxX),
    y: Math.floor(Math.random() * mapData.maxY),
  };
}

(function () {
  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let stars = {};
  let starElements = {};
  let highScoreName = "";
  let highScore = 0;

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");

  const elementValuesArray = [1, 1, 2, 3, 5, 8, 13, 25, -1, -1, -2, -3, -13];

  function placeStar() {
    const { x, y } = getRandomSafeSpot();
    const value = randomFromArray(elementValuesArray);
    const starRef = firebase.database().ref(`stars/${getKeyString(x, y)}`);
    starRef.set({
      x,
      y,
      value,
    });

    const starTimeouts = [1000, 3000, 10000, 5000, 700];
    setTimeout(() => {
      placeStar();
    }, randomFromArray(starTimeouts));
  }

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

  function checkHighScore(highScore, playerScore) {
    return playerScore > highScore;
  }

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

  function initGame() {
    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1));
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1));
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0));
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0));

    const allPlayersRef = firebase.database().ref(`players`);
    const allStarsRef = firebase.database().ref(`stars`);
    const highScoreRef = firebase.database().ref(`high-score`);

    highScoreRef.set({
      name: highScoreName,
      score: highScore,
    });

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

        if (checkHighScore(highScore, characterState.stars)) {
          console.log("new high score");
          highScoreName = characterState.name;
          highScore = characterState.stars;

          highScoreRef.update({
            name: highScoreName,
            score: highScore,
          });
          document.querySelector("#highScoreName").textContent = highScoreName;
          document.querySelector("#highScore").textContent = highScore;
        }
      });
    });

    allPlayersRef.on("child_added", (snapshot) => {
      //Fires whenever a new node is added the tree
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

      //Fill in some initial state
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

    //Remove character DOM element after they leave
    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
    });

    allStarsRef.on("value", (snapshot) => {
      stars = snapshot.val() || {};
    });
    //

    allStarsRef.on("child_added", (snapshot) => {
      const star = snapshot.val();
      const key = getKeyString(star.x, star.y);
      stars[key] = true;
      const starImage = randomFromArray(starSprites);

      // Create the DOM Element
      const starElement = document.createElement("div");
      starElement.classList.add("star", "grid-cell");
      starElement.innerHTML = `
          <div class="${starImage} grid-cell"></div>
        `;

      // Position the Element
      const left = 16 * star.x + "px";
      const top = 16 * star.y - 4 + "px";
      starElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      starElements[key] = starElement;
      gameContainer.appendChild(starElement);
    });
    allStarsRef.on("child_removed", (snapshot) => {
      const { x, y } = snapshot.val();
      const keyToRemove = getKeyString(x, y);
      gameContainer.removeChild(starElements[keyToRemove]);
      delete starElements[keyToRemove];
    });

    //Updates player name with text input
    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      playerRef.update({
        name: newName,
      });
    });

    //Update player color on button click
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color: nextColor,
      });
    });

    //Place my first coin
    placeStar();
  }

  firebase.auth().onAuthStateChanged((user) => {
    console.log(user);
    if (user) {
      //You're logged in!
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);

      const name = createName();
      playerNameInput.value = name;

      const { x, y } = getRandomSafeSpot();

      playerRef.set({
        id: playerId,
        name,
        direction: "right",
        color: randomFromArray(playerColors),
        x,
        y,
        stars: 0,
      });

      //Remove me from Firebase when I diconnect
      playerRef.onDisconnect().remove();

      //Begin the game now that we are signed in
      initGame();
    } else {
      //You're logged out.
    }
  });

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
