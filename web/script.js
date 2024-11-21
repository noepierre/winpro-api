// Fonction pour récupérer le token d'authentification
async function getToken() {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password' })
        });
        
        if (!response.ok) {
            throw new Error('Erreur de connexion');
        }

        const data = await response.json();
        return data.token; // Retourne le token
    } catch (error) {
        console.error('Erreur lors de la récupération du token:', error);
        return null; // Retourne null si une erreur se produit
    }
}

let specs = {};

let currentPortalIndex = 0;
let modelsList = [];

// Fonction pour récupérer les spécifications
async function loadSpecs() {
    try {
        const token = await getToken();
        if (!token) {
            console.error('Impossible d\'obtenir le token');
            return;
        }

        const response = await fetch('http://localhost:3000/portail-specifications', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        specs = await response.json();
        const portalListElement = document.getElementById("portalList");

        const buttons = ["110", "210", "310", "510"];

        const activeButtonId = buttons.find(buttonId => document.getElementById(buttonId).classList.contains("active"));

        portalListElement.innerHTML = "";

        if (activeButtonId) {
            modelsList = specs[`models${activeButtonId}`] || [];
            currentPortalIndex = 0; // Réinitialise l'index

            modelsList.forEach((model, index) => {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.className = "col1";
                cell.textContent = model;

                row.addEventListener("click", () => {
                    document.getElementById("model").value = model;
                    updateCollection();
                    document.querySelectorAll("tr").forEach(row => row.classList.remove("active"));
                    row.classList.add("active");
                    currentPortalIndex = index; // Met à jour l'index en fonction du clic
                });

                row.appendChild(cell);
                portalListElement.appendChild(row);
            });
        }
        updateCollection();
    } catch (error) {
        console.error("Erreur lors de la lecture des spécifications des portails:", error);
    }
}

// Fonction pour passer au portail précédent
function goToLastPortal() {
    if (modelsList.length === 0) return;

    // Passe au portail suivant (boucle au début si à la fin)
    currentPortalIndex = (currentPortalIndex - 1) % modelsList.length;
    const nextModel = modelsList[currentPortalIndex];

    // Met à jour le champ "Modèle" avec le modèle suivant
    document.getElementById("model").value = nextModel;
    updateCollection();

    // Met à jour l'état actif dans la liste
    const portalRows = document.querySelectorAll("#portalList tr");
    portalRows.forEach(row => row.classList.remove("active"));
    if (portalRows[currentPortalIndex]) {
        portalRows[currentPortalIndex].classList.add("active");
    }
}

// Fonction pour passer au portail suivant
function goToNextPortal() {
    if (modelsList.length === 0) return;

    // Passe au portail suivant (boucle au début si à la fin)
    currentPortalIndex = (currentPortalIndex + 1) % modelsList.length;
    const nextModel = modelsList[currentPortalIndex];

    // Met à jour le champ "Modèle" avec le modèle suivant
    document.getElementById("model").value = nextModel;
    updateCollection();

    // Met à jour l'état actif dans la liste
    const portalRows = document.querySelectorAll("#portalList tr");
    portalRows.forEach(row => row.classList.remove("active"));
    if (portalRows[currentPortalIndex]) {
        portalRows[currentPortalIndex].classList.add("active");
    }
}

// Met à jour la collection en fonction du modèle sélectionné
function updateCollection() {
    const modelInput = document.getElementById('model').value;
    const collectionInput = document.getElementById('collection');

    // Si le modèle contient "210", on définit la collection à "WEB_ELEG_2VTX"
    if (modelInput.includes("210")) {
        collectionInput.value = "WEB_ELEG_2VTX";
    } else if (modelInput.includes("110")) {
        collectionInput.value = "WEB_ELEG_1VTL";
    } else if (modelInput.includes("310")) {
        collectionInput.value = "WEB_ELEG_COUL1";
    } else if (modelInput.includes("510")) {
        collectionInput.value = "WEB_ELEG_COUL2";
    }
}

// Fonction pour rendre un bouton actif
function toggleActive(buttonNumber) {
    // Sélectionne tous les boutons
    const buttons = document.querySelectorAll('button');
    
    // Supprime la classe 'active' de tous les boutons
    buttons.forEach(button => button.classList.remove('active'));
    
    // Ajoute la classe 'active' au bouton sélectionné
    buttons[buttonNumber - 1].classList.add('active');
}

// Fonction pour envoyer la requête au serveur
async function sendRequest() {
    event.preventDefault(); // Empêche le rechargement de la page
    const getValue = (id) => document.getElementById(id).value;
    const color1 = getValue('color1');
    var color2 = getValue('color2');
    const width = getValue('width');
    const height = getValue('height');
    const width2 = getValue('width2');
    var model = getValue('model'); // car le modèle peut être modifié sellon l'aspect
    const pose = getValue('pose');
    const sens_ouverture = getValue('sens_ouverture');
    const poteau_gauche = getValue('poteau_gauche');
    const poteau_droit = getValue('poteau_droit');
    const serrure = getValue('serrure');
    const ferrage = getValue('ferrage');
    const tole = getValue('tole');
    const poignee = getValue('poignee');
    const decor = getValue('decor');
    const gammeDecor = getValue('gammeDecor');
    const numeroRue = getValue('numero');
    const aspect = getValue('aspect');

    const token = await getToken(); // Récupère le token

    // URL de l'API avec les paramètres
    const url = `http://localhost:3000/api/generate?color1=${color1}&color2=${color2}&width=${width}&height=${height}&width2=${width2}&model=${model}&pose=${pose}&sens_ouverture=${sens_ouverture}&poteau_gauche=${poteau_gauche}&poteau_droit=${poteau_droit}&serrure=${serrure}&ferrage=${ferrage}&tole=${tole}&poignee=${poignee}&decor=${decor}&gammeDecor=${gammeDecor}&numeroRue=${numeroRue}&aspect=${aspect}`;

    try {
        // Envoi de la requête avec l'en-tête Authorization contenant le token
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Ajout du token dans l'en-tête
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error("Erreur lors de l'envoi de la requête");
        }

        // Récupération du contenu SVG
        const svgContent = await response.text();

        // Affichage du contenu SVG dans le conteneur
        document.getElementById("imageContainer").innerHTML = svgContent;
    } catch (error) {
        console.error("Erreur lors de l'envoi de la requête:", error);
    }
    
}

// Charger les spécifications à l'ouverture de la page
loadSpecs();
