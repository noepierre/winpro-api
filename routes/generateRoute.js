import express from 'express';
import fs from 'fs';
import path from 'path';
import { extractSvgAndAdjustViewBox } from '../utils/svgUtils.js';


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
        poignee, // Poignée
        decor, // Décor du modèle
        gammeDecor, // Gamme de décor
        numeroRue, // Numéro de rue pour le décor
        aspect // Aspect du modèle (avec ou sans meneau)
    } = req.query;

    // Copier le modèle pour le modifier si nécessaire
    let modelInput = model;

    // Mettre à jour la collection selon le modèle
    // Si le modèle contient 210 -> WEB_ELEG_2VTX sinon si le modèle contient 210 -> WEB_ELEG_1VTL sinon ''
    let collection = modelInput.includes("210") ? "WEB_ELEG_2VTX" : modelInput.includes("110") ? "WEB_ELEG_1VTL" : '';

    let specs = {};

    // Vérifier si le modèle est bicolore
    let isBicolor = false;

    // Vérifier si le modèle est dans la liste des modèles -G ou -D
    let isGDmodelInput = false;

    // Récupérer les remplissages pour les vantaux
    let vantaux = [];

    // Vérifier si il existe des remplissages pour le modèle
    let hasFillings = false;

    async function getToken() {
        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'password' }) // A changer peut-être
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
    
    let modelInputName = '';

    // Charger le fichier de spécifications et récupérer les informations nécessaires
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

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des spécifications');
        }

        const specs = await response.json();

        // Vérifier si le modèle est un modèle bicolor
        isBicolor = specs.bicolores.includes(modelInput);

        // Vérifier si le modèle est dans la liste des modèles -G ou -D
        isGDmodelInput = specs.models_DG.includes(modelInput);

        // Trouver les remplissages pour le modèle spécifié
        modelInputName = modelInput.match(/^[A-Za-z]+/)[0]; // Extraire le nom du modèle sans les chiffres

        vantaux = specs.remplissage_vantail.filter(vantail => vantail.model === modelInputName);

        // Vérifier si il existe des remplissages pour le modèle
        hasFillings = specs.remplissage_vantail.some(vantail => vantail.model === modelInputName);

    } catch (error) {
        console.error('Erreur lors de la récupération des spécifications des portails:', error);
    }
    
    // Déterminer le sens
    const sens = sens_ouverture.includes("gauche") ? "1" : "0";

    // Ajouter la couleur secondaire si le modèle est bicolore
    const bicoloration = isBicolor ? `<FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n` : '';

    let remplissage_vantail1 = 0;
    let remplissage_vantail2 = 0;

    // Récupérer les remplissages pour les vantaux
    if (vantaux.length > 0) {
        ({ remplissage_vantail1, remplissage_vantail2 } = vantaux[0]);
    }

    var nombre_panneaux = 2;
    var transomXml = ''; // Initialiser le XML pour le poteau intermédiaire

    // Ajuster le modèle en fonction de l'aspect et de la largeur
    if (aspect === "1" && width > 4000 && !modelInput.endsWith("-M") && modelInput.includes("310")) {
        modelInput += "-M";
    }

    if (aspect === "2" && !modelInput.endsWith("-M") && modelInput.includes("310")) {
        modelInput += "-M";
        transomXml = `              <TRANSOM transom_id="1" leaf_id="1" filling_id="1" pos="W / 2" code="ALU ASPECT 2VTX" info="" masonry="1" />`;
    }

    // Si le modèle est de type '310' et qu'il existe des remplissages pour ce modèle
    if (modelInput.includes("310") && specs.remplissage_vantail.some(vantail => vantail.modelInput === modelInputName)) {
        // Modèle 310 n'a qu'un seul vantail
        let nombre_panneaux = 1;

        // Fusionner les remplissages du vantail 2 dans le vantail 1 pour les modèles '310'
        // Exemple : si remplissage_vantail1 = [2] et remplissage_vantail2 = [2], le résultat sera remplissage_vantail1 = [2, 4]
        
        // Trouver le plus grand remplissage existant dans les deux vantaux
        const maxRemplissage1 = Math.max(...remplissage_vantail1, 0); // Si vide, renvoie 0
        const maxRemplissage2 = Math.max(...remplissage_vantail2, 0);
        const maxRemplissage = Math.max(maxRemplissage1, maxRemplissage2);

        // Ajouter les éléments de remplissage_vantail2 avec un décalage pour les fusionner dans remplissage_vantail1
        remplissage_vantail1 = remplissage_vantail1.concat(
            remplissage_vantail2.map(value => value + maxRemplissage)
        );
        // Vider le remplissage du vantail 2 car tout est transféré dans le vantail 1
        remplissage_vantail2 = [];
    }

    // Si modèle est 310 ou 510, que serrure contient "sans" alors on ajoute le moteur
    
    let motorXml = '';

    if ((modelInput.includes("310") || modelInput.includes("510")) && serrure.includes("sans")) {
        motorXml = `<FITTING_OPTION code="QQ_Motor" value="QQ_Motor_ELI" />\n`;
    } else {
        motorXml = '';
    }

    // Construire le XML pour les vantaux
    const buildSashXml = () => {
        let sashXml = `<SASH id="1" leaves="${nombre_panneaux}" leaf_orientation="H" door="0" fixe="0" doorfixe="0">\n
                    <ASYMETRIC_LEAVES_0>${width2}</ASYMETRIC_LEAVES_0>\n
                    <FITTING_OPTION code="QQ_serrure" value="${serrure}" />\n
                    <FITTING_OPTION code="QQ_poignee" value="${poignee}" />\n
                    ${motorXml}
                    <SASH_OPTION code="QQ_ferrage" value="${ferrage}" />\n
                    <DIRECTION>${sens}</DIRECTION>\n\n`;

        if (!modelInput.includes("110")) {
            
            for (let i = 0; i < remplissage_vantail1.length; i++) {
                sashXml += `                    <FILLING leaf_id="1" filling_id="${remplissage_vantail1[i]}">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                    </FILLING>\n\n`;
            }
        
        
            for (let i = 0; i < remplissage_vantail2.length; i++) {
                sashXml += `                    <FILLING leaf_id="2" filling_id="${remplissage_vantail2[i]}">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                    </FILLING>\n\n`;
            }

        // Si c'est un modèle -M et que remplissage_vantail1 existe, on ajoute un remplissage pour les ou la zone spécifiée ET un remplissage pour les ou la zone spécifiée + 1
        } else if (remplissage_vantail1.length > 0 && modelInput.endsWith("-M")) {
            for (let i = 0; i < remplissage_vantail1.length; i++) {
                sashXml += `                    <FILLING leaf_id="1" filling_id="${remplissage_vantail1[i]}">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                    </FILLING>\n\n`;
            }
        
            for (let i = 0; i < remplissage_vantail1.length; i++) {
                sashXml += `                    <FILLING leaf_id="1" filling_id="${remplissage_vantail1[i] + 1}">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                    </FILLING>\n\n`;
            }
        
        // Si c'est le modèle MIZA110, la zone à remplir est la zone 2 (cas particulier)
        } else if (model === "MIZA110") {
            sashXml += `                    <FILLING leaf_id="1" filling_id="2">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                    </FILLING>\n\n`;
        
        // Si le remplissage_vantail1 existe pour le modèle, on ajoute les remplissages pour le vantail 1
        } else if (remplissage_vantail1.length > 0 && !modelInput.endsWith("-M")) {

            if (sens == 0) { // Si le modèle le sens est 0, on ajoute le remplissage correspondant à la zone 2 du vantail 1 (cas particulier si les deux vantaux sont différents)
                sashXml += `                    <FILLING leaf_id="1" filling_id="${remplissage_vantail2[0]}">\n
                                    <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                        </FILLING>\n\n`;
            } else {
                sashXml += `                    <FILLING leaf_id="1" filling_id="${remplissage_vantail1[0]}">\n
                                    <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                        </FILLING>\n\n`;
            }
            
            if (remplissage_vantail1.length > 1) {
                sashXml += `                    <FILLING leaf_id="1" filling_id="${remplissage_vantail1[1]}">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                    </FILLING>\n\n`;
            }

        // Si c'est un modèle -M et que remplissage_vantail1 n'existe pas pour le modèle, on ajoute un remplissage pour la zone 1 et 2 du vantail 1
        } else if (remplissage_vantail1 === 0 && modelInput.endsWith("-M")) {
            sashXml += `                    <FILLING leaf_id="1" filling_id="1">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                    </FILLING>\n\n`;

            sashXml += `                    <FILLING leaf_id="1" filling_id="2}">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                    </FILLING>\n\n`;

        } else {
            sashXml += `                    <FILLING leaf_id="1" filling_id="2">\n
                                    <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n
                        </FILLING>\n\n`;
        }

        sashXml += transomXml; // Ajouter le poteau intermédiaire si nécessaire
        sashXml += `                    </SASH>\n`;
        
        return sashXml;
    };

    // Si le modèle n'est pas un portillon
    if (!modelInput.includes("110")) {
        // Ajuster les dimensions pour les modèles B, BH, BB, B, CDG et CDGI
        if (modelInput.endsWith("-B") || modelInput.endsWith("-BB") || modelInput.endsWith("-BH") || modelInput.endsWith("-CDG") || modelInput.endsWith("-CDGI")) {

            if (modelInput.endsWith("-BH")) {
                // Si le modèle est un modèle -BH ou -BB, C = width/2, D = C * Tangeant(7°) et E = C * Tangeant(7°)
                var C = width / 2;
                var D = C * Math.tan(7 * Math.PI / 180);
                var E = C * Math.tan(7 * Math.PI / 180);
                var shapeXml = `<SHAPE id="16" c="${C}" d="${D}" e="${E}" />`;
            } else if (modelInput.endsWith("-BB")) {
                // Si le modèle est un modèle -BH ou -BB, C = width/2, D = - (C * Tangeant(7°)) et E = - (C * Tangeant(7°))
                var C = width / 2;
                var D = - (C * Math.tan(7 * Math.PI / 180));
                var E = - (C * Math.tan(7 * Math.PI / 180));
                var shapeXml = `<SHAPE id="16" c="${C}" d="${D}" e="${E}" />`;
            } else if (modelInput.endsWith("-B")) {
                // Si le modèle est un modèle -B, C = 7514 * (1 - racine(1 - (width^2/4*7514^2)))
                var C = 7514 * (1 - Math.sqrt(1 - (width ** 2 / (4 * 7514 ** 2))));
                var shapeXml = `<SHAPE id="8" c="${C}" />`;
            } else if (modelInput.endsWith("-CDG")) {
                // Si le modèle est un modèle -CDG, C = 200, E = 1686, F = 1804, D = (width - 2329) / 4 + 15
                var C = 200;
                var E = 1686;
                var F = 1804;
                var D = (width - 2329) / 4 + 15;
                var shapeXml = `<SHAPE id="42" c="${C}" d="${D}" e="${E}" f="${F}" />`;
            } else { // CDGI
                // Si le modèle est un modèle -CDGI, C = -200, E = 1804, F = 1686, D = (width - 2329) / 4 + 15
                var C = -200;
                var E = 1804;
                var F = 1686;
                var D = (width - 2329) / 4 + 15;
                var shapeXml = `<SHAPE id="42" c="${C}" d="${D}" e="${E}" f="${F}" />`;
            }

        } else {
            var shapeXml = '';
        }
    } else { // Si le modèle est un portillon
        // Ajuster les dimensions pour les modèles B, BH, BB, B, CDG et CDGI
        if (modelInput.includes("-B") || modelInput.includes("-CDG") || modelInput.includes("-CDGI")) {
            console.log("Ajustement des dimensions pour le modèle:", modelInput);

            if (modelInput.includes("-B")) {
                // Si le modèle est un modèle -B, C = 7514, E = B - C
                var C = 7514
                var E = height - C;
                // si le sens d'ouverture est à gauche, d = weight sinon d=0
                if (sens_ouverture.includes("gauche")) {
                    var D = width;

                    // ajouter -D à la fin du modèle
                    modelInput = modelInput + "-G";
                } else {
                    var D = 0;

                    // ajouter -G à la fin du modèle
                    modelInput = modelInput + "-D";
                }
                var shapeXml = `<SHAPE id="5" c="${C}" d="${D}" e="${E}" />`;
            } else if (modelInput.includes("-CDG") && sens_ouverture.includes("droite")) {
                // Si le modèle est un modèle -CDG et ouverture droite, C = 200, E = 904, F = 786, D = (weight - 797.5) / 2 + 5
                var C = 200;
                var E = 904;
                var F = 786;
                var D = (width - 797.5) / 2 + 5;
                var shapeXml = `<SHAPE id="43" orientation="1" c="${C}" d="${D}" e="${E}" f="${F}" />`;

                // ajouter -D à la fin du modèle
                modelInput = modelInput + "-D";
            } else if (modelInput.includes("-CDG") && sens_ouverture.includes("gauche")) {
                // Si le modèle est un modèle -CDG et ouverture gauche, C = 200, E = 786, F = 904, D = (weight - 797.5) / 2 - 5*
                var C = 200;
                var E = 786;
                var F = 904;
                var D = (width - 797.5) / 2 - 5;
                var shapeXml = `<SHAPE id="43" orientation="-1" c="${C}" d="${D}" e="${E}" f="${F}" />`;

                // ajouter -G à la fin du modèle
                modelInput = modelInput + "-G";
            }

        // Sinon, si le modèle est dans "modelInputs_DG" dans le fichier de spécifications on ajoute -D ou -G selon le sens d'ouverture
        } else if (isGDmodelInput) {

            if (sens_ouverture.includes("droite")) {
                modelInput = modelInput + "-D";
                shapeXml = '';
            } else {
                modelInput = modelInput + "-G";
                shapeXml = '';
            }            

        } else {
            var shapeXml = '';

        }
    }

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

        .replace('{{sashXml}}', buildSashXml())

        .replace('{{peripheralProfileXml}}', peripheralProfileXml)

        .replace('{{pose}}', pose)
        .replace('{{sens_ouverture}}', sens_ouverture)
        .replace('{{poteau_gauche}}', poteau_gauche)
        .replace('{{poteau_droit}}', poteau_droit);

    // Ecrire le contenu de la requête dans un fichier
    const requestFilePath = path.resolve('temp/request.xml');
    fs.writeFileSync(requestFilePath, requestContent);

    // Envoi de la requête SOAP, récupération de la réponse, génération du SVG et renvoi au client
    try {
        console.log("------------ Nouvelle requête ------------");
        console.log(`\nParamètres de la requête : couleur1=${color1}, couleur2=${color2}, largeur=${width}, hauteur=${height}, largeur2=${width2}, modèle=${modelInput}, pose=${pose}, sens_ouverture=${sens_ouverture}, poteau_gauche=${poteau_gauche}, poteau_droit=${poteau_droit}, serrure=${serrure}, ferrage=${ferrage}, poignée=${poignee}, décor=${decor}, gammeDecor=${gammeDecor}, numéroRue=${numeroRue}, aspect=${aspect}`);
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
            /*
            &lt;ERROR_CODE&gt;4&lt;/ERROR_CODE&gt;
            &lt;ERROR_MESSAGE&gt;Computation error&lt;/ERROR_MESSAGE&gt;
            &lt;ERROR_EXPLANATION&gt;Echec #100101
            Reduire Hauteur de 83 mm ou augmenter de 97 mm , Pour Remplissage non déligné&lt;/ERROR_EXPLANATION&gt;
            */

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