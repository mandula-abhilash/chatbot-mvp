# Setup Virtual Environment

## Windows

```sh
python3 -m venv venv

venv\Scripts\Activate
```

## Linux / macOS

```sh
python3 -m venv venv
source venv/bin/activate
```

## Install Requirements

```sh
pip install -r requirements.txt
```

## Deploy on Server

```sh
nohup /home/abhilash/chatbot/chatbot-mvp/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8100 --workers 2 > /home/abhilash/chatbot/logs/chatbot-server.log 2>&1 &
```

### Using PM2 : Recommended

```sh
pm2 start "/home/abhilash/chatbot/chatbot-mvp/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8100 --workers 2" --name chatbot-api
```
