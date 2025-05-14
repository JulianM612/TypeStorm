// --- DOM Elements ---
const passageDisplay = document.getElementById('passage-display');
const typingInput = document.getElementById('typing-input');
const startButton = document.getElementById('start-button');
const wpmDisplay = document.getElementById('wpm-display');
const accuracyDisplay = document.getElementById('accuracy-display');
const timerDisplay = document.getElementById('timer-display');
const passageContainer = document.getElementById('passage-container'); // ADDED: Reference for shake target

// --- Sample Passages (Hardcoded for MVP) ---
const samplePassages = [
    "The quick brown fox jumps over the lazy dog.",
    "Programming is the art of telling another human being what one wants the computer to do.",
    "TypeStorm will be an amazing typing experience.",
    "Practice makes perfect, especially in typing speed and accuracy.",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "To be or not to be, that is the question.",
    "A journey of a thousand miles begins with a single step."
];

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

// --- Core Functions ---

function getRandomPassage() {
    const randomIndex = Math.floor(Math.random() * samplePassages.length);
    return samplePassages[randomIndex];
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
    passageContainer.classList.remove('shake-error'); // Ensure shake is removed on reset

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

    passageCharsSpans.forEach(span => span.classList.remove('current', 'correct', 'incorrect'));
    if (passageCharsSpans.length > 0) {
        passageCharsSpans[0].classList.add('current');
    }
}

function startGameProcedure() {
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
        charSpan.classList.add('correct');
        charSpan.classList.remove('incorrect');
        passageContainer.classList.remove('shake-error'); // Remove shake on correct input
        correctCharCount++;
        currentCharIndex++;
    } else {
        charSpan.classList.add('incorrect');
        charSpan.classList.remove('correct');
        mistakeCount++;

        // --- TRIGGER SHAKE ANIMATION ---
        if (!passageContainer.classList.contains('shake-error')) { // Avoid re-adding if already shaking quickly
            passageContainer.classList.add('shake-error');
            setTimeout(() => {
                passageContainer.classList.remove('shake-error');
            }, 300); // Must match CSS animation duration
        }
        // -----------------------------
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
    passageContainer.classList.remove('shake-error'); // Ensure shake is removed at end

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

resetGame();
console.log("TypeStorm Initialized. Click 'Start New Test' to begin.");