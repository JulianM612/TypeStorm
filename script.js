// --- DOM Elements ---
const passageDisplay = document.getElementById('passage-display');
const typingInput = document.getElementById('typing-input'); // We'll keep this for MVP
const startButton = document.getElementById('start-button');
const wpmDisplay = document.getElementById('wpm-display');
const accuracyDisplay = document.getElementById('accuracy-display');
const timerDisplay = document.getElementById('timer-display');

// --- Sample Passages (Hardcoded for MVP) ---
const samplePassages = [
    "The quick brown fox jumps over the lazy dog.",
    "Programming is the art of telling another human being what one wants the computer to do.",
    "TypeStorm will be an amazing typing experience.",
    "Practice makes perfect, especially in typing speed and accuracy.",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "To be or not to be, that is the question."
];

// --- Game State Variables ---
let currentPassageText = "";
let passageCharsSpans = []; // Array of <span> elements for each character in the passage
let currentCharIndex = 0;
let typedCharCount = 0; // Total characters typed by user (including mistakes)
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
    passageDisplay.innerHTML = ''; // Clear previous passage
    passageCharsSpans = []; // Reset the array of char spans

    passageText.split('').forEach(char => {
        const charSpan = document.createElement('span');
        charSpan.innerText = char;
        passageDisplay.appendChild(charSpan);
        passageCharsSpans.push(charSpan); // Store span for direct manipulation
    });

    // Highlight the first character as 'current'
    if (passageCharsSpans.length > 0) {
        passageCharsSpans[0].classList.add('current');
    }
}

function resetGame() {
    console.log("Resetting game...");
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);

    currentPassageText = getRandomPassage();
    formatPassageForDisplay(currentPassageText);

    currentCharIndex = 0;
    typedCharCount = 0;
    correctCharCount = 0;
    mistakeCount = 0;
    startTime = null;

    typingInput.value = '';
    typingInput.disabled = false;
    // typingInput.focus(); // Focus after user clicks start

    wpmDisplay.textContent = '0';
    accuracyDisplay.textContent = '0'; // Show 0% initially
    timerDisplay.textContent = '0s';

    startButton.textContent = "Start New Test";
    startButton.disabled = false;

    // Remove 'current' class from any character if a game was interrupted
    passageCharsSpans.forEach(span => span.classList.remove('current', 'correct', 'incorrect'));
    if (passageCharsSpans.length > 0) {
        passageCharsSpans[0].classList.add('current');
    }
}

function startGameProcedure() {
    console.log("Game starting...");
    resetGame(); // Reset state and load new passage
    // Game becomes active and timer starts on first valid input
    typingInput.focus(); // Now focus after reset and ready
}


function handleTypingInput(event) {
    const typedText = typingInput.value;
    if (!gameActive && typedText.length > 0) {
        gameActive = true;
        startTimer();
        startButton.disabled = true; // Disable start button once typing begins
    }

    if (!gameActive || currentCharIndex >= currentPassageText.length) {
        // Don't process if game isn't active or passage is finished
        // We will clear the input below if passage is finished to prevent further typing
        if(currentCharIndex >= currentPassageText.length) {
            typingInput.value = ''; // Prevent typing more once done
        }
        return;
    }

    const lastTypedChar = typedText.slice(-1);
    const expectedChar = currentPassageText[currentCharIndex];
    const charSpan = passageCharsSpans[currentCharIndex];

    // Remove 'current' class from the current character span before moving on
    charSpan.classList.remove('current');

    if (lastTypedChar === expectedChar) {
        charSpan.classList.add('correct');
        charSpan.classList.remove('incorrect'); // In case of correction (though we don't support backspace correction visually yet)
        correctCharCount++;
    } else {
        charSpan.classList.add('incorrect');
        charSpan.classList.remove('correct');
        mistakeCount++;
    }

    typedCharCount++;
    currentCharIndex++;

    // Highlight next character or end game
    if (currentCharIndex < currentPassageText.length) {
        passageCharsSpans[currentCharIndex].classList.add('current');
    } else {
        endGame();
    }

    // For this simplified MVP, we clear the input field after each character.
    // This forces character-by-character input matching the display.
    // A more natural input will be an enhancement.
    typingInput.value = '';

    updateLiveHUD();
}

function startTimer() {
    startTime = new Date();
    timerInterval = setInterval(() => {
        const elapsedTimeSeconds = Math.floor((new Date() - startTime) / 1000);
        timerDisplay.textContent = `${elapsedTimeSeconds}s`;

        // Live WPM update (basic calculation)
        if (gameActive && correctCharCount > 0) {
            const minutes = elapsedTimeSeconds / 60;
            if (minutes > 0) {
                const wordsTyped = (correctCharCount / 5); // Average word length of 5, using correct chars
                const wpm = Math.round(wordsTyped / minutes);
                wpmDisplay.textContent = wpm;
            } else {
                wpmDisplay.textContent = '0'; // Avoid NaN or Infinity if time is too short
            }
        }
    }, 1000);
}

function updateLiveHUD() {
    // Live Accuracy
    if (typedCharCount > 0) {
        const accuracy = Math.round((correctCharCount / typedCharCount) * 100);
        accuracyDisplay.textContent = `${accuracy}`; // Just the number, % is in HTML
    } else {
        accuracyDisplay.textContent = '0';
    }
}

function endGame() {
    console.log("Game ended!");
    clearInterval(timerInterval);
    gameActive = false;
    typingInput.disabled = true; // Disable input after finishing

    const endTime = new Date();
    const timeTakenSeconds = (endTime - startTime) / 1000;
    const timeTakenMinutes = timeTakenSeconds / 60;

    // Final WPM calculation (using correct characters for net WPM)
    // Standard is (correct characters / 5) / time_in_minutes
    let finalWPM = 0;
    if (timeTakenMinutes > 0) {
        finalWPM = Math.round((correctCharCount / 5) / timeTakenMinutes);
    }
    wpmDisplay.textContent = finalWPM;

    // Final Accuracy
    let finalAccuracy = 0;
    if (currentPassageText.length > 0) { // Use passage length for accuracy against the target
        const accuracyMistakes = currentPassageText.length - correctCharCount; // How many of required chars were missed or typed wrong
        finalAccuracy = Math.round(((currentPassageText.length - mistakeCount) / currentPassageText.length) * 100);
         // Alternative: Accuracy based on typed characters:
        // finalAccuracy = Math.round((correctCharCount / typedCharCount) * 100);
    }
     // Ensure accuracy is not negative if mistakes exceed passage length (should not happen with current logic)
    accuracyDisplay.textContent = `${Math.max(0, finalAccuracy)}`;


    timerDisplay.textContent = `${timeTakenSeconds.toFixed(2)}s`; // Show more precise time at end

    startButton.textContent = "Play Again?";
    startButton.disabled = false;
}

// --- Event Listeners ---
startButton.addEventListener('click', startGameProcedure);
// 'input' event is generally better for text fields than 'keydown' for actual text changes
typingInput.addEventListener('input', handleTypingInput);

// --- Initial Setup ---
// Load a passage immediately, but don't start the game until button click
resetGame(); // Call reset to load initial passage and set up UI
console.log("TypeStorm Initialized. Click 'Start New Test' to begin.");