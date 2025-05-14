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
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownMessage = document.getElementById('countdown-message');

// Results Modal Elements
const resultsModal = document.getElementById('results-modal');
const modalCloseButton = document.querySelector('#results-modal .modal-close-button'); // More specific selector
const modalPlayAgainButton = document.getElementById('modal-play-again-button');
const modalWpmDisplay = document.getElementById('modal-wpm');
const modalAccuracyDisplay = document.getElementById('modal-accuracy');
const modalTimeDisplay = document.getElementById('modal-time');
const modalGrossWpmDisplay = document.getElementById('modal-gross-wpm');
const modalCharsDisplay = document.getElementById('modal-chars');
const modalErrorsDisplay = document.getElementById('modal-errors');

// Settings Modal Elements
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const settingsModalCloseButton = document.getElementById('settings-modal-close-button');
const allowBackspaceToggle = document.getElementById('allow-backspace-toggle');
const settingsSaveButton = document.getElementById('settings-save-button');


// --- Audio Elements & Setup ---
const sounds = {
    countdownTick: null,
    keyPress: null
};
let audioUnlocked = false; 

function loadAudio() {
    try {
        sounds.countdownTick = new Audio('sounds/countdown-tick.mp3'); 
        sounds.keyPress = new Audio('sounds/key-press.mp3');       
        console.log("Audio objects for path reference created.");

        sounds.countdownTick.onerror = () => console.error("Error with countdownTick.mp3 base audio object.");
        sounds.keyPress.onerror = () => console.error("Error with key-press.mp3 base audio object.");
        
        if (sounds.keyPress) sounds.keyPress.load();
        if (sounds.countdownTick) sounds.countdownTick.load(); 

    } catch (e) {
        console.error("Error creating base Audio objects:", e);
    }
}

function playSound(soundName, createNewInstance = false) {
    if (!audioUnlocked) return; 

    let audioToPlay;
    if (createNewInstance) {
        if (sounds[soundName] && sounds[soundName].src) { 
            audioToPlay = new Audio(sounds[soundName].src); 
        } else {
            console.warn(`[playSound] Cannot create new instance for "${soundName}", base sound or src missing.`);
            return;
        }
    } else if (sounds[soundName]) {
        audioToPlay = sounds[soundName];
    } else {
        console.warn(`[playSound] Sound "${soundName}" not found in sounds object definition.`);
        return;
    }
    
    if (createNewInstance || audioToPlay.readyState >= 2) { 
        if (!createNewInstance) audioToPlay.currentTime = 0; 
        audioToPlay.play().catch(error => console.warn(`Could not play sound "${soundName}":`, error));
    } else {
         audioToPlay.load(); 
    }
}

function unlockAudio() {
    if (!audioUnlocked) {
        audioUnlocked = true;
        console.log("Audio unlocked by user interaction.");
        const prime = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
        prime.volume = 0; 
        prime.play().catch(() => {}); 
    }
}

// --- Game Settings ---
let gameSettings = {
    allowBackspace: true // Default to true
};

function loadSettings() {
    const savedSettings = localStorage.getItem('typeStormSettings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            // Merge, preferring saved settings but keeping defaults for missing ones
            gameSettings = { ...gameSettings, ...parsedSettings };
        } catch (e) {
            console.error("Error parsing saved settings:", e);
            // Stick with defaults if parsing fails
        }
    }
    if (allowBackspaceToggle) {
        allowBackspaceToggle.checked = gameSettings.allowBackspace;
    }
}

function saveSettings() {
    localStorage.setItem('typeStormSettings', JSON.stringify(gameSettings));
}


// --- Passages Data ---
let defaultFallbackPassage = "The quick brown fox jumps over the lazy dog. This is a default passage if the API fails to load.";
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
let countdownInProgress = false; 

// --- Configuration ---
const CHARS_PER_WORD = 5;
const BOT_TYPING_INTERVAL_MS = 50;
const COUNTDOWN_SECONDS = 3; 
const API_NINJAS_URL = 'https://api.api-ninjas.com/v1/quotes';
const API_NINJAS_KEY = 'k3SjrLZIe88JPoDPvrFbRQ==NiXjNzu4cbJktQ5C'; 

// --- Function to load passages from API-Ninjas ---
async function loadPassageFromAPI() {
    console.log("Loading passage from API..."); 
    if (!passageDisplay || !typingInput || !startButton) {
        console.error("CRITICAL UI elements missing for API load.");
        if (passageDisplay) passageDisplay.innerHTML = '<div class="loader-container"><em>Error: UI elements missing.</em></div>';
        if(startButton) startButton.disabled = false;
        if(botModeButton) botModeButton.disabled = false;
        return defaultFallbackPassage;
    }
    passageDisplay.innerHTML = '<div class="loader-container"><div class="loader"></div><em>Loading new passage...</em></div>';
    passageDisplay.style.justifyContent = 'center'; 
    passageDisplay.style.alignItems = 'center';

    if (API_NINJAS_KEY === 'YOUR_API_KEY' || !API_NINJAS_KEY) {
        console.warn("API Key for API-Ninjas is not set. Using default passage.");
        passageDisplay.innerHTML = '<div class="loader-container"><em>API Key not configured. Using default.</em></div>';
        await new Promise(resolve => setTimeout(resolve, 1500));
        return defaultFallbackPassage;
    }
    try {
        const response = await fetch(API_NINJAS_URL, { headers: { 'X-Api-Key': API_NINJAS_KEY }});
        if (!response.ok) {
            console.error(`API error! Status: ${response.status}`);
            throw new Error(`API error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && data[0].quote) {
            const passageText = data[0].quote.trim().replace(/\s\s+/g, ' ');
            if (passageText.length === 0) {
                 console.error("API returned an empty quote.");
                 throw new Error("API returned an empty quote.");
            }
            return passageText;
        } else {
            console.error("API response not in expected format or empty quote content.");
            throw new Error("API response not in expected format or empty quote content.");
        }
    } catch (error) {
        console.error("Could not load passage from API-Ninjas:", error.message);
        if (passageDisplay) passageDisplay.innerHTML = '<div class="loader-container"><em>Error loading passage. Using default.</em></div>';
        await new Promise(resolve => setTimeout(resolve, 1500));
        return defaultFallbackPassage;
    } finally {
        passagesLoaded = true;
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
    if (!passageDisplay) { return; }
    passageDisplay.innerHTML = ''; 
    passageDisplay.style.justifyContent = 'flex-start'; 
    passageDisplay.style.alignItems = 'flex-start';   
    passageCharsSpans = []; 
    passageWords = []; 
    const words = passageText.split(/(\s+)/); 
    words.forEach(wordOrSpace => {
        if (wordOrSpace.match(/\s+/)) { 
            const spaceSpan = document.createElement('span');
            spaceSpan.classList.add('passage-space'); 
            spaceSpan.innerHTML = wordOrSpace.replace(/ /g, ' '); 
            passageDisplay.appendChild(spaceSpan);
            wordOrSpace.split('').forEach(() => passageCharsSpans.push(spaceSpan));
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

async function resetGame(doCountdown = true) { 
    if (timerInterval) clearInterval(timerInterval);
    if (botActive) deactivateBotMode(true); 
    gameActive = false;
    countdownInProgress = false; 
    passagesLoaded = false; 
    if(passageContainer) passageContainer.classList.remove('shake-error'); 
    if(countdownOverlay) countdownOverlay.style.display = 'none'; 
    
    if(typingInput) typingInput.disabled = true; 
    if(startButton) startButton.disabled = true;
    if(botModeButton) botModeButton.disabled = true;

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
    if(accuracyDisplay) accuracyDisplay.textContent = '0'; 
    if(timerDisplay) timerDisplay.textContent = '0s';
    
    if(startButton) {
        startButton.textContent = "Start New Test";
        startButton.disabled = doCountdown; // Keep disabled if countdown is next
    }
     if(botModeButton) {
        botModeButton.textContent = "Activate Bot";
        botModeButton.disabled = doCountdown; 
    }
    
    if (!doCountdown) { // No countdown, enable buttons if not bot mode starting
        if(startButton && !botActive) startButton.disabled = false;
        if(botModeButton && !botActive) botModeButton.disabled = false;
    }


    if (passageCharsSpans.length > 0 && passageCharsSpans[0] && passageCharsSpans[0].classList) { 
        passageCharsSpans[0].classList.add('current');
    }
    scrollPassageDisplay(); 

    if (!doCountdown) { 
        if(typingInput) typingInput.disabled = false;
        if (typingInput && !botActive) { 
            try { typingInput.focus(); } catch (e) { console.warn("Focus failed in resetGame (no countdown)"); }
        }
    }
}

function startCountdown() {
    return new Promise(resolve => {
        if (!countdownOverlay || !countdownMessage || !typingInput) {
            resolve(); return;
        }
        countdownInProgress = true;
        if(startButton) startButton.disabled = true; 
        if(botModeButton) botModeButton.disabled = true;
        typingInput.disabled = true; 

        countdownOverlay.style.display = 'flex';
        let count = COUNTDOWN_SECONDS;
        
        function updateAndPlayCountdownTick(number) { 
            countdownMessage.textContent = number;
            if (audioUnlocked && sounds.countdownTick) {
                playSound('countdownTick', true); 
            }
        }
        
        updateAndPlayCountdownTick(count); 

        const intervalId = setInterval(() => {
            count--;
            if (count > 0) {
                updateAndPlayCountdownTick(count); 
            } else if (count === 0) {
                countdownMessage.textContent = 'Go!';
            } else {
                clearInterval(intervalId);
                countdownOverlay.style.display = 'none';
                countdownInProgress = false;
                if (typingInput && !botActive) { 
                    typingInput.disabled = false;
                    try { typingInput.focus(); } catch (e) { console.warn("Focus failed after countdown"); }
                }
                resolve(); 
            }
        }, 1000);
    });
}

async function initialAppSetup() {
    if (typingInput) typingInput.disabled = true;
    if (passageDisplay) passageDisplay.innerHTML = '<em>Click "Start New Test" to begin.</em>';
    if (startButton) startButton.disabled = false;
    if (botModeButton) botModeButton.disabled = false;
    if(wpmDisplay) wpmDisplay.textContent = '0';
    if(accuracyDisplay) accuracyDisplay.textContent = '0'; 
    if(timerDisplay) timerDisplay.textContent = '0s';
    if(progressBarFill) progressBarFill.style.width = '0%';
}

async function startGameProcedure() {
    await resetGame(true); 
    if (!botActive) { 
        await startCountdown(); 
    }
}

function processTypedCharacter(typedChar, isBackspace = false) {
    if (countdownInProgress) return; 
    if (isBackspace) {
        if (!gameSettings.allowBackspace) {
            if(typingInput) typingInput.value = ''; 
            return; 
        }
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
        if (sounds.keyPress) playSound('keyPress', false); 

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
    if (countdownInProgress) { 
        event.preventDefault();
        return;
    }
    if (event.key === "Backspace" && !gameSettings.allowBackspace) {
        event.preventDefault(); 
        processTypedCharacter(null, true); 
        if(typingInput) typingInput.value = ''; 
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
    if (gameActive || botActive || countdownInProgress) return; 
    await resetGame(false); 
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
    if (!botActive || !gameActive || currentCharIndex >= currentPassageText.length) {
        if (botActive && !gameActive) { deactivateBotMode(false); } 
        else if (botActive && currentCharIndex >= currentPassageText.length) { endGame(); } 
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
        botModeButton.disabled = gameActive || countdownInProgress;
    }
    if (!calledFromResetOrEnd && !gameActive && !countdownInProgress) {
        if(typingInput) typingInput.disabled = false;
        if(startButton) startButton.disabled = false;
    }
    console.log("Bot mode deactivated.");
}

// --- Settings Modal Functions ---
function openSettingsModal() {
    if (!settingsModal) return;
    if (allowBackspaceToggle) allowBackspaceToggle.checked = gameSettings.allowBackspace;
    settingsModal.style.display = 'flex';
    setTimeout(() => settingsModal.classList.add('active'), 10);
}

function closeSettingsModal() {
    if (!settingsModal) return;
    settingsModal.classList.remove('active');
}

// --- Event Listeners ---
if(startButton) {
    startButton.addEventListener('click', () => {
        unlockAudio(); 
        startGameProcedure();
    });
}
if(typingInput) {
    typingInput.addEventListener('keydown', (event) => {
        unlockAudio(); 
        handleKeyDown(event);
    });
}
if (botModeButton) {
    botModeButton.addEventListener('click', () => {
        unlockAudio(); 
        activateBotMode();
    });
}
if (modalCloseButton) { // For results modal
    modalCloseButton.addEventListener('click', closeResultsModal);
}
if (modalPlayAgainButton) {
    modalPlayAgainButton.addEventListener('click', () => {
        unlockAudio(); 
        closeResultsModal();
        startGameProcedure(); 
    });
}

// Settings Event Listeners
if (settingsButton) {
    settingsButton.addEventListener('click', () => {
        unlockAudio(); 
        openSettingsModal();
    });
}
if (settingsModalCloseButton) {
    settingsModalCloseButton.addEventListener('click', closeSettingsModal);
}
if (settingsModal) { 
    settingsModal.addEventListener('click', (event) => {
        if (event.target === settingsModal) closeSettingsModal();
    });
}
if (allowBackspaceToggle) {
    allowBackspaceToggle.addEventListener('change', (event) => {
        gameSettings.allowBackspace = event.target.checked;
        saveSettings();
    });
}
if (settingsSaveButton) { 
    settingsSaveButton.addEventListener('click', () => {
        // Settings are applied on change, this button just closes.
        // saveSettings(); // Could save again here if needed, but change listener already does it.
        closeSettingsModal();
    });
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (resultsModal && resultsModal.classList.contains('active')) {
            closeResultsModal();
        } else if (settingsModal && settingsModal.classList.contains('active')) {
            closeSettingsModal();
        }
    }
});
if (resultsModal) { // Close on overlay click for results modal
    resultsModal.addEventListener('click', (event) => {
        if (event.target === resultsModal) closeResultsModal();
    });
}


// --- Initialization ---
loadAudio(); 
loadSettings();
initialAppSetup(); 
console.log("TypeStorm application initialized. Click 'Start New Test' to begin.");