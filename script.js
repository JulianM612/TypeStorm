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
let passageCharsSpans = []; // This will now store individual character spans
let passageWords = [];    // Optional: to store word groups if needed later, not strictly used by current char logic

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
    console.log("0. loadPassageFromAPI started."); 

    if (!passageDisplay || !typingInput || !startButton) {
        console.error("CRITICAL ERROR: One or more essential DOM elements (passageDisplay, typingInput, startButton) are null in loadPassageFromAPI. Halting further API load.");
        if (passageDisplay) passageDisplay.innerHTML = '<div class="loader-container"><em>Error: UI elements missing. Cannot load passage.</em></div>';
        else console.error("passageDisplay itself is null, cannot update UI with error.");
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

    console.log("0.5. Past initial DOM manipulations in loadPassageFromAPI.");

    if (API_NINJAS_KEY === 'YOUR_API_KEY' || !API_NINJAS_KEY) {
        console.error("1. API Key for API-Ninjas is not set.");
        passageDisplay.innerHTML = '<div class="loader-container"><em>API Key not configured. Using a default passage.</em></div>';
        await new Promise(resolve => setTimeout(resolve, 2000));
        return defaultFallbackPassage;
    }

    try {
        console.log("2. Attempting to fetch from API-Ninjas...");
        const response = await fetch(API_NINJAS_URL, {
            method: 'GET',
            headers: { 'X-Api-Key': API_NINJAS_KEY }
        });
        console.log("3. Fetch response received. Status:", response.status);

        if (!response.ok) {
            let errorDetails = `API error! status: ${response.status}, Message: ${response.statusText}`;
            console.log("4a. Response not OK. Attempting to parse error JSON.", errorDetails);
            try {
                const errorData = await response.json();
                console.log("4b. Parsed error JSON:", errorData);
                if (errorData && errorData.error) { errorDetails += ` - ${errorData.error}`; }
                else if (errorData && errorData.message) { errorDetails += ` - ${errorData.message}`; }
            } catch (e) {
                console.error("4c. Could not parse error JSON:", e);
            }
            throw new Error(errorDetails);
        }

        console.log("5. Response OK. Attempting to parse success JSON.");
        const data = await response.json();
        console.log("6. Parsed success JSON:", data);

        if (Array.isArray(data) && data.length > 0 && data[0].quote) {
            const passageText = data[0].quote.trim();
            console.log("DEBUG: Raw passageText from API (after trim):", `"${passageText}"`); 

            if (passageText.length === 0) {
                console.error("7a. API returned an empty quote string.");
                throw new Error("API returned an empty quote.");
            }
            console.log("7b. Passage loaded successfully from API-Ninjas.");
            let processedPassage = passageText.replace(/\s\s+/g, ' ');
            console.log("DEBUG: Processed passageText (after replace):", `"${processedPassage}"`);
            return processedPassage;
        } else {
            console.error("8. API response not in expected format or empty quote content. Data:", data);
            throw new Error("API response not in expected format or empty quote content.");
        }
    } catch (error) {
        console.error("9. CATCH BLOCK: Could not load passage from API-Ninjas:", error.message);
        if (passageDisplay) passageDisplay.innerHTML = '<div class="loader-container"><em>Error loading passage. Using a default one.</em></div>';
        await new Promise(resolve => setTimeout(resolve, 1500));
        return defaultFallbackPassage;
    } finally {
        console.log("10. FINALLY BLOCK: Setting passagesLoaded, re-enabling inputs.");
        passagesLoaded = true;
        if (typingInput) typingInput.disabled = false;
        if (startButton) startButton.disabled = false;
        if(botModeButton) botModeButton.disabled = false;
        if (!gameActive && typingInput) {
             try {
                typingInput.focus();
             } catch (e) {
                console.warn("Could not focus typingInput in finally block:", e);
             }
         }
        console.log("11. FINALLY BLOCK: End.");
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

    passageCharsSpans = []; // Reset character spans array
    passageWords = []; // Reset words array (though not strictly used for current logic yet)

    const cleanPassageText = passageText; 
    console.log("DEBUG: Text for formatPassageForDisplay:", `"${cleanPassageText}"`);

    // MODIFIED: Split by words to handle wrapping better, then by chars within words
    const words = cleanPassageText.split(/(\s+)/); // Split by space, keeping spaces as elements

    words.forEach(wordOrSpace => {
        if (wordOrSpace.match(/\s+/)) { // If it's one or more whitespace characters
            // Create a single span for the whitespace block to ensure it takes up space for wrapping
            const spaceSpan = document.createElement('span');
            spaceSpan.classList.add('passage-space'); // Add a class for potential specific styling
            // Use multiple   if there are multiple spaces to preserve them
            spaceSpan.innerHTML = wordOrSpace.replace(/ /g, ' '); 
            passageDisplay.appendChild(spaceSpan);
            // Add each character of the space block to passageCharsSpans for indexing
            wordOrSpace.split('').forEach(spaceChar => {
                passageCharsSpans.push(spaceSpan); // Push the *same* spaceSpan for each char in the space block
                                                 // This is a simplification; for precise styling of individual spaces
                                                 // within a multi-space block, each would need its own sub-span.
                                                 // But for indexing, this maps chars to the block.
            });
        } else if (wordOrSpace.length > 0) { // If it's a word
            const wordSpanContainer = document.createElement('span'); // Container for the word's chars
            wordSpanContainer.classList.add('passage-word');
            passageDisplay.appendChild(wordSpanContainer);
            passageWords.push(wordSpanContainer);

            wordOrSpace.split('').forEach(char => {
                const charSpan = document.createElement('span');
                charSpan.innerText = char;
                wordSpanContainer.appendChild(charSpan); // Append char to its word container
                passageCharsSpans.push(charSpan); // Keep track of individual char spans for styling
            });
        }
    });

    if (passageCharsSpans.length > 0 && passageCharsSpans[0]) { // Check if first span exists
        // The first actual character span (not a container) needs the 'current' class.
        // passageCharsSpans[0] might be a space block span or the first char span of the first word.
        // We need to find the first span that isn't just a space container if we go this route.
        // Simpler: if passageCharsSpans[0] is the first character's span (as it should be with current logic)
        if (passageCharsSpans[0].innerText || passageCharsSpans[0].innerHTML === ' ') {
             passageCharsSpans[0].classList.add('current');
        } else if (passageCharsSpans.length > 1 && passageCharsSpans[1]){ // Defensive
             passageCharsSpans[1].classList.add('current');
        }

    }
    passageDisplay.scrollTop = 0;
}


function scrollPassageDisplay() {
    if (!gameActive || currentCharIndex >= passageCharsSpans.length || !passageDisplay || passageCharsSpans.length === 0) return;
    
    const currentActualSpan = passageCharsSpans[currentCharIndex];
    if (!currentActualSpan) {
        console.warn("scrollPassageDisplay: No currentActualSpan found for index", currentCharIndex);
        return;
    }

    const displayRect = passageDisplay.getBoundingClientRect();
    const spanRect = currentActualSpan.getBoundingClientRect(); // Use the actual character span
    const targetOffsetFromTop = displayRect.height * 0.33; 
    
    const desiredScrollTop = passageDisplay.scrollTop + (spanRect.top - displayRect.top) - targetOffsetFromTop;
    const currentSpanTopInDisplay = spanRect.top - displayRect.top; 
    const buffer = spanRect.height * 0.5; 

    if (currentSpanTopInDisplay > (displayRect.height - spanRect.height - buffer) || currentSpanTopInDisplay < buffer) {
        if (passageDisplay.scrollTo) {
            passageDisplay.scrollTo({ top: desiredScrollTop, behavior: 'smooth' });
        } else { 
            passageDisplay.scrollTop = desiredScrollTop; 
        }
    }
}

async function resetGame() {
    if (timerInterval) clearInterval(timerInterval);
    if (botActive) { deactivateBotMode(true); }
    gameActive = false;
    passagesLoaded = false; 
    if(passageContainer) passageContainer.classList.remove('shake-error'); 

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
    if(startButton) startButton.textContent = "Start New Test";

    if (passageCharsSpans.length > 0 && passageCharsSpans[0]) { // Check added for safety
        // Ensure the correct span gets the 'current' class after new formatting
        let firstInteractiveSpan = passageCharsSpans[0];
        // If the first element in passageCharsSpans is a container (like a space block span),
        // it might not be what we want to highlight as 'current'.
        // However, the logic in formatPassageForDisplay now directly pushes individual char spans.
        // So passageCharsSpans[0] should be the first character's span.
        if (firstInteractiveSpan.classList) { // Check if it's a DOM element with classList
             firstInteractiveSpan.classList.add('current');
        }
    }
    scrollPassageDisplay(); 
}

async function startGameProcedure() {
    await resetGame();
    if(typingInput && !typingInput.disabled) { 
        try {
            typingInput.focus();
        } catch (e) {
            console.warn("Could not focus typingInput in startGameProcedure:", e);
        }
    }
    console.log("Game ready. Start typing!");
}

function processTypedCharacter(typedChar, isBackspace = false) {
    if (isBackspace) {
        if (currentCharIndex === 0 || typedCharCount === 0) return;
        // Before decrementing currentCharIndex, remove 'current' from the current character
        if (currentCharIndex < currentPassageText.length && passageCharsSpans[currentCharIndex]) {
             passageCharsSpans[currentCharIndex].classList.remove('current');
        } else if (currentCharIndex === currentPassageText.length && passageCharsSpans[currentCharIndex-1]) {
            // If at the end, the previous char was 'current' (conceptually, though visually none might be)
             passageCharsSpans[currentCharIndex-1].classList.remove('current');
        }


        currentCharIndex--;
        const charSpanToUndo = passageCharsSpans[currentCharIndex];
        if (!charSpanToUndo) return; // Safety check

        typedCharCount--; // This should always happen for a backspace that modifies state
        if (charSpanToUndo.classList.contains('correct')) { correctCharCount--; }
        else if (charSpanToUndo.classList.contains('incorrect')) { mistakeCount--; }
        
        charSpanToUndo.classList.remove('correct', 'incorrect');
        charSpanToUndo.classList.add('current');

    } else { // Normal character typed
        if (currentCharIndex >= currentPassageText.length) return; 
        const expectedChar = currentPassageText[currentCharIndex];
        const charSpan = passageCharsSpans[currentCharIndex];
        
        if (!charSpan) {
            console.error("processTypedCharacter: No charSpan found for index", currentCharIndex);
            return;
        }

        charSpan.classList.remove('current');
        typedCharCount++;

        if (typedChar === expectedChar) {
            charSpan.classList.remove('incorrect'); // Ensure incorrect is removed if it was there
            charSpan.classList.add('correct');
            if(passageContainer) passageContainer.classList.remove('shake-error');
            correctCharCount++;
        } else {
            charSpan.classList.remove('correct'); // Ensure correct is removed
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
    if (typingInput && typingInput.disabled || botActive) return; 
    if (event.key === "Tab" || event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta") return;
    if (event.key !== "Backspace" && event.key.length > 1) return; // Allow only single char keys or backspace
    
    // Start game on first valid character (not backspace)
    if (!gameActive && event.key !== "Backspace" && event.key.length === 1) {
        gameActive = true;
        startTimer();
        if(startButton) startButton.disabled = true;
        if (botModeButton) botModeButton.disabled = true;
    }

    if (!gameActive && event.key === "Backspace") return; // Don't process backspace if game not active
    if (!gameActive) return; // General guard if game hasn't started for other keys

    if (event.key === "Backspace") {
        event.preventDefault();
        processTypedCharacter(null, true);
        if(typingInput) typingInput.value = ''; 
    } else if (event.key.length === 1 && currentCharIndex < currentPassageText.length) { // Check for single char key
        event.preventDefault();
        processTypedCharacter(event.key, false);
        if(typingInput) typingInput.value = '';
    } else if (currentCharIndex >= currentPassageText.length && event.key !== "Backspace") {
        // If text is finished, prevent further typing except backspace (which is handled by its own clause)
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
    setTimeout(() => {
        resultsModal.classList.add('active');
    }, 10);
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
startGameProcedure(); 
console.log("TypeStorm initializing, setting up initial game...");