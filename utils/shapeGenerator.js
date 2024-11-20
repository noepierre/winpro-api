// utils/shapeGenerator.js
// Ce fichier contient les fonctions pour générer <SHAPE>

// Calcul des tangentes à 7°
const tan7 = Math.tan(7 * Math.PI / 180);

const buildShapeXml = (id, c, d = null, e = null, f = null, orientation = null) => {
    let shapeXml = `<SHAPE id="${id}" c="${c}"`;
    if (d !== null) shapeXml += ` d="${d}"`;
    if (e !== null) shapeXml += ` e="${e}"`;
    if (f !== null) shapeXml += ` f="${f}"`;
    if (orientation !== null) shapeXml += ` orientation="${orientation}"`;
    shapeXml += ' />';
    return shapeXml;
};

// Fonction pour générer le XML en fonction des différents modèles et entrées
const generateShapeXml = (modelInput, width, height, sens_ouverture, isGDmodelInput) => {
    let shapeXml = '';
    let newModelInput;

    // Si le modèle n'est pas un portillon
    if (!modelInput.includes("110")) {
        // Ajuster les dimensions pour les modèles B, BH, BB, B, CDG et CDGI
        if (modelInput.endsWith("-B") || modelInput.endsWith("-BB") || modelInput.endsWith("-BH") || modelInput.endsWith("-CDG") || modelInput.endsWith("-CDGI")) {
            shapeXml = '';

            if (modelInput.endsWith("-BH") || modelInput.endsWith("-BB")) {
                const C = width / 2;
                const D = modelInput.endsWith("-BH") ? C * tan7 : -C * tan7;
                shapeXml = buildShapeXml("16", C, D, D);
            } else if (modelInput.endsWith("-B")) {
                const C = 7514 * (1 - Math.sqrt(1 - (width ** 2 / (4 * 7514 ** 2))));
                shapeXml = buildShapeXml("8", C);
            } else if (modelInput.endsWith("-CDG") || modelInput.endsWith("-CDGI")) {
                const C = modelInput.endsWith("-CDG") ? 200 : -200;
                const E = modelInput.endsWith("-CDG") ? 1686 : 1804;
                const F = modelInput.endsWith("-CDG") ? 1804 : 1686;
                const D = (width - 2329) / 4 + 15;
                shapeXml = buildShapeXml("42", C, D, E, F);
            }

        } else {
            shapeXml = '';
        }
    } else { // Si le modèle est un portillon
        shapeXml = '';
        if (modelInput.includes("-B") || modelInput.includes("-CDG") || modelInput.includes("-BH") || modelInput.includes("-BB")) {

            const C = width * tan7;
            let orientation = null;
            let suffix = '';

            if (modelInput.includes("-BH") || modelInput.includes("-BB")) {                
                if (modelInput.includes("-BH")) {
                    if (sens_ouverture.includes("gauche")) {
                        suffix = "-G";
                        orientation = "0";
                    } else {
                        suffix = "-D";
                        orientation = "1";
                    }
                } else if (modelInput.includes("-BB")) {
                    if (sens_ouverture.includes("droite")) {
                        suffix = "-D";
                        orientation = "0"
                    } else {
                        suffix = "-G";
                        orientation = "1";
                    }
                }                
                modelInput += suffix;
                shapeXml = buildShapeXml("1", C, null, null, null, orientation);
            } else if (modelInput.includes("-B")) {
                const E = height - 7514;
                const D = sens_ouverture.includes("gauche") ? width : 0;
                suffix = sens_ouverture.includes("gauche") ? "-G" : "-D";
                modelInput += suffix;
                shapeXml = buildShapeXml("5", 7514, D, E);
            } else if (modelInput.includes("-CDG")) {
                const D = (width - 797.5) / 2 + (sens_ouverture.includes("droite") ? 5 : -5);
                const E = sens_ouverture.includes("droite") ? 904 : 786;
                const F = sens_ouverture.includes("droite") ? 786 : 904;
                suffix = sens_ouverture.includes("droite") ? "-D" : "-G";
                modelInput += suffix;
                orientation = sens_ouverture.includes("droite") ? "1" : "-1";
                shapeXml = buildShapeXml("43", 200, D, E, F, orientation);
            }

        } else if (isGDmodelInput) {
            const suffix = sens_ouverture.includes("droite") ? "-D" : "-G";
            modelInput += suffix;
            shapeXml = '';
        } else {
            shapeXml = '';
        }
    }

    newModelInput = modelInput;

    return { shapeXml, newModelInput };
};

export { generateShapeXml };