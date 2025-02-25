server {
    server_name chatbot.visdak.com;

    location / {
        proxy_pass http://127.0.0.1:8800;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Forward client IP headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/chatbot.visdak.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/chatbot.visdak.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}

server {
    if ($host = chatbot.visdak.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    server_name chatbot.visdak.com;

    listen 80;
    return 404; # managed by Certbot
}
