import fetch from 'node-fetch';
import { getToken } from './jwtUtils.js';

/**
 * Récupère les spécifications des portails depuis l'API.
 * @returns {Promise<Object>} Les spécifications des portails.
 */
export async function fetchSpecs() {
    const token = await getToken(); // Récupérer le token

    if (!token) {
        console.error('Impossible d\'obtenir le token'); // Si le token n'est pas récupéré, afficher un message d'erreur
        return;
    }

    const response = await fetch('http://localhost:3000/portail-specifications', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Erreur lors de la récupération des spécifications'); // Si on ne peut pas récupérer les spécifications, afficher un message d'erreur

    return response.json();
}


/**
 * Met à jour le modèle pour gérer les cas de largeur maximale et d'aspect.
 * @param {Object} specs - Les spécifications des portails.
 * @param {string} modelInput - Le modèle à ajuster.
 * @param {number} width - La largeur du portail.
 * @param {string} aspect - L'aspect du portail.
 * @returns {string} Le modèle ajusté en fonction de la largeur et de l'aspect.
 */
export function adjustModelBasedOnWidthAndAspect(specs, modelInput, width, aspect ) {
    // Vérifier si le modèle a une largeur maximale sans meneau
    let maxWidth_without_m = specs.maxWidth_without_m.some(model => model.model === modelInput)

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

    // Si le modèle est déjà un modèle -M2 et que l'aspect est 2, on remplace -M2 par -M3
    if (aspect === "2" && modelInput.endsWith("M2")) {
        modelInput = modelInput.replace("-M2", "-M3");
    }

    // On retourne le modèle ajusté en fonction de la largeur et de l'aspect
    return modelInput;
}

/**
 * Vérifie si un modèle est bicolore, GD, ou a une tôle changeable.
 * @param {Object} specs - Les spécifications des portails.
 * @param {string} modelInput - Le modèle à vérifier.
 * @param {string} modelInputName - Le nom du modèle sans chiffres.
 * @returns {Object} Un objet contenant les résultats des vérifications.
 */
export function getModelProperties(specs, modelInput, modelInputName) {

    // Vérifier si le modèle est dans la liste des modèles -G ou -D
    let isGDmodel = specs.models_DG.includes(modelInput);

    // Vérifier si le modèle est un modèle bicolore
    let isBicolor = specs.bicolores.includes(modelInputName);

    // Vérifier si le modèle a une tole changeable
    let tole_changeable = specs.models_tole_changeable.includes(modelInput);

    // On retourne les résultats des vérifications
    return { isGDmodel, isBicolor, tole_changeable };
}


/**
 * Fonction pour récupérer les remplissages pour les vantaux
 * @param {Object} specs - Les spécifications des portails.
 * @param {string} model - Le modèle du portail.
 * @param {string} modelInput - Le modèle du portail avec les chiffres.
 * @param {string} modelInputName - Le nom du modèle sans chiffres.
 * @returns {Object} Les remplissages pour les vantaux.
 */
export function getRemplissages(specs, model, modelInput, modelInputName) {
    // Récupérer les remplissages pour les vantaux
    let vantaux = [];

    // Vérifier si il existe des remplissages pour le modèle
    let remplissage210 = false;

    // Vérifier si le modèle a un remplissage pour le modèle 310
    let remplissage310 = false;

    // Vérifier si le modèle a un remplissage pour les modèles 110
    let remplissage110 = false;

    // Remplissages du vantail pour les modèles 110 et 310
    let vantail110 = [];
    let vantail310 = [];

    // Remplir vantail110 par les remplissages pour les modèles 110
    if (model.includes("110")) {

        // Vérifier si le modèle a un remplissage pour les modèles 110
        remplissage110 = specs.remplissage_vantail_110.some(vantail => vantail.model === modelInputName);

        if (modelInput.endsWith("-M")) {
            vantail110 = specs.remplissage_vantail_110.filter(vantail => vantail.model === modelInput);
        } else {
            vantail110 = specs.remplissage_vantail_110.filter(vantail => vantail.model === modelInputName);
        }
        
    } else if (model.includes("210") || model.includes("510")) { // Les modèles 210 et 510 ont les mêmes remplissages

        // Comme les modèles 210 et 510 ont les mêmes remplissages, on vérifie si le modèle a un remplissage pour les modèles 210
        if (model.includes("510")) {
            modelInput = modelInput.replace("510", "210"); // On remplace 510 par 210 pour la recherche
        }

        if (modelInput.endsWith("-M")) {
            remplissage210 = specs.remplissage_vantails_210.some(vantail => vantail.model === modelInput);

            vantaux = specs.remplissage_vantails_210.filter(vantail => vantail.model === modelInput);
        } else {
            remplissage210 = specs.remplissage_vantails_210.some(vantail => vantail.model === modelInputName);

            vantaux = specs.remplissage_vantails_210.filter(vantail => vantail.model === modelInputName);
        }

        if (model.includes("510")) {
            modelInput = modelInput.replace("210", "510"); // On remet 510 à la place de 210 pour les modèles 510
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

    return { remplissage210, remplissage310, remplissage110, vantail110, vantail310, vantaux };
}