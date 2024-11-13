import { DOMParser, XMLSerializer } from 'xmldom';

export function extractSvgAndAdjustViewBox(xmlContent, width, height) {
    // Remplacer les entités HTML
    xmlContent = xmlContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/ onmouseenter="WPitemEnter\(this\)"/g, "")
        .replace(/ onmouseleave="WPitemLeave\(this\)"/g, "")
        .replace(/ onclick="WPitemClick\(this\)"/g, "");

    // Trouver le début et la fin de l'élément SVG
    const startIndex = xmlContent.indexOf('<svg');
    const endIndex = xmlContent.indexOf('</svg>', startIndex);

    if (startIndex !== -1 && endIndex !== -1) {
        // Extraire le contenu SVG
        let svgContent = xmlContent.slice(startIndex, endIndex + '</svg>'.length);
        
        // Analyser le SVG pour obtenir les coordonnées extrêmes
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
        const svgElement = svgDoc.documentElement;

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        // Utiliser getElementsByTagName pour obtenir les éléments et les itérer
        const elements = svgElement.getElementsByTagName('*'); // Retourne une NodeList
        for (let i = 0; i < elements.length; i++) {
            const elem = elements[i];
            const x = parseFloat(elem.getAttribute('x')) || 0;
            const y = parseFloat(elem.getAttribute('y')) || 0;
            const width = parseFloat(elem.getAttribute('width')) || 0;
            const height = parseFloat(elem.getAttribute('height')) || 0;

            // Calculer les points extrêmes et ajouter une petite marge
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        }

        // Ajuster la viewBox
        const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
        svgElement.setAttribute("viewBox", viewBox);

        // Convertir le SVG en chaîne de caractères
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgElement);

        // Modifier la chaîne pour inclure xmlns:xlink
        svgString = svgString.replace('xmlns="http://www.w3.org/2000/svg"', 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"');
        svgString = svgString.replace('xmlns:xlink=""', 'xmlns:xlink="http://www.w3.org/1999/xlink"');

        // Retourner le SVG modifié
        return svgString;
    } else {
        console.error("Aucun élément SVG trouvé dans la réponse.");
        return null;
    }
}