import express from 'express';
import fs, { cp } from 'fs';
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
        tole, // Tôle
        poignee, // Poignée
        decor, // Décor du modèle
        gammeDecor, // Gamme de décor
        numeroRue, // Numéro de rue pour le décor
        aspect // Aspect du modèle (avec ou sans meneau)
    } = req.query;

    // Copier le modèle pour le modifier si nécessaire
    let modelInput = model;

    // Mettre à jour la collection selon le modèle
    // Si le modèle contient 210 -> WEB_ELEG_2VTX,  si le modèle contient 210 -> WEB_ELEG_1VTL, sinon si le modèle contient 310 -> WEB_ELEG_COUL1
    let collection = modelInput.includes("210") ? "WEB_ELEG_2VTX" : modelInput.includes("110") ? "WEB_ELEG_1VTL" : modelInput.includes("310") ? "WEB_ELEG_COUL1" : '';

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

        // Vérifier si le modèle a une largeur maximale sans meneau
        maxWidth_without_m = specs.maxWidth_without_m.some(model => model.model === modelInput)

        if (maxWidth_without_m) {
            maxWidth_without_m = specs.maxWidth_without_m.filter(model => model.model === modelInput)[0].maxWidth;
        }

        // Si on ne trouve pas le modèle dans les spécifications, on reessaye en ajoutant -M à modelInput
        if (!maxWidth_without_m) {
            modelInput = modelInput + "-M";
            maxWidth_without_m = specs.maxWidth_without_m.some(model => model.model === modelInput)

            if (!maxWidth_without_m) {
                modelInput = modelInput.replace("-M", "");
            } else {
                maxWidth_without_m = specs.maxWidth_without_m.filter(model => model.model === modelInput)[0].maxWidth;
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

        // Vérifier si le modèle est dans la liste des modèles -G ou -D
        isGDmodelInput = specs.models_DG.includes(modelInput);

        // Trouver les remplissages pour le modèle spécifié
        modelInputName = modelInput.match(/^[A-Za-z]+/)[0]; // Extraire le nom du modèle sans les chiffres

        vantaux = specs.remplissage_vantails_210.filter(vantail => vantail.model === modelInputName);

        // Vérifier si le modèle est un modèle bicolore
        isBicolor = specs.bicolores.includes(modelInputName);

        // Vérifier si le modèle a une tole changeable
        tole_changeable = specs.models_tole_changeable.includes(modelInput);

        // Si maxWidth_without_m du modèle existe, on ajoute -M à la fin du modèle si width est supérieur à maxWidth_without_m

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

            remplissage210 = specs.remplissage_vantails_210.some(vantail => vantail.model === modelInputName);

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

    } catch (error) {
        console.error('Erreur lors de la récupération des spécifications des portails:', error);
    }
    
    // Déterminer le sens
    const sens = sens_ouverture.includes("gauche") ? "1" : "0";

    // Ajouter la couleur secondaire si le modèle est bicolore
    const bicoloration = isBicolor ? `<FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n` : '';

    // Initialiser les remplissages pour les portillons (110)
    let remplissage_vantail_110 = 0;

    // Initialiser les remplissages pour les 2 vantaux
    let remplissage_vantail1 = 0;
    let remplissage_vantail2 = 0;

    // remplissage du vantail si le modèle est 310
    let remplissage_vantail_310 = 0;

    var transomXml = ''; // Initialiser le XML pour le poteau intermédiaire

    // Si l'aspect est 2 et que le modèle ne se termine pas par -M2 et que le modèle n'est pas un 310, alors on ajoute le poteau intermédiaire
    if (aspect === "2" && !modelInput.endsWith("-M2") && modelInput.includes("310")) {

        // Cas particulier pour le modèle MIZA310
        if (modelInput === "MIZA310-M3") {
            transomXml = `              <TRANSOM transom_id="3" leaf_id="1" filling_id="1" pos="W / 2" code="ALU ASPECT 2VTX" info="" masonry="1" />`;
        } else {
            transomXml = `              <TRANSOM transom_id="1" leaf_id="1" filling_id="1" pos="W / 2" code="ALU ASPECT 2VTX" info="" masonry="1" />`;
        }
    }

    // Récupérer les remplissages pour les vantaux et affecter les valeurs aux variables
    if (remplissage210 && vantaux.length > 0) {
        ({ remplissage_vantail1, remplissage_vantail2 } = vantaux[0]);
    } else if (remplissage310 && vantail310.length > 0) {
        ({ remplissage_vantail_310 } = vantail310[0]);
    } else if (remplissage110 && vantail110.length > 0) {
        ({ remplissage_vantail_110 } = vantail110[0]);
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
        let sashXml = `<SASH id="1" leaves="2" leaf_orientation="H" door="0" fixe="0" doorfixe="0">\n
                    <ASYMETRIC_LEAVES_0>${width2}</ASYMETRIC_LEAVES_0>\n
                    <FITTING_OPTION code="QQ_serrure" value="${serrure}" />\n
                    <FITTING_OPTION code="QQ_poignee" value="${poignee}" />\n
                    ${motorXml}
                    <SASH_OPTION code="QQ_ferrage" value="${ferrage}" />\n
                    <DIRECTION>${sens}</DIRECTION>\n\n`;

        if (modelInput.includes("210") || modelInput.includes("510")) {
            

            for (let i = 0; i < remplissage_vantail1.length; i++) {
                sashXml += `                    <FILLING leaf_id="1" filling_id="${remplissage_vantail1[i]}">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n`;
                
                if (tole_changeable) {
                    sashXml += `                                <FILLING_OPTION code="QR_ModTole" value="${tole}"/>\n`;
                }

                sashXml += `                    </FILLING>\n\n`;
            }

            for (let i = 0; i < remplissage_vantail2.length; i++) {
                sashXml += `                    <FILLING leaf_id="2" filling_id="${remplissage_vantail2[i]}">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n`;
                
                if (tole_changeable) {
                    sashXml += `                                <FILLING_OPTION code="QR_ModTole" value="${tole}"/>\n`;
                }

                sashXml += `                    </FILLING>\n\n`;
            }

        } else if (modelInput.includes("310") && remplissage310) {
  
            // On ajoute les remplissages pour le vantail 1
            for (let i = 0; i < remplissage_vantail_310.length; i++) {
                sashXml += `                    <FILLING leaf_id="1" filling_id="${remplissage_vantail_310[i]}">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n`;
                
                if (tole_changeable) {
                    sashXml += `                                <FILLING_OPTION code="QR_ModTole" value="${tole}"/>\n`;
                }

                sashXml += `                    </FILLING>\n\n`;
            }

        // Si c'est un modèle -M et que remplissage_vantail1 existe, on ajoute un remplissage pour les ou la zone spécifiée ET un remplissage pour les ou la zone spécifiée + 1
        } else if (modelInput.includes("110") && remplissage_vantail_110) {

            // On ajoute les remplissages pour le vantail 1
            for (let i = 0; i < remplissage_vantail_110.length; i++) {
                sashXml += `                    <FILLING leaf_id="1" filling_id="${remplissage_vantail_110[i]}">\n
                                <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n`;
                
                if (tole_changeable) {
                    sashXml += `                                <FILLING_OPTION code="QR_ModTole" value="${tole}"/>\n`;
                }

                sashXml += `                    </FILLING>\n\n`;
            }

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
        if (modelInput.includes("-B") || modelInput.includes("-CDG") || modelInput.includes("-CDGI") || modelInput.includes("-BH") || modelInput.includes("-BB")) {

            if (modelInput.includes("-BH")) {         
                // Si le modèle est un modèle -BH, C = width * Tangeant(7°)
                var C = width * Math.tan(7 * Math.PI / 180);

                if (sens_ouverture.includes("gauche")) {
                    // ajouter -D à la fin du modèle
                    modelInput = modelInput + "-G";
                                        
                    var shapeXml = `<SHAPE id="1" orientation="0" c="${C}" />`;
                } else {
                    // ajouter -G à la fin du modèle
                    modelInput = modelInput + "-D";
                    
                    var shapeXml = `<SHAPE id="1" orientation="1" c="${C}" />`;
                }
            
            } else if (modelInput.includes("-BB")) {         
                // Si le modèle est un modèle -BB, C = width * Tangeant(7°)
                var C = width * Math.tan(7 * Math.PI / 180);

                if (sens_ouverture.includes("droite")) {
                    // ajouter -D à la fin du modèle
                    modelInput = modelInput + "-D";
                                        
                    var shapeXml = `<SHAPE id="1" orientation="0" c="${C}" />`;
                } else {
                    // ajouter -G à la fin du modèle
                    modelInput = modelInput + "-D";
                    
                    var shapeXml = `<SHAPE id="1" orientation="1" c="${C}" />`;
                }

            } else if (modelInput.includes("-B")) {
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