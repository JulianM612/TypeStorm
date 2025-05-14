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
let defaultFallbackPassage = "The quick brown fox jumps over the lazy dog. This is a default passage if the API fails to load. Please check your internet connection or try again later.";
let passagesLoaded = false; // Still useful to gate game start

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

// NEW API Configuration for API-Ninjas
const API_NINJAS_URL = 'https://api.api-ninjas.com/v1/quotes';
// IMPORTANT: Replace 'YOUR_API_KEY' with your actual API key
const API_NINJAS_KEY = 'k3SjrLZIe88JPoDPvrFbRQ==NiXjNzu4cbJktQ5C'; // <<< PUT YOUR KEY HERE


// --- Function to load passages from API-Ninjas ---
async function loadPassageFromAPI() {
    console.log("Fetching new passage from API-Ninjas...");
    passageDisplay.innerHTML = '<em>Loading new passage...</em>';
    typingInput.disabled = true;
    startButton.disabled = true;
    if(botModeButton) botModeButton.disabled = true;

    if (API_NINJAS_KEY === 'YOUR_API_KEY' || !API_NINJAS_KEY) {
        console.error("API Key for API-Ninjas is not set. Please update API_NINJAS_KEY in script.js.");
        passageDisplay.innerText = "API Key not configured. Using a default passage.";
        await new Promise(resolve => setTimeout(resolve, 2000));
        passagesLoaded = true; // Mark as loaded to allow game with fallback
        typingInput.disabled = false;
        startButton.disabled = false;
        if(botModeButton) botModeButton.disabled = false;
        if (!gameActive) typingInput.focus();
        return defaultFallbackPassage;
    }

    try {
        const response = await fetch(API_NINJAS_URL, {
            method: 'GET',
            headers: {
                'X-Api-Key': API_NINJAS_KEY
            }
        });

        if (!response.ok) {
            let errorDetails = `API error! status: ${response.status}, Message: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) { // API-Ninjas often returns { "error": "message" }
                    errorDetails += ` - ${errorData.error}`;
                } else if (errorData && errorData.message) { // Or sometimes just { "message": "..." }
                     errorDetails += ` - ${errorData.message}`;
                }
            } catch (e) { /* Ignore if error response isn't JSON */ }
            throw new Error(errorDetails);
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0 && data[0].quote) {
            const passageText = data[0].quote.trim();
            if (passageText.length === 0) {
                throw new Error("API returned an empty quote.");
            }
            console.log("Passage loaded from API-Ninjas, length:", passageText.length);
            return passageText.replace(/\s\s+/g, ' ');
        } else {
            throw new Error("API response not in expected format or empty quote content.");
        }
    } catch (error) {
        console.error("Could not load passage from API-Ninjas:", error);
        passageDisplay.innerText = "Error loading passage. Using a default one.";
        await new Promise(resolve => setTimeout(resolve, 1500));
        return defaultFallbackPassage;
    } finally {
        passagesLoaded = true;
        typingInput.disabled = false;
        startButton.disabled = false;
         if(botModeButton) botModeButton.disabled = false;
         if (!gameActive) typingInput.focus();
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
function formatPassageForDisplay(passageText) {
    passageDisplay.innerHTML = '';
    passageCharsSpans = [];
    const cleanPassageText = passageText.replace(/\n+/g, ' ');

    cleanPassageText.split('').forEach(char => {
        const charSpan = document.createElement('span');
        charSpan.innerText = char;
        passageDisplay.appendChild(charSpan);
        passageCharsSpans.push(charSpan);
    });

    if (passageCharsSpans.length > 0) {
        passageCharsSpans[0].classList.add('current');
    }
    passageDisplay.scrollTop = 0;
}

function scrollPassageDisplay() {
    if (!gameActive || currentCharIndex >= passageCharsSpans.length || !passageDisplay || passageCharsSpans.length === 0) {
        return;
    }

    const currentSpan = passageCharsSpans[currentCharIndex];
    if (!currentSpan) return;

    const displayRect = passageDisplay.getBoundingClientRect();
    const spanRect = currentSpan.getBoundingClientRect();
    const targetOffsetFromTop = displayRect.height * 0.33;
    const desiredScrollTop = passageDisplay.scrollTop + (spanRect.top - displayRect.top) - targetOffsetFromTop;
    const currentSpanTopInDisplay = spanRect.top - displayRect.top;
    const buffer = spanRect.height * 0.5;

    if (currentSpanTopInDisplay > displayRect.height - spanRect.height - buffer ||
        currentSpanTopInDisplay < buffer) {
        if (passageDisplay.scrollTo) {
            passageDisplay.scrollTo({ top: desiredScrollTop, behavior: 'smooth' });
        } else {
            passageDisplay.scrollTop = desiredScrollTop;
        }
    }
}

async function resetGame() {
    if (timerInterval) clearInterval(timerInterval);
    if (botActive) {
        deactivateBotMode(true);
    }
    gameActive = false;
    passagesLoaded = false;

    passageContainer.classList.remove('shake-error');
    
    currentPassageText = await loadPassageFromAPI();
    formatPassageForDisplay(currentPassageText);
    updateProgressBar();

    currentCharIndex = 0;
    typedCharCount = 0;
    correctCharCount = 0;
    mistakeCount = 0;
    startTime = null;

    typingInput.value = '';
    wpmDisplay.textContent = '0';
    accuracyDisplay.textContent = '0';
    timerDisplay.textContent = '0s';
    startButton.textContent = "Start New Test";

    if (passageCharsSpans.length > 0) {
        passageCharsSpans[0].classList.add('current');
    }
    scrollPassageDisplay(); // Initial scroll check
}

async function startGameProcedure() {
    await resetGame();
    typingInput.focus();
    console.log("Game ready. Start typing!");
}

function processTypedCharacter(typedChar, isBackspace = false) {
    if (isBackspace) {
        if (currentCharIndex === 0 || typedCharCount === 0) return;
        const previousCharSpan = passageCharsSpans[currentCharIndex -1];
        if (!previousCharSpan) return;
        if (currentCharIndex < currentPassageText.length) {
            passageCharsSpans[currentCharIndex]?.classList.remove('current');
        }
        currentCharIndex--;
        const charSpanToUndo = passageCharsSpans[currentCharIndex];
        typedCharCount--;
        if (charSpanToUndo.classList.contains('correct')) {
            correctCharCount--;
        } else if (charSpanToUndo.classList.contains('incorrect')) {
            mistakeCount--;
        }
        charSpanToUndo.classList.remove('correct', 'incorrect');
        charSpanToUndo.classList.add('current');
    } else {
        if (currentCharIndex >= currentPassageText.length) return;
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
        } else if (currentCharIndex >= currentPassageText.length) {
            endGame();
        }
    }

    updateProgressBar();
    updateLiveHUD();
    scrollPassageDisplay();
}

function handleKeyDown(event) {
    if (typingInput.disabled || botActive) return;
    if (event.key === "Tab" || event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta") {
        return;
    }
    if (event.key !== "Backspace" && event.key.length > 1) {
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
        event.preventDefault();
        processTypedCharacter(null, true);
        typingInput.value = '';
    } else if (event.key.length === 1 && currentCharIndex < currentPassageText.length) {
        event.preventDefault();
        processTypedCharacter(event.key, false);
        typingInput.value = '';
    } else if (currentCharIndex >= currentPassageText.length && event.key !== "Backspace") {
        typingInput.value = '';
        event.preventDefault();
    }
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
                if (elapsedTimeSeconds > 0) {
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
    } else if (correctCharCount > 0 && timeTakenSeconds > 0) {
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

async function activateBotMode() {
    if (gameActive || botActive) return;
    await resetGame();

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
    processTypedCharacter(charToType, false);
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
typingInput.addEventListener('keydown', handleKeyDown);
if (botModeButton) {
    botModeButton.addEventListener('click', activateBotMode);
}

// --- Initialization ---
startGameProcedure();
console.log("TypeStorm initializing, setting up initial game...");