// --- DOM Elements ---
const passageDisplay = document.getElementById('passage-display');
const typingInput = document.getElementById('typing-input');
const startButton = document.getElementById('start-button');
const wpmDisplay = document.getElementById('wpm-display');
const accuracyDisplay = document.getElementById('accuracy-display');
const timerDisplay = document.getElementById('timer-display');
const passageContainer = document.getElementById('passage-container');

// --- Passages Data ---
let allPassages = []; // To store passages fetched from JSON
let passagesLoaded = false; // Flag to check if passages are loaded

// --- Game State Variables ---
let currentPassageText = "";
let passageCharsSpans = [];
let currentCharIndex = 0;
let typedCharCount = 0;
let correctCharCount = 0;
let mistakeCount = 0;
let startTime;
let timerInterval;
let gameActive = false;

// --- NEW: Function to load passages from JSON ---
async function loadPassages() {
    try {
        const response = await fetch('texts.json'); // Assumes texts.json is in the same folder as index.html
        if (!response.ok) {
            // If the server returned an error (like 404 Not Found)
            throw new Error(`HTTP error! status: ${response.status}, Nessage: ${response.statusText}`);
        }
        const data = await response.json();

        // Assuming your JSON is an array of objects, each with a "text" property:
        // e.g., [{ "id": 1, "text": "Some text." }, { "id": 2, "text": "Another text." }]
        if (Array.isArray(data) && data.length > 0 && typeof data[0].text === 'string') {
            allPassages = data.map(item => item.text);
        }
        // If your JSON is just an array of strings: e.g., ["Some text.", "Another text."]
        // else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
        //     allPassages = data;
        // }
        else {
            console.error("texts.json is not in the expected format (array of objects with 'text' property, or array of strings).");
            allPassages = ["Error: Invalid passage data format in texts.json."];
        }

        if (allPassages.length === 0) {
            console.error("No passages found in texts.json or file is empty/malformed.");
            allPassages = ["Error: Could not load typing passages. Please check texts.json."];
        }
        passagesLoaded = true;
        console.log("Passages loaded:", allPassages.length, "passages found.");
    } catch (error) {
        console.error("Could not load passages from texts.json:", error);
        passageDisplay.innerText = "Error loading passages. Please check console and texts.json.";
        allPassages = ["Failed to load passages. Ensure texts.json exists and is valid."]; // Fallback
        passagesLoaded = true; // Set to true even on error to allow fallback to work if needed
    } finally {
        // This block will run whether the try succeeded or failed.
        // Good place to initialize the game display, as passages (or a fallback) will be set.
        resetGame(); // Call resetGame to display the first passage (or error message)
    }
}


// --- Core Functions ---

function getRandomPassage() {
    if (!passagesLoaded || allPassages.length === 0) {
        console.warn("Passages not loaded yet or no passages available.");
        // This fallback is important if loadPassages fails completely before resetGame is called.
        return "Error: Passages are not available. Check texts.json or console.";
    }
    const randomIndex = Math.floor(Math.random() * allPassages.length);
    return allPassages[randomIndex];
}

function formatPassageForDisplay(passageText) {
    passageDisplay.innerHTML = '';
    passageCharsSpans = [];

    passageText.split('').forEach(char => {
        const charSpan = document.createElement('span');
        charSpan.innerText = char;
        passageDisplay.appendChild(charSpan);
        passageCharsSpans.push(charSpan);
    });

    if (passageCharsSpans.length > 0) {
        passageCharsSpans[0].classList.add('current');
    }
}

function resetGame() {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    passageContainer.classList.remove('shake-error');

    // Get a passage (this will use the fetched ones or a fallback if loading failed)
    currentPassageText = getRandomPassage();
    formatPassageForDisplay(currentPassageText);

    currentCharIndex = 0;
    typedCharCount = 0;
    correctCharCount = 0;
    mistakeCount = 0;
    startTime = null;

    typingInput.value = '';
    typingInput.disabled = false;

    wpmDisplay.textContent = '0';
    accuracyDisplay.textContent = '0';
    timerDisplay.textContent = '0s';

    startButton.textContent = "Start New Test";
    startButton.disabled = false;

    passageCharsSpans.forEach(span => span.classList.remove('current', 'incorrect', 'correct'));
    if (passageCharsSpans.length > 0) {
        passageCharsSpans[0].classList.add('current');
    }
}

function startGameProcedure() {
    // resetGame is now called after passages load, or if start is clicked before fully loaded
    if (!passagesLoaded) {
        console.log("Passages still loading, please wait...");
        // Optionally disable start button until passagesLoaded is true
        // startButton.disabled = true; (and re-enable in loadPassages's finally block)
        return; // Or try to call loadPassages again, but current setup calls resetGame from loadPassages
    }
    // If resetGame was already called by loadPassages, this might re-pick a passage.
    // For simplicity, we'll let it. Or, we could have a flag like `initialGameLoaded`.
    resetGame(); // This ensures a fresh passage if start button is clicked.
    typingInput.focus();
    console.log("Game ready. Start typing!");
}

function handleTypingInput() {
    if (typingInput.disabled) return;

    const typedText = typingInput.value;

    if (!gameActive && typedText.length > 0) {
        gameActive = true;
        startTimer();
        startButton.disabled = true;
    }

    if (!gameActive || currentCharIndex >= currentPassageText.length) {
        if (currentCharIndex >= currentPassageText.length) {
            typingInput.value = '';
        }
        return;
    }

    const lastTypedChar = typedText.slice(-1);
    const expectedChar = currentPassageText[currentCharIndex];
    const charSpan = passageCharsSpans[currentCharIndex];

    charSpan.classList.remove('current');
    typedCharCount++;

    if (lastTypedChar === expectedChar) {
        charSpan.classList.remove('incorrect');
        charSpan.classList.add('correct');
        passageContainer.classList.remove('shake-error');
        correctCharCount++;
        currentCharIndex++;
    } else {
        charSpan.classList.remove('correct');
        charSpan.classList.add('incorrect');
        mistakeCount++;

        if (!passageContainer.classList.contains('shake-error')) {
            passageContainer.classList.add('shake-error');
            setTimeout(() => {
                passageContainer.classList.remove('shake-error');
            }, 300);
        }
        currentCharIndex++;
    }

    if (currentCharIndex < currentPassageText.length) {
        passageCharsSpans[currentCharIndex].classList.add('current');
    } else if (currentCharIndex >= currentPassageText.length && gameActive) {
        endGame();
    }

    typingInput.value = '';
    updateLiveHUD();
}

function startTimer() {
    startTime = new Date();
    timerInterval = setInterval(() => {
        if (!gameActive) {
            clearInterval(timerInterval);
            return;
        }
        const elapsedTimeSeconds = Math.floor((new Date() - startTime) / 1000);
        timerDisplay.textContent = `${elapsedTimeSeconds}s`;

        if (correctCharCount > 0) {
            const minutes = elapsedTimeSeconds / 60;
            if (minutes > 0) {
                const grossWPM = Math.round((correctCharCount / 5) / minutes);
                wpmDisplay.textContent = grossWPM;
            } else {
                wpmDisplay.textContent = '0';
            }
        }
    }, 1000);
}

function updateLiveHUD() {
    if (typedCharCount > 0) {
        const accuracy = Math.round((correctCharCount / typedCharCount) * 100);
        accuracyDisplay.textContent = `${accuracy}`;
    } else {
        accuracyDisplay.textContent = '0';
    }
}

function endGame() {
    if (!gameActive) return;

    console.log("Game ended!");
    clearInterval(timerInterval);
    gameActive = false;
    typingInput.disabled = true;
    passageContainer.classList.remove('shake-error');

    const endTime = new Date();
    const timeTakenSeconds = (endTime - startTime) / 1000;
    const timeTakenMinutes = timeTakenSeconds / 60;

    let finalWPM = 0;
    if (timeTakenMinutes > 0 && correctCharCount > 0) {
        finalWPM = Math.round((correctCharCount / 5) / timeTakenMinutes);
    }
    wpmDisplay.textContent = finalWPM;

    let finalAccuracy = 0;
    if (typedCharCount > 0) {
         finalAccuracy = Math.round((correctCharCount / typedCharCount) * 100);
    }
    accuracyDisplay.textContent = `${Math.max(0, finalAccuracy)}`;

    timerDisplay.textContent = `${timeTakenSeconds.toFixed(2)}s`;

    startButton.textContent = "Play Again?";
    startButton.disabled = false;
}

// --- Event Listeners ---
startButton.addEventListener('click', startGameProcedure);
typingInput.addEventListener('input', handleTypingInput);

// --- Initial Setup ---
// Call loadPassages to fetch JSON, which will then call resetGame.
loadPassages();
// The initial console log for "TypeStorm Initialized" might be better placed inside the 'finally' block of loadPassages
// or after resetGame is successfully called if you want to ensure the UI is ready.
// For now, it's fine here, just know that the game might not be fully "ready" until passages load.
console.log("TypeStorm initializing, loading passages...");