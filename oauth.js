// const clientId = 'Ov23liKgzowi1nkZGhJv'; // Client token for localhost:5000
const clientId = 'Ov23li0gGWXc4e6csy9r'; // Client token for wheresx.github.io/editor/

let access_token = undefined;
const loginContainer = document.querySelector('#login-container');
const code = new URLSearchParams(window.location.search).get('code');
const loginResultDiv = document.querySelector('#login-result');

async function getAccessTokenFromCode(code) {
    console.log('Got the code', code);

    loginResultDiv.textContent = 'Waiting for auth server...';
    let data = await fetch(`https://gh-oauth-server.onrender.com/api/${clientId}/${code}`)
    data = await data.json();

    if (!data.access_token) {
        throw new Error('No access token received');
    }

    return data.access_token;
}

function loginWithGithub() {
    const redirectUri = window.location.origin + window.location.pathname;
    const scope = 'repo';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
}

async function onload() {
    access_token = localStorage.getItem('access_token');

    if (access_token) {
        await afterAuth();

    } else if (code) {
        window.history.replaceState({}, document.title, window.location.pathname);
        try {
            access_token = await getAccessTokenFromCode(code);
        } catch (error) {
            loginResultDiv.textContent = 'Error logging in: ' + error.message;
            return;
        }
        if (access_token) {
            localStorage.setItem('access_token', access_token);
            console.log("Saved token to local storage");
            await afterAuth()
        }
    }
}

// Add document.onload callback to run some code
document.addEventListener('DOMContentLoaded', onload);
