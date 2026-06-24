package referentiel_api.services;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;
import referentiel_api.entities.*;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

@Service
public class RapportService {

    // ── Palette de couleurs CDG ──
    private static final Color COULEUR_PRIMAIRE    = new Color(0, 72, 128);   // Bleu CDG
    private static final Color COULEUR_SECONDAIRE  = new Color(0, 128, 96);   // Vert accent
    private static final Color COULEUR_EN_TETE     = new Color(245, 248, 252);
    private static final Color COULEUR_LIGNE_IMPAIR = new Color(252, 253, 255);
    private static final Color COULEUR_LIGNE_PAIR   = Color.WHITE;
    private static final Color COULEUR_ROUGE        = new Color(200, 40, 40);
    private static final Color COULEUR_ORANGE       = new Color(220, 120, 0);
    private static final Color COULEUR_VERT         = new Color(30, 140, 60);

    // ── Polices ──
    private static final Font FONT_TITRE      = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, COULEUR_PRIMAIRE);
    private static final Font FONT_SOUS_TITRE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, COULEUR_PRIMAIRE);
    private static final Font FONT_SECTION    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, COULEUR_PRIMAIRE);
    private static final Font FONT_LABEL      = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);
    private static final Font FONT_VALEUR     = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
    private static final Font FONT_TABLE_HEAD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
    private static final Font FONT_TABLE_CELL = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
    private static final Font FONT_FOOTER     = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);

    private static final SimpleDateFormat SDF = new SimpleDateFormat("dd/MM/yyyy");
    private static final NumberFormat     NF  = NumberFormat.getInstance(Locale.FRANCE);

    /**
     * Génère un rapport PDF pour un projet selon le rôle de l'utilisateur.
     * @param projet  Le projet complet (avec ses relations chargées)
     * @param role    "PMO" ou "CHEF_PROJET"
     */
    public byte[] genererRapport(Projet projet, String role) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        Document doc = new Document(PageSize.A4, 45, 45, 60, 60);
        PdfWriter writer = PdfWriter.getInstance(doc, baos);

        // ── En-tête et pied de page ──
        writer.setPageEvent(new PiedDePageEvent(projet, role));

        doc.open();

        // ══ PAGE DE COUVERTURE ══
        ajouterCouverture(doc, projet, role);
        doc.newPage();

        int secNum = 1;

        // ══ SECTION : Informations Générales ══
        ajouterSectionInfosGenerales(doc, projet, role, secNum++);

        // ══ SECTION : Phases & Livrables ══
        if (projet.getSousPhases() != null && !projet.getSousPhases().isEmpty()) {
            ajouterSectionPhases(doc, projet.getSousPhases(), secNum++);
        }

        // ══ SECTIONS PMO UNIQUEMENT (Confidentiel) ══
        if ("PMO".equalsIgnoreCase(role)) {
            // SECTION : Contrats & Prestataires
            if (projet.getContrats() != null && !projet.getContrats().isEmpty()) {
                ajouterSectionContrats(doc, projet.getContrats(), secNum++);
            }

            // SECTION : Budget & Finances
            ajouterSectionBudgetFinances(doc, projet, secNum++);
        }

        // ══ SECTION : Suivi et Indicateurs (Pour tous) ══
        ajouterSectionSuiviIndicateurs(doc, projet, secNum++);

        doc.close();
        return baos.toByteArray();
    }

    // ══════════════════════════════════════════════════════
    // PAGE DE COUVERTURE
    // ══════════════════════════════════════════════════════
    private void ajouterCouverture(Document doc, Projet projet, String role) throws Exception {
        // Bandeau coloré haut
        PdfPTable bandeauHaut = new PdfPTable(1);
        bandeauHaut.setWidthPercentage(100);
        PdfPCell cellBandeau = new PdfPCell();
        cellBandeau.setBackgroundColor(COULEUR_PRIMAIRE);
        cellBandeau.setPadding(20);
        cellBandeau.setBorder(Rectangle.NO_BORDER);

        Font fontOrg = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.WHITE);
        Font fontOrgSub = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(180, 210, 240));

        Paragraph org = new Paragraph("CAISSE DE DÉPÔT ET DE GESTION", fontOrg);
        org.setAlignment(Element.ALIGN_CENTER);
        Paragraph orgSub = new Paragraph("Système Référentiel SI", fontOrgSub);
        orgSub.setAlignment(Element.ALIGN_CENTER);
        cellBandeau.addElement(org);
        cellBandeau.addElement(orgSub);
        bandeauHaut.addCell(cellBandeau);
        doc.add(bandeauHaut);

        doc.add(new Paragraph("\n\n"));

        // Titre du rapport
        String typeRapport = "PMO".equalsIgnoreCase(role) ? "RAPPORT PMO" : "RAPPORT CHEF DE PROJET";
        Paragraph titre = new Paragraph(typeRapport, FONT_TITRE);
        titre.setAlignment(Element.ALIGN_CENTER);
        doc.add(titre);

        doc.add(new Paragraph("\n"));

        // Nom du projet
        Font fontNomProjet = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, COULEUR_SECONDAIRE);
        Paragraph nomProjet = new Paragraph(projet.getNom(), fontNomProjet);
        nomProjet.setAlignment(Element.ALIGN_CENTER);
        doc.add(nomProjet);

        // Code projet
        Font fontCode = FontFactory.getFont(FontFactory.HELVETICA, 12, Color.GRAY);
        Paragraph codeProjet = new Paragraph("Code : " + safe(projet.getCode()), fontCode);
        codeProjet.setAlignment(Element.ALIGN_CENTER);
        doc.add(codeProjet);

        doc.add(new Paragraph("\n\n"));

        // Métadonnées de couverture
        PdfPTable meta = new PdfPTable(2);
        meta.setWidthPercentage(70);
        meta.setHorizontalAlignment(Element.ALIGN_CENTER);
        meta.setWidths(new float[]{40, 60});

        ajouterLigneMeta(meta, "Statut", safe(projet.getStatut()));
        ajouterLigneMeta(meta, "Phase courante", safe(projet.getPhaseCourante()));
        ajouterLigneMeta(meta, "Chef de projet", getChefDeProjetNames(projet));
        ajouterLigneMeta(meta, "Direction métier", safe(projet.getDirectionMetier()));
        ajouterLigneMeta(meta, "Date de génération", SDF.format(new Date()));
        doc.add(meta);

        doc.add(new Paragraph("\n\n\n"));

        // Bandeau état santé
        String etat = safe(projet.getEtatSante());
        Color couleurEtat = "Vert".equalsIgnoreCase(etat) ? COULEUR_VERT
                          : "Orange".equalsIgnoreCase(etat) ? COULEUR_ORANGE : COULEUR_ROUGE;

        PdfPTable etatTable = new PdfPTable(1);
        etatTable.setWidthPercentage(50);
        etatTable.setHorizontalAlignment(Element.ALIGN_CENTER);
        PdfPCell etatCell = new PdfPCell(new Phrase("État de santé du projet : " + etat,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.WHITE)));
        etatCell.setBackgroundColor(couleurEtat);
        etatCell.setPadding(12);
        etatCell.setBorder(Rectangle.NO_BORDER);
        etatCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        etatTable.addCell(etatCell);
        doc.add(etatTable);
    }

    // ══════════════════════════════════════════════════════
    // SECTION 1 – INFORMATIONS GÉNÉRALES
    // ══════════════════════════════════════════════════════
    private void ajouterSectionInfosGenerales(Document doc, Projet projet, String role, int secNum) throws Exception {
        doc.add(creerTitreSectionElement(secNum + ". Informations Générales"));

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{25, 25, 25, 25});
        table.setSpacingBefore(6);

        ajouterLigneInfo4Cols(table,
            "Code", safe(projet.getCode()),
            "Statut", safe(projet.getStatut()));
        ajouterLigneInfo4Cols(table,
            "Type", safe(projet.getType()),
            "Phase courante", safe(projet.getPhaseCourante()));
        ajouterLigneInfo4Cols(table,
            "Chef de projet", getChefDeProjetNames(projet),
            "Direction métier", safe(projet.getDirectionMetier()));
        ajouterLigneInfo4Cols(table,
            "Début prévu", formatDate(projet.getDateDebutPrevue()),
            "Fin prévue", formatDate(projet.getDateFinPrevue()));
        ajouterLigneInfo4Cols(table,
            "Fin réelle", formatDate(projet.getDateReelleFin()),
            "Date Création", formatDate(projet.getDateCreation()));

        doc.add(table);

        // Description
        if (projet.getDescription() != null && !projet.getDescription().isBlank()) {
            doc.add(new Paragraph("\n"));
            Paragraph labelDesc = new Paragraph("Description :", FONT_LABEL);
            doc.add(labelDesc);
            Paragraph desc = new Paragraph(projet.getDescription(), FONT_VALEUR);
            desc.setIndentationLeft(10);
            doc.add(desc);
        }

        doc.add(new Paragraph("\n"));
    }

    // ══════════════════════════════════════════════════════
    // SECTION 2 – PHASES & LIVRABLES
    // ══════════════════════════════════════════════════════
    private void ajouterSectionPhases(Document doc, List<SousPhase> phases, int secNum) throws Exception {
        doc.add(creerTitreSectionElement(secNum + ". Phases & Livrables"));

        for (SousPhase phase : phases) {
            // En-tête de phase
            PdfPTable headerPhase = new PdfPTable(1);
            headerPhase.setWidthPercentage(100);
            headerPhase.setSpacingBefore(8);

            PdfPCell cellPhase = new PdfPCell(new Phrase("  " + safe(phase.getNomPhase()) + " — " + safe(phase.getStatut()),
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE)));
            cellPhase.setBackgroundColor(COULEUR_PRIMAIRE);
            cellPhase.setPadding(7);
            cellPhase.setBorder(Rectangle.NO_BORDER);
            headerPhase.addCell(cellPhase);
            doc.add(headerPhase);

            // Dates de la phase
            PdfPTable datesPhase = new PdfPTable(4);
            datesPhase.setWidthPercentage(100);
            ajouterLigneInfo4Cols(datesPhase,
                "Début", formatDate(phase.getDateDebut()),
                "Fin", formatDate(phase.getDateFin()));
            doc.add(datesPhase);

            // Livrables
            if (phase.getLivrables() != null && !phase.getLivrables().isEmpty()) {
                PdfPTable tableLiv = new PdfPTable(3);
                tableLiv.setWidthPercentage(100);
                tableLiv.setWidths(new float[]{50, 25, 25});
                tableLiv.setSpacingBefore(3);

                ajouterEnTeteTable(tableLiv, "Livrable", "Livré ?", "Validé ?");

                int row = 0;
                for (Livrable l : phase.getLivrables()) {
                    Color bg = (row++ % 2 == 0) ? COULEUR_LIGNE_PAIR : COULEUR_LIGNE_IMPAIR;
                    ajouterCellule(tableLiv, safe(l.getNom()), bg, Element.ALIGN_LEFT);
                    ajouterCellule(tableLiv, Boolean.TRUE.equals(l.getEstLivre()) ? "✓ Oui" : "✗ Non", bg, Element.ALIGN_CENTER);
                    ajouterCellule(tableLiv, Boolean.TRUE.equals(l.getEstValide()) ? "✓ Oui" : "✗ Non", bg, Element.ALIGN_CENTER);
                }
                doc.add(tableLiv);
            }
        }
        doc.add(new Paragraph("\n"));
    }

    // ══════════════════════════════════════════════════════
    // BUDGET & FINANCES (PMO uniquement : accès complet)
    // ══════════════════════════════════════════════════════
    private void ajouterSectionBudgetFinances(Document doc, Projet projet, int secNum) throws Exception {
        doc.add(creerTitreSectionElement(secNum + ". Budget & Finances (Confidentiel PMO)"));

        // Table récapitulative (3 colonnes)
        PdfPTable gridTable = new PdfPTable(3);
        gridTable.setWidthPercentage(100);
        gridTable.setWidths(new float[]{33.33f, 33.33f, 33.33f});
        gridTable.setSpacingBefore(8);
        gridTable.setSpacingAfter(12);

        Double initial = projet.getBudgetInitial() != null ? projet.getBudgetInitial() : 0.0;
        Double consomme = projet.getBudgetConsomme() != null ? projet.getBudgetConsomme() : 0.0;
        Double delta = initial - consomme;

        // Cellule 1: Budget Initial
        PdfPCell cellInit = new PdfPCell();
        cellInit.setBorderColor(new Color(220, 225, 235));
        cellInit.setPadding(8);
        cellInit.setBackgroundColor(COULEUR_EN_TETE);
        cellInit.addElement(new Paragraph("Budget Initial Prévu", FONT_LABEL));
        Paragraph pInit = new Paragraph(formatMontant(initial) + " MAD", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.BLACK));
        pInit.setSpacingBefore(4);
        cellInit.addElement(pInit);
        gridTable.addCell(cellInit);

        // Cellule 2: Budget Consommé
        PdfPCell cellCons = new PdfPCell();
        cellCons.setBorderColor(new Color(220, 225, 235));
        cellCons.setPadding(8);
        cellCons.setBackgroundColor(COULEUR_EN_TETE);
        cellCons.addElement(new Paragraph("Budget Consommé à date", FONT_LABEL));
        Paragraph pCons = new Paragraph(formatMontant(consomme) + " MAD", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, COULEUR_ORANGE));
        pCons.setSpacingBefore(4);
        cellCons.addElement(pCons);
        gridTable.addCell(cellCons);

        // Cellule 3: Budget Restant (Delta)
        PdfPCell cellDelta = new PdfPCell();
        cellDelta.setBorderColor(new Color(220, 225, 235));
        cellDelta.setPadding(8);
        cellDelta.setBackgroundColor(COULEUR_EN_TETE);
        cellDelta.addElement(new Paragraph("Budget Restant (Delta)", FONT_LABEL));
        Color colDelta = delta < 0 ? COULEUR_ROUGE : COULEUR_VERT;
        Paragraph pDelta = new Paragraph(formatMontant(delta) + " MAD", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, colDelta));
        pDelta.setSpacingBefore(4);
        cellDelta.addElement(pDelta);
        gridTable.addCell(cellDelta);

        doc.add(gridTable);

        // Échéancier de paiements
        if (projet.getEcheancesPaiement() != null && !projet.getEcheancesPaiement().isEmpty()) {
            Paragraph titreEch = new Paragraph("Échéancier de paiements :", FONT_LABEL);
            titreEch.setSpacingAfter(4);
            doc.add(titreEch);

            PdfPTable tableEch = new PdfPTable(5);
            tableEch.setWidthPercentage(100);
            tableEch.setWidths(new float[]{20, 18, 25, 25, 12});
            
            ajouterEnTeteTable(tableEch, "Montant", "Date d'échéance", "Conditionné par", "Élément lié", "Statut");

            int row = 0;
            for (EcheancePaiement e : projet.getEcheancesPaiement()) {
                Color bg = (row++ % 2 == 0) ? COULEUR_LIGNE_PAIR : COULEUR_LIGNE_IMPAIR;
                
                // Montant
                ajouterCellule(tableEch, formatMontant(e.getMontant()) + " MAD", bg, Element.ALIGN_RIGHT);
                // Date
                ajouterCellule(tableEch, formatDate(e.getDateEcheance()), bg, Element.ALIGN_CENTER);

                // Conditionné par & Élément lié
                String cond = "Aucun (Lié au projet)";
                String lie = "—";
                if (e.getSousPhase() != null) {
                    cond = "Validation d'une Phase";
                    lie = safe(e.getSousPhase().getNomPhase());
                } else if (e.getLivrable() != null) {
                    cond = "Remise d'un Livrable";
                    lie = safe(e.getLivrable().getNom());
                }
                ajouterCellule(tableEch, cond, bg, Element.ALIGN_LEFT);
                ajouterCellule(tableEch, lie, bg, Element.ALIGN_LEFT);

                // Statut
                boolean paye = Boolean.TRUE.equals(e.getEstPaye());
                PdfPCell cellPaye = new PdfPCell(new Phrase(paye ? "Payé" : "Non Payé",
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, paye ? COULEUR_VERT : COULEUR_ORANGE)));
                cellPaye.setBackgroundColor(bg);
                cellPaye.setPadding(5);
                cellPaye.setBorderColor(new Color(220, 225, 235));
                cellPaye.setHorizontalAlignment(Element.ALIGN_CENTER);
                tableEch.addCell(cellPaye);
            }
            doc.add(tableEch);
        } else {
            Paragraph aucunEch = new Paragraph("Aucun échéancier de paiement défini.", FONT_VALEUR);
            aucunEch.setIndentationLeft(10);
            doc.add(aucunEch);
        }
        doc.add(new Paragraph("\n"));
    }

    // ══════════════════════════════════════════════════════
    // CONTRATS (PMO uniquement : accès complet)
    // ══════════════════════════════════════════════════════
    private void ajouterSectionContrats(Document doc, List<Contrat> contrats, int secNum) throws Exception {
        doc.add(creerTitreSectionElement(secNum + ". Contrats & Prestataires (Confidentiel PMO)"));

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{25, 35, 20, 20});
        table.setSpacingBefore(6);

        ajouterEnTeteTable(table, "Référence", "Objet du marché", "Type", "Montant (MAD)");

        int row = 0;
        for (Contrat c : contrats) {
            Color bg = (row++ % 2 == 0) ? COULEUR_LIGNE_PAIR : COULEUR_LIGNE_IMPAIR;
            ajouterCellule(table, safe(c.getReference()), bg, Element.ALIGN_LEFT);
            ajouterCellule(table, safe(c.getObjet()), bg, Element.ALIGN_LEFT);
            ajouterCellule(table, safe(c.getTypeMarche()), bg, Element.ALIGN_CENTER);
            ajouterCellule(table, formatMontant(c.getMontantContractuel()), bg, Element.ALIGN_RIGHT);
        }

        doc.add(table);
        doc.add(new Paragraph("\n"));
    }

    // ══════════════════════════════════════════════════════
    // SUIVI ET INDICATEURS (Pour tous)
    // ══════════════════════════════════════════════════════
    private void ajouterSectionSuiviIndicateurs(Document doc, Projet projet, int secNum) throws Exception {
        doc.add(creerTitreSectionElement(secNum + ". Suivi et Indicateurs"));

        // Table indicateurs (2 colonnes)
        PdfPTable tableInd = new PdfPTable(2);
        tableInd.setWidthPercentage(100);
        tableInd.setWidths(new float[]{50, 50});
        tableInd.setSpacingBefore(6);
        tableInd.setSpacingAfter(8);

        // Cellule 1: Taux d'avancement
        PdfPCell cellTaux = new PdfPCell();
        cellTaux.setBorderColor(new Color(220, 225, 235));
        cellTaux.setPadding(8);
        cellTaux.setBackgroundColor(COULEUR_EN_TETE);
        cellTaux.addElement(new Paragraph("Taux d'avancement", FONT_LABEL));
        String avancement = (projet.getTauxAvancement() != null ? projet.getTauxAvancement() + " %" : "—");
        Paragraph pTaux = new Paragraph(avancement, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, COULEUR_PRIMAIRE));
        pTaux.setSpacingBefore(4);
        cellTaux.addElement(pTaux);
        tableInd.addCell(cellTaux);

        // Cellule 2: État de santé
        PdfPCell cellSante = new PdfPCell();
        cellSante.setBorderColor(new Color(220, 225, 235));
        cellSante.setPadding(8);
        cellSante.setBackgroundColor(COULEUR_EN_TETE);
        cellSante.addElement(new Paragraph("État de santé", FONT_LABEL));
        
        String etat = safe(projet.getEtatSante());
        Color couleurEtat = "Vert".equalsIgnoreCase(etat) ? COULEUR_VERT
                          : "Orange".equalsIgnoreCase(etat) ? COULEUR_ORANGE : "Rouge".equalsIgnoreCase(etat) ? COULEUR_ROUGE : Color.BLACK;
        Paragraph pSante = new Paragraph(etat, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, couleurEtat));
        pSante.setSpacingBefore(4);
        cellSante.addElement(pSante);
        tableInd.addCell(cellSante);

        doc.add(tableInd);

        // Commentaires de suivi
        if (projet.getCommentairesSuivi() != null && !projet.getCommentairesSuivi().isBlank()) {
            Paragraph labelComm = new Paragraph("Commentaires de suivi :", FONT_LABEL);
            labelComm.setSpacingAfter(2);
            doc.add(labelComm);
            Paragraph comm = new Paragraph(projet.getCommentairesSuivi(), FONT_VALEUR);
            comm.setIndentationLeft(10);
            comm.setSpacingAfter(10);
            doc.add(comm);
        }

        // Registre des Risques (avec Plan d'action!)
        Paragraph titreRisques = new Paragraph("Registre des Risques :", FONT_LABEL);
        titreRisques.setSpacingBefore(6);
        titreRisques.setSpacingAfter(4);
        doc.add(titreRisques);

        if (projet.getRisques() != null && !projet.getRisques().isEmpty()) {
            PdfPTable tableRisques = new PdfPTable(4);
            tableRisques.setWidthPercentage(100);
            tableRisques.setWidths(new float[]{35, 12, 23, 30});

            ajouterEnTeteTable(tableRisques, "Description du risque", "Impact", "Responsable", "Plan d'action");

            int row = 0;
            for (Risque r : projet.getRisques()) {
                Color bg = (row++ % 2 == 0) ? COULEUR_LIGNE_PAIR : COULEUR_LIGNE_IMPAIR;
                
                ajouterCellule(tableRisques, safe(r.getDescription()), bg, Element.ALIGN_LEFT);

                // Impact
                String impact = safe(r.getImpact());
                Color impactColor = "Fort".equalsIgnoreCase(impact) ? COULEUR_ROUGE
                                  : "Moyen".equalsIgnoreCase(impact) ? COULEUR_ORANGE : "Faible".equalsIgnoreCase(impact) ? COULEUR_VERT : Color.BLACK;
                PdfPCell cellImpact = new PdfPCell(new Phrase(impact,
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, impactColor)));
                cellImpact.setBackgroundColor(bg);
                cellImpact.setPadding(5);
                cellImpact.setBorderColor(new Color(220, 225, 235));
                cellImpact.setHorizontalAlignment(Element.ALIGN_CENTER);
                tableRisques.addCell(cellImpact);

                ajouterCellule(tableRisques, safe(r.getResponsable()), bg, Element.ALIGN_LEFT);
                ajouterCellule(tableRisques, safe(r.getPlanAction()), bg, Element.ALIGN_LEFT);
            }
            doc.add(tableRisques);
        } else {
            Paragraph aucunRisque = new Paragraph("Aucun risque identifié.", FONT_VALEUR);
            aucunRisque.setIndentationLeft(10);
            doc.add(aucunRisque);
        }

        // Plan d'Actions
        Paragraph titreActions = new Paragraph("Plan d'Actions :", FONT_LABEL);
        titreActions.setSpacingBefore(10);
        titreActions.setSpacingAfter(4);
        doc.add(titreActions);

        if (projet.getActions() != null && !projet.getActions().isEmpty()) {
            PdfPTable tableActions = new PdfPTable(2);
            tableActions.setWidthPercentage(100);
            tableActions.setWidths(new float[]{75, 25});

            ajouterEnTeteTable(tableActions, "Description de l'action", "Statut");

            int row = 0;
            for (Action a : projet.getActions()) {
                Color bg = (row++ % 2 == 0) ? COULEUR_LIGNE_PAIR : COULEUR_LIGNE_IMPAIR;
                ajouterCellule(tableActions, safe(a.getDescription()), bg, Element.ALIGN_LEFT);
                ajouterCellule(tableActions, safe(a.getStatut()), bg, Element.ALIGN_CENTER);
            }
            doc.add(tableActions);
        } else {
            Paragraph aucuneAction = new Paragraph("Aucune action planifiée.", FONT_VALEUR);
            aucuneAction.setIndentationLeft(10);
            doc.add(aucuneAction);
        }

        doc.add(new Paragraph("\n"));
    }

    // ══════════════════════════════════════════════════════
    // UTILITAIRES DE CONSTRUCTION DU TABLEAU
    // ══════════════════════════════════════════════════════

    private Paragraph creerTitreSectionElement(String titre) {
        Paragraph p = new Paragraph(titre, FONT_SOUS_TITRE);
        p.setSpacingBefore(14);
        p.setSpacingAfter(4);
        return p;
    }

    private void ajouterEnTeteTable(PdfPTable table, String... colonnes) {
        for (String col : colonnes) {
            PdfPCell cell = new PdfPCell(new Phrase(col, FONT_TABLE_HEAD));
            cell.setBackgroundColor(COULEUR_PRIMAIRE);
            cell.setPadding(7);
            cell.setBorderColor(Color.WHITE);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }
    }

    private void ajouterCellule(PdfPTable table, String texte, Color bg, int alignement) {
        PdfPCell cell = new PdfPCell(new Phrase(texte, FONT_TABLE_CELL));
        cell.setBackgroundColor(bg);
        cell.setPadding(5);
        cell.setBorderColor(new Color(220, 225, 235));
        cell.setHorizontalAlignment(alignement);
        table.addCell(cell);
    }

    private void ajouterLigneInfo4Cols(PdfPTable table, String label1, String val1, String label2, String val2) {
        PdfPCell l1 = new PdfPCell(new Phrase(label1, FONT_LABEL));
        l1.setBackgroundColor(COULEUR_EN_TETE);
        l1.setPadding(6);
        l1.setBorderColor(new Color(220, 225, 235));
        table.addCell(l1);

        PdfPCell v1 = new PdfPCell(new Phrase(val1, FONT_VALEUR));
        v1.setPadding(6);
        v1.setBorderColor(new Color(220, 225, 235));
        table.addCell(v1);

        PdfPCell l2 = new PdfPCell(new Phrase(label2, FONT_LABEL));
        l2.setBackgroundColor(COULEUR_EN_TETE);
        l2.setPadding(6);
        l2.setBorderColor(new Color(220, 225, 235));
        table.addCell(l2);

        PdfPCell v2 = new PdfPCell(new Phrase(val2, FONT_VALEUR));
        v2.setPadding(6);
        v2.setBorderColor(new Color(220, 225, 235));
        table.addCell(v2);
    }

    private void ajouterLigneMeta(PdfPTable table, String label, String valeur) {
        PdfPCell l = new PdfPCell(new Phrase(label, FONT_LABEL));
        l.setBackgroundColor(COULEUR_EN_TETE);
        l.setPadding(7);
        l.setBorder(Rectangle.BOX);
        l.setBorderColor(new Color(210, 220, 235));
        table.addCell(l);

        PdfPCell v = new PdfPCell(new Phrase(valeur, FONT_VALEUR));
        v.setPadding(7);
        v.setBorder(Rectangle.BOX);
        v.setBorderColor(new Color(210, 220, 235));
        table.addCell(v);
    }

    private String getChefDeProjetNames(Projet projet) {
        if (projet.getChefDeProjet() != null && !projet.getChefDeProjet().isEmpty()) {
            java.util.List<String> names = new java.util.ArrayList<>();
            for (Utilisateur u : projet.getChefDeProjet()) {
                names.add(u.getPrenom() + " " + u.getNom());
            }
            return String.join(", ", names);
        }
        return (projet.getNomChefDeProjet() != null && !projet.getNomChefDeProjet().isBlank())
                ? projet.getNomChefDeProjet() : "—";
    }

    // ── Formatage ──

    private String safe(String val) {
        return (val != null && !val.isBlank()) ? val : "—";
    }

    private String formatDate(Date date) {
        return date != null ? SDF.format(date) : "—";
    }

    private String formatMontant(Double montant) {
        return montant != null ? NF.format(montant) : "—";
    }

    // ══════════════════════════════════════════════════════
    // PIED DE PAGE + EN-TÊTE PAGES SUIVANTES
    // ══════════════════════════════════════════════════════
    private static class PiedDePageEvent extends PdfPageEventHelper {
        private final Projet projet;
        private final String role;

        PiedDePageEvent(Projet projet, String role) {
            this.projet = projet;
            this.role = role;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();

            // Ligne séparatrice
            cb.setLineWidth(0.5f);
            cb.setColorStroke(new Color(180, 190, 210));
            cb.moveTo(document.leftMargin(), document.bottomMargin() - 10);
            cb.lineTo(document.right() - document.rightMargin(), document.bottomMargin() - 10);
            cb.stroke();

            // Texte pied de page
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, Color.GRAY);
            Phrase left   = new Phrase("CDG — " + projet.getNom() + " (" + projet.getCode() + ")", footerFont);
            Phrase center = new Phrase("Confidentiel — " + role, footerFont);
            Phrase right  = new Phrase("Page " + writer.getPageNumber(), footerFont);

            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT,   left,   document.leftMargin(), document.bottomMargin() - 22, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, center, document.right() / 2,  document.bottomMargin() - 22, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,  right,  document.right() - document.rightMargin(), document.bottomMargin() - 22, 0);
        }
    }
}
