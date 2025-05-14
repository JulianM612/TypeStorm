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

// Modal DOM Elements
const resultsModal = document.getElementById('results-modal');
const modalCloseButton = document.querySelector('.modal-close-button');
const modalPlayAgainButton = document.getElementById('modal-play-again-button');
const modalWpmDisplay = document.getElementById('modal-wpm');
const modalAccuracyDisplay = document.getElementById('modal-accuracy');
const modalTimeDisplay = document.getElementById('modal-time');
const modalGrossWpmDisplay = document.getElementById('modal-gross-wpm');
const modalCharsDisplay = document.getElementById('modal-chars');
const modalErrorsDisplay = document.getElementById('modal-errors');

// --- ADDED: DOM Element Checks ---
console.log("--- DOM Element Checks ---");
console.log("passageDisplay:", passageDisplay);
console.log("typingInput:", typingInput);
console.log("startButton:", startButton);
console.log("wpmDisplay:", wpmDisplay);
console.log("accuracyDisplay:", accuracyDisplay);
console.log("timerDisplay:", timerDisplay);
console.log("passageContainer:", passageContainer);
console.log("progressBarFill:", progressBarFill);
console.log("botModeButton:", botModeButton);
console.log("resultsModal:", resultsModal);
console.log("modalCloseButton:", modalCloseButton);
console.log("modalPlayAgainButton:", modalPlayAgainButton);
// Add any other critical elements you select by ID here
console.log("--- End DOM Element Checks ---");


// --- Passages Data ---
let defaultFallbackPassage = "The quick brown fox jumps over the lazy dog. This is a default passage if the API fails to load. Please check your internet connection or try again later.";
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
const API_NINJAS_URL = 'https://api.api-ninjas.com/v1/quotes';
const API_NINJAS_KEY = 'k3SjrLZIe88JPoDPvrFbRQ==NiXjNzu4cbJktQ5C'; // <<< REPLACE WITH YOUR ACTUAL API KEY

// --- Function to load passages from API-Ninjas ---
async function loadPassageFromAPI() {
    console.log("0. loadPassageFromAPI started."); // LOG 0

    // Check if critical elements for this function exist before using them
    if (!passageDisplay || !typingInput || !startButton) {
        console.error("CRITICAL ERROR: One or more essential DOM elements (passageDisplay, typingInput, startButton) are null in loadPassageFromAPI. Halting further API load.");
        // Display a user-friendly error message on the page itself if possible
        if (passageDisplay) passageDisplay.innerHTML = '<em>Error: UI elements missing. Cannot load passage.</em>';
        else console.error("passageDisplay itself is null, cannot update UI with error.");
        // Attempt to re-enable start button if it exists, so user can try again after fixing HTML/JS
        if(startButton) startButton.disabled = false;
        if(botModeButton) botModeButton.disabled = false; // Also re-enable bot button if it exists
        return defaultFallbackPassage; // Return fallback to allow some game state resolution
    }

    passageDisplay.innerHTML = '<em>Loading new passage...</em>';
    typingInput.disabled = true;
    startButton.disabled = true;
    if(botModeButton) botModeButton.disabled = true;

    console.log("0.5. Past initial DOM manipulations in loadPassageFromAPI."); // LOG 0.5

    if (API_NINJAS_KEY === 'YOUR_API_KEY' || !API_NINJAS_KEY) {
        console.error("1. API Key for API-Ninjas is not set."); // LOG 1
        passageDisplay.innerText = "API Key not configured. Using a default passage.";
        await new Promise(resolve => setTimeout(resolve, 2000));
        // The finally block will handle re-enabling inputs and setting passagesLoaded
        return defaultFallbackPassage; // Ensure this path leads to finally
    }

    try {
        console.log("2. Attempting to fetch from API-Ninjas..."); // LOG 2
        const response = await fetch(API_NINJAS_URL, {
            method: 'GET',
            headers: { 'X-Api-Key': API_NINJAS_KEY }
        });
        console.log("3. Fetch response received. Status:", response.status); // LOG 3

        if (!response.ok) {
            let errorDetails = `API error! status: ${response.status}, Message: ${response.statusText}`;
            console.log("4a. Response not OK. Attempting to parse error JSON.", errorDetails); // LOG 4a
            try {
                const errorData = await response.json();
                console.log("4b. Parsed error JSON:", errorData); // LOG 4b
                if (errorData && errorData.error) { errorDetails += ` - ${errorData.error}`; }
                else if (errorData && errorData.message) { errorDetails += ` - ${errorData.message}`; }
            } catch (e) {
                console.error("4c. Could not parse error JSON:", e); // LOG 4c
            }
            throw new Error(errorDetails);
        }

        console.log("5. Response OK. Attempting to parse success JSON."); // LOG 5
        const data = await response.json();
        console.log("6. Parsed success JSON:", data); // LOG 6

        if (Array.isArray(data) && data.length > 0 && data[0].quote) {
            const passageText = data[0].quote.trim();
            if (passageText.length === 0) {
                console.error("7a. API returned an empty quote string."); // LOG 7a
                throw new Error("API returned an empty quote.");
            }
            console.log("7b. Passage loaded successfully from API-Ninjas."); // LOG 7b
            return passageText.replace(/\s\s+/g, ' ');
        } else {
            console.error("8. API response not in expected format or empty quote content. Data:", data); // LOG 8
            throw new Error("API response not in expected format or empty quote content.");
        }
    } catch (error) {
        console.error("9. CATCH BLOCK: Could not load passage from API-Ninjas:", error.message); // LOG 9 - Log error.message for clarity
        if (passageDisplay) passageDisplay.innerText = "Error loading passage. Using a default one.";
        await new Promise(resolve => setTimeout(resolve, 1500));
        return defaultFallbackPassage;
    } finally {
        console.log("10. FINALLY BLOCK: Setting passagesLoaded, re-enabling inputs."); // LOG 10
        passagesLoaded = true;
        if (typingInput) typingInput.disabled = false;
        if (startButton) startButton.disabled = false;
        if(botModeButton) botModeButton.disabled = false;
        if (!gameActive && typingInput) {
             try { // Add try-catch for focus in case input becomes hidden/disabled by other logic
                typingInput.focus();
             } catch (e) {
                console.warn("Could not focus typingInput in finally block:", e);
             }
         }
        console.log("11. FINALLY BLOCK: End."); // LOG 11
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
    if (!passageDisplay) { console.error("formatPassageForDisplay: passageDisplay is null!"); return; }
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
    if (!gameActive || currentCharIndex >= passageCharsSpans.length || !passageDisplay || passageCharsSpans.length === 0) return;
    const currentSpan = passageCharsSpans[currentCharIndex];
    if (!currentSpan) return;
    const displayRect = passageDisplay.getBoundingClientRect();
    const spanRect = currentSpan.getBoundingClientRect();
    const targetOffsetFromTop = displayRect.height * 0.33;
    const desiredScrollTop = passageDisplay.scrollTop + (spanRect.top - displayRect.top) - targetOffsetFromTop;
    const currentSpanTopInDisplay = spanRect.top - displayRect.top;
    const buffer = spanRect.height * 0.5;
    if (currentSpanTopInDisplay > displayRect.height - spanRect.height - buffer || currentSpanTopInDisplay < buffer) {
        if (passageDisplay.scrollTo) {
            passageDisplay.scrollTo({ top: desiredScrollTop, behavior: 'smooth' });
        } else { passageDisplay.scrollTop = desiredScrollTop; }
    }
}

async function resetGame() {
    if (timerInterval) clearInterval(timerInterval);
    if (botActive) { deactivateBotMode(true); }
    gameActive = false;
    passagesLoaded = false; // Reset this before attempting to load
    if(passageContainer) passageContainer.classList.remove('shake-error'); // Check if passageContainer exists

    currentPassageText = await loadPassageFromAPI(); // This will now run its finally block
    
    formatPassageForDisplay(currentPassageText);
    updateProgressBar();

    currentCharIndex = 0;
    typedCharCount = 0;
    correctCharCount = 0;
    mistakeCount = 0;
    startTime = null;

    if(typingInput) typingInput.value = '';
    if(wpmDisplay) wpmDisplay.textContent = '0';
    if(accuracyDisplay) accuracyDisplay.textContent = '0';
    if(timerDisplay) timerDisplay.textContent = '0s';
    if(startButton) startButton.textContent = "Start New Test";

    if (passageCharsSpans.length > 0) {
        passageCharsSpans[0].classList.add('current');
    }
    scrollPassageDisplay(); // Initial scroll check
}

async function startGameProcedure() {
    await resetGame();
    if(typingInput && !typingInput.disabled) { // Check if input exists and is not disabled
        try {
            typingInput.focus();
        } catch (e) {
            console.warn("Could not focus typingInput in startGameProcedure:", e);
        }
    }
    console.log("Game ready. Start typing!");
}

function processTypedCharacter(typedChar, isBackspace = false) {
    // ... (rest of processTypedCharacter logic, no changes here for this debug step)
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
        if (charSpanToUndo.classList.contains('correct')) { correctCharCount--; }
        else if (charSpanToUndo.classList.contains('incorrect')) { mistakeCount--; }
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
            if(passageContainer) passageContainer.classList.remove('shake-error');
            correctCharCount++;
        } else {
            charSpan.classList.remove('correct');
            charSpan.classList.add('incorrect');
            mistakeCount++;
            if (passageContainer && !passageContainer.classList.contains('shake-error')) {
                passageContainer.classList.add('shake-error');
                setTimeout(() => { if(passageContainer) passageContainer.classList.remove('shake-error'); }, 300);
            }
        }
        currentCharIndex++;
        if (currentCharIndex < currentPassageText.length) {
            passageCharsSpans[currentCharIndex].classList.add('current');
        } else if (currentCharIndex >= currentPassageText.length) { endGame(); }
    }
    updateProgressBar();
    updateLiveHUD();
    scrollPassageDisplay();
}

function handleKeyDown(event) {
    // ... (rest of handleKeyDown logic, no changes here for this debug step)
    if (typingInput && typingInput.disabled || botActive) return; // Check typingInput existence
    if (event.key === "Tab" || event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta") return;
    if (event.key !== "Backspace" && event.key.length > 1) return;
    if (!gameActive && event.key !== "Backspace" && event.key.length === 1) {
        gameActive = true;
        startTimer();
        if(startButton) startButton.disabled = true;
        if (botModeButton) botModeButton.disabled = true;
    }
    if (!gameActive) return;
    if (event.key === "Backspace") {
        event.preventDefault();
        processTypedCharacter(null, true);
        if(typingInput) typingInput.value = '';
    } else if (event.key.length === 1 && currentCharIndex < currentPassageText.length) {
        event.preventDefault();
        processTypedCharacter(event.key, false);
        if(typingInput) typingInput.value = '';
    } else if (currentCharIndex >= currentPassageText.length && event.key !== "Backspace") {
        if(typingInput) typingInput.value = '';
        event.preventDefault();
    }
}

function startTimer() {
    // ... (rest of startTimer logic, no changes here for this debug step)
    startTime = new Date();
    timerInterval = setInterval(() => {
        if (!gameActive) { clearInterval(timerInterval); return; }
        const elapsedTimeSeconds = Math.floor((new Date() - startTime) / 1000);
        if(timerDisplay) timerDisplay.textContent = `${elapsedTimeSeconds}s`;
        if (correctCharCount > 0) {
            const minutes = elapsedTimeSeconds / 60;
            if (minutes > 0) {
                if(wpmDisplay) wpmDisplay.textContent = Math.round((correctCharCount / CHARS_PER_WORD) / minutes);
            } else {
                if (elapsedTimeSeconds > 0) {
                    if(wpmDisplay) wpmDisplay.textContent = Math.round((correctCharCount / CHARS_PER_WORD) / (elapsedTimeSeconds / 60));
                } else { if(wpmDisplay) wpmDisplay.textContent = '0'; }
            }
        } else if (elapsedTimeSeconds > 0) { if(wpmDisplay) wpmDisplay.textContent = '0'; }
    }, 1000);
}

function updateLiveHUD() {
    // ... (rest of updateLiveHUD logic, no changes here for this debug step)
    if (typedCharCount > 0) {
        if(accuracyDisplay) accuracyDisplay.textContent = `${Math.max(0, Math.round((correctCharCount / typedCharCount) * 100))}`;
    } else { if(accuracyDisplay) accuracyDisplay.textContent = '0'; }
}


// --- Modal Functions ---
function openResultsModal() {
    // ... (rest of openResultsModal logic, no changes here for this debug step)
    if (!resultsModal) return;

    const finalNetWPM = wpmDisplay ? wpmDisplay.textContent : '0';
    const finalAccuracy = accuracyDisplay? accuracyDisplay.textContent : '0';
    const finalTime = timerDisplay ? timerDisplay.textContent : '0s';

    let grossWPM = 0;
    if (startTime) {
        const timeTakenSeconds = (new Date() - startTime) / 1000;
        const timeTakenMinutes = timeTakenSeconds / 60;
        if (timeTakenMinutes > 0 && typedCharCount > 0) {
            grossWPM = Math.round((typedCharCount / CHARS_PER_WORD) / timeTakenMinutes);
        } else if (typedCharCount > 0 && timeTakenSeconds > 0) {
             grossWPM = Math.round((typedCharCount / CHARS_PER_WORD) / (timeTakenSeconds/60));
        }
    }
    
    if(modalWpmDisplay) modalWpmDisplay.textContent = finalNetWPM;
    if(modalAccuracyDisplay) modalAccuracyDisplay.textContent = finalAccuracy; // HUD accuracy usually has '%'
    if(modalTimeDisplay) modalTimeDisplay.textContent = finalTime;
    if(modalGrossWpmDisplay) modalGrossWpmDisplay.textContent = grossWPM;
    if(modalCharsDisplay) modalCharsDisplay.textContent = `${correctCharCount}/${typedCharCount}`;
    if(modalErrorsDisplay) modalErrorsDisplay.textContent = mistakeCount;

    resultsModal.style.display = 'flex';
    setTimeout(() => {
        resultsModal.classList.add('active');
    }, 10);
}

function closeResultsModal() {
    // ... (rest of closeResultsModal logic, no changes here for this debug step)
    if (!resultsModal) return;
    resultsModal.classList.remove('active');
}

function endGame() {
    // ... (rest of endGame logic, no changes here for this debug step)
    if (!gameActive) return;
    console.log("Game ended!");
    clearInterval(timerInterval);
    if(passageContainer) passageContainer.classList.remove('shake-error');
    updateProgressBar();
    const endTime = new Date();
    const timeTakenSeconds = startTime ? (endTime - startTime) / 1000 : 0;
    const timeTakenMinutes = timeTakenSeconds / 60;
    let finalNetWPM = 0;
    if (timeTakenMinutes > 0 && correctCharCount > 0) {
        finalNetWPM = Math.round((correctCharCount / CHARS_PER_WORD) / timeTakenMinutes);
    } else if (correctCharCount > 0 && timeTakenSeconds > 0) {
        finalNetWPM = Math.round((correctCharCount / CHARS_PER_WORD) / (timeTakenSeconds/60));
    }
    if(wpmDisplay) wpmDisplay.textContent = finalNetWPM;
    let finalAccuracyVal = 0;
    if (typedCharCount > 0) { finalAccuracyVal = Math.round((correctCharCount / typedCharCount) * 100); }
    if(accuracyDisplay) accuracyDisplay.textContent = `${Math.max(0, finalAccuracyVal)}`;
    if(timerDisplay) timerDisplay.textContent = `${timeTakenSeconds.toFixed(2)}s`;
    if(typingInput) typingInput.disabled = true;
    if(startButton) {
        startButton.textContent = "Play Again?";
        startButton.disabled = false;
    }
    if (botModeButton) {
        botModeButton.textContent = "Activate Bot";
        botModeButton.disabled = false;
    }
    if (botActive) { deactivateBotMode(true); }
    gameActive = false;
    openResultsModal();
}


async function activateBotMode() {
    // ... (rest of activateBotMode logic, no changes here for this debug step)
    if (gameActive || botActive) return;
    await resetGame();
    gameActive = true;
    botActive = true;
    if(typingInput) typingInput.disabled = true;
    if(startButton) startButton.disabled = true;
    if (botModeButton) {
        botModeButton.textContent = "Bot Running...";
        botModeButton.disabled = true;
    }
    console.log("Bot mode activated.");
    startTimer();
    botTypeNextCharacter();
}

function botTypeNextCharacter() {
    // ... (rest of botTypeNextCharacter logic, no changes here for this debug step)
    if (!botActive || !gameActive || currentCharIndex >= currentPassageText.length) {
        if (botActive && !gameActive) { deactivateBotMode(false); }
        return;
    }
    const charToType = currentPassageText[currentCharIndex];
    processTypedCharacter(charToType, false);
    if (gameActive && botActive && currentCharIndex < currentPassageText.length) {
        botTimeoutId = setTimeout(botTypeNextCharacter, BOT_TYPING_INTERVAL_MS);
    }
}

function deactivateBotMode(calledFromResetOrEnd = false) {
    // ... (rest of deactivateBotMode logic, no changes here for this debug step)
    if (botTimeoutId) clearTimeout(botTimeoutId);
    botActive = false;
    if (!calledFromResetOrEnd && botModeButton) {
        botModeButton.textContent = "Activate Bot";
        botModeButton.disabled = gameActive;
    }
    if (!calledFromResetOrEnd && !gameActive) {
        if(typingInput) typingInput.disabled = false;
        if(startButton) startButton.disabled = false;
    }
    console.log("Bot mode deactivated.");
}

// --- Event Listeners ---
if(startButton) startButton.addEventListener('click', startGameProcedure);
if(typingInput) typingInput.addEventListener('keydown', handleKeyDown);

if (botModeButton) {
    botModeButton.addEventListener('click', activateBotMode);
}

if (modalCloseButton) {
    modalCloseButton.addEventListener('click', closeResultsModal);
}

if (modalPlayAgainButton) {
    modalPlayAgainButton.addEventListener('click', () => {
        closeResultsModal();
        startGameProcedure();
    });
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && resultsModal && resultsModal.classList.contains('active')) {
        closeResultsModal();
    }
});

if (resultsModal) {
    resultsModal.addEventListener('click', (event) => {
        if (event.target === resultsModal) {
            closeResultsModal();
        }
    });
}

// --- Initialization ---
startGameProcedure(); // This calls resetGame, which calls loadPassageFromAPI
console.log("TypeStorm initializing, setting up initial game..."); // This will run after startGameProcedure is called, but not necessarily after it completes