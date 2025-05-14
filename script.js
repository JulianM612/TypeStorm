// --- START OF FILE script.js ---

// --- DOM Elements ---
const DOMElements = {
    passageDisplay: document.getElementById('passage-display'),
    typingInput: document.getElementById('typing-input'),
    startButton: document.getElementById('start-button'),
    wpmDisplay: document.getElementById('wpm-display'),
    accuracyDisplay: document.getElementById('accuracy-display'),
    timerDisplay: document.getElementById('timer-display'),
    passageContainer: document.getElementById('passage-container'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    botModeButton: document.getElementById('bot-mode-button'),
    countdownOverlay: document.getElementById('countdown-overlay'),
    countdownMessage: document.getElementById('countdown-message'),
    resultsModal: {
        modal: document.getElementById('results-modal'),
        closeButton: document.querySelector('#results-modal .modal-close-button'),
        playAgainButton: document.getElementById('modal-play-again-button'),
        wpmDisplay: document.getElementById('modal-wpm'),
        accuracyDisplay: document.getElementById('modal-accuracy'),
        timeDisplay: document.getElementById('modal-time'),
        grossWpmDisplay: document.getElementById('modal-gross-wpm'),
        charsDisplay: document.getElementById('modal-chars'),
        errorsDisplay: document.getElementById('modal-errors'),
    },
    settingsModal: {
        modal: document.getElementById('settings-modal'),
        settingsButton: document.getElementById('settings-button'),
        closeButton: document.getElementById('settings-modal-close-button'),
        allowBackspaceToggle: document.getElementById('allow-backspace-toggle'),
        saveButton: document.getElementById('settings-save-button'),
    }
};

// --- Audio Elements & Setup ---
const sounds = {
    countdownTick: null,
    keyPress: null
};
let audioUnlocked = false;

// --- Game Settings ---
let gameSettings = {
    allowBackspace: true
};

// --- Passages Data ---
let defaultFallbackPassage = "The quick brown fox jumps over the lazy dog. This is a default passage if the API fails to load.";

// --- Game State Variables ---
let gameState = {
    currentPassageText: "",
    passageCharsSpans: [],
    passageWords: [],
    currentCharIndex: 0,
    typedCharCount: 0,
    correctCharCount: 0,
    mistakeCount: 0,
    startTime: null,
    timerInterval: null,
    gameActive: false,
    botActive: false,
    botTimeoutId: null,
    countdownInProgress: false,
    passagesLoaded: false
};

// --- Configuration ---
const Config = {
    CHARS_PER_WORD: 5,
    BOT_TYPING_INTERVAL_MS: 50,
    COUNTDOWN_SECONDS: 3,
    API_NINJAS_URL: 'https://api.api-ninjas.com/v1/quotes',
    API_NINJAS_KEY: 'k3SjrLZIe88JPoDPvrFbRQ==NiXjNzu4cbJktQ5C',
    UI: {
        SCROLL_TARGET_OFFSET_RATIO: 0.33,
        SCROLL_VIEWPORT_BUFFER_RATIO: 0.5,
        SHAKE_ERROR_ANIMATION_DURATION_MS: 300,
    }
};


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


function loadSettings() {
    const savedSettings = localStorage.getItem('typeStormSettings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            gameSettings = { ...gameSettings, ...parsedSettings };
        } catch (e) {
            console.error("Error parsing saved settings:", e);
        }
    }
    if (DOMElements.settingsModal.allowBackspaceToggle) {
        DOMElements.settingsModal.allowBackspaceToggle.checked = gameSettings.allowBackspace;
    }
}

function saveSettings() {
    localStorage.setItem('typeStormSettings', JSON.stringify(gameSettings));
}


async function loadPassageFromAPI() {
    console.log("Loading passage from API...");
    if (!DOMElements.passageDisplay || !DOMElements.typingInput || !DOMElements.startButton) {
        console.error("CRITICAL UI elements missing for API load.");
        if (DOMElements.passageDisplay) DOMElements.passageDisplay.innerHTML = '<div class="loader-container"><em>Error: UI elements missing.</em></div>';
        if(DOMElements.startButton) DOMElements.startButton.disabled = false;
        if(DOMElements.botModeButton) DOMElements.botModeButton.disabled = false;
        return defaultFallbackPassage;
    }
    DOMElements.passageDisplay.innerHTML = '<div class="loader-container"><div class="loader"></div><em>Loading new passage...</em></div>';
    DOMElements.passageDisplay.style.justifyContent = 'center';
    DOMElements.passageDisplay.style.alignItems = 'center';

    if (Config.API_NINJAS_KEY === 'YOUR_API_KEY' || !Config.API_NINJAS_KEY) {
        console.warn("API Key for API-Ninjas is not set. Using default passage.");
        DOMElements.passageDisplay.innerHTML = '<div class="loader-container"><em>API Key not configured. Using default.</em></div>';
        await new Promise(resolve => setTimeout(resolve, 1500));
        return defaultFallbackPassage;
    }
    try {
        const response = await fetch(Config.API_NINJAS_URL, { headers: { 'X-Api-Key': Config.API_NINJAS_KEY }});
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
        if (DOMElements.passageDisplay) DOMElements.passageDisplay.innerHTML = '<div class="loader-container"><em>Error loading passage. Using default.</em></div>';
        await new Promise(resolve => setTimeout(resolve, 1500));
        return defaultFallbackPassage;
    } finally {
        gameState.passagesLoaded = true;
    }
}

function updateProgressBar() {
    if (!gameState.currentPassageText || gameState.currentPassageText.length === 0 || !DOMElements.progressBarFill) {
        if(DOMElements.progressBarFill) DOMElements.progressBarFill.style.width = '0%';
        return;
    }
    const progressIndex = Math.min(gameState.currentCharIndex, gameState.currentPassageText.length);
    const progressPercent = (progressIndex / gameState.currentPassageText.length) * 100;
    DOMElements.progressBarFill.style.width = `${progressPercent}%`;
}

function calculateWPM(charCount, timeSeconds, charsPerWord = Config.CHARS_PER_WORD) {
    if (timeSeconds <= 0 || charCount <= 0) return 0;
    const minutes = timeSeconds / 60;
    if (minutes <= 0) return 0;
    return Math.round((charCount / charsPerWord) / minutes);
}

function formatPassageForDisplay(passageText) {
    if (!DOMElements.passageDisplay) { return; }
    DOMElements.passageDisplay.innerHTML = '';
    DOMElements.passageDisplay.style.justifyContent = 'flex-start';
    DOMElements.passageDisplay.style.alignItems = 'flex-start';
    gameState.passageCharsSpans = [];
    gameState.passageWords = [];
    const words = passageText.split(/(\s+)/);
    words.forEach(wordOrSpace => {
        if (wordOrSpace.match(/\s+/)) {
            const spaceSpan = document.createElement('span');
            spaceSpan.classList.add('passage-space');
            spaceSpan.innerHTML = wordOrSpace.replace(/ /g, ' ');
            DOMElements.passageDisplay.appendChild(spaceSpan);
            wordOrSpace.split('').forEach(() => gameState.passageCharsSpans.push(spaceSpan));
        } else if (wordOrSpace.length > 0) {
            const wordSpanContainer = document.createElement('span');
            wordSpanContainer.classList.add('passage-word');
            DOMElements.passageDisplay.appendChild(wordSpanContainer);
            gameState.passageWords.push(wordSpanContainer);
            wordOrSpace.split('').forEach(char => {
                const charSpan = document.createElement('span');
                charSpan.innerText = char;
                wordSpanContainer.appendChild(charSpan);
                gameState.passageCharsSpans.push(charSpan);
            });
        }
    });
    if (gameState.passageCharsSpans.length > 0 && gameState.passageCharsSpans[0] && gameState.passageCharsSpans[0].classList) {
        gameState.passageCharsSpans[0].classList.add('current');
    }
    DOMElements.passageDisplay.scrollTop = 0;
}

function scrollPassageDisplay() {
    if (!gameState.gameActive || gameState.currentCharIndex >= gameState.passageCharsSpans.length || !DOMElements.passageDisplay || gameState.passageCharsSpans.length === 0) return;
    const currentActualSpan = gameState.passageCharsSpans[gameState.currentCharIndex];
    if (!currentActualSpan) { return; }
    const displayRect = DOMElements.passageDisplay.getBoundingClientRect();
    const spanRect = currentActualSpan.getBoundingClientRect();
    const targetOffsetFromTop = displayRect.height * Config.UI.SCROLL_TARGET_OFFSET_RATIO;
    const desiredScrollTop = DOMElements.passageDisplay.scrollTop + (spanRect.top - displayRect.top) - targetOffsetFromTop;
    const currentSpanTopInDisplay = spanRect.top - displayRect.top;
    const buffer = spanRect.height * Config.UI.SCROLL_VIEWPORT_BUFFER_RATIO;
    if (currentSpanTopInDisplay > (displayRect.height - spanRect.height - buffer) || currentSpanTopInDisplay < buffer) {
        if (DOMElements.passageDisplay.scrollTo) DOMElements.passageDisplay.scrollTo({ top: desiredScrollTop, behavior: 'smooth' });
        else DOMElements.passageDisplay.scrollTop = desiredScrollTop;
    }
}

async function resetGame(doCountdown = true) {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    if (gameState.botActive) deactivateBotMode(true);
    gameState.gameActive = false;
    gameState.countdownInProgress = false;
    gameState.passagesLoaded = false;
    if(DOMElements.passageContainer) DOMElements.passageContainer.classList.remove('shake-error');
    if(DOMElements.countdownOverlay) DOMElements.countdownOverlay.style.display = 'none';

    if(DOMElements.typingInput) DOMElements.typingInput.disabled = true;
    if(DOMElements.startButton) DOMElements.startButton.disabled = true;
    if(DOMElements.botModeButton) DOMElements.botModeButton.disabled = true;

    gameState.currentPassageText = await loadPassageFromAPI();
    formatPassageForDisplay(gameState.currentPassageText);
    updateProgressBar();

    gameState.currentCharIndex = 0;
    gameState.typedCharCount = 0;
    gameState.correctCharCount = 0;
    gameState.mistakeCount = 0;
    gameState.startTime = null;

    if(DOMElements.typingInput) DOMElements.typingInput.value = '';
    if(DOMElements.wpmDisplay) DOMElements.wpmDisplay.textContent = '0';
    if(DOMElements.accuracyDisplay) DOMElements.accuracyDisplay.textContent = '0';
    if(DOMElements.timerDisplay) DOMElements.timerDisplay.textContent = '0s';

    if(DOMElements.startButton) {
        DOMElements.startButton.textContent = "Start New Test";
        DOMElements.startButton.disabled = doCountdown;
    }
     if(DOMElements.botModeButton) {
        DOMElements.botModeButton.textContent = "Activate Bot";
        DOMElements.botModeButton.disabled = doCountdown;
    }

    if (!doCountdown) {
        if(DOMElements.startButton && !gameState.botActive) DOMElements.startButton.disabled = false;
        if(DOMElements.botModeButton && !gameState.botActive) DOMElements.botModeButton.disabled = false;
    }

    if (gameState.passageCharsSpans.length > 0 && gameState.passageCharsSpans[0] && gameState.passageCharsSpans[0].classList) {
        gameState.passageCharsSpans[0].classList.add('current');
    }
    scrollPassageDisplay();

    if (!doCountdown) {
        if(DOMElements.typingInput) DOMElements.typingInput.disabled = false;
        if (DOMElements.typingInput && !gameState.botActive) {
            try { DOMElements.typingInput.focus(); } catch (e) { console.warn("Focus failed in resetGame (no countdown)"); }
        }
    }
}

function startCountdown() {
    return new Promise(resolve => {
        if (!DOMElements.countdownOverlay || !DOMElements.countdownMessage || !DOMElements.typingInput) {
            resolve(); return;
        }
        gameState.countdownInProgress = true;
        if(DOMElements.startButton) DOMElements.startButton.disabled = true;
        if(DOMElements.botModeButton) DOMElements.botModeButton.disabled = true;
        DOMElements.typingInput.disabled = true;

        DOMElements.countdownOverlay.style.display = 'flex';
        let count = Config.COUNTDOWN_SECONDS;

        function updateAndPlayCountdownTick(number) {
            DOMElements.countdownMessage.textContent = number;
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
                DOMElements.countdownMessage.textContent = 'Go!';
            } else {
                clearInterval(intervalId);
                DOMElements.countdownOverlay.style.display = 'none';
                gameState.countdownInProgress = false;
                if (DOMElements.typingInput && !gameState.botActive) {
                    DOMElements.typingInput.disabled = false;
                    try { DOMElements.typingInput.focus(); } catch (e) { console.warn("Focus failed after countdown"); }
                }
                resolve();
            }
        }, 1000);
    });
}

async function initialAppSetup() {
    if (DOMElements.typingInput) DOMElements.typingInput.disabled = true;
    if (DOMElements.passageDisplay) DOMElements.passageDisplay.innerHTML = '<em>Click "Start New Test" to begin.</em>';
    if (DOMElements.startButton) DOMElements.startButton.disabled = false;
    if (DOMElements.botModeButton) DOMElements.botModeButton.disabled = false;
    if(DOMElements.wpmDisplay) DOMElements.wpmDisplay.textContent = '0';
    if(DOMElements.accuracyDisplay) DOMElements.accuracyDisplay.textContent = '0';
    if(DOMElements.timerDisplay) DOMElements.timerDisplay.textContent = '0s';
    if(DOMElements.progressBarFill) DOMElements.progressBarFill.style.width = '0%';
}

async function startGameProcedure() {
    await resetGame(true);
    if (!gameState.botActive) {
        await startCountdown();
    }
}

function processTypedCharacter(typedChar, isBackspace = false) {
    if (gameState.countdownInProgress) return;
    if (isBackspace) {
        if (!gameSettings.allowBackspace) {
            if(DOMElements.typingInput) DOMElements.typingInput.value = '';
            return;
        }
        if (gameState.currentCharIndex === 0 || gameState.typedCharCount === 0) return;
        if (gameState.currentCharIndex < gameState.currentPassageText.length && gameState.passageCharsSpans[gameState.currentCharIndex]) {
             gameState.passageCharsSpans[gameState.currentCharIndex].classList.remove('current');
        } else if (gameState.currentCharIndex === gameState.currentPassageText.length && gameState.passageCharsSpans[gameState.currentCharIndex-1]) {
             gameState.passageCharsSpans[gameState.currentCharIndex-1].classList.remove('current');
        }
        gameState.currentCharIndex--;
        const charSpanToUndo = gameState.passageCharsSpans[gameState.currentCharIndex];
        if (!charSpanToUndo) return;
        gameState.typedCharCount--;
        if (charSpanToUndo.classList.contains('correct')) { gameState.correctCharCount--; }
        else if (charSpanToUndo.classList.contains('incorrect')) { gameState.mistakeCount--; }
        charSpanToUndo.classList.remove('correct', 'incorrect');
        charSpanToUndo.classList.add('current');
    } else {
        if (gameState.currentCharIndex >= gameState.currentPassageText.length) return;
        if (sounds.keyPress) playSound('keyPress', false);

        const expectedChar = gameState.currentPassageText[gameState.currentCharIndex];
        const charSpan = gameState.passageCharsSpans[gameState.currentCharIndex];
        if (!charSpan) { return; }
        charSpan.classList.remove('current');
        gameState.typedCharCount++;
        if (typedChar === expectedChar) {
            charSpan.classList.remove('incorrect');
            charSpan.classList.add('correct');
            if(DOMElements.passageContainer) DOMElements.passageContainer.classList.remove('shake-error');
            gameState.correctCharCount++;
        } else {
            charSpan.classList.remove('correct');
            charSpan.classList.add('incorrect');
            gameState.mistakeCount++;
            if (DOMElements.passageContainer && !DOMElements.passageContainer.classList.contains('shake-error')) {
                DOMElements.passageContainer.classList.add('shake-error');
                setTimeout(() => { if(DOMElements.passageContainer) DOMElements.passageContainer.classList.remove('shake-error'); }, Config.UI.SHAKE_ERROR_ANIMATION_DURATION_MS);
            }
        }
        gameState.currentCharIndex++;
        if (gameState.currentCharIndex < gameState.currentPassageText.length && gameState.passageCharsSpans[gameState.currentCharIndex]) {
            gameState.passageCharsSpans[gameState.currentCharIndex].classList.add('current');
        } else if (gameState.currentCharIndex >= gameState.currentPassageText.length) {
            endGame();
        }
    }
    updateProgressBar();
    updateLiveHUD();
    scrollPassageDisplay();
}

function handleKeyDown(event) {
    if (gameState.countdownInProgress) {
        event.preventDefault();
        return;
    }
    if (event.key === "Backspace" && !gameSettings.allowBackspace) {
        event.preventDefault();
        processTypedCharacter(null, true);
        if(DOMElements.typingInput) DOMElements.typingInput.value = '';
        return;
    }

    if (DOMElements.typingInput && DOMElements.typingInput.disabled || gameState.botActive) return;
    if (event.key === "Tab" || event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta") return;
    if (event.key !== "Backspace" && event.key.length > 1) return;

    if (!gameState.gameActive && event.key !== "Backspace" && event.key.length === 1) {
        gameState.gameActive = true;
        startTimer();
        if(DOMElements.startButton) DOMElements.startButton.disabled = true;
        if (DOMElements.botModeButton) DOMElements.botModeButton.disabled = true;
    }
    if (!gameState.gameActive && event.key === "Backspace") return;
    if (!gameState.gameActive) return;

    if (event.key === "Backspace") {
        event.preventDefault();
        processTypedCharacter(null, true);
        if(DOMElements.typingInput) DOMElements.typingInput.value = '';
    } else if (event.key.length === 1 && gameState.currentCharIndex < gameState.currentPassageText.length) {
        event.preventDefault();
        processTypedCharacter(event.key, false);
        if(DOMElements.typingInput) DOMElements.typingInput.value = '';
    } else if (gameState.currentCharIndex >= gameState.currentPassageText.length && event.key !== "Backspace") {
        if(DOMElements.typingInput) DOMElements.typingInput.value = '';
        event.preventDefault();
    }
}

function startTimer() {
    gameState.startTime = new Date();
    gameState.timerInterval = setInterval(() => {
        if (!gameState.gameActive) { clearInterval(gameState.timerInterval); return; }
        const elapsedTimeSeconds = Math.floor((new Date() - gameState.startTime) / 1000);
        if(DOMElements.timerDisplay) DOMElements.timerDisplay.textContent = `${elapsedTimeSeconds}s`;

        if(DOMElements.wpmDisplay) DOMElements.wpmDisplay.textContent = calculateWPM(gameState.correctCharCount, elapsedTimeSeconds);
    }, 1000);
}

function updateLiveHUD() {
    if (gameState.typedCharCount > 0) {
        if(DOMElements.accuracyDisplay) DOMElements.accuracyDisplay.textContent = `${Math.max(0, Math.round((gameState.correctCharCount / gameState.typedCharCount) * 100))}`;
    } else { if(DOMElements.accuracyDisplay) DOMElements.accuracyDisplay.textContent = '0'; }
}

function openResultsModal(finalNetWPM, finalAccuracy, finalTimeSeconds, finalTypedCharCount, finalCorrectCharCount, finalMistakeCount) {
    if (!DOMElements.resultsModal.modal) return;

    const grossWPM = calculateWPM(finalTypedCharCount, finalTimeSeconds);
    const finalTimeDisplay = `${finalTimeSeconds.toFixed(2)}s`;

    if(DOMElements.resultsModal.wpmDisplay) DOMElements.resultsModal.wpmDisplay.textContent = finalNetWPM;
    if(DOMElements.resultsModal.accuracyDisplay) DOMElements.resultsModal.accuracyDisplay.textContent = finalAccuracy;
    if(DOMElements.resultsModal.timeDisplay) DOMElements.resultsModal.timeDisplay.textContent = finalTimeDisplay;
    if(DOMElements.resultsModal.grossWpmDisplay) DOMElements.resultsModal.grossWpmDisplay.textContent = grossWPM;
    if(DOMElements.resultsModal.charsDisplay) DOMElements.resultsModal.charsDisplay.textContent = `${finalCorrectCharCount}/${finalTypedCharCount}`;
    if(DOMElements.resultsModal.errorsDisplay) DOMElements.resultsModal.errorsDisplay.textContent = finalMistakeCount;

    DOMElements.resultsModal.modal.style.display = 'flex';
    setTimeout(() => { DOMElements.resultsModal.modal.classList.add('active'); }, 10);
}

function closeResultsModal() {
    if (!DOMElements.resultsModal.modal) return;
    DOMElements.resultsModal.modal.classList.remove('active');
}

function endGame() {
    if (!gameState.gameActive) return;
    console.log("Game ended!");
    clearInterval(gameState.timerInterval);
    if(DOMElements.passageContainer) DOMElements.passageContainer.classList.remove('shake-error');
    updateProgressBar();
    const endTime = new Date();
    const timeTakenSeconds = gameState.startTime ? (endTime - gameState.startTime) / 1000 : 0;

    let finalNetWPM = calculateWPM(gameState.correctCharCount, timeTakenSeconds);

    if(DOMElements.wpmDisplay) DOMElements.wpmDisplay.textContent = finalNetWPM;
    let finalAccuracyVal = 0;
    if (gameState.typedCharCount > 0) { finalAccuracyVal = Math.round((gameState.correctCharCount / gameState.typedCharCount) * 100); }
    if(DOMElements.accuracyDisplay) DOMElements.accuracyDisplay.textContent = `${Math.max(0, finalAccuracyVal)}`;
    if(DOMElements.timerDisplay) DOMElements.timerDisplay.textContent = `${timeTakenSeconds.toFixed(2)}s`;
    if(DOMElements.typingInput) DOMElements.typingInput.disabled = true;
    if(DOMElements.startButton) {
        DOMElements.startButton.textContent = "Play Again?";
        DOMElements.startButton.disabled = false;
    }
    if (DOMElements.botModeButton) {
        DOMElements.botModeButton.textContent = "Activate Bot";
        DOMElements.botModeButton.disabled = false;
    }
    if (gameState.botActive) { deactivateBotMode(true); }
    gameState.gameActive = false;
    openResultsModal(
        finalNetWPM,
        Math.max(0, finalAccuracyVal),
        timeTakenSeconds,
        gameState.typedCharCount,
        gameState.correctCharCount,
        gameState.mistakeCount
    );
}

async function activateBotMode() {
    if (gameState.gameActive || gameState.botActive || gameState.countdownInProgress) return;
    await resetGame(false);
    gameState.gameActive = true;
    gameState.botActive = true;
    if(DOMElements.typingInput) DOMElements.typingInput.disabled = true;
    if(DOMElements.startButton) DOMElements.startButton.disabled = true;
    if (DOMElements.botModeButton) {
        DOMElements.botModeButton.textContent = "Bot Running...";
        DOMElements.botModeButton.disabled = true;
    }
    console.log("Bot mode activated.");
    startTimer();
    botTypeNextCharacter();
}

function botTypeNextCharacter() {
    if (!gameState.botActive || !gameState.gameActive || gameState.currentCharIndex >= gameState.currentPassageText.length) {
        if (gameState.botActive && !gameState.gameActive) { deactivateBotMode(false); }
        else if (gameState.botActive && gameState.currentCharIndex >= gameState.currentPassageText.length) { endGame(); }
        return;
    }
    const charToType = gameState.currentPassageText[gameState.currentCharIndex];
    processTypedCharacter(charToType, false);
    if (gameState.gameActive && gameState.botActive && gameState.currentCharIndex < gameState.currentPassageText.length) {
        gameState.botTimeoutId = setTimeout(botTypeNextCharacter, Config.BOT_TYPING_INTERVAL_MS);
    }
}

function deactivateBotMode(calledFromResetOrEnd = false) {
    if (gameState.botTimeoutId) clearTimeout(gameState.botTimeoutId);
    gameState.botActive = false;
    if (!calledFromResetOrEnd && DOMElements.botModeButton) {
        DOMElements.botModeButton.textContent = "Activate Bot";
        DOMElements.botModeButton.disabled = gameState.gameActive || gameState.countdownInProgress;
    }
    if (!calledFromResetOrEnd && !gameState.gameActive && !gameState.countdownInProgress) {
        if(DOMElements.typingInput) DOMElements.typingInput.disabled = false;
        if(DOMElements.startButton) DOMElements.startButton.disabled = false;
    }
    console.log("Bot mode deactivated.");
}

function openSettingsModal() {
    if (!DOMElements.settingsModal.modal) return;
    if (DOMElements.settingsModal.allowBackspaceToggle) DOMElements.settingsModal.allowBackspaceToggle.checked = gameSettings.allowBackspace;
    DOMElements.settingsModal.modal.style.display = 'flex';
    setTimeout(() => DOMElements.settingsModal.modal.classList.add('active'), 10);
}

function closeSettingsModal() {
    if (!DOMElements.settingsModal.modal) return;
    DOMElements.settingsModal.modal.classList.remove('active');
}

// --- Event Listeners ---
if(DOMElements.startButton) {
    DOMElements.startButton.addEventListener('click', () => {
        unlockAudio();
        startGameProcedure();
    });
}
if(DOMElements.typingInput) {
    DOMElements.typingInput.addEventListener('keydown', (event) => {
        unlockAudio();
        handleKeyDown(event);
    });
}
if (DOMElements.botModeButton) {
    DOMElements.botModeButton.addEventListener('click', () => {
        unlockAudio();
        activateBotMode();
    });
}
if (DOMElements.resultsModal.closeButton) {
    DOMElements.resultsModal.closeButton.addEventListener('click', closeResultsModal);
}
if (DOMElements.resultsModal.playAgainButton) {
    DOMElements.resultsModal.playAgainButton.addEventListener('click', () => {
        unlockAudio();
        closeResultsModal();
        startGameProcedure();
    });
}

if (DOMElements.settingsModal.settingsButton) {
    DOMElements.settingsModal.settingsButton.addEventListener('click', () => {
        unlockAudio();
        openSettingsModal();
    });
}
if (DOMElements.settingsModal.closeButton) {
    DOMElements.settingsModal.closeButton.addEventListener('click', closeSettingsModal);
}
if (DOMElements.settingsModal.modal) {
    DOMElements.settingsModal.modal.addEventListener('click', (event) => {
        if (event.target === DOMElements.settingsModal.modal) closeSettingsModal();
    });
}
if (DOMElements.settingsModal.allowBackspaceToggle) {
    DOMElements.settingsModal.allowBackspaceToggle.addEventListener('change', (event) => {
        gameSettings.allowBackspace = event.target.checked;
        saveSettings();
    });
}
if (DOMElements.settingsModal.saveButton) {
    DOMElements.settingsModal.saveButton.addEventListener('click', () => {
        closeSettingsModal();
    });
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (DOMElements.resultsModal.modal && DOMElements.resultsModal.modal.classList.contains('active')) {
            closeResultsModal();
        } else if (DOMElements.settingsModal.modal && DOMElements.settingsModal.modal.classList.contains('active')) {
            closeSettingsModal();
        }
    }
});
if (DOMElements.resultsModal.modal) {
    DOMElements.resultsModal.modal.addEventListener('click', (event) => {
        if (event.target === DOMElements.resultsModal.modal) closeResultsModal();
    });
}


// --- Initialization ---
loadAudio();
loadSettings();
initialAppSetup();
console.log("TypeStorm application initialized. Click 'Start New Test' to begin.");
// --- END OF FILE script.js ---