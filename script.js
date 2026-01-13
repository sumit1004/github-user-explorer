// DOM Elements
const input = document.getElementById("usernameInput");
const button = document.getElementById("searchBtn");
const errorContainer = document.getElementById("error");
const loadingContainer = document.getElementById("loading");
const profileSection = document.getElementById("profile");
const reposSection = document.getElementById("repos");
const reposHeader = document.getElementById("reposHeader");
const navBrand = document.querySelector(".nav-brand");

// Modal Elements
const readmeModal = document.getElementById("readmeModal");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const modalCloseBtn = document.getElementById("modalCloseBtn");

// Event Listeners
button.addEventListener("click", searchUser);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchUser();
});

// Scroll to home when clicking nav brand
navBrand.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Modal event listeners
modalClose.addEventListener("click", closeReadmeModal);
modalCloseBtn.addEventListener("click", closeReadmeModal);
modalOverlay.addEventListener("click", closeReadmeModal);

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !readmeModal.classList.contains("hidden")) {
    closeReadmeModal();
  }
});

// API Rate limit tracking aur caching ke liye
let apiCallCount = 0;
const MAX_API_CALLS = 60; // Bina token ke 60 calls
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const userCache = {}; // User data ko store karne ke liye
const repoCache = {}; // Repos data ko store karne ke liye

// GitHub Personal Access Token (public scope ke liye, jis se rate limit badh jayegi)
//if token limit reach then change the token 
const GITHUB_TOKEN = "you github token"; // 

async function searchUser() {
  const username = input.value.trim();

  if (!username) {
    showError("Please enter a GitHub username");
    return;
  }

  if (username.length > 39) {
    showError("Username is too long");
    return;
  }

  // Clear previous state
  clearResults();
  showLoading(true);

  try {
    // check cache if the data is present or not
    if (userCache[username] && Date.now() - userCache[username].timestamp < CACHE_DURATION) {
      displayProfile(userCache[username].data);
      fetchReposWithCache(userCache[username].data.repos_url);
      showLoading(false);
      return;
    }

    // Fetch user data - with authentication header
    const userRes = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        ...(GITHUB_TOKEN && { "Authorization": `token ${GITHUB_TOKEN}` }) // Agar token hai to add karo
      }
    });

    if (!userRes.ok) {
      if (userRes.status === 404) {
        showError(`User "${username}" not found on GitHub`);
      } else if (userRes.status === 403) {
        showError("API rate limit exceeded. Please try again later. ");
      } else {
        showError("Failed to fetch user data. Please try again");
      }
      showLoading(false);
      return;
    }

    const user = await userRes.json();

    if (user.message) {
      showError(user.message);
      showLoading(false);
      return;
    }

    // store user data in cache
    userCache[username] = {
      data: user,
      timestamp: Date.now()
    };

    displayProfile(user);

    // fetch repository with caching
    fetchReposWithCache(user.repos_url);

  } catch (err) {
    showError("Network error. Please check your connection and try again");
    console.error("Search error:", err);
  } finally {
    showLoading(false);
  }
}

// function of fetching Repositories with cache 
async function fetchReposWithCache(reposUrl) {
  const cacheKey = reposUrl;
  
  // check cache
  if (repoCache[cacheKey] && Date.now() - repoCache[cacheKey].timestamp < CACHE_DURATION) {
    const repos = repoCache[cacheKey].data;
    displayRepoHeader(repos.length);
    displayRepos(repos);
    showLoading(false);
    return;
  }

  try {
    const repoRes = await fetch(`${reposUrl}?sort=stars&per_page=30`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        ...(GITHUB_TOKEN && { "Authorization": `token ${GITHUB_TOKEN}` })
      }
    });

    if (repoRes.ok) {
      const repos = await repoRes.json();
      
      // store in cache
      repoCache[cacheKey] = {
        data: repos,
        timestamp: Date.now()
      };
      
      displayRepoHeader(repos.length);
      displayRepos(repos);
    } else {
      console.warn("Failed to fetch repositories");
      displayRepoHeader(0);
    }
  } catch (err) {
    console.warn("Error fetching repos:", err);
    displayRepoHeader(0);
  } finally {
    showLoading(false);
  }
}

function displayProfile(user) {
  // Set avatar
  const avatar = document.getElementById("avatar");
  avatar.src = user.avatar_url;
  avatar.alt = `${user.login}'s avatar`;

  // Set profile info
  document.getElementById("name").textContent = user.name || user.login;
  document.getElementById("username").textContent = `@${user.login}`;
  document.getElementById("bio").textContent = user.bio || "No bio available";
  document.getElementById("location").textContent = user.location || "Location not specified";

  // Set stats
  document.getElementById("followers").textContent = formatNumber(user.followers);
  document.getElementById("following").textContent = formatNumber(user.following);
  document.getElementById("publicRepos").textContent = formatNumber(user.public_repos);

  // Set GitHub link
  const githubLink = document.getElementById("githubLink");
  githubLink.href = user.html_url;
  githubLink.setAttribute("aria-label", `Visit ${user.login}'s GitHub profile`);

  // Show profile section
  profileSection.classList.remove("hidden");

  // Scroll to profile
  setTimeout(() => {
    profileSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

function displayRepoHeader(count) {
  document.getElementById("repoCount").textContent = `${count} repositories found`;
  reposHeader.classList.remove("hidden");
}

async function displayRepos(repos) {
  reposSection.innerHTML = "";

  if (repos.length === 0) {
    reposSection.innerHTML = '<p class="no-repos">No public repositories found</p>';
    return;
  }

  // Filter out forked repos (optional - you can remove this to show all)
  const primaryRepos = repos.filter(repo => !repo.fork).slice(0, 20);

  for (let i = 0; i < primaryRepos.length; i++) {
    const repo = primaryRepos[i];
    const repoDiv = await createRepoCard(repo, i);
    if (repoDiv) {
      reposSection.appendChild(repoDiv);
    }
  }
}

async function createRepoCard(repo, index) {
  const div = document.createElement("div");
  div.className = "repo";

  // Escape HTML to prevent XSS
  const escapedName = escapeHtml(repo.name);
  const escapedDesc = escapeHtml(repo.description || "No description provided");

  // Get language info
  const language = repo.language || "Unknown";
  const langColor = getLanguageColor(language);

  // Fetch README asynchronously
  let readmeText = null;
  const readmePromise = fetchReadme(repo.owner.login, repo.name).then((text) => {
    readmeText = text;
  });

  // Initial HTML without README
  div.innerHTML = `
    <h3><a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${escapedName}</a></h3>
    <p class="repo-description">${escapedDesc}</p>
    
    <div class="repo-meta">
      <div class="repo-meta-item stars">
        ⭐ ${formatNumber(repo.stargazers_count)}
      </div>
      ${repo.language ? `
        <div class="repo-meta-item language">
          <span class="language-dot" style="background: ${langColor};"></span>
          ${escapeHtml(language)}
        </div>
      ` : ''}
      ${repo.forks_count > 0 ? `
        <div class="repo-meta-item">
          🔀 ${formatNumber(repo.forks_count)}
        </div>
      ` : ''}
    </div>
  `;

  // Append to section first
  let readmeContainer = null;

  // Load README after initial render (performance optimization)
  const loadReadme = async () => {
    await readmePromise;

    if (!readmeContainer) {
      readmeContainer = document.createElement("div");
      readmeContainer.style.marginTop = "12px";
      div.appendChild(readmeContainer);
    }

    if (readmeText) {
      const shortReadme = readmeText.split("\n").slice(0, 4).join("\n").trim();
      const fullText = readmeText;
      const hasMoreContent = readmeText.split("\n").length > 4;

      const preEl = document.createElement("pre");
      preEl.className = "readme";
      preEl.textContent = shortReadme;

      readmeContainer.innerHTML = "";
      readmeContainer.appendChild(preEl);

      if (hasMoreContent) {
        const btn = document.createElement("button");
        btn.className = "show-more";
        btn.textContent = "Show more";

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          openReadmeModal(repo, fullText);
        });

        readmeContainer.appendChild(btn);
      }
    } else {
      readmeContainer.innerHTML = '<p class="readme" style="color: #6e7681; font-style: italic;">README not available</p>';
    }
  };

  // Load README after a short delay to prioritize initial render
  setTimeout(loadReadme, 100);

  return div;
}

async function fetchReadme(username, repoName) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${username}/${repoName}/readme`,
      {
        headers: {
          "Accept": "application/vnd.github.v3.raw",
          ...(GITHUB_TOKEN && { "Authorization": `token ${GITHUB_TOKEN}` }) // Token ke saath bhej
        }
      }
    );

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Modal Functions
function openReadmeModal(repo, readmeText) {
  document.getElementById("modalRepoName").textContent = repo.name;
  
  const repoLink = document.getElementById("modalRepoLink");
  repoLink.textContent = repo.html_url;
  repoLink.href = repo.html_url;
  
  document.getElementById("modalReadmeContent").textContent = readmeText || "README not available";
  
  const githubBtn = document.getElementById("modalGitHubBtn");
  githubBtn.href = repo.html_url;
  
  readmeModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeReadmeModal() {
  readmeModal.classList.add("hidden");
  document.body.style.overflow = "auto";
}

// Utility Functions
function showError(message) {
  errorContainer.textContent = message;
  errorContainer.classList.remove("hidden");
  reposSection.innerHTML = "";
  profileSection.classList.add("hidden");
  reposHeader.classList.add("hidden");
}

function showLoading(show) {
  if (show) {
    loadingContainer.classList.remove("hidden");
  } else {
    loadingContainer.classList.add("hidden");
  }
}

function clearResults() {
  errorContainer.textContent = "";
  errorContainer.classList.add("hidden");
  profileSection.classList.add("hidden");
  reposHeader.classList.add("hidden");
  reposSection.innerHTML = "";
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getLanguageColor(language) {
  const colors = {
    "JavaScript": "#f1e05a",
    "TypeScript": "#3178c6",
    "Python": "#3572A5",
    "Java": "#b07219",
    "Go": "#00ADD8",
    "Rust": "#ce422b",
    "C++": "#f34b7d",
    "C": "#555555",
    "C#": "#239120",
    "PHP": "#777bb4",
    "Ruby": "#cc342d",
    "Swift": "#FA7343",
    "Kotlin": "#7F52FF",
    "HTML": "#e34c26",
    "CSS": "#563d7c",
    "SQL": "#336791",
    "Shell": "#89e051",
    "Vue": "#2c3e50",
    "React": "#61dafb",
  };
  return colors[language] || "#858585";
}