// --- DOM Elements ---
const passageDisplay = document.getElementById('passage-display');
const typingInput = document.getElementById('typing-input');
const startButton = document.getElementById('start-button');
const wpmDisplay = document.getElementById('wpm-display');
const accuracyDisplay = document.getElementById('accuracy-display');
const timerDisplay = document.getElementById('timer-display');
const passageContainer = document.getElementById('passage-container');
const progressBarFill = document.getElementById('progress-bar-fill'); // ADDED: Progress Bar Fill Element

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
            allPassages = ["Error: Invalid passage data format."];
        }
        if (allPassages.length === 0) {
            allPassages = ["Error: Could not load passages."];
        }
        passagesLoaded = true;
        console.log("Passages loaded:", allPassages.length, "passages found.");
    } catch (error) {
        console.error("Could not load passages from texts.json:", error);
        passageDisplay.innerText = "Error loading passages. Check console.";
        allPassages = ["Failed to load passages. Check texts.json."];
        passagesLoaded = true;
    } finally {
        resetGame();
    }
}

// --- NEW: Function to update progress bar ---
function updateProgressBar() {
    if (!currentPassageText || currentPassageText.length === 0 || !progressBarFill) {
        if(progressBarFill) progressBarFill.style.width = '0%';
        return;
    }
    // Ensure currentCharIndex doesn't exceed passage length for calculation
    const progressIndex = Math.min(currentCharIndex, currentPassageText.length);
    const progressPercent = (progressIndex / currentPassageText.length) * 100;
    progressBarFill.style.width = `${progressPercent}%`;
}

// --- Core Functions ---

function getRandomPassage() {
    if (!passagesLoaded || allPassages.length === 0) {
        return "Error: Passages not available. Check texts.json.";
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

    currentPassageText = getRandomPassage();
    formatPassageForDisplay(currentPassageText);
    updateProgressBar(); // ADDED: Reset/update progress bar

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
    if (!passagesLoaded) {
        console.log("Passages still loading...");
        return;
    }
    resetGame();
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

    updateProgressBar(); // ADDED: Update progress bar after processing char

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
    updateProgressBar(); // ADDED: Ensure progress bar is full at the end

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

startButton.addEventListener('click', startGameProcedure);
typingInput.addEventListener('input', handleTypingInput);

loadPassages();
console.log("TypeStorm initializing, loading passages...");