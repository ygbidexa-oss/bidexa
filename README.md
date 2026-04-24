# YG Gestion Rénovation — Site Web

## Lancement du site

### Prérequis
Installer **Node.js** : https://nodejs.org (version 18 ou +)

### Démarrer en local

```bash
# 1. Aller dans le dossier du projet
cd "C:\Users\YOUNE\.verdent\verdent-projects\crer-un-site-internet"

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement
npm run dev
```

Ouvrir ensuite : **http://localhost:5173**

### Mise en production

```bash
npm run build
```
Les fichiers optimisés seront générés dans le dossier `dist/` — prêts à être déployés sur Netlify, Vercel, ou tout hébergement web.

## Personnalisation

| Élément | Fichier |
|---|---|
| Couleurs / polices | `tailwind.config.js` |
| Contenu Hero | `src/components/Hero.jsx` |
| Services | `src/components/Services.jsx` |
| Témoignages | `src/components/Testimonials.jsx` |
| Articles blog | `src/components/Blog.jsx` |
| Coordonnées | `src/components/Contact.jsx` |
| Courriel de contact | `src/components/Contact.jsx` (ligne `mailto:`) |
