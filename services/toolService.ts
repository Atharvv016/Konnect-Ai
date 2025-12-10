import { ApiConfig, ExecutionResults } from '../types';
import { fetchGitHubCommit, sendSlackNotification, createJiraTicket, sendEmail } from './integrations';

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
       
       // Append ticket link to Slack message if successful
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