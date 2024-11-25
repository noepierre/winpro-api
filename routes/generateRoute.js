import express from 'express';
import fs, { cp } from 'fs';
import path from 'path';
import { extractSvgAndAdjustViewBox } from '../utils/svgUtils.js';
import { generateShapeXml } from '../utils/shapeGenerator.js';
import { buildSashXml } from '../utils/sashGenerator.js';
import { fetchSpecs, adjustModelBasedOnWidthAndAspect, getModelProperties, getRemplissages } from '../utils/specUtils.js';

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

    // On récupère le modèle initial pour pouvoir le modifier ensuite si nécessaire
    let modelInput = model

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

    // Nom du modèle sans les chiffres (ex: ALTA310 => ALTA)
    const modelInputName = modelInput.match(/^[A-Za-z]+/)[0];
    
    // Initialiser la variable pour les spécifications des portails
    let specs = {};

    // -------------------------------------- RÉCUPÉRATION DES SPÉCIFICATIONS DES PORTAILS DEPUIS LE FICHER JSON -------------------------------------- //

    // Charger le fichier de spécifications et récupérer les informations nécessaires
    try {
        specs = await fetchSpecs();
    } catch (error) {
        console.error("Erreur lors de la récupération des spécifications :", error);
        return res.status(500).send("Erreur lors de la récupération des spécifications");
    }

    // -------------------------------------- GESTION DU MODÈLE SELON LE MENEAU ET L'ASPECT -------------------------------------- //

    // Comme les modèles 210 et 510 ont les mêmes remplissages, on vérifie si le modèle a une largeur maximale sans meneau pour les modèles 210
    if (model.includes("510")) {
        modelInput = modelInput.replace("510", "210");
    }
    
    // Récupérer le modèle ajusté en fonction de la largeur et de l'aspect
    modelInput = adjustModelBasedOnWidthAndAspect(specs, modelInput, width, aspect, sens_ouverture);

    // On remet 510 à la place de 210 pour les modèles 510
    if (model.includes("510")) {
        modelInput = modelInput.replace("210", "510");
    }

    // -------------------------------------- RÉCUPÉRATION DES SPÉCIFICATIONS DU MODÈLE (BICOLORATION, GD, TOLE CHANGEABLE) -------------------------------------- //

    // Vérifier si le modèle est dans la liste des modèles -G ou -D, est bicolore et a une tole changeable
    const { isGDmodel, isBicolor, tole_changeable } = getModelProperties(specs, modelInput, modelInputName);

    // -------------------------------------- RÉCUPÉRATION DES REMPLISSAGES POUR LES VANTAUX -------------------------------------- //

    // Appeler la fonction pour récupérer les remplissages pour les vantaux
    const remplissages = getRemplissages(specs, model, modelInput, modelInputName);

    // Extraire les remplissages pour les vantaux
    const { remplissage210, remplissage310, remplissage110, vantail110, vantail310, vantaux } = remplissages;


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

    // -------------------------------------- GÉNÉRATION DU XML POUR LE POTEAU INTERMÉDIAIRE -------------------------------------- //

    var transomXml = ''; // Initialiser le XML pour le poteau intermédiaire

    // Fonction pour déterminer si on doit ajouter le poteau intermédiaire
    function shouldAddTransom(model, aspect) {
        return aspect === "2" && !model.endsWith("-M2") && model.includes("310");
    }

    // Ajouter le poteau intermédiaire si nécessaire
    if (shouldAddTransom(modelInput, aspect)) {
        transomXml = `                               <TRANSOM transom_id="1" leaf_id="1" filling_id="1" pos="W / 2" code="ALU ASPECT 2VTX" info="" masonry="1" />\n`;
    }

    // Cas particulier pour le MIZA310
    if (modelInput.includes("MIZA310-M3")) {
        transomXml = `                               <TRANSOM transom_id="3" leaf_id="1" filling_id="1" pos="W / 2" code="ALU ASPECT 2VTX" info="" masonry="1" />\n`;
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
    const { shapeXml, newModelInput } = generateShapeXml(modelInput, width, height, sens_ouverture, isGDmodel);
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