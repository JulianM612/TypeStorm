// --- DOM Elements ---
const passageDisplay = document.getElementById('passage-display');
const typingInput = document.getElementById('typing-input');
const startButton = document.getElementById('start-button');
const wpmDisplay = document.getElementById('wpm-display');
const accuracyDisplay = document.getElementById('accuracy-display');
const timerDisplay = document.getElementById('timer-display');
const passageContainer = document.getElementById('passage-container');
const progressBarFill = document.getElementById('progress-bar-fill');
const botModeButton = document.getElementById('bot-mode-button');

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
let botActive = false;
let botTimeoutId;

// --- Configuration ---
const CHARS_PER_WORD = 5;
const BOT_TYPING_INTERVAL_MS = 50;

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
        resetGame();
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
        deactivateBotMode(true);
    }
    gameActive = false;

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
    typingInput.focus();

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
        return;
    }
    resetGame();
    console.log("Game ready. Start typing!");
}

function processTypedCharacter(typedChar, isBackspace = false) {
    if (isBackspace) {
        if (currentCharIndex === 0 || typedCharCount === 0) return; // Cannot backspace at the start or if no chars typed

        // If we are past the end (e.g. game ended, but backspace is somehow processed)
        // or if current char index is already at a valid position for backspacing.
        const previousCharSpan = passageCharsSpans[currentCharIndex -1];
        if (!previousCharSpan) return; // Should not happen if currentCharIndex > 0

        // Remove 'current' from the character we *were* at (or about to type)
        // This handles the case where currentCharIndex might be one ahead due to a previous type
        if (currentCharIndex < currentPassageText.length) {
            passageCharsSpans[currentCharIndex]?.classList.remove('current');
        }

        currentCharIndex--; // Move cursor back logically

        const charSpanToUndo = passageCharsSpans[currentCharIndex];
        typedCharCount--;

        if (charSpanToUndo.classList.contains('correct')) {
            correctCharCount--;
        } else if (charSpanToUndo.classList.contains('incorrect')) {
            mistakeCount--;
        }

        charSpanToUndo.classList.remove('correct', 'incorrect');
        charSpanToUndo.classList.add('current');

    } else { // Normal character typing
        if (currentCharIndex >= currentPassageText.length) return; // Already at the end

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

        if (currentCharIndex < currentPassageText.length) {
            passageCharsSpans[currentCharIndex].classList.add('current');
        } else if (currentCharIndex >= currentPassageText.length) { // Game ends when passage is complete
            endGame();
        }
    }

    updateProgressBar();
    updateLiveHUD();
}

function handleKeyDown(event) {
    if (typingInput.disabled || botActive) return;

    if (event.key === "Tab" || event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta") {
        return; // Allow modifier keys
    }

    // Prevent default for most other non-character keys if they are not handled
    if (event.key !== "Backspace" && event.key.length > 1) {
        // event.preventDefault(); // Optional: uncomment to block keys like ArrowUp, etc.
        return;
    }

    if (!gameActive && event.key !== "Backspace" && event.key.length === 1) {
        gameActive = true;
        startTimer();
        startButton.disabled = true;
        if (botModeButton) botModeButton.disabled = true;
    }

    if (!gameActive) return;

    if (event.key === "Backspace") {
        event.preventDefault(); // Prevent browser back navigation or input field deletion
        processTypedCharacter(null, true);
        typingInput.value = '';
    } else if (event.key.length === 1 && currentCharIndex < currentPassageText.length) {
        event.preventDefault(); // Prevent character from appearing in input, as we handle it
        processTypedCharacter(event.key, false);
        typingInput.value = '';
    } else if (currentCharIndex >= currentPassageText.length && event.key !== "Backspace") {
        // At the end of the passage, only allow backspace or do nothing for other keys
        typingInput.value = '';
        event.preventDefault();
    }
    // If game is over and they hit backspace, processTypedCharacter handles it
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
                 // For very short times, calculate WPM based on typed chars
                if (elapsedTimeSeconds > 0) { // Avoid division by zero
                    const wpm_interim = Math.round((correctCharCount / CHARS_PER_WORD) / (elapsedTimeSeconds / 60));
                    wpmDisplay.textContent = wpm_interim;
                } else {
                    wpmDisplay.textContent = '0';
                }
            }
        } else if (elapsedTimeSeconds > 0) {
            wpmDisplay.textContent = '0';
        }
    }, 1000);
}

function updateLiveHUD() {
    if (typedCharCount > 0) {
        const accuracy = Math.round((correctCharCount / typedCharCount) * 100);
        accuracyDisplay.textContent = `${Math.max(0, accuracy)}`;
    } else {
        accuracyDisplay.textContent = '0';
    }
}

function endGame() {
    if (!gameActive) return;

    console.log("Game ended!");
    clearInterval(timerInterval);
    passageContainer.classList.remove('shake-error');
    updateProgressBar();

    const endTime = new Date();
    const timeTakenSeconds = startTime ? (endTime - startTime) / 1000 : 0;
    const timeTakenMinutes = timeTakenSeconds / 60;

    let finalWPM = 0;
    if (timeTakenMinutes > 0 && correctCharCount > 0) {
        finalWPM = Math.round((correctCharCount / CHARS_PER_WORD) / timeTakenMinutes);
    } else if (correctCharCount > 0 && timeTakenSeconds > 0) { // Handle cases less than a minute
        finalWPM = Math.round((correctCharCount / CHARS_PER_WORD) / (timeTakenSeconds/60));
    }
    wpmDisplay.textContent = finalWPM;


    let finalAccuracy = 0;
    if (typedCharCount > 0) {
         finalAccuracy = Math.round((correctCharCount / typedCharCount) * 100);
    }
    accuracyDisplay.textContent = `${Math.max(0, finalAccuracy)}`;
    timerDisplay.textContent = `${timeTakenSeconds.toFixed(2)}s`;

    typingInput.disabled = true;
    startButton.textContent = "Play Again?";
    startButton.disabled = false;

    if (botModeButton) {
        botModeButton.textContent = "Activate Bot";
        botModeButton.disabled = false;
    }

    if (botActive) {
        deactivateBotMode(true);
    }

    gameActive = false;
}

// --- Bot Mode Functions ---
function activateBotMode() {
    if (gameActive || botActive) return;

    resetGame();

    gameActive = true;
    botActive = true;
    typingInput.disabled = true;
    startButton.disabled = true;
    if (botModeButton) {
        botModeButton.textContent = "Bot Running...";
        botModeButton.disabled = true;
    }

    console.log("Bot mode activated.");
    startTimer();
    botTypeNextCharacter();
}

function botTypeNextCharacter() {
    if (!botActive || !gameActive || currentCharIndex >= currentPassageText.length) {
        if (botActive && !gameActive) {
             deactivateBotMode(false);
        }
        return;
    }

    const charToType = currentPassageText[currentCharIndex];
    processTypedCharacter(charToType, false); // Bot types normally, no backspace

    if (gameActive && botActive && currentCharIndex < currentPassageText.length) {
        botTimeoutId = setTimeout(botTypeNextCharacter, BOT_TYPING_INTERVAL_MS);
    }
}

function deactivateBotMode(calledFromResetOrEnd = false) {
    if (botTimeoutId) clearTimeout(botTimeoutId);
    botActive = false;

    if (!calledFromResetOrEnd && botModeButton) {
        botModeButton.textContent = "Activate Bot";
        botModeButton.disabled = gameActive;
    }
    if (!calledFromResetOrEnd && !gameActive) {
        typingInput.disabled = false;
        startButton.disabled = false;
    }
    console.log("Bot mode deactivated.");
}

// --- Event Listeners ---
startButton.addEventListener('click', startGameProcedure);
typingInput.addEventListener('keydown', handleKeyDown); // CHANGED to keydown
if (botModeButton) {
    botModeButton.addEventListener('click', activateBotMode);
}

// --- Initialization ---
loadPassages();
console.log("TypeStorm initializing, loading passages...");