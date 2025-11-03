# 🚀 LegacyLift-B

**LegacyLift-B** is a **Node.js backend** service for the **LegacyLift App**.  
It provides APIs for analyzing legacy **JSP-based Java projects** using **AI** and supports **file uploads** to generate insights about code quality, architecture, and modernization opportunities.

---

## 🧩 Features

- 🧠 AI-Powered JSP Code Analysis
- 📤 File Upload Support (multipart/form-data)
- ⚡ Lightweight Express.js API
- 🧾 Structured JSON Response
- 🧱 Modular Node.js Architecture

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/LegacyLift-B.git
cd LegacyLift-B
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Configure Environment Variables (Optional)
Create a `.env` file in the root directory.
```env
PORT=3000
AI_API_KEY=your-ai-api-key-here
API_URL=your-api-url
API_MODEL=your-api-model
```

### 4️⃣ Start the Server
```bash
npm start
```
Runs at [http://localhost:3000](http://localhost:3000)

For development:
```bash
npm run dev
```

---

## 🧪 API Testing Guide

### 📤 Endpoint: POST /api/analyze
Uploads a JSP file for AI analysis.

**Example (cURL):**
```bash
curl --location 'http://localhost:3000/api/analyze' --form 'folder=@"/C:/path/Documents/Doctor-Patient-Portal-AdvanceJavaWebProject-main/Doctor-Patient-Portal-AdvanceJavaWebProject-main/Doctor-Patient-Portal/user_login.jsp"'
```

**Sample Response:**
```json
{
  "success": true,
  "fileName": "user_login.jsp",
  "analysis": {
    "summary": "This JSP handles user authentication and session management.",
    "issues": [
      "Inline Java code (scriptlet) detected — migrate to JSTL or EL.",
      "Potential SQL injection vulnerability — use prepared statements."
    ],
    "recommendations": [
      "Separate business logic into servlet controllers.",
      "Adopt MVC pattern for scalability."
    ]
  }
}
```

---

## 📁 Project Structure

```
LegacyLift-B/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
├── .env
├── package.json
└── README.md
```

---

## 🧰 Tech Stack

| Component | Purpose |
|------------|----------|
| Node.js | JavaScript runtime |
| Express.js | Web framework |
| Multer | File upload middleware |
| Axios / OpenAI SDK | AI integration |
| Dotenv | Environment config |

---

## 🧠 Future Enhancements

- Support for ZIP uploads
- Generate PDF/JSON reports
- Authentication & user sessions
- AI-based code refactoring hints
- Cloud integration (AWS/GCP)

---

## 🧪 Development Commands

| Command | Description |
|----------|--------------|
| npm install | Install dependencies |
| npm start | Start production server |
| npm run dev | Run with nodemon |
| npm test | Run test cases |

---

## 📜 License

Licensed under the **MIT License**.

---
