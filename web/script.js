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

// Fonction pour charger les spécifications au chargement de la page
async function loadSpecs() {
    try {
        // Récupère le token d'authentification
        const token = await getToken();
        if (!token) {
            console.error('Impossible d\'obtenir le token');
            return;
        }

        // Envoi de la requête pour obtenir les spécifications des portails
        const response = await fetch('http://localhost:3000/portail-specifications', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        specs = await response.json();

        // Sélection de l'élément de la liste des portails
        const portalListElement = document.getElementById("portalList");

        // Liste des identifiants de boutons à vérifier
        const buttons = ["110", "210", "310", "510"];
        
        // Descriptions des boutons pour chaque type de portail
        const descriptions = {
            "110": "Portillons",
            "210": "Portails 2 vantaux",
            "310": "Portails coulissants",
            "510": "Portails coulissants 2 vantaux",
        };

        // Récupère la description correspondant au bouton actif
        const activeButtonId = buttons.find(buttonId => document.getElementById(buttonId).classList.contains("active"));
        const description = descriptions[activeButtonId];

        // Efface le contenu actuel de la liste des portails
        portalListElement.innerHTML = "";

        // Vérifie chaque bouton et charge les modèles correspondants
        buttons.forEach(buttonId => {
            if (document.getElementById(buttonId).classList.contains("active")) {
                // Récupère les modèles associés au bouton actif
                const models = specs[`models${buttonId}`] || [];

                // Ajoute chaque modèle à la liste des portails
                models.forEach(model => {
                    const row = document.createElement("tr");
                    const cell = document.createElement("td");
                    cell.className = "col1";
                    cell.textContent = model;

                    // Ajoute un événement de clic pour chaque modèle
                    row.addEventListener("click", () => {
                        document.getElementById("model").value = model; // Remplie le champ "Modèle"
                        updateCollection(); // Met à jour la collection
                        // Passe la classe 'active' au modèle dans le tableau
                        document.querySelectorAll("tr").forEach(row => row.classList.remove("active"));
                        row.classList.add("active");
                    });

                    row.appendChild(cell);
                    portalListElement.appendChild(row);
                });

                // Met à jour la description en fonction du bouton actif
                const descriptionElement = document.getElementById("description");
                descriptionElement.innerHTML = `<h2>${description}</h2>`;

                // Met à jour la collection
                updateCollection();
            }
        });
    } catch (error) {
        console.error("Erreur lors de la lecture des spécifications des portails:", error);
    }
}

// Met à jour la collection en fonction du modèle sélectionné
function updateCollection() {
    const modelInput = document.getElementById('model').value;
    const collectionInput = document.getElementById('collection');

    // Si le modèle contient "210", on définit la collection à "WEB_ELEG_2VTX"
    if (modelInput.includes("210")) {
        collectionInput.value = "WEB_ELEG_2VTX";
    } else {
        // Recherche la collection correspondant au modèle
        const collection = specs.model_collections[modelInput] || ''; // Valeur par défaut si non trouvée
        collectionInput.value = collection;
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
    const poignee = getValue('poignee');
    const decor = getValue('decor');
    const gammeDecor = getValue('gammeDecor');
    const numeroRue = getValue('numero');
    const aspect = getValue('aspect');

    // Déterminer le sens
    const sens = sens_ouverture.includes("gauche") ? "1" : "0";

    const token = await getToken(); // Récupère le token

    // URL de l'API avec les paramètres
    const url = `http://localhost:3000/api/generate?color1=${color1}&color2=${color2}&width=${width}&height=${height}&width2=${width2}&model=${model}&pose=${pose}&sens_ouverture=${sens}&poteau_gauche=${poteau_gauche}&poteau_droit=${poteau_droit}&serrure=${serrure}&ferrage=${ferrage}&poignee=${poignee}&decor=${decor}&gammeDecor=${gammeDecor}&numeroRue=${numeroRue}&aspect=${aspect}`;

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
