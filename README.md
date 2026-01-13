#  GitHub User Explorer

GitHub User Explorer is a modern frontend web application that allows users to search GitHub profiles, explore public repositories, and read repository README files in an interactive and responsive interface.

---

##  Features

- Search GitHub users by username  
- View public profile details (avatar, bio, followers, repositories)
- Explore public repositories sorted by popularity
- Preview README files directly inside the app
- Open full README content in a modal view
- Fully responsive design for all devices

---

##  Tech Stack

### Frontend
- HTML5  
- CSS3  
- Vanilla JavaScript (ES6)

### APIs
- GitHub REST API v3

### Concepts Used
- Fetch API
- DOM Manipulation
- Client-side caching
- API rate-limit handling
- Responsive UI design

---

##  Login & Authentication

- No user login required
- No authentication system
- Public GitHub data is accessed directly using GitHub APIs

> Optional: A GitHub Personal Access Token can be added to increase API rate limits.


##  API Endpoints Used
```
- **User Profile**  
  `https://api.github.com/users/{username}`

- **User Repositories**  
  `https://api.github.com/users/{username}/repos`

- **Repository README**  
  `https://api.github.com/repos/{owner}/{repo}/readme`
```

##  Performance Optimizations

- In-memory caching for user and repository data
- Reduced API calls to avoid rate-limit issues
- Lazy loading of README content

---

##  Responsive Design

- Optimized for desktop, tablet, and mobile devices
- Built using CSS Grid and Flexbox

---

##  Project Type

- Frontend-only application
- No backend server
- No database
- Ideal for learning APIs and frontend development

---

##  License

This project is open-source and created for educational purposes.

---

##  Acknowledgements

- GitHub REST API
- Open-source developer community
