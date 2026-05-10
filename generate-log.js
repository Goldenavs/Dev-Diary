// generate-log.js
const fs = require('fs');
const path = require('path');

// Configuration
const USERNAME = 'Goldenavs'; // <-- Ensure this is your actual username!
const API_URL = `https://api.github.com/users/${USERNAME}/events/public`;

async function fetchDailyActivity() {
    try {
        // Build headers for authentication to bypass IP rate limits
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        // Inject token if it exists in the environment
        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
        }

        const response = await fetch(API_URL, { headers });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const events = await response.json();
        
        // Filter events from the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentEvents = events.filter(event => new Date(event.created_at) > oneDayAgo);

        generateMarkdown(recentEvents);
    } catch (error) {
        console.error("Failed to fetch activity:");
        console.error(error);
        process.exit(1); // This is what caused the exit code 1
    }
}

function generateMarkdown(events) {
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
    console.log(`Successfully generated log for ${dateStr}`);
}

fetchDailyActivity();