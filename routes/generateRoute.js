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

    // Vérifier si tous les paramètres sont fournis
    if (!color1 || !color2 || !width || !height || !width2 || !model || !pose || !sens_ouverture || !poteau_gauche || !poteau_droit || !serrure || !ferrage || !poignee || !decor || !gammeDecor || !numeroRue || !aspect) {
        console.log('Remarque : tous les paramètres ne sont pas fournis. Les paramètres qui ne sont pas fournis seront remplacés par des valeurs par défaut.');
    }

    const widthNum = parseInt(width, 10);
    const heightNum = parseInt(height, 10);
    const width2Num = parseInt(width2, 10);
    if (isNaN(widthNum) || isNaN(heightNum) || isNaN(width2Num)) {
        return res.status(400).json({ error: "Les paramètres de largeur et de hauteur doivent être des nombres." });
    }

    // Mettre à jour la collection selon le modèle
    // Si le modèle contient 210 -> WEB_ELEG_2VTX
    const collection = model.includes('210') ? 'WEB_ELEG_2VTX' : 'INCONNU POUR LE MOMENT';

    let specs = {};

    // Charger le fichier de spécifications
    try {
        const response = await fetch("http://localhost:3000/portail-specifications");
        if (!response.ok) {
            throw new Error("Erreur lors de la récupération des spécifications");
        }
        
        specs = await response.json();
    } catch (error) {
        console.error("Erreur lors de la lecture des spécifications des portails:", error);
    }

    // Déterminer le sens
    const sens = sens_ouverture.includes("gauche") ? "1" : "0";

    // Vérifier si le modèle est un modèle bicolor
    const isBicolor = specs.bicolor_fillings.includes(model);    
    const bicoloration = isBicolor ? `<FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n` : '';

    // si la couleur 2 est vide, on affecte la couleur 1 à la couleur 2
    if (!color2) color2 = color1;

    // Trouver les remplissages pour le modèle spécifié
    const modelName = model.match(/^[A-Za-z]+/)[0]; // Extraire le nom du modèle
    const vantaux = specs.remplissage_vantail.filter(vantail => vantail.model === modelName);

    let remplissage_vantail1 = 0;
    let remplissage_vantail2 = 0;

    // Récupérer les remplissages pour les vantaux
    if (vantaux.length > 0) {
        ({ remplissage_vantail1, remplissage_vantail2 } = vantaux[0]);
    }

    var nombre_panneaux = 2;
    var transomXml = ''; // Initialiser le XML pour le poteau intermédiaire

    // Ajuster le modèle en fonction de l'aspect et de la largeur
    if (aspect === "1" && width > 4000 && !model.endsWith("-M")) {
        model += "-M";
    }

    if (aspect === "2" && !model.endsWith("-M")) {
        model += "-M";
        transomXml = `              <TRANSOM transom_id="1" leaf_id="1" filling_id="1" pos="W / 2" code="ALU ASPECT 2VTX" info="" masonry="1" />`;
    }

    // Si le modèle est de type '310' et qu'il existe des remplissages pour ce modèle
    if (model.includes("310") && specs.remplissage_vantail.some(vantail => vantail.model === modelName)) {
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


    // Construire le XML pour les vantaux
    const buildSashXml = () => {
        let sashXml = `<SASH id="1" leaves="${nombre_panneaux}" leaf_orientation="H" door="0" fixe="0" doorfixe="0">\n
                    <ASYMETRIC_LEAVES_0>${width2}</ASYMETRIC_LEAVES_0>\n
                    <FITTING_OPTION code="QQ_serrure" value="${serrure}" />\n
                    <FITTING_OPTION code="QQ_poignee" value="${poignee}" />\n
                    <SASH_OPTION code="QQ_ferrage" value="${ferrage}" />\n
                    <DIRECTION>${sens}</DIRECTION>\n\n`;

        if (!model.includes("110")) {
            
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
    if (!model.includes("110")) {
        // Ajuster les dimensions pour les modèles B, BH, BB, B, CDG et CDGI
        if (model.endsWith("-B") || model.endsWith("-BB") || model.endsWith("-BH") || model.endsWith("-CDG") || model.endsWith("-CDGI")) {
            console.log("Ajustement des dimensions pour le modèle:", model);

            if (model.endsWith("-BH")) {
                // Si le modèle est un modèle -BH ou -BB, C = width/2, D = C * Tangeant(7°) et E = C * Tangeant(7°)
                var C = width / 2;
                var D = C * Math.tan(7 * Math.PI / 180);
                var E = C * Math.tan(7 * Math.PI / 180);
                var shapeXml = `<SHAPE id="16" c="${C}" d="${D}" e="${E}" />`;
            } else if (model.endsWith("-BB")) {
                // Si le modèle est un modèle -BH ou -BB, C = width/2, D = - (C * Tangeant(7°)) et E = - (C * Tangeant(7°))
                var C = width / 2;
                var D = - (C * Math.tan(7 * Math.PI / 180));
                var E = - (C * Math.tan(7 * Math.PI / 180));
                var shapeXml = `<SHAPE id="16" c="${C}" d="${D}" e="${E}" />`;
            } else if (model.endsWith("-B")) {
                // Si le modèle est un modèle -B, C = 7514 * (1 - racine(1 - (width^2/4*7514^2)))
                var C = 7514 * (1 - Math.sqrt(1 - (width ** 2 / (4 * 7514 ** 2))));
                var shapeXml = `<SHAPE id="8" c="${C}" />`;
            } else if (model.endsWith("-CDG")) {
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
        if (model.includes("-B") || model.includes("-CDG") || model.includes("-CDGI")) {
            console.log("Ajustement des dimensions pour le modèle:", model);

            if (model.includes("-B")) {
                // Si le modèle est un modèle -B, C = 7514, E = B - C
                var C = 7514
                var E = height - C;
                // si le sens d'ouverture est à gauche, d = weight sinon d=0
                if (sens_ouverture.includes("gauche")) {
                    var D = width;

                    // ajouter -D à la fin du modèle
                    model = model + "-G";
                } else {
                    var D = 0;

                    // ajouter -G à la fin du modèle
                    model = model + "-D";
                }
                var shapeXml = `<SHAPE id="5" c="${C}" d="${D}" e="${E}" />`;
            } else if (model.includes("-CDG") && sens_ouverture.includes("droite")) {
                // Si le modèle est un modèle -CDG et ouverture droite, C = 200, E = 904, F = 786, D = (weight - 797.5) / 2 + 5
                var C = 200;
                var E = 904;
                var F = 786;
                var D = (width - 797.5) / 2 + 5;
                var shapeXml = `<SHAPE id="43" orientation="1" c="${C}" d="${D}" e="${E}" f="${F}" />`;

                // ajouter -D à la fin du modèle
                model = model + "-D";
            } else if (model.includes("-CDG") && sens_ouverture.includes("gauche")) {
                // Si le modèle est un modèle -CDG et ouverture gauche, C = 200, E = 786, F = 904, D = (weight - 797.5) / 2 - 5*
                var C = 200;
                var E = 786;
                var F = 904;
                var D = (width - 797.5) / 2 - 5;
                var shapeXml = `<SHAPE id="43" orientation="-1" c="${C}" d="${D}" e="${E}" f="${F}" />`;

                // ajouter -G à la fin du modèle
                model = model + "-G";
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
        .replace('{{model}}', model)

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
    const requestFilePath = path.resolve('C:/Users/INFOCFP3/Documents/CFP-API/request.xml');
    // fs.writeFileSync(requestFilePath, requestContent); // Commenté pour éviter que la page ne se recharge

    // Envoi de la requête SOAP, récupération de la réponse, génération du SVG et renvoi au client
    try {
        console.log("Envoi de la requête SOAP...");
        const response = await fetch("http://127.0.0.1:8001/soap/IWebshopv1", {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml; charset=utf-8' },
            body: requestContent
        });

        const responseText = await response.text();

        console.log("Réponse SOAP reçue :", responseText);

        // Extraire et ajuster le SVG
        const svgElement = extractSvgAndAdjustViewBox(responseText, width, height);
        console.log("SVG généré :", svgElement);

        // Ecrire le contenu du SVG dans un fichier
        const svgFilePath = path.resolve('C:/Users/INFOCFP3/Documents/CFP-API/response.svg');
        // fs.writeFileSync(svgFilePath, svgElement); // Commenté pour éviter que la page ne se recharge

        // Renvoi du SVG généré au client
        res.header("Content-Type", "image/svg+xml");
        res.send(svgElement);
        console.log("Réponse SOAP retournée au client.");
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la requête SOAP:', error);
        res.status(500).send('Erreur lors de l\'envoi de la requête SOAP');
    }
});


export default router;