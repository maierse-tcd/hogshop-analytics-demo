import { getChurnedUsers, updateUser, getUTMCampaign, updateUTMCampaign } from '../database/db.js';
import { getReactivationCampaign } from '../lib/utmCampaigns.js';
import { log } from '../lib/helpers.js';

const isTest = process.argv.includes('--test');
const isProcess = process.argv.includes('--process');

async function processChurn() {
  log('🔍 Identifying churned users...');

  const churnedUsers = getChurnedUsers();
  log(`Found ${churnedUsers.length} churned users`);

  for (const user of churnedUsers) {
    const campaign = getReactivationCampaign(user.total_spent || 0);
    
    updateUser(user.id!, {
      status: 'churned',
      churned_at: new Date().toISOString(),
      reactivation_utm_campaign: campaign.name,
      reactivation_utm_source: campaign.utmParams.utm_source,
      reactivation_utm_medium: campaign.utmParams.utm_medium,
    });

    const utmCampaign = getUTMCampaign(campaign.name);
    if (utmCampaign) {
      updateUTMCampaign(campaign.name, {
        cohort_size: (utmCampaign.cohort_size || 0) + 1,
      });
    }

    log(`User ${user.email} marked as churned, assigned to ${campaign.name}`);
  }

  log('✅ Churn processing complete');
}

if (isTest || isProcess) {
  processChurn().then(() => process.exit(0));
}
