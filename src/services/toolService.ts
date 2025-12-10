import { ApiConfig, ExecutionResults } from '../types';
import { fetchGitHubCommit, sendSlackNotification, createJiraTicket, sendEmail, scheduleCalendarMeeting, fetchSentryError, compareFigmaDesign, runSafeQuery, publishConfluencePage, searchYouTubeVideos } from './integrations';

export const executeTools = async (results: ExecutionResults, config: ApiConfig): Promise<string[]> => {
  const logs: string[] = [];

  // --- GitHub Integration ---
  if (config.githubToken && config.githubOwner && config.githubRepo) {
    logs.push(`🔄 GitHub: Connecting to ${config.githubOwner}/${config.githubRepo}...`);
    try {
      const commits = await fetchGitHubCommit(config);
      const latestCommit = commits[0];
      
      // Update results with REAL data
      results.commitHash = latestCommit.sha;
      results.developerName = latestCommit.commit.author.name;
      
      logs.push(`✅ GitHub: Successfully fetched latest commit ${latestCommit.sha.substring(0, 7)} by ${latestCommit.commit.author.name}`);
    } catch (error) {
      logs.push(`❌ GitHub: ${(error as Error).message}`);
    }
  } else {
    logs.push(`⚠️ GitHub: No config provided. Using simulated data.`);
  }

  // --- Jira Integration ---
  if (config.jiraDomain && config.jiraToken && config.jiraProjectKey) {
     logs.push(`🔄 Jira: Creating ticket in project ${config.jiraProjectKey}...`);
     try {
       const ticket = await createJiraTicket(config, results);
       logs.push(`✅ Jira: Ticket created successfully! Key: ${ticket.key} (ID: ${ticket.id})`);
       results.slackMessage += `\n\ntracked in Jira: ${config.jiraDomain}/browse/${ticket.key}`;
     } catch (error) {
       const msg = (error as Error).message;
       if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          logs.push(`❌ Jira: CORS Blocked. To test Jira from localhost, use a CORS proxy or disable browser security temporarily.`);
       } else {
          logs.push(`❌ Jira: ${msg}`);
       }
     }
  } else {
     logs.push(`⚠️ Jira: Missing configuration (Domain, Token, or Project Key). Skipping ticket creation.`);
  }

  // --- Gmail Integration (Simulated) ---
  if (results.gmailRecipient && results.gmailBody) {
    if (config.gmailAddress) {
       logs.push(`🔄 Gmail: Sending summary to ${results.gmailRecipient}...`);
       try {
         await sendEmail(config, results.gmailRecipient, results.gmailSubject || "Incident Summary", results.gmailBody);
         logs.push(`✅ Gmail: Sent successfully from ${config.gmailAddress}`);
       } catch (error) {
         logs.push(`❌ Gmail: Failed to send - ${(error as Error).message}`);
       }
    } else {
       logs.push(`⚠️ Gmail: No sender address configured. Skipping email.`);
    }
  }

  // --- Calendar Integration ---
  if (results.calendarEvent) {
     if (config.calendarId) {
        logs.push(`🔄 Calendar: Scheduling War Room...`);
        try {
           const meeting = await scheduleCalendarMeeting(config, results.calendarEvent.title, results.calendarEvent.attendees);
           logs.push(`✅ Calendar: Meeting scheduled at ${meeting.time}`);
           results.calendarEvent.meetLink = meeting.link;
        } catch (error) {
           logs.push(`❌ Calendar: ${(error as Error).message}`);
        }
     } else {
        logs.push(`⚠️ Calendar: ID not configured. Skipping invite.`);
     }
  }

  // --- Sentry Integration ---
  if (results.sentryAnalysis) {
     if (config.sentryDsn) {
        logs.push(`🔄 Sentry: Fetching stack traces...`);
        try {
           await fetchSentryError(config);
           logs.push(`✅ Sentry: Trace logs retrieved.`);
        } catch (error) {
           logs.push(`❌ Sentry: ${(error as Error).message}`);
        }
     } else {
        logs.push(`⚠️ Sentry: DSN not configured. Using AI simulation.`);
     }
  }

  // --- Figma Integration ---
  if (results.figmaComparison) {
     if (config.figmaToken) {
        logs.push(`🔄 Figma: Analyzing visual drift...`);
        try {
           const res = await compareFigmaDesign(config);
           logs.push(`✅ Figma: Analysis complete. Drift Score: ${res.score}%`);
        } catch (error) {
           logs.push(`❌ Figma: ${(error as Error).message}`);
        }
     } else {
        logs.push(`⚠️ Figma: Token not configured. Using AI estimation.`);
     }
  }

  // --- Database Integration ---
  if (results.sqlQuery) {
     if (config.dbConnectionString) {
        logs.push(`🔄 DB: Executing Safe Query...`);
        try {
           const res = await runSafeQuery(config, results.sqlQuery.query);
           logs.push(`✅ DB: ${res}`);
        } catch (error) {
           logs.push(`❌ DB: ${(error as Error).message}`);
        }
     } else {
        logs.push(`⚠️ DB: Connection string missing. Skipping execution.`);
     }
  }

  // --- Confluence Integration ---
  if (results.confluencePage) {
    if (config.confluenceDomain && config.confluenceToken) {
      logs.push(`🔄 Confluence: Publishing page '${results.confluencePage.title}'...`);
      try {
        const page = await publishConfluencePage(config, results.confluencePage);
        logs.push(`✅ Confluence: Published successfully.`);
        results.confluencePage.url = page.url;
      } catch (error) {
        logs.push(`❌ Confluence: ${(error as Error).message}`);
      }
    } else {
      logs.push(`⚠️ Confluence: Missing config. Skipping publication.`);
    }
  }

  // --- YouTube Integration ---
  if (results.youtubeResults) {
    logs.push(`🔄 YouTube: Searching for '${results.youtubeResults.query}'...`);
    try {
       const videos = await searchYouTubeVideos(config, results.youtubeResults.query);
       results.youtubeResults.videos = videos;
       logs.push(`✅ YouTube: Found ${videos.length} videos.`);
    } catch (error) {
       logs.push(`❌ YouTube: ${(error as Error).message}`);
    }
  }

  // --- Slack Integration ---
  if (config.slackWebhook) {
    logs.push(`🔄 Slack: Sending message via Webhook...`);
    try {
      const slackText = `*${results.bugPriority} Alert*: ${results.bugSummary}\n\n${results.slackMessage}`;
      await sendSlackNotification(config, slackText);
      logs.push(`✅ Slack: Notification sent to configured webhook.`);
    } catch (error) {
      logs.push(`❌ Slack: Failed to send - ${(error as Error).message}`);
    }
  } else {
    logs.push(`⚠️ Slack: No webhook provided. Skipping real notification.`);
  }

  return logs;
};