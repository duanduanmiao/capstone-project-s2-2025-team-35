# Campus Event Management System (CEMS)
**University of Auckland – COMPSCI 399 Capstone Project**  
**Team 35 – Six God**  
![Status](https://img.shields.io/badge/status-active-success)

![React](https://img.shields.io/badge/Frontend-React-blue)
![.NET 8](https://img.shields.io/badge/Backend-.NET%208-purple)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-darkblue)
![AWS](https://img.shields.io/badge/Cloud-AWS-orange)

[![Open in Codespaces](https://classroom.github.com/assets/launch-codespace-2972f46106e565e64193e422d61a12cf1da4916b45550586e14ef0a7c637dd04.svg)](https://classroom.github.com/open-in-codespaces?assignment_repo_id=19989501)

[📋 Project Management Board (Jira)](https://aucklanduni-team-n6j5e7e9.atlassian.net/jira/software/projects/CEMS/boards/1?atlOrigin=eyJpIjoiNWIyNjhiZDdiOGMxNDc1ZThiZjg2NDkwYjcxZTg4MmMiLCJwIjoiaiJ9)

---

## 🧭 Description
CEMS is a full-stack web platform built to **centralize campus event discovery** and improve engagement between **students and organisers** at the University of Auckland.

It allows students to **browse, register, and manage** event participation, while organisers can **create, publish, and track** their events efficiently.

Key features include:
- Secure **Google OAuth authentication**
- Role-based access for **students and organisers**
- Real-time **event capacity and conflict detection**
- Responsive **UI design for desktop and mobile**
- Personalised **dashboards and profiles**

---

## 🌐 Deployed Website
**Live Production URL:**  
🔗 https://cemsuoa.com

**Deployed on AWS:**  
- **Frontend** → S3 + CloudFront (static hosting)  
- **Backend** → App Runner  
- **Database** → RDS (PostgreSQL)

---

### 🔑 Test Accounts  
⚠️ These demo accounts are **for testing purposes only**.

**Organizer Account**  
- Email: `cemsorganizer11@gmail.com`  
- Password: `cems-organizer1@`

**Student Account**  
- Email: `cemsstudent11@gmail.com`  
- Password: `cems-student1@`

---

## ⚙️ Technologies
| Category | Tools / Languages | Versions / Notes |
|-----------|------------------|------------------|
| **Frontend** | React, Vite | React 18+, Vite 4+ |
| **Backend** | .NET 8 Web API (C#) | ASP.NET Core 8.0 |
| **Database** | PostgreSQL / SQLite | AWS RDS |
| **Authentication** | Google OAuth 2.0, JWT | Role-based sign-in |
| **Infrastructure** | AWS App Runner, S3, CloudFront | Production Deployment |
| **DevOps** | Docker, GitHub Actions | Manual Build/Deploy |
| **Package Tools** | npm, EF Core | npm 9+, EF Core 8 |

---

## 🛠️ Local Development Setup

### Prerequisites
For users:
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js v18+](https://nodejs.org/en/download)

For developers (full stack):
- Docker  
- AWS CLI (optional for deployment)

---

### **Frontend Setup** 🖥️
```bash
cd reactapp1.client
npm install
npm run dev
```

---

### **Backend Setup** ⚙️
**IMPORTANT:** The backend (.NET Web API) must be run in a **separate terminal session** from the frontend.

1.  **Open a new terminal.**
2.  Navigate to the server directory and run the API:

```bash
cd ReactApp1.Server
dotnet run
```

---

## ▶️ Usage Instructions

You can access and log in to CEMS **either via the deployed website**  
👉 https://cemsuoa.com
**or by running it locally** using the instructions above.

Once running:

- Use one of the **test accounts** above to log in
- **Students** can browse and register for events
- **Organisers** can create, edit, and manage events
- The **dashboard automatically adapts based on the logged-in role**

---

## 🚀 Future Plans

- Calendar view & recurring event scheduling  
- Email / notification reminders for upcoming events  
- Admin analytics dashboard (event engagement insights)  
- Mobile app version (React Native)  
- AI-based event recommendations  

---

## 🙏 Acknowledgements

Special thanks to:  
- **Our team – Team 35 “Six God”** for collaborative development  
- **Mike (client)** for continuous feedback and support  
- **Asma (course coordinator)** for guidance and support  
- University of Auckland & AWS documentation for deployment resources  
