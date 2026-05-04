# Spécifications : Système Référentiel SI

Ce document regroupe le brainstorming des besoins et fonctionnalités pour le système de gestion de référentiel des projets SI.

## 1. Acteurs et Cas d'Utilisation

### 🧑‍💼 Chef de Projet
Il est responsable de la gestion opérationnelle de ses projets.
- Modifier un projet
- Ajouter des phases
- Ajouter des livrables
- Associer un contrat
- Associer un prestataire
- Saisir le budget
- Joindre un document

### 📊 PMO / Directeur de projets
Il a une vision macro et de pilotage du portefeuille de projets.
- Créer un projet PMO
- Consulter tous les projets
- Consulter les indicateurs de performance et de suivi
- Exporter des rapports

### ⚙️ Administrateur Fonctionnel
Il gère le paramétrage et la sécurité du système.
- Gérer les utilisateurs (création, droits, rôles)
- Gérer les listes de références (types de projet, statuts, directions métiers, etc.)

### 🌐 Tous les Acteurs
- S'authentifier
- Consulter les projets (selon les droits d'accès/attribués)
- Filtrer les projets

---

## 2. Modèle de Données d'un Projet

Chaque projet du référentiel comportera les informations suivantes classées par thématique :

### 2.1 Informations générales
- **Nom du projet** : Titre clair et unique
- **Code projet** : Identifiant unique (ex: PRJ-2025-001)
- **Description** : Résumé des objectifs du projet
- **Type de projet** : Ex: ERP, Développement spécifique, Migration, Sécurité, etc. *(Liste de référence)*
- **Statut** : En cours, En attente, Terminé, Suspendu… *(Liste de référence)*
- **Chef de projet** : Nom du chef de projet ou sponsor
- **Direction métier concernée** : Demandeur métier *(Liste de référence)*
- **Phase du projet** : Cadrage/Pré-Étude, Lancement consultation/Appel d'offre, Contractualisation, Exécution, Clôture

### 2.2 Planning
- **Date de création** : Date de démarrage administratif
- **Date de début prévue** : Démarrage opérationnel
- **Date de fin prévue** : Deadline théorique
- **Date réelle de fin** : Renseignée une fois le projet clôturé
- **Phases du projet** : Historiques et plannings des phases (cadrage, spécifications, recette…)

### 2.3 Contrats & Prestataires
- **Champ objet du marché** : Sujet de l'intervention
- **Prestataire(s)** : Nom(s) des intervenants externes
- **Type de marché** : Bon de commande, marché négocié… *(Liste de référence)*
- **Référence du marché** : Numéro du contrat ou de la commande
- **Délai d'exécution** : En mois
- **Montant contractuel** : Coût prévu
- **Documents liés** : Contrats PDF, cahiers des charges, etc.

### 2.4 Budget & Finances
- **Budget initial** : Estimation prévue
- **Budget consommé** : Dépenses réelles à date
- **Budget restant / Delta** : Calcul automatique (![Budget initial] - ![Budget consommé])
- **Échéancier de paiement** : Dates et montants avec statut (Payé / Pas encore payé)

### 2.5 Phases & Livrables
- **Tableau des phases d'exécution** : Liste des phases avec les livrables associés
- **Livrables** : Nom (Ex: Cahier des charges, Spécifications, Recette), possibilité de téléchargement
- **PV de réception** : Attaché à chaque phase
- **Statut de la phase** : Non entamée, En cours, Livrée, Validée

### 2.6 Suivi et Indicateurs
- **Taux d’avancement** : Pourcentage (%)
- **État de santé** : Vert / Orange / Rouge (Météo du projet)
- **Risques identifiés** : Tableau listant le risque, l'impact et le responsable
- **Actions en cours** : Liste de tâches / To-Do
- **Commentaires de suivi** : Notes régulières du CdP

### 2.7 Homologation Sécurité / Conformité
- **Homologation Sécurité** : Tableau (Description / Document joint)
- **Conformité** : Tableau (Description / Document joint)

### 2.8 Comitologie
- **Comités de Pilotage (COPIL)** : N° du COPIL, date, support de présentation, compte rendu

### 2.9 Documents Divers
- Cahier des charges
- Planning
- PV de recette
- Contrats
- Rapports d’audit
