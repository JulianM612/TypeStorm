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

// NEW: Countdown Elements
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownMessage = document.getElementById('countdown-message');

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
// ... (other checks remain the same)
console.log("countdownOverlay:", countdownOverlay);
console.log("countdownMessage:", countdownMessage);
console.log("--- End DOM Element Checks ---");


// --- Passages Data ---
let defaultFallbackPassage = "The quick brown fox jumps over the lazy dog. This is a default passage if the API fails to load. Please check your internet connection or try again later.";
let passagesLoaded = false;

// --- Game State Variables ---
let currentPassageText = "";
let passageCharsSpans = []; 
let passageWords = [];    
let currentCharIndex = 0;
let typedCharCount = 0;
let correctCharCount = 0;
let mistakeCount = 0;
let startTime;
let timerInterval;
let gameActive = false;
let botActive = false;
let botTimeoutId;
let countdownInProgress = false; // NEW: Flag for countdown state


// --- Configuration ---
const CHARS_PER_WORD = 5;
const BOT_TYPING_INTERVAL_MS = 50;
const COUNTDOWN_SECONDS = 3; // NEW: Countdown duration
const API_NINJAS_URL = 'https://api.api-ninjas.com/v1/quotes';
const API_NINJAS_KEY = 'k3SjrLZIe88JPoDPvrFbRQ==NiXjNzu4cbJktQ5C'; 

// --- Function to load passages from API-Ninjas ---
async function loadPassageFromAPI() {
    console.log("0. loadPassageFromAPI started."); 
    if (!passageDisplay || !typingInput || !startButton) {
        console.error("CRITICAL ERROR: One or more essential DOM elements are null.");
        if (passageDisplay) passageDisplay.innerHTML = '<div class="loader-container"><em>Error: UI elements missing.</em></div>';
        if(startButton) startButton.disabled = false;
        if(botModeButton) botModeButton.disabled = false;
        return defaultFallbackPassage;
    }
    passageDisplay.innerHTML = '<div class="loader-container"><div class="loader"></div><em>Loading new passage...</em></div>';
    passageDisplay.style.justifyContent = 'center'; 
    passageDisplay.style.alignItems = 'center';
    typingInput.disabled = true;
    startButton.disabled = true;
    if(botModeButton) botModeButton.disabled = true;
    if (API_NINJAS_KEY === 'YOUR_API_KEY' || !API_NINJAS_KEY) {
        console.error("1. API Key for API-Ninjas is not set.");
        passageDisplay.innerHTML = '<div class="loader-container"><em>API Key not configured. Using default.</em></div>';
        await new Promise(resolve => setTimeout(resolve, 2000));
        return defaultFallbackPassage;
    }
    try {
        const response = await fetch(API_NINJAS_URL, { headers: { 'X-Api-Key': API_NINJAS_KEY }});
        if (!response.ok) throw new Error(`API error! status: ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && data[0].quote) {
            const passageText = data[0].quote.trim().replace(/\s\s+/g, ' ');
            if (passageText.length === 0) throw new Error("API returned an empty quote.");
            console.log("DEBUG: Processed passageText:", `"${passageText}"`);
            return passageText;
        } else {
            throw new Error("API response not in expected format or empty quote.");
        }
    } catch (error) {
        console.error("9. CATCH BLOCK: Could not load passage from API-Ninjas:", error.message);
        if (passageDisplay) passageDisplay.innerHTML = '<div class="loader-container"><em>Error loading passage. Using default.</em></div>';
        await new Promise(resolve => setTimeout(resolve, 1500));
        return defaultFallbackPassage;
    } finally {
        passagesLoaded = true;
        // Buttons and input enabling will be handled after countdown or if no countdown
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
    passageDisplay.style.justifyContent = 'flex-start'; 
    passageDisplay.style.alignItems = 'flex-start';   
    passageCharsSpans = []; 
    passageWords = []; 
    const cleanPassageText = passageText; 
    console.log("DEBUG: Text for formatPassageForDisplay:", `"${cleanPassageText}"`);
    const words = cleanPassageText.split(/(\s+)/); 
    words.forEach(wordOrSpace => {
        if (wordOrSpace.match(/\s+/)) { 
            const spaceSpan = document.createElement('span');
            spaceSpan.classList.add('passage-space'); 
            spaceSpan.innerHTML = wordOrSpace.replace(/ /g, ' '); 
            passageDisplay.appendChild(spaceSpan);
            wordOrSpace.split('').forEach(spaceChar => {
                passageCharsSpans.push(spaceSpan); 
            });
        } else if (wordOrSpace.length > 0) { 
            const wordSpanContainer = document.createElement('span'); 
            wordSpanContainer.classList.add('passage-word');
            passageDisplay.appendChild(wordSpanContainer);
            passageWords.push(wordSpanContainer);
            wordOrSpace.split('').forEach(char => {
                const charSpan = document.createElement('span');
                charSpan.innerText = char;
                wordSpanContainer.appendChild(charSpan); 
                passageCharsSpans.push(charSpan); 
            });
        }
    });
    if (passageCharsSpans.length > 0 && passageCharsSpans[0] && passageCharsSpans[0].classList) { 
        passageCharsSpans[0].classList.add('current');
    }
    passageDisplay.scrollTop = 0;
}


function scrollPassageDisplay() {
    if (!gameActive || currentCharIndex >= passageCharsSpans.length || !passageDisplay || passageCharsSpans.length === 0) return;
    const currentActualSpan = passageCharsSpans[currentCharIndex];
    if (!currentActualSpan) { return; }
    const displayRect = passageDisplay.getBoundingClientRect();
    const spanRect = currentActualSpan.getBoundingClientRect(); 
    const targetOffsetFromTop = displayRect.height * 0.33; 
    const desiredScrollTop = passageDisplay.scrollTop + (spanRect.top - displayRect.top) - targetOffsetFromTop;
    const currentSpanTopInDisplay = spanRect.top - displayRect.top; 
    const buffer = spanRect.height * 0.5; 
    if (currentSpanTopInDisplay > (displayRect.height - spanRect.height - buffer) || currentSpanTopInDisplay < buffer) {
        if (passageDisplay.scrollTo) passageDisplay.scrollTo({ top: desiredScrollTop, behavior: 'smooth' });
        else passageDisplay.scrollTop = desiredScrollTop; 
    }
}

async function resetGame(doCountdown = true) { // MODIFIED: Added doCountdown parameter
    if (timerInterval) clearInterval(timerInterval);
    if (botActive) deactivateBotMode(true); 
    gameActive = false;
    countdownInProgress = false; // Reset countdown flag
    passagesLoaded = false; 
    if(passageContainer) passageContainer.classList.remove('shake-error'); 
    if(countdownOverlay) countdownOverlay.style.display = 'none'; // Hide countdown initially

    // Ensure input is disabled before loading, buttons might be enabled later by startGameProcedure
    if(typingInput) typingInput.disabled = true;


    currentPassageText = await loadPassageFromAPI(); 
    formatPassageForDisplay(currentPassageText);
    updateProgressBar();

    currentCharIndex = 0;
    typedCharCount = 0;
    correctCharCount = 0;
    mistakeCount = 0;
    startTime = null;

    if(typingInput) typingInput.value = '';
    if(wpmDisplay) wpmDisplay.textContent = '0';
    if(accuracyDisplay) accuracyDisplay.textContent = '0'; // No % here, added in HTML
    if(timerDisplay) timerDisplay.textContent = '0s';
    if(startButton) {
        startButton.textContent = "Start New Test";
        startButton.disabled = false; // Re-enable start button after reset finishes
    }
     if(botModeButton) {
        botModeButton.textContent = "Activate Bot";
        botModeButton.disabled = false; // Re-enable bot button
    }


    if (passageCharsSpans.length > 0 && passageCharsSpans[0] && passageCharsSpans[0].classList) { 
        passageCharsSpans[0].classList.add('current');
    }
    scrollPassageDisplay(); 

    // If not doing a countdown, enable input immediately
    if (!doCountdown) {
        if(typingInput) typingInput.disabled = false;
        if (typingInput && !botActive) { // Only focus if not in bot mode setup
            try { typingInput.focus(); } catch (e) { console.warn("Focus failed in resetGame (no countdown)"); }
        }
    }
}

// NEW: Countdown Function
function startCountdown() {
    return new Promise(resolve => {
        if (!countdownOverlay || !countdownMessage || !typingInput) {
            console.warn("Countdown elements missing, skipping countdown.");
            resolve();
            return;
        }

        countdownInProgress = true;
        startButton.disabled = true; // Disable buttons during countdown
        if(botModeButton) botModeButton.disabled = true;
        typingInput.disabled = true; // Ensure input is disabled
        countdownOverlay.style.display = 'flex';
        let count = COUNTDOWN_SECONDS;
        countdownMessage.textContent = count;

        const intervalId = setInterval(() => {
            count--;
            if (count > 0) {
                countdownMessage.textContent = count;
            } else if (count === 0) {
                countdownMessage.textContent = 'Go!';
            } else {
                clearInterval(intervalId);
                countdownOverlay.style.display = 'none';
                countdownInProgress = false;
                if (typingInput && !botActive) { // Only enable/focus if bot is not about to run
                    typingInput.disabled = false;
                    try { typingInput.focus(); } catch (e) { console.warn("Focus failed after countdown"); }
                }
                // Re-enable buttons if game hasn't auto-started (e.g. if bot isn't activating)
                // Game start logic (disabling buttons) is in handleKeyDown or activateBotMode
                // For manual start, user typing will trigger button disable.
                // Start button remains disabled until game ends or new reset.
                // Bot button also handled by its own logic.

                resolve(); // Resolve the promise once countdown is complete
            }
        }, 1000);
    });
}


async function startGameProcedure() {
    await resetGame(true); // Pass true to indicate countdown is desired
    if (!botActive) { // Only start countdown if not immediately activating bot
        await startCountdown();
    } else {
        // If bot mode was initiated, resetGame was called by activateBotMode,
        // and activateBotMode will handle its own flow without user countdown.
        // So, we might need to adjust activateBotMode to call resetGame(false)
        if(typingInput) typingInput.disabled = false; // Ensure input enabled for bot if no countdown
    }
    console.log("Game ready. Start typing (after countdown if any)!");
}

function processTypedCharacter(typedChar, isBackspace = false) {
    if (countdownInProgress) return; // Do not process typing during countdown
    if (isBackspace) {
        if (currentCharIndex === 0 || typedCharCount === 0) return;
        if (currentCharIndex < currentPassageText.length && passageCharsSpans[currentCharIndex]) {
             passageCharsSpans[currentCharIndex].classList.remove('current');
        } else if (currentCharIndex === currentPassageText.length && passageCharsSpans[currentCharIndex-1]) {
             passageCharsSpans[currentCharIndex-1].classList.remove('current');
        }
        currentCharIndex--;
        const charSpanToUndo = passageCharsSpans[currentCharIndex];
        if (!charSpanToUndo) return; 
        typedCharCount--; 
        if (charSpanToUndo.classList.contains('correct')) { correctCharCount--; }
        else if (charSpanToUndo.classList.contains('incorrect')) { mistakeCount--; }
        charSpanToUndo.classList.remove('correct', 'incorrect');
        charSpanToUndo.classList.add('current');
    } else { 
        if (currentCharIndex >= currentPassageText.length) return; 
        const expectedChar = currentPassageText[currentCharIndex];
        const charSpan = passageCharsSpans[currentCharIndex];
        if (!charSpan) { return; }
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
        if (currentCharIndex < currentPassageText.length && passageCharsSpans[currentCharIndex]) {
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
    if (countdownInProgress) { // Prevent typing during countdown
        event.preventDefault();
        return;
    }
    if (typingInput && typingInput.disabled || botActive) return; 
    if (event.key === "Tab" || event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta") return;
    if (event.key !== "Backspace" && event.key.length > 1) return; 
    
    if (!gameActive && event.key !== "Backspace" && event.key.length === 1) {
        gameActive = true;
        startTimer();
        if(startButton) startButton.disabled = true; 
        if (botModeButton) botModeButton.disabled = true;
    }
    if (!gameActive && event.key === "Backspace") return; 
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
    if (typedCharCount > 0) {
        if(accuracyDisplay) accuracyDisplay.textContent = `${Math.max(0, Math.round((correctCharCount / typedCharCount) * 100))}`;
    } else { if(accuracyDisplay) accuracyDisplay.textContent = '0'; }
}


// --- Modal Functions ---
function openResultsModal() {
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
    if(modalAccuracyDisplay) modalAccuracyDisplay.textContent = finalAccuracy;
    if(modalTimeDisplay) modalTimeDisplay.textContent = finalTime;
    if(modalGrossWpmDisplay) modalGrossWpmDisplay.textContent = grossWPM;
    if(modalCharsDisplay) modalCharsDisplay.textContent = `${correctCharCount}/${typedCharCount}`;
    if(modalErrorsDisplay) modalErrorsDisplay.textContent = mistakeCount;
    resultsModal.style.display = 'flex';
    setTimeout(() => { resultsModal.classList.add('active'); }, 10);
}

function closeResultsModal() {
    if (!resultsModal) return;
    resultsModal.classList.remove('active');
}

function endGame() {
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
    if (gameActive || botActive || countdownInProgress) return; // Prevent bot during countdown
    await resetGame(false); // MODIFIED: Pass false to skip user countdown
    gameActive = true;
    botActive = true;
    if(typingInput) typingInput.disabled = true; // Bot types, so user input is disabled
    if(startButton) startButton.disabled = true;
    if (botModeButton) {
        botModeButton.textContent = "Bot Running...";
        botModeButton.disabled = true;
    }
    console.log("Bot mode activated.");
    startTimer(); // Start game timer for bot
    botTypeNextCharacter();
}

function botTypeNextCharacter() {
    if (!botActive || !gameActive || currentCharIndex >= currentPassageText.length) {
        if (botActive && !gameActive) { deactivateBotMode(false); } // If game ended for other reasons
        else if (botActive && currentCharIndex >= currentPassageText.length) { endGame(); } // Bot finished
        return;
    }
    const charToType = currentPassageText[currentCharIndex];
    processTypedCharacter(charToType, false); // Bot types correctly
    if (gameActive && botActive && currentCharIndex < currentPassageText.length) { // Check if bot should continue
        botTimeoutId = setTimeout(botTypeNextCharacter, BOT_TYPING_INTERVAL_MS);
    } else if (gameActive && botActive && currentCharIndex >= currentPassageText.length) {
        // This condition is now handled by the primary check inside processTypedCharacter calling endGame
        // or the check at the beginning of this function.
    }
}

function deactivateBotMode(calledFromResetOrEnd = false) {
    if (botTimeoutId) clearTimeout(botTimeoutId);
    botActive = false;
    // Only re-enable buttons if not part of a full game reset/end sequence
    // which handles button states separately.
    if (!calledFromResetOrEnd && botModeButton) {
        botModeButton.textContent = "Activate Bot";
        // Game might still be active if user manually stopped bot (not implemented)
        // Or if game ended, endGame handles buttons.
        // If called because bot finished, endGame handles it.
        // This is tricky; button states are best handled by game state transitions.
        botModeButton.disabled = gameActive || countdownInProgress;
    }
    if (!calledFromResetOrEnd && !gameActive && !countdownInProgress) {
        if(typingInput) typingInput.disabled = false;
        if(startButton) startButton.disabled = false;
    }
    console.log("Bot mode deactivated.");
}

// --- Event Listeners ---
if(startButton) startButton.addEventListener('click', startGameProcedure);
if(typingInput) typingInput.addEventListener('keydown', handleKeyDown);
if (botModeButton) botModeButton.addEventListener('click', activateBotMode);
if (modalCloseButton) modalCloseButton.addEventListener('click', closeResultsModal);
if (modalPlayAgainButton) {
    modalPlayAgainButton.addEventListener('click', () => {
        closeResultsModal();
        startGameProcedure(); // This will trigger a new countdown
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
startGameProcedure(); // Initial call will trigger reset and then countdown
console.log("TypeStorm initializing, setting up initial game...");