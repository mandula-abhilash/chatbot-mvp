# **Visdak Chatbot - Setup & Deployment Guide**

This guide covers setting up **local development**, running **individual services**, and deploying with **Docker Compose & PM2** for production.

---

## **1️⃣ Local Development Setup (For Developers)**

### **1.1 Install Dependencies**

#### **🟢 Backend - Node.js Setup**

```sh
cd backend-node
npm install
```

#### **🟢 AI Service - Python Setup**

```sh
cd ai-service-python
python3 -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\Activate)
pip install -r requirements.txt
```

### **1.2 Running Services Individually**

#### **🔹 Run Node.js Backend**

```sh
cd backend-node
npm run dev  # Runs Express with nodemon (For development)
```

#### **🔹 Run Python AI Service**

```sh
cd ai-service-python
source venv/bin/activate  # Activate Virtual Environment
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## **2️⃣ Running Everything with Docker Compose**

### **2.1 Build & Start All Services**

```sh
docker-compose up --build -d
```

### **2.2 Check Running Containers**

```sh
docker ps
```

### **2.3 Stop All Services**

```sh
docker-compose down
```

---

## **3️⃣ Production Deployment**

### **3.1 Deploy Python AI Service (FastAPI) with PM2**

#### **🔹 Run Without PM2 (Temporary Execution)**

```sh
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 > chatbot-server.log 2>&1 &
```

#### **🔹 Run with PM2 (Recommended)**

```sh
pm install -g pm2  # If not installed
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2" --name chatbot-ai-service-8000
```

---

### **3.2 Deploy Node.js Backend with PM2**

#### **🔹 Start with PM2**

```sh
pm install -g pm2  # If not installed
pm2 start ecosystem.config.js --name chatbot-backend-node-3000
```

#### **🔹 Restart Services if Needed**

```sh
pm2 restart visdak-chatbot
pm2 restart chatbot-api
```

#### **🔹 Check Running Processes**

```sh
pm2 list
pm2 logs
```

---

## **4️⃣ Managing Environment Variables**

**Important:** Never store credentials inside Docker or code.

### **4.1 Create a `.env` file at Root (`CHATBOT-MVP/.env`)**

```ini
POSTGRES_USER=visdak
POSTGRES_PASSWORD=secretpassword
POSTGRES_DB=chatbot_db
POSTGRES_HOST=postgres-db
POSTGRES_PORT=5432
OPENAI_API_KEY=your-openai-key
WHATSAPP_API_TOKEN=your-whatsapp-token
```

### **4.2 Add `.env` Files to `.gitignore`**

```sh
echo "*.env" >> .gitignore
```

---

## **5️⃣ Monitoring & Logs**

### **5.1 Checking PM2 Logs**

```sh
pm2 logs visdak-chatbot
pm2 logs chatbot-api
```

### **5.2 Viewing Docker Logs**

```sh
docker logs <container_id>
```

---

## **6️⃣ Updating & Redeploying**

### **6.1 Pull Latest Code & Restart**

```sh
git pull origin main
docker-compose up --build -d  # Rebuild with latest changes
```

### **6.2 Restart PM2 Services**

```sh
pm2 restart all
```
