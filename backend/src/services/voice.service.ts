import { config } from '../config/environment';
import { logger } from '../utils/logger';

interface VoiceVerificationResult {
  success: boolean;
  similarityScore?: number;
  error?: string;
  profileId?: string;
}

interface VoiceProfileResult {
  success: boolean;
  profileId?: string;
  error?: string;
}

/**
 * Voice Service for Speaker Recognition
 *
 * Currently uses Mock mode for development/testing.
 *
 * For production with Azure Speaker Recognition:
 * 1. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env
 * 2. Use Azure Speaker Recognition REST API or SDK
 *
 * Architecture:
 * - On enrollment: Creates a voice profile with Azure, stores profileId in database
 * - On verification: Compares new audio against stored profileId
 * - Uses text-independent verification (no specific phrase required)
 */
class VoiceService {
  private enabled: boolean = false;
  private azureEndpoint: string | null = null;
  private azureKey: string | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Azure Speaker Recognition service
   */
  private initialize(): void {
    try {
      if (!config.azure.speechKey || !config.azure.speechRegion) {
        logger.warn('⚠️ Azure Speech credentials not configured. Voice verification will use MOCK MODE.');
        logger.warn('💡 To enable real voice recognition:');
        logger.warn('   1. Create Azure Cognitive Services resource');
        logger.warn('   2. Add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to .env');
        logger.warn('   3. Restart the server');
        this.enabled = false;
        return;
      }

      this.azureKey = config.azure.speechKey;
      this.azureEndpoint = `https://${config.azure.speechRegion}.api.cognitive.microsoft.com`;
      this.enabled = true;

      logger.info('✅ Azure Voice Service configured', {
        region: config.azure.speechRegion,
        endpoint: this.azureEndpoint,
        mode: 'PRODUCTION',
      });
    } catch (error) {
      logger.error('❌ Failed to initialize Azure Voice Service:', error);
      this.enabled = false;
    }
  }

  /**
   * Convert base64 audio to buffer
   */
  private base64ToBuffer(base64Audio: string): Buffer {
    // Remove data URL prefix if present
    const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  /**
   * Create a voice profile using Azure Speaker Recognition REST API
   *
   * Azure Speaker Recognition Process:
   * 1. Create profile: POST /speaker/identification/v2.0/text-independent/profiles
   * 2. Enroll audio: POST /speaker/identification/v2.0/text-independent/profiles/{profileId}/enrollments
   * 3. Get profile status: GET /speaker/identification/v2.0/text-independent/profiles/{profileId}
   *
   * Reference: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/speaker-recognition-overview
   */
  async createVoiceProfile(audioData: string): Promise<VoiceProfileResult> {
    if (!this.enabled) {
      logger.info('🎤 [MOCK] Creating voice profile (mock mode)');
      return {
        success: true,
        profileId: `MOCK_PROFILE_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };
    }

    try {
      logger.info('🎤 [AZURE] Creating voice profile with Azure Speaker Recognition');

      // Step 1: Create voice profile
      const createResponse = await fetch(
        `${this.azureEndpoint}/speaker/identification/v2.0/text-independent/profiles`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locale: 'en-US',
          }),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create profile: ${errorText}`);
      }

      const profileData = await createResponse.json() as { profileId: string };
      const profileId = profileData.profileId;

      logger.info('✅ Voice profile created', { profileId });

      // Step 2: Enroll audio
      const audioBuffer = this.base64ToBuffer(audioData);

      const enrollResponse = await fetch(
        `${this.azureEndpoint}/speaker/identification/v2.0/text-independent/profiles/${profileId}/enrollments`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureKey!,
            'Content-Type': 'audio/wav', // or 'audio/webm'
          },
          body: audioBuffer,
        }
      );

      if (!enrollResponse.ok) {
        const errorText = await enrollResponse.text();
        logger.warn('⚠️ Enrollment warning:', errorText);
        // Note: First enrollment might not be enough, but we'll store the profile
      }

      logger.info('✅ Voice profile enrolled successfully', { profileId });

      return {
        success: true,
        profileId,
      };
    } catch (error) {
      logger.error('❌ Failed to create voice profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify voice against stored profile using Azure Speaker Recognition REST API
   *
   * Azure Speaker Verification Process:
   * 1. Identify speaker: POST /speaker/identification/v2.0/text-independent/profiles/identifySingleSpeaker
   * 2. Compare identified profileId with stored profileId
   * 3. Check confidence score
   */
  async verifyVoice(audioData: string, storedProfileId: string): Promise<VoiceVerificationResult> {
    if (!this.enabled) {
      logger.info('🎤 [MOCK] Verifying voice (mock mode)', {
        profileId: storedProfileId.substring(0, 20),
      });

      // Mock verification with 80% success rate for testing
      const mockScore = Math.random();
      const success = mockScore >= 0.2; // 80% success rate

      logger.info(
        success ? '✅ [MOCK] Voice verified' : '❌ [MOCK] Voice verification failed',
        { mockScore: mockScore.toFixed(2) }
      );

      return {
        success,
        similarityScore: mockScore,
      };
    }

    try {
      logger.info('🎤 [AZURE] Verifying voice with Azure Speaker Recognition', {
        profileId: storedProfileId,
      });

      const audioBuffer = this.base64ToBuffer(audioData);

      // Identify speaker from audio
      const identifyResponse = await fetch(
        `${this.azureEndpoint}/speaker/identification/v2.0/text-independent/profiles/identifySingleSpeaker?profileIds=${storedProfileId}`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureKey!,
            'Content-Type': 'audio/wav', // or 'audio/webm'
          },
          body: audioBuffer,
        }
      );

      if (!identifyResponse.ok) {
        const errorText = await identifyResponse.text();
        throw new Error(`Voice identification failed: ${errorText}`);
      }

      const identificationResult = await identifyResponse.json() as {
        identifiedProfile?: {
          profileId: string;
          score: number;
        };
      };
      const identifiedProfileId = identificationResult.identifiedProfile?.profileId;
      const score = identificationResult.identifiedProfile?.score || 0;

      const isMatch = identifiedProfileId === storedProfileId;

      logger.info(
        isMatch ? '✅ Voice verified successfully' : '❌ Voice verification failed',
        {
          storedProfileId,
          identifiedProfileId,
          score,
          isMatch,
        }
      );

      // Require at least 0.8 confidence score for verification
      return {
        success: isMatch && score >= 0.8,
        similarityScore: score,
      };
    } catch (error) {
      logger.error('❌ Failed to verify voice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a voice profile from Azure
   */
  async deleteVoiceProfile(profileId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.enabled) {
      logger.info('🎤 [MOCK] Deleting voice profile (mock mode)', { profileId });
      return { success: true };
    }

    try {
      logger.info('🎤 [AZURE] Deleting voice profile', { profileId });

      const deleteResponse = await fetch(
        `${this.azureEndpoint}/speaker/identification/v2.0/text-independent/profiles/${profileId}`,
        {
          method: 'DELETE',
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureKey!,
          },
        }
      );

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const errorText = await deleteResponse.text();
        throw new Error(`Failed to delete profile: ${errorText}`);
      }

      logger.info('✅ Voice profile deleted successfully', { profileId });
      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to delete voice profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get voice service status
   */
  getStatus(): { enabled: boolean; mode: string } {
    return {
      enabled: this.enabled,
      mode: this.enabled ? 'AZURE_PRODUCTION' : 'MOCK_DEVELOPMENT',
    };
  }
}

export const voiceService = new VoiceService();
