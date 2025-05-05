const inputUsername = document.querySelector("#input__username");
const loadBtn = document.querySelector("#input__load-btn");

const profileViewpoint = document.querySelector(".profile-viewpoint");
const repoHeading = document.querySelector(
  ".profile-repository__wrapper .repositories-heading"
);
const preRepoHeading = document.querySelector(
  ".profile-repository__wrapper .pre-repo__heading"
);
const profileRepos = document.querySelector(".profile-repos");
let preload = profileViewpoint.innerHTML;
let repoPreload = profileRepos.innerHTML;

let lastScrollTop = 0;
const navBar = document.querySelector("#nav-bar");

document.addEventListener("scroll", () => {
  let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  if (scrollTop > lastScrollTop) {
    navBar.style.transform = "translateY(-100%)";
  } else {
    navBar.style.transform = "translateY(0)";
  }
  lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
});

loadBtn.addEventListener("click", (e) => {
  e.preventDefault();
  profileViewpoint.innerHTML = preload;
  profileRepos.innerHTML = repoPreload;
  let profileName = inputUsername.value.trim();
  if (profileName === "") {
    displayError("User not found! Check username and try again!");
    return;
  }
  loadBtn.disabled = true;
  getProfileData(profileName)
    .then((data) => {
      if (data.message === "Not Found") {
        throw new Error("User not found! Check username and try again!");
      }
      renderProfileData(data);
      return getProfileRepos(profileName);
    })
    .then((repos) => {
      if (repos && !repos.message) {
        repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
        renderRepos(repos);
      }
    })
    .catch((err) => {
      if (err instanceof TypeError) {
        displayError("Network Error. Check your internet connection.");
        return;
      }
      displayError(err.message);
    })
    .finally(() => {
      loadBtn.disabled = false;
    });
});

function getProfileData(profileName) {
  return fetch(`https://api.github.com/users/${profileName}`).then((res) => {
    if (!res.ok) {
      return res.json().then((errorData) => {
        if (res.status === 403 || errorData.message.includes("API rate limit"))
          throw new Error(
            "GitHub API rate limit exceeded. Try again in an hour."
          );
        else if (res.status === 404) {
          throw new Error("User not found! Check username and try again!");
        } else throw new Error("Unexpected error occurred.");
      });
    }
    return res.json();
  });
}

function getProfileRepos(profileName) {
  return fetch(
    `https://api.github.com/users/${profileName}/repos?per_page=6&sort=created`
  ).then((res) => {
    if (!res.ok) {
      return res.json().then((errorData) => {
        if (res.status === 404) {
          throw new Error("No repositories found!");
        } else throw new Error("Unexpected error occurred.");
      });
    }
    return res.json();
  });
}

function getRepoTech(fullRepoName) {
  return fetch(`https://api.github.com/repos/${fullRepoName}/languages`).then(
    (res) => res.json()
  );
}

function displayError(message) {
  repoHeading.style.display = "none";
  preRepoHeading.style.display = "none";
  profileViewpoint.innerHTML = `<div class="profile__not-found"><p>${message}</p></div>`;
  profileRepos.innerHTML = ``;
}

function renderProfileData(data) {
  profileViewpoint.innerHTML = `<div class="profile-img">
              <img
                src="${data.avatar_url}"
                alt=""
              />
            </div>
            <div class="profile__details">
              <a href="${
                data.html_url
              }" class="profile__username" target="_blank">${
    data.name ? data.name : data.login
  }</a>
              <div class="profile__bio-wrapper">
                <p class="profile__bio">${
                  data.bio ? data.bio : "Bio not available."
                }</p>
                ${
                  data.company
                    ? `<span class="profile__company"
                  ><i class="fa-regular fa-building"></i> ${data.company}</span
                >`
                    : ""
                }
                ${
                  data.location
                    ? `<span class="profile__location"
                  ><i class="fa-regular fa-compass"></i> ${data.location}</span
                >`
                    : ""
                }
              </div>
              <div class="profile__stats">
                <div class="profile__stat followers">
                  <span>${formatNumber(data.followers)}</span>Followers
                </div>
                <div class="profile__stat following">
                  <span>${formatNumber(data.following)}</span>Following
                </div>
                <div class="profile__stat repos">
                  <span>${formatNumber(data.public_repos)}</span>Repositories
                </div>
              </div>
            </div>`;
}

function renderRepos(repos) {
  if (repos.length === 0) {
    preRepoHeading.style.display = "none";
    profileRepos.innerHTML = `<div class="profile__not-found"><p>No repositories found!</p></div>`;
    return;
  }
  repoHeading.style.display = "block";
  preRepoHeading.style.display = "none";
  const repoPromises = repos.map(async (repo) => {
    let languages = "";
    try {
      const lang = await getRepoTech(repo.full_name);
      languages = Object.keys(lang);
    } catch (err) {
      languages = "N/A";
    }

    return `<div class="repo-details">
                          <a class="repo__name" href="${
                            repo.html_url
                          }" target="_blank">${repo.name}</a>
                          <p class="repo__description">${
                            repo.description
                              ? repo.description
                              : "No description available."
                          }</p>
                          <div class="repo__stats">
                            <span class="repo-stat"
                              ><i class="fa-solid fa-star"></i> ${formatNumber(
                                repo.stargazers_count
                              )}</span
                            >
                            <span class="repo-stat"
                              ><i class="fa-solid fa-code-fork"></i> ${formatNumber(
                                repo.forks_count
                              )}</span
                            >
                            <span class="repo-stat"
                              ><i class="fa-regular fa-eye"></i> ${formatNumber(
                                repo.watchers_count
                              )}</span
                            >
                            ${
                              !languages.length === 0
                                ? `<span class="repo-stat">
                            <i class="fa-solid fa-cubes"></i><div class = "repo-languages">
                            ${languages
                              .map((lan) => `<div class="lang">${lan}</div>`)
                              .join("")}
                            </div></span>`
                                : ""
                            }
                          </div>
                        </div>`;
  });
  Promise.all(repoPromises).then((repositoryList) => {
    profileRepos.innerHTML = repositoryList.join("");
  });
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
}
