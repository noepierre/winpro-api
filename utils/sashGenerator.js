const buildFillingXml = (leafId, fillings, color2, tole_changeable, tole) => {
    let fillingXml = '';
    for (let i = 0; i < fillings.length; i++) {
        fillingXml += `                                 <FILLING leaf_id="${leafId}" filling_id="${fillings[i]}">\n
                                    <FILLING_INNER_COLOUR info="">${color2}</FILLING_INNER_COLOUR>\n`;

        if (tole_changeable) {
            fillingXml += `                                    <FILLING_OPTION code="QR_ModTole" value="${tole}"/>\n`;
        }

        fillingXml += `                                 </FILLING>\n\n`;
    }
    return fillingXml;
};

const buildSashXml = (params) => {
    const {
        width2,
        serrure,
        poignee,
        motorXml,
        ferrage,
        sens,
        typeCoulissant,
        modelInput,
        remplissage_vantail1 = [],
        remplissage_vantail2 = [],
        remplissage_vantail_310 = [],
        remplissage_vantail_110 = [],
        color2,
        tole_changeable,
        tole,
        transomXml,
    } = params;

    // Définir le guide pour les portails coulissants
    let guide = "";

    // Si le portail est un téléscopique, le guide est QO_TypeOuvr_TELE
    if (typeCoulissant === "telescopique") {
        guide = "QO_TypeOuvr_TELE"
    }

    let sashXml = `<SASH id="1" leaves="2" leaf_orientation="H" door="0" fixe="0" doorfixe="0">\n
                                <ASYMETRIC_LEAVES_0>${width2}</ASYMETRIC_LEAVES_0>\n
                                <SASH_OPTION code="QO_TypeOuvr" value="${guide}" />\n
                                <FITTING_OPTION code="QQ_serrure" value="${serrure}" />\n
                                <FITTING_OPTION code="QQ_poignee" value="${poignee}" />\n
                                ${motorXml}
                                <SASH_OPTION code="QQ_ferrage" value="${ferrage}" />\n
                                <DIRECTION>${sens}</DIRECTION>\n\n`;

    if (modelInput.includes("210") || modelInput.includes("510")) {
        sashXml += buildFillingXml(1, remplissage_vantail1, color2, tole_changeable, tole);
        sashXml += buildFillingXml(2, remplissage_vantail2, color2, tole_changeable, tole);
    } else if (modelInput.includes("310") && remplissage_vantail_310.length) {
        sashXml += buildFillingXml(1, remplissage_vantail_310, color2, tole_changeable, tole);
    } else if (modelInput.includes("110") && remplissage_vantail_110.length) {
        sashXml += buildFillingXml(1, remplissage_vantail_110, color2, tole_changeable, tole);
    }

    sashXml += transomXml; // Ajouter le poteau intermédiaire si nécessaire
    sashXml += `                            </SASH>\n`;

    return sashXml;
};

export { buildSashXml };