import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';
import { config } from '../config/env';
import { logger } from '../config/logger';

interface RecaptchaVerificationResult {
  success: boolean;
  score: number;
  reason?: string;
}

let recaptchaClient: RecaptchaEnterpriseServiceClient | null = null;

function getRecaptchaClient(): RecaptchaEnterpriseServiceClient {
  if (!recaptchaClient) {
    recaptchaClient = new RecaptchaEnterpriseServiceClient();
  }

  return recaptchaClient;
}

export async function verifyRecaptchaToken(token: string, expectedAction: string): Promise<RecaptchaVerificationResult> {
  if (!config.RECAPTCHA_ENABLED) {
    return { success: true, score: 1 };
  }

  if (!config.RECAPTCHA_PROJECT_ID || !config.RECAPTCHA_SITE_KEY) {
    logger.error('reCAPTCHA is enabled but RECAPTCHA_PROJECT_ID or RECAPTCHA_SITE_KEY is missing');
    return { success: false, score: 0, reason: 'missing_configuration' };
  }

  if (!token) {
    return { success: false, score: 0, reason: 'missing_token' };
  }

  const client = getRecaptchaClient();
  const parent = client.projectPath(config.RECAPTCHA_PROJECT_ID);

  const [assessment] = await client.createAssessment({
    parent,
    assessment: {
      event: {
        token,
        siteKey: config.RECAPTCHA_SITE_KEY,
        expectedAction
      }
    }
  });

  if (!assessment.tokenProperties?.valid) {
    return {
      success: false,
      score: 0,
      reason: assessment.tokenProperties?.invalidReason?.toString() ?? 'invalid_token'
    };
  }

  const action = assessment.tokenProperties.action;
  if (action !== expectedAction) {
    return { success: false, score: 0, reason: 'action_mismatch' };
  }

  const score = assessment.riskAnalysis?.score ?? 0;
  if (score < config.RECAPTCHA_MIN_SCORE) {
    return { success: false, score, reason: 'score_too_low' };
  }

  return { success: true, score };
}
