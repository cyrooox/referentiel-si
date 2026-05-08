# Système Référentiel SI

Le **Système Référentiel SI** est une application web de gestion de portefeuille de projets développée dans le cadre d'un Projet de Fin d'Études (PFE) au sein de la Caisse de Dépôt et de Gestion (CDG).

## 🚀 Fonctionnalités Principales

- **Tableau de Bord (Dashboard)** : Suivi des KPIs (Projets actifs, alertes, budget consommé).
- **Authentification SSO** : Intégration complète avec **Keycloak** pour la gestion des accès (SSO, connexion Microsoft, rôles).
- **Extraction Intelligente (OCR)** : Importation automatisée de fiches de suivi PDF grâce à Apache PDFBox et des expressions régulières avancées.
- **Gestion de Portefeuille** : Suivi des phases, livrables, échéances de paiement, contrats, prestataires, risques et actions.
- **Multi-Rôles** : Accès différencié pour l'Administrateur, le PMO et les Chefs de Projets.

## 🛠️ Architecture et Technologies

L'application suit une architecture N-Tiers moderne :

*   **Frontend :** React.js, Vite, Tailwind CSS, Lucide React (Icônes), Axios.
*   **Backend :** Java 17, Spring Boot, Spring Data JPA, Apache PDFBox (OCR).
*   **Base de Données :** PostgreSQL.
*   **Identity & Access Management (IAM) :** Keycloak (Déployé via Docker).

## 💻 Prérequis

Pour lancer ce projet en environnement de développement, vous avez besoin de :

*   [Node.js](https://nodejs.org/) (v18 ou supérieur)
*   [Java JDK](https://adoptium.net/) (v17 ou supérieur)
*   [Maven](https://maven.apache.org/) (Inclus via le wrapper `mvnw`)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Pour faire tourner Keycloak et PostgreSQL)

## ⚙️ Installation et Lancement

### 1. Démarrer les services (Docker)
L'application nécessite Keycloak et PostgreSQL. Si vous utilisez Docker, lancez Keycloak sur le port 8180 :
```bash
docker run -p 8180:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:26.2 start-dev
```

### 2. Démarrer le Backend (Spring Boot)
Ouvrez un terminal, placez-vous dans le dossier `referentiel-api` et lancez :
```bash
cd referentiel-api
./mvnw spring-boot:run
```
L'API démarrera sur le port **8080**.

### 3. Démarrer le Frontend (React)
Ouvrez un second terminal, placez-vous dans le dossier `referentiel-ui` et installez les dépendances :
```bash
cd referentiel-ui
npm install
npm run dev
```
L'application web sera accessible sur **http://localhost:5173**.

## 🎨 Thème Keycloak Personnalisé

Le projet inclut un thème personnalisé pour l'interface de connexion (`cdg-theme`). Il doit être injecté dans le conteneur Keycloak :
```bash
docker cp "keycloak-theme/cdg-theme" <container_id>:/opt/keycloak/themes/
```
Ensuite, sélectionnez `cdg-theme` dans l'onglet *Realm Settings -> Themes* de la console d'administration Keycloak.

---
*Réalisé dans le cadre d'un stage de fin d'études (PFE) - 2026*
