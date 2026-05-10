// generate-log.js
const fs = require('fs');
const path = require('path');

console.log("🚀 Booting up Developer Diary Bot...");

// Configuration
const USERNAME = 'Goldenavs'; 
const API_URL = `https://api.github.com/users/${USERNAME}/events/public`;

async function fetchDailyActivity() {
    try {
        console.log(`🔍 Target API URL: ${API_URL}`);
        
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        // 1. DIAGNOSE THE TOKEN
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            console.log("❌ ERROR: NO TOKEN DETECTED! The script cannot see your secret.");
        } else {
            console.log(`🔑 Token found! Length: ${token.length} chars. Starts with: ${token.substring(0, 4)}***`);
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log("📡 Sending request to GitHub...");
        const response = await fetch(API_URL, { headers });
        
        // 2. DIAGNOSE THE API RESPONSE
        console.log(`📥 API Response Code: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API rejected us: HTTP ${response.status} -> ${errorText}`);
        }
        
        const events = await response.json();
        console.log(`✅ Success! Fetched ${events.length} total events from GitHub.`);
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentEvents = events.filter(event => new Date(event.created_at) > oneDayAgo);
        console.log(`📅 Found ${recentEvents.length} events strictly from the last 24 hours.`);

        generateMarkdown(recentEvents);
    } catch (error) {
        console.error("\n💀 FATAL CRASH REPORT:");
        console.error(error.message);
        process.exit(1); 
    }
}

function generateMarkdown(events) {
    console.log("✍️ Generating markdown file...");
    const dateStr = new Date().toISOString().split('T')[0];
    let markdownContent = `# Developer Diary - ${dateStr}\n\n`;

    if (events.length === 0) {
        markdownContent += `*Rest day. Brain recharging. Focused on planning and architecture today.*\n`;
    } else {
        markdownContent += `### Today's Activity Summary\n\n`;
        
        const repoActivity = {};
        events.forEach(event => {
            const repoName = event.repo.name;
            if (!repoActivity[repoName]) repoActivity[repoName] = [];
            
            if (event.type === 'PushEvent') {
                event.payload.commits.forEach(commit => {
                    repoActivity[repoName].push(`- 💻 Committed: ${commit.message}`);
                });
            } else if (event.type === 'IssuesEvent') {
                repoActivity[repoName].push(`- 🐛 Issue ${event.payload.action}: ${event.payload.issue.title}`);
            }
        });

        for (const [repo, actions] of Object.entries(repoActivity)) {
            markdownContent += `#### 📁 [${repo}](https://github.com/${repo})\n`;
            actions.forEach(action => markdownContent += `${action}\n`);
            markdownContent += '\n';
        }
    }

    const dir = path.join(__dirname, 'logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const filePath = path.join(dir, `${dateStr}.md`);
    fs.writeFileSync(filePath, markdownContent);
    console.log(`🎉 SUCCESS! File created at: logs/${dateStr}.md`);
}

fetchDailyActivity();