// --- DOM Elements ---
const passageDisplay = document.getElementById('passage-display');
const typingInput = document.getElementById('typing-input');
const startButton = document.getElementById('start-button');
const wpmDisplay = document.getElementById('wpm-display');
const accuracyDisplay = document.getElementById('accuracy-display');
const timerDisplay = document.getElementById('timer-display');
const passageContainer = document.getElementById('passage-container');
const progressBarFill = document.getElementById('progress-bar-fill');
const botModeButton = document.getElementById('bot-mode-button'); // ADDED: Bot Mode Button

// --- Passages Data ---
let allPassages = [];
let passagesLoaded = false;

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
let botActive = false;      // ADDED: Bot active state
let botTimeoutId;         // ADDED: Bot timer ID

// --- Configuration ---
const CHARS_PER_WORD = 5; // Standard for WPM calculation
const BOT_TYPING_INTERVAL_MS = 50; // Milliseconds between bot key presses

// --- Function to load passages from JSON ---
async function loadPassages() {
    try {
        const response = await fetch('texts.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, Message: ${response.statusText}`);
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && data[0].text !== undefined) {
            allPassages = data.map(item => item.text);
        } else {
            console.error("texts.json is not in the expected format (array of objects with 'text' property).");
            allPassages = ["Error: Invalid passage data format. Using default."];
        }
        if (allPassages.length === 0) {
            allPassages = ["Error: Could not load passages. Using default."];
        }
        passagesLoaded = true;
        console.log("Passages loaded:", allPassages.length, "passages found.");
    } catch (error) {
        console.error("Could not load passages from texts.json:", error);
        passageDisplay.innerText = "Error loading passages. Please try refreshing. Using a default passage for now.";
        allPassages = ["Failed to load passages. Check texts.json. This is a default passage to allow testing."];
        passagesLoaded = true;
    } finally {
        resetGame(); // Initialize with a passage even on error
    }
}

// --- Function to update progress bar ---
function updateProgressBar() {
    if (!currentPassageText || currentPassageText.length === 0 || !progressBarFill) {
        if(progressBarFill) progressBarFill.style.width = '0%';
        return;
    }
    const progressIndex = Math.min(currentCharIndex, currentPassageText.length);
    const progressPercent = (progressIndex / currentPassageText.length) * 100;
    progressBarFill.style.width = `${progressPercent}%`;
}

// --- Core Functions ---

function getRandomPassage() {
    if (!passagesLoaded || allPassages.length === 0) {
        return "Error: Passages not available. Please ensure texts.json is loaded correctly.";
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
    if (timerInterval) clearInterval(timerInterval);
    if (botActive) {
        deactivateBotMode(true); // Pass true as it's part of a reset
    }
    gameActive = false; // Ensure game is marked inactive before setup

    passageContainer.classList.remove('shake-error');

    currentPassageText = getRandomPassage();
    formatPassageForDisplay(currentPassageText);
    updateProgressBar();

    currentCharIndex = 0;
    typedCharCount = 0;
    correctCharCount = 0;
    mistakeCount = 0;
    startTime = null;

    typingInput.value = '';
    typingInput.disabled = false;
    typingInput.focus(); // Focus input on reset

    wpmDisplay.textContent = '0';
    accuracyDisplay.textContent = '0';
    timerDisplay.textContent = '0s';

    startButton.textContent = "Start New Test";
    startButton.disabled = false;
    if (botModeButton) {
        botModeButton.textContent = "Activate Bot";
        botModeButton.disabled = false;
    }

    passageCharsSpans.forEach(span => span.classList.remove('current', 'incorrect', 'correct'));
    if (passageCharsSpans.length > 0) {
        passageCharsSpans[0].classList.add('current');
    }
}

function startGameProcedure() {
    if (!passagesLoaded) {
        console.log("Passages still loading...");
        // Optionally, disable start button until passagesLoaded is true
        return;
    }
    resetGame(); // This will also focus the input
    console.log("Game ready. Start typing!");
}

// --- NEW: Centralized Character Processing Logic ---
function processTypedCharacter(typedChar) {
    // This function should only be called if gameActive is true and currentCharIndex is valid.
    // The calling functions (handleTypingInput, botTypeNextCharacter) ensure this.

    const expectedChar = currentPassageText[currentCharIndex];
    const charSpan = passageCharsSpans[currentCharIndex];

    charSpan.classList.remove('current');
    typedCharCount++;

    if (typedChar === expectedChar) {
        charSpan.classList.remove('incorrect');
        charSpan.classList.add('correct');
        passageContainer.classList.remove('shake-error');
        correctCharCount++;
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
    }
    currentCharIndex++;
    updateProgressBar();

    if (currentCharIndex < currentPassageText.length) {
        passageCharsSpans[currentCharIndex].classList.add('current');
    } else if (currentCharIndex >= currentPassageText.length) { // Game ends when passage is complete
        endGame();
    }

    updateLiveHUD();
}

function handleTypingInput() {
    if (typingInput.disabled || botActive) return; // Do not process user input if disabled or bot is active

    const typedText = typingInput.value;

    if (!gameActive && typedText.length > 0) {
        gameActive = true;
        startTimer();
        startButton.disabled = true;
        if (botModeButton) botModeButton.disabled = true;
    }

    if (!gameActive || currentCharIndex >= currentPassageText.length) {
        // If game not active or passage already completed, clear input and return
        if (currentCharIndex >= currentPassageText.length) {
             typingInput.value = '';
        }
        return;
    }

    const lastTypedChar = typedText.slice(-1);
    if (lastTypedChar) {
        processTypedCharacter(lastTypedChar);
    }

    typingInput.value = ''; // Clear input for next char, enforcing single char processing
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
                const grossWPM = Math.round((correctCharCount / CHARS_PER_WORD) / minutes);
                wpmDisplay.textContent = grossWPM;
            } else {
                wpmDisplay.textContent = '0'; // Or calculate based on partial minute for faster feedback
            }
        } else if (elapsedTimeSeconds > 0) { // Time passed but no correct chars
            wpmDisplay.textContent = '0';
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
    if (!gameActive) return; // Prevent multiple calls if already ended

    console.log("Game ended!");
    clearInterval(timerInterval);
    passageContainer.classList.remove('shake-error');
    updateProgressBar(); // Ensure progress bar is full

    const endTime = new Date();
    const timeTakenSeconds = startTime ? (endTime - startTime) / 1000 : 0;
    const timeTakenMinutes = timeTakenSeconds / 60;

    let finalWPM = 0;
    if (timeTakenMinutes > 0 && correctCharCount > 0) {
        finalWPM = Math.round((correctCharCount / CHARS_PER_WORD) / timeTakenMinutes);
    }
    wpmDisplay.textContent = finalWPM;

    let finalAccuracy = 0;
    if (typedCharCount > 0) {
         finalAccuracy = Math.round((correctCharCount / typedCharCount) * 100);
    }
    accuracyDisplay.textContent = `${Math.max(0, finalAccuracy)}`;
    timerDisplay.textContent = `${timeTakenSeconds.toFixed(2)}s`;

    // UI updates for game end state
    typingInput.disabled = true;
    startButton.textContent = "Play Again?";
    startButton.disabled = false;

    if (botModeButton) {
        botModeButton.textContent = "Activate Bot";
        botModeButton.disabled = false;
    }

    if (botActive) {
        deactivateBotMode(true); // Game ended, ensure bot is fully deactivated
    }

    gameActive = false; // Set gameActive to false AFTER all cleanup
}

// --- NEW: Bot Mode Functions ---
function activateBotMode() {
    if (gameActive || botActive) return; // Don't start if a game or bot is already active

    resetGame(); // Prepare a fresh game state (this also focuses input, but we'll disable it)

    gameActive = true; // Mark game as active for timer and logic
    botActive = true;
    typingInput.disabled = true; // User cannot type
    startButton.disabled = true;
    if (botModeButton) {
        botModeButton.textContent = "Bot Running...";
        botModeButton.disabled = true;
    }

    console.log("Bot mode activated.");
    startTimer(); // Start the main game timer for the bot
    botTypeNextCharacter();
}

function botTypeNextCharacter() {
    if (!botActive || !gameActive || currentCharIndex >= currentPassageText.length) {
        // Stop conditions: bot manually deactivated, game ended by other means, or passage completed
        // If passage completed, processTypedCharacter would have called endGame, which handles bot deactivation.
        // This is a safeguard.
        if (botActive && !gameActive) { // Game ended, bot needs to clean up its own state if not done by endGame
             deactivateBotMode(false); // Not part of reset/end, so allow UI updates
        }
        return;
    }

    const charToType = currentPassageText[currentCharIndex];
    // Directly call processTypedCharacter - bot is always "correct" for this demonstration
    // No need to simulate input field value for the bot
    processTypedCharacter(charToType);

    // If game is still active and bot should continue (passage not yet complete)
    if (gameActive && botActive && currentCharIndex < currentPassageText.length) {
        botTimeoutId = setTimeout(botTypeNextCharacter, BOT_TYPING_INTERVAL_MS);
    }
    // If the passage got completed by the last processTypedCharacter, endGame would have been called.
}

function deactivateBotMode(calledFromResetOrEnd = false) {
    if (botTimeoutId) clearTimeout(botTimeoutId);
    botActive = false;

    // Only adjust UI if not part of a full resetGame or endGame flow,
    // as those functions will handle most button states.
    // This primarily handles the bot button's text if bot is stopped independently.
    if (!calledFromResetOrEnd && botModeButton) {
        botModeButton.textContent = "Activate Bot";
        // Enable bot button only if no game is active.
        // If a game IS active (user somehow took over), it remains disabled.
        botModeButton.disabled = gameActive;
    }
    if (!calledFromResetOrEnd && !gameActive) {
        // If bot is deactivated and no game is active, ensure typing input is enabled
        typingInput.disabled = false;
        startButton.disabled = false;
    }
    console.log("Bot mode deactivated.");
}

// --- Event Listeners ---
startButton.addEventListener('click', startGameProcedure);
typingInput.addEventListener('input', handleTypingInput);
if (botModeButton) {
    botModeButton.addEventListener('click', activateBotMode);
}

// --- Initialization ---
loadPassages();
console.log("TypeStorm initializing, loading passages...");