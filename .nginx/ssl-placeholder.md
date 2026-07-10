# SSL production — Let's Encrypt / Certbot

## Prerequis
- Serveur expose sur les ports 80 ET 443 (443 deja commente dans docker-compose.yml)
- Nom de domaine DNS pointe vers le serveur (ex: kasi.votre-domaine.com)

## Etapes

1. Installer certbot sur l hote :
   sudo apt install certbot

2. Arreter nginx le temps de la generation (certbot a besoin du port 80) :
   docker compose stop nginx

3. Generer le certificat :
   sudo certbot certonly --standalone -d kasi.votre-domaine.com

4. Creer /etc/nginx/ssl/kasi-ssl.conf sur l hote :
   ssl_certificate     /etc/letsencrypt/live/kasi.votre-domaine.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/kasi.votre-domaine.com/privkey.pem;
   ssl_protocols       TLSv1.2 TLSv1.3;
   ssl_ciphers         HIGH:!aNULL:!MD5;

5. Dans default.conf, decommenter les deux lignes SSL :
   listen 443 ssl;
   include /etc/nginx/ssl/kasi-ssl.conf;

6. Dans docker-compose.yml, decommenter les trois lignes (port + volumes SSL).

7. Renouvellement automatique (cron sur l hote) :
   0 3 * * * certbot renew --quiet && docker exec kasi-nginx nginx -s reload
