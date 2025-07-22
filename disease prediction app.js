// Pet Disease Predictor with Fixed Result Parsing

const petTypes = [
  { id: 'dog', type: 'Dog', icon: '🐕' },
  { id: 'cat', type: 'Cat', icon: '🐱' },
  { id: 'rabbit', type: 'Rabbit', icon: '🐰' },
  { id: 'bird', type: 'Bird', icon: '🐦' },
  { id: 'hamster', type: 'Hamster', icon: '🐹' },
  { id: 'ferret', type: 'Ferret', icon: '🦦' },
  { id: 'turtle', type: 'Turtle', icon: '🐢' },
  { id: 'guinea-pig', type: 'Guinea Pig', icon: '🐷' }
];

const symptoms = [
  { id: 'lethargy', name: 'Lethargy' },
  { id: 'fever', name: 'Fever' },
  { id: 'weight-loss', name: 'Weight Loss' },
  { id: 'appetite-loss', name: 'Loss of Appetite' },
  { id: 'dehydration', name: 'Dehydration' },
  { id: 'vomiting', name: 'Vomiting' },
  { id: 'diarrhea', name: 'Diarrhea' },
  { id: 'constipation', name: 'Constipation' },
  { id: 'bloating', name: 'Bloating' },
  { id: 'coughing', name: 'Coughing' },
  { id: 'sneezing', name: 'Sneezing' },
  { id: 'nasal-discharge', name: 'Nasal Discharge' },
  { id: 'labored-breathing', name: 'Labored Breathing' },
  { id: 'aggression', name: 'Aggression' },
  { id: 'restlessness', name: 'Restlessness' },
  { id: 'excessive-vocalization', name: 'Excessive Vocalization' },
  { id: 'hiding', name: 'Hiding' },
  { id: 'itching', name: 'Itching' },
  { id: 'rash', name: 'Rash/Skin Irritation' },
  { id: 'hair-loss', name: 'Hair Loss' },
  { id: 'limping', name: 'Limping' },
  { id: 'swelling', name: 'Swelling' },
  { id: 'discharge', name: 'Unusual Discharge' },
  { id: 'seizures', name: 'Seizures' }
];

let selectedPet = null;
let selectedSymptoms = new Set();

document.addEventListener('DOMContentLoaded', () => {
  initializePetSelector();
  initializeSymptomGrid();
  initializePredictButton();
});

function initializePetSelector() {
  const petContainer = document.getElementById('petSelectContainer');
  const selected = petContainer.querySelector('.select-selected');
  const items = petContainer.querySelector('.select-items');

  // Populate pet options
  petTypes.forEach(pet => {
    const div = document.createElement('div');
    div.innerHTML = `${pet.icon} ${pet.type}`;
    div.addEventListener('click', () => {
      selectedPet = pet;
      selected.innerHTML = `${pet.icon} ${pet.type}`;
      items.classList.add('select-hide');
      document.getElementById('symptomSection').classList.remove('hidden');
      updateButton();
    });
    items.appendChild(div);
  });

  // Handle dropdown toggle
  selected.addEventListener('click', e => {
    e.stopPropagation();
    items.classList.toggle('select-hide');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    items.classList.add('select-hide');
  });
}

function initializeSymptomGrid() {
  const grid = document.getElementById('symptomGrid');
  symptoms.forEach(symptom => {
    const btn = document.createElement('button');
    btn.className = 'symptom-button';
    btn.textContent = symptom.name;
    btn.addEventListener('click', () => toggleSymptom(symptom.id, btn));
    grid.appendChild(btn);
  });
}

function initializePredictButton() {
  document.getElementById('predictButton').addEventListener('click', async () => {
    const button = document.getElementById('predictButton');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('loadingSpinner');
    
    // Show loading state
    button.disabled = true;
    buttonText.textContent = 'Analyzing...';
    spinner.classList.remove('hidden');
    
    try {
      const results = await getPredictionResultsFromGemini();
      displayResults(results);
    } catch (error) {
      console.error('Prediction error:', error);
      displayErrorResults();
    } finally {
      // Reset button state
      button.disabled = false;
      buttonText.textContent = 'Predict Possible Conditions';
      spinner.classList.add('hidden');
    }
  });
}

function toggleSymptom(id, btn) {
  if (selectedSymptoms.has(id)) {
    selectedSymptoms.delete(id);
    btn.classList.remove('selected');
  } else {
    selectedSymptoms.add(id);
    btn.classList.add('selected');
  }
  document.getElementById('symptomCount').textContent = selectedSymptoms.size;
  updateButton();
}

function updateButton() {
  const button = document.getElementById('predictButton');
  button.disabled = !selectedPet || selectedSymptoms.size === 0;
}

async function getPredictionResultsFromGemini() {
  const prompt = `
Act as a veterinary assistant. Given the pet type and symptoms, reply in **exact markdown format** and nothing else.

Use exactly this structure:

**1. Possible Conditions (max 3):**
- Disease Name: One-line description
- Disease Name: One-line description
- Disease Name: One-line description

**2. Recommended Vaccinations (max 2):**
- Vaccine Name
- Vaccine Name

**3. Precautionary Steps (max 3):**
- Step 1
- Step 2
- Step 3

**4. Next Steps (max 3):**
- Action 1
- Action 2
- Action 3

Now, based on:
Pet Type: ${selectedPet.type}  
Symptoms: ${Array.from(selectedSymptoms).join(', ')}
`;



  try {
    // Use the API key from your code
    const API_KEY = "AIzaSyCulCs7284L53VJsZEX9v2UPPK62_o7vA8";
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCulCs7284L53VJsZEX9v2UPPK62_o7vA8`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("🧠 Gemini Response:", text);
    
    if (!text || text === "No result") {
      throw new Error("Empty response from API");
    }
    
    const parsedResults = parseStructuredGeminiResponse(text);
    
    // Validate that we got meaningful results
    if (parsedResults.possibleDiseases.length === 0 && 
        parsedResults.recommendedVaccines.length === 0 && 
        parsedResults.precautionarySteps.length === 0 && 
        parsedResults.nextSteps.length === 0) {
      throw new Error("No meaningful data parsed from API response");
    }
    
    return parsedResults;
  } catch (err) {
    console.error("Gemini API Error:", err);
    console.log("Falling back to mock data due to API error");
    return getMockResults();
  }
}

function parseStructuredGeminiResponse(text) {
  console.log("📝 Raw Gemini response:\n", text);

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  const results = {
    possibleDiseases: [],
    recommendedVaccines: [],
    precautionarySteps: [],
    nextSteps: [],
    consultationRequired: true
  };

  let currentSection = 'possibleDiseases';

  for (let line of lines) {
    const lower = line.toLowerCase();

    // Detect section transitions
    if (lower.includes('recommended vaccine') || lower.includes('vaccination')) {
      currentSection = 'recommendedVaccines';
      continue;
    }
    if (lower.includes('precautionary') || lower.startsWith('monitor') || lower.startsWith('isolate')) {
      currentSection = 'precautionarySteps';
      continue;
    }
    if (lower.includes('next step') || lower.startsWith('schedule') || lower.startsWith('consult')) {
      currentSection = 'nextSteps';
      continue;
    }

    // Clean and store line in appropriate section
    if (currentSection === 'possibleDiseases') {
      if (line.toLowerCase().includes('possible condition')) continue;
      if (line.includes(':')) {
        results.possibleDiseases.push(line);
      }
    } else {
      results[currentSection].push(line);
    }
  }


  console.log("📊 Final parsed result:", results);
  return results;
}

function getMockResults() {
  // Mock data ONLY used as fallback when API fails
  const mockConditions = {
    'dog': {
      possibleDiseases: [
        'Kennel Cough: Common respiratory infection causing persistent coughing',
        'Gastroenteritis: Inflammation of stomach and intestines causing digestive issues',
        'Upper Respiratory Infection: Viral or bacterial infection affecting breathing'
      ],
      recommendedVaccines: [
        'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
        'Bordetella (Kennel Cough) vaccine'
      ]
    },
    'cat': {
      possibleDiseases: [
        'Upper Respiratory Infection: Common viral infection in cats',
        'Hairball Obstruction: Blockage caused by ingested hair',
        'Feline Herpes Virus: Viral infection causing respiratory symptoms'
      ],
      recommendedVaccines: [
        'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
        'Rabies vaccination'
      ]
    }
  };

  console.log("⚠️ Using mock data as fallback");
  const petData = mockConditions[selectedPet.id] || mockConditions['dog'];
  
  return {
    possibleDiseases: petData.possibleDiseases,
    recommendedVaccines: petData.recommendedVaccines,
    precautionarySteps: [
      'Monitor symptoms closely for any changes (MOCK DATA)',
      'Ensure adequate hydration and rest (MOCK DATA)',
      'Isolate from other pets if contagious condition suspected (MOCK DATA)'
    ],
    nextSteps: [
      'Schedule veterinary examination within 24-48 hours (MOCK DATA)',
      'Keep detailed symptom log for veterinarian (MOCK DATA)',
      'Follow veterinarian recommendations for treatment (MOCK DATA)'
    ],
    consultationRequired: true
  };
}

function displayResults(results) {
  const resultsSection = document.getElementById('resultsSection');
  const diseasesList = document.getElementById('diseasesList');
  const vaccinesList = document.getElementById('vaccinesList');
  const precautionsList = document.getElementById('precautionsList');
  const nextStepsList = document.getElementById('nextStepsList');
  const severityDiv = document.getElementById('severityIndicator');

  // Show results section
  resultsSection.classList.remove('hidden');
  
  console.log("🎨 Displaying results:", results);
  
  // Populate diseases list
  if (results.possibleDiseases.length > 0) {
    diseasesList.innerHTML = results.possibleDiseases.map(disease => {
      const parts = disease.split(':');
      const name = parts[0]?.trim() || disease;
      const description = parts[1]?.trim() || '';
      return `<li><strong>${name}</strong>${description ? ': ' + description : ''}</li>`;
    }).join('');
  } else {
    diseasesList.innerHTML = '<li>No specific conditions identified from API response. Continue monitoring symptoms.</li>';
  }

  // Populate vaccines list
  if (results.recommendedVaccines.length > 0) {
    vaccinesList.innerHTML = results.recommendedVaccines.map(vaccine => 
      `<li>${vaccine}</li>`
    ).join('');
  } else {
    vaccinesList.innerHTML = '<li>No specific vaccines recommended. Consult veterinarian for vaccination recommendations.</li>';
  }

  // Populate precautions list
  if (results.precautionarySteps.length > 0) {
    precautionsList.innerHTML = results.precautionarySteps.map(step => 
      `<li>${step}</li>`
    ).join('');
  } else {
    precautionsList.innerHTML = '<li>No specific precautions provided. Follow general pet care guidelines.</li>';
  }

  // Populate next steps list
  if (results.nextSteps.length > 0) {
    nextStepsList.innerHTML = results.nextSteps.map(step => 
      `<li>${step}</li>`
    ).join('');
  } else {
    nextStepsList.innerHTML = '<li>No specific next steps provided. Schedule veterinary consultation.</li>';
  }

  // Set severity indicator
  const symptomCount = selectedSymptoms.size;
  let severityClass = 'low';
  let severityText = 'Low Priority';
  
  if (symptomCount >= 5) {
    severityClass = 'high';
    severityText = 'High Priority - Immediate Attention Recommended';
  } else if (symptomCount >= 3) {
    severityClass = 'moderate';
    severityText = 'Moderate Priority - Schedule Appointment Soon';
  }

  severityDiv.className = `severity-indicator ${severityClass}`;
  severityDiv.innerHTML = `
    <div>
      <strong>Assessment for ${selectedPet.icon} ${selectedPet.type}</strong>
      <div class="severity-text">${severityText}</div>
    </div>
    <div class="symptom-count-badge">${symptomCount} symptoms</div>
  `;

  // Add animation
  setTimeout(() => {
    resultsSection.classList.add('visible');
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

function displayErrorResults() {
  const resultsSection = document.getElementById('resultsSection');
  const diseasesList = document.getElementById('diseasesList');
  const vaccinesList = document.getElementById('vaccinesList');
  const precautionsList = document.getElementById('precautionsList');
  const nextStepsList = document.getElementById('nextStepsList');

  resultsSection.classList.remove('hidden');

  diseasesList.innerHTML = '<li>Unable to analyze symptoms at this time. Please consult a veterinarian.</li>';
  vaccinesList.innerHTML = '<li>Consult veterinarian for vaccination recommendations</li>';
  precautionsList.innerHTML = '<li>Monitor your pet closely and seek professional advice</li>';
  nextStepsList.innerHTML = '<li>Contact your veterinarian for proper diagnosis</li>';

  setTimeout(() => {
    resultsSection.classList.add('visible');
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

// Optional: Add your Gemini API key here for live predictions
// window.GEMINI_API_KEY = 'your-api-key-here';