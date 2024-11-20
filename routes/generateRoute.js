import express from 'express';
import fs, { cp } from 'fs';
import path from 'path';
import { extractSvgAndAdjustViewBox } from '../utils/svgUtils.js';
import { generateShapeXml } from '../utils/shapeGenerator.js';
import { buildSashXml } from '../utils/sashGenerator.js';
import { getToken } from '../utils/jwtUtils.js';

const router = express.Router();

// Route GET pour générer un SVG
router.get('/generate', async (req, res) => {
    // Récupérer tous les paramètres depuis la requête
    // La description de tous les paramètres est disponible dans le fichier README.md
    const {
        color1, // Couleur principale
        color2, // Couleur secondaire
        width, // Largeur
        height, // Hauteur
        width2, // Largeur du deuxième vantail si vantaux asymétriques (0 si vantaux symétriques)
        model, // Modèle
        pose, // Type de pose
        sens_ouverture, // Sens d'ouverture
        poteau_gauche, // Poteaux
        poteau_droit, // Poteaux
        serrure, // Serrure
        ferrage, // Ferrage
        tole, // Tôle
        poignee, // Poignée
        decor, // Décor du modèle
        gammeDecor, // Gamme de décor
        numeroRue, // Numéro de rue pour le décor
        aspect // Aspect du modèle (avec ou sans meneau)
    } = req.query;

    // -------------------------------------- INITIALISATION DES VARIABLES PRINCIPALES -------------------------------------- //

    // Copier le modèle pour le modifier si nécessaire
    let modelInput = model;

    // Mettre à jour la collection selon le modèle
    let collection = "";

    if (modelInput.includes("210")) {
        collection = "WEB_ELEG_2VTX";
    } else if (modelInput.includes("110")) {
        collection = "WEB_ELEG_1VTL";
    } else if (modelInput.includes("310")) {
        collection = "WEB_ELEG_COUL1";
    } else if (modelInput.includes("510")) {
        collection = "WEB_ELEG_COUL2";
    }

    // Vérifier si le modèle est bicolore
    let isBicolor = false;

    // Vérifier si le modèle est dans la liste des modèles -G ou -D
    let isGDmodelInput = false;

    // Récupérer les remplissages pour les vantaux
    let vantaux = [];

    // Vérifier si il existe des remplissages pour le modèle
    let remplissage210 = false;

    // Vérifier si le modèle a un remplissage pour le modèle 310
    let remplissage310 = false;

    // Vérifier si le modèle a un remplissage pour les modèles 110
    let remplissage110 = false;

    // Remplissages pour les modèles
    let vantail110 = [];
    let vantail310 = [];

    // On vérifie si le modèle a une tole changeable ou non
    let tole_changeable = false;

    // Largeur maximale sans meneau
    let maxWidth_without_m;

    // Nom du modèle sans les chiffres (ex: ALTA310 => ALTA)
    const modelInputName = modelInput.match(/^[A-Za-z]+/)[0];
    
    // Initialiser la variable pour les spécifications des portails
    let specs = {};

    // -------------------------------------- RÉCUPÉRATION DES SPÉCIFICATIONS DES PORTAILS DEPUIS LE FICHER JSON -------------------------------------- //

    // Charger le fichier de spécifications et récupérer les informations nécessaires
    try {
        const token = await getToken(); // Récupérer le token

        if (!token) {
            console.error('Impossible d\'obtenir le token'); // Si le token n'est pas récupéré, afficher un message d'erreur
            return;
        }

        // Récupérer le fichier JSON des spécifications des portails
        const response = await fetch('http://localhost:3000/portail-specifications', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des spécifications'); // Si la récupération des spécifications échoue, afficher un message d'erreur
        }

        specs = await response.json();

    } catch (error) {
        console.error('Erreur lors de la récupération des spécifications des portails:', error);
    }

    // -------------------------------------- GESTION DU MODÈLE SELON LE MENEAU ET L'ASPECT -------------------------------------- //

    // Vérifier si le modèle a une largeur maximale sans meneau
    maxWidth_without_m = specs.maxWidth_without_m.some(model => model.model === modelInput)

    // Si le modèle est trouvé dans la liste des modèles sans meneau, on récupère la largeur maximale
    if (maxWidth_without_m) {

        maxWidth_without_m = specs.maxWidth_without_m.filter(model => model.model === modelInput)[0].maxWidth;

    } else { // Si le modèle n'est pas trouvé dans la liste, on vérifie si le modèle -M existe
        modelInput = modelInput + "-M";
        maxWidth_without_m = specs.maxWidth_without_m.some(model => model.model === modelInput)

        if (!maxWidth_without_m) {
            modelInput = modelInput.replace("-M", ""); // Si le modèle -M n'existe pas, on enlève -M car c'est un modèle qui n'a pas de largeur maximale
        } else {
            maxWidth_without_m = specs.maxWidth_without_m.filter(model => model.model === modelInput)[0].maxWidth; // Si le modèle existe avec -M, on récupère la largeur maximale de ce modèle
        }
    }

    // Passer au modèle -M si la largeur est supérieure à maxWidth_without_m
    if (maxWidth_without_m && width > maxWidth_without_m) {
        if (modelInput.endsWith("0") || modelInput.endsWith("-D") || modelInput.endsWith("-G")) {
            modelInput = modelInput.replace("0", "0-M");
        } else if (modelInput.endsWith("-M")) {
            modelInput = modelInput + "2";
        }
    }

    // Cas particulier pour le modèle MIZA310 qui est chiant
    if (modelInput.includes("MIZA310") && (aspect === "2" || width > maxWidth_without_m)) {
        if (modelInput.endsWith("0")) {
            modelInput = modelInput + "-M3";
        } else if (modelInput.endsWith("-M")) {
            modelInput = modelInput + "3";
        }
    }        

    // Si le modèle est un 310 de base et que l'aspect est 2, on ajoute -M à la fin du modèle
    if (aspect === "2" && modelInput.endsWith("310") && maxWidth_without_m) {
        modelInput = modelInput + "-M";
    }

    // SI le modèle est déjà un modèle -M2 et que l'aspect est 2, on remplace -M2 par -M3
    if (aspect === "2" && modelInput.endsWith("M2")) {
        modelInput = modelInput.replace("-M2", "-M3");
    }

    // -------------------------------------- RÉCUPÉRATION DES SPÉCIFICATIONS DU MODÈLE -------------------------------------- //

    // Vérifier si le modèle est dans la liste des modèles -G ou -D
    isGDmodelInput = specs.models_DG.includes(modelInput);

    // Vérifier si le modèle est un modèle bicolore
    isBicolor = specs.bicolores.includes(modelInputName);

    // Vérifier si le modèle a une tole changeable
    tole_changeable = specs.models_tole_changeable.includes(modelInput);

    // -------------------------------------- RÉCUPÉRATION DES REMPLISSAGES POUR LES VANTAUX -------------------------------------- //

    // Remplir vantail110 par les remplissages pour les modèles 110
    if (model.includes("110")) {

        // Vérifier si le modèle a un remplissage pour les modèles 110
        remplissage110 = specs.remplissage_vantail_110.some(vantail => vantail.model === modelInputName);

        if (modelInput.endsWith("-M")) {
            vantail110 = specs.remplissage_vantail_110.filter(vantail => vantail.model === modelInput);
        } else {
            vantail110 = specs.remplissage_vantail_110.filter(vantail => vantail.model === modelInputName);
        }
         
    } else if (model.includes("210")) {

        if (modelInput.endsWith("-M")) {
            remplissage210 = specs.remplissage_vantails_210.some(vantail => vantail.model === modelInput);

            vantaux = specs.remplissage_vantails_210.filter(vantail => vantail.model === modelInput);
        } else {
            remplissage210 = specs.remplissage_vantails_210.some(vantail => vantail.model === modelInputName);

            vantaux = specs.remplissage_vantails_210.filter(vantail => vantail.model === modelInputName);
        }

    } else if (model.includes("310")) {

        // Vérifier si le modèle a un remplissage pour les modèles 310
        remplissage310 = specs.remplissage_vantail_310.some(vantail => vantail.model.includes(modelInputName));

        // Remplir vantail310 par les remplissages pour les modèles 310
        if (modelInput.endsWith("-M3")) {
            vantail310 = specs.remplissage_vantail_310.filter(vantail => vantail.model === modelInput);
        } else if (modelInput.endsWith("-M2")) {
            vantail310 = specs.remplissage_vantail_310.filter(vantail => vantail.model === modelInput);
        } else if (modelInput.endsWith("-M")) {
            vantail310 = specs.remplissage_vantail_310.filter(vantail => vantail.model === modelInput);
        } else {
            vantail310 = specs.remplissage_vantail_310.filter(vantail => vantail.model === modelInputName);
        }

    }

    // -------------------------------------- GÉNÉRATION DU XML POUR LE POTEAU INTERMÉDIAIRE -------------------------------------- //

    var transomXml = ''; // Initialiser le XML pour le poteau intermédiaire

    // Si l'aspect est 2 et que le modèle ne se termine pas par -M2 et que le modèle n'est pas un 310, alors on ajoute le poteau intermédiaire
    if (aspect === "2" && !modelInput.endsWith("-M2") && modelInput.includes("310")) {

        transomXml = `                               <TRANSOM transom_id="1" leaf_id="1" filling_id="1" pos="W / 2" code="ALU ASPECT 2VTX" info="" masonry="1" />\n`;

        // Cas particulier pour le modèle MIZA310
        if (modelInput === "MIZA310-M3") {
            transomXml = `                               <TRANSOM transom_id="3" leaf_id="1" filling_id="1" pos="W / 2" code="ALU ASPECT 2VTX" info="" masonry="1" />\n`;
        }
    }

    // -------------------------------------- COLORATION DU MODÈLE (COULEUR SECONDAIRE et REMPLISSAGES) -------------------------------------- //

    // Ajouter la couleur secondaire si le modèle est bicolore
    const bicoloration = isBicolor ? `<FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n` : '';

    // Initialiser le remplissage pour les portillons (110)
    let remplissage_vantail_110 = 0;

    // Initialiser les remplissages pour les 2 vantaux (210)
    let remplissage_vantail1 = 0;
    let remplissage_vantail2 = 0;

    // Initialiser le remplissage du vantail pour les coulissants (310)
    let remplissage_vantail_310 = 0;

    // Récupérer les remplissages pour les vantaux et affecter les valeurs aux variables
    if (remplissage210 && vantaux.length > 0) {
        ({ remplissage_vantail1, remplissage_vantail2 } = vantaux[0]);
    } else if (remplissage310 && vantail310.length > 0) {
        ({ remplissage_vantail_310 } = vantail310[0]);
    } else if (remplissage110 && vantail110.length > 0) {
        ({ remplissage_vantail_110 } = vantail110[0]);
    }

    // -------------------------------------- MOTORISATION DU MODÈLE -------------------------------------- //

    // Si modèle est 310 ou 510, que serrure contient "sans" alors on ajoute le moteur    
    let motorXml = '';

    if ((modelInput.includes("310") || modelInput.includes("510")) && serrure.includes("sans")) {
        motorXml = `<FITTING_OPTION code="QQ_Motor" value="QQ_Motor_ELI" />\n`;
    } else {
        motorXml = '';
    }

    // -------------------------------------- GÉNÉRATION DE <SASH> -------------------------------------- //

    // Déterminer le sens
    const sens = sens_ouverture.includes("gauche") ? "1" : "0";

    // Utiliser la fonction pour générer le sashXml
    // Appeler buildSashXml
    const SashXml = buildSashXml({
        width2,
        serrure,
        poignee,
        motorXml,
        ferrage,
        sens,
        modelInput,
        remplissage_vantail1,
        remplissage_vantail2,
        remplissage_vantail_310,
        remplissage_vantail_110,
        color2,
        tole_changeable,
        tole,
        transomXml,
    });

    // -------------------------------------- GÉNÉRATION DE <SHAPE> -------------------------------------- //

    // Utiliser la fonction pour générer le shapeXml
    // Appeler generateShapeXml 
    const { shapeXml, newModelInput } = generateShapeXml(modelInput, width, height, sens_ouverture, isGDmodelInput);
    modelInput = newModelInput; // Mettre à jour le modèle avec le nouveau modèle

    // -------------------------------------- GÉNÉRATION DE <PERIPHERAL_PROFILES> -------------------------------------- //

    // Construire le XML pour les profils périphériques
    if (gammeDecor === "QP_GamDecor_Sans") {
        var peripheralProfileXml = ``
    } else {
        var peripheralProfileXml = `
                    <PERIPHERAL_PROFILES>
                        <PERIPHERAL_PROFILE code="DECORS">
                            <PERIPHERAL_PROFILE_OPTION code="QP_GamDecor" value="${gammeDecor}" />
                            <PERIPHERAL_PROFILE_OPTION code="QP_ModDecor" value="${decor}" />
                            <PERIPHERAL_PROFILE_OPTION code="QP_NumRue" value="${numeroRue}" />
                        </PERIPHERAL_PROFILE>
                    </PERIPHERAL_PROFILES>
        `;
    }

    // -------------------------------------- PRÉPARATION DE LA REQUÊTE SOAP --------------------------------

    // Lire le fichier XML de la requête
    const requestPath = path.resolve('requete/template.xml');
    let requestContent = fs.readFileSync(requestPath, 'utf-8');

    // Remplacer les placeholders dans le fichier SVG
    requestContent = requestContent
        .replace('{{collection}}', collection)
        .replace('{{model}}', modelInput)

        .replace('{{width}}', width)
        .replace('{{height}}', height)
        .replace('{{shapeXml}}', shapeXml)
        
        .replace('{{color1}}', color1)
        .replace('{{bicoloration}}', bicoloration) // Ajouter la couleur secondaire si le modèle est bicolore

        .replace('{{sashXml}}', SashXml)

        .replace('{{peripheralProfileXml}}', peripheralProfileXml)

        .replace('{{pose}}', pose)
        .replace('{{sens_ouverture}}', sens_ouverture)
        .replace('{{poteau_gauche}}', poteau_gauche)
        .replace('{{poteau_droit}}', poteau_droit);

    // Ecrire le contenu de la requête dans un fichier
    const requestFilePath = path.resolve('temp/request.xml');
    fs.writeFileSync(requestFilePath, requestContent);

    // -------------------------------------- ENVOI DE LA REQUÊTE SOAP -------------------------------------- //

    // Envoi de la requête SOAP, récupération de la réponse, génération du SVG et renvoi au client
    try {
        console.log("------------ Nouvelle requête ------------");
        console.log(`\nParamètres de la requête : couleur1=${color1}, couleur2=${color2}, largeur=${width}, hauteur=${height}, largeur2=${width2}, modèle=${modelInput}, pose=${pose}, sens_ouverture=${sens_ouverture}, poteau_gauche=${poteau_gauche}, poteau_droit=${poteau_droit}, serrure=${serrure}, ferrage=${ferrage}, poignée=${poignee}, tole=${tole}, décor=${decor}, gammeDecor=${gammeDecor}, numéroRue=${numeroRue}, aspect=${aspect}`);
        console.log("\nEnvoi de la requête SOAP...");
        
        const response = await fetch("http://127.0.0.1:8001/soap/IWebshopv1", {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml; charset=utf-8' },
            body: requestContent
        });

        const responseText = await response.text();

        console.log("Réponse SOAP reçue.\n");

        // enregistrer la réponse dans un fichier
        const responseFilePath = path.resolve('temp/response.xml');
        fs.writeFileSync(responseFilePath, responseText);

        // extraire les informations de la réponse
        const errorCode = responseText.match(/&lt;ERROR_CODE&gt;(\d+)&lt;\/ERROR_CODE&gt;/)[1];

        console.log("Code d'erreur :", errorCode);

        // Extraire ERROR_MESSAGE et ERROR_EXPLANATION si le code d'erreur n'est pas 0
        if (errorCode !== "0") {
            const decodedResponse = responseText
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');

            // Extraire les informations d'erreur du texte décodé avec le flag 's' pour capturer les retours à la ligne
            const errorMessageMatch = decodedResponse.match(/<ERROR_MESSAGE>(.+)<\/ERROR_MESSAGE>/);
            const errorExplanationMatch = decodedResponse.match(/<ERROR_EXPLANATION>(.+)<\/ERROR_EXPLANATION>/s);

            const errorMessage = errorMessageMatch ? errorMessageMatch[1] : "Erreur inconnue";
            const errorExplanation = errorExplanationMatch ? errorExplanationMatch[1].trim() : "Aucune explication disponible";

            console.error(`Erreur : ${errorMessage}`);
            console.error(`Explication : ${errorExplanation}`);
            return res.status(500).send(`Erreur : ${errorMessage}`);

        }

        // Extraire et ajuster le SVG
        const svgElement = extractSvgAndAdjustViewBox(responseText, width, height);

        // Ecrire le contenu du SVG dans un fichier
        const svgFilePath = path.resolve('temp/portail.svg');
        fs.writeFileSync(svgFilePath, svgElement);

        // Renvoi du SVG généré au client
        res.header("Content-Type", "image/svg+xml");
        res.send(svgElement);
        console.log("Réponse SOAP retournée au client avec succès.\n");
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la requête SOAP:', error);
        res.status(500).send('Erreur lors de l\'envoi de la requête SOAP');
    }
});


export default router;