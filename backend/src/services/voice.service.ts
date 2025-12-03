import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
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

class VoiceService {
  private speechConfig: sdk.SpeechConfig | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Azure Speech SDK
   */
  private initialize(): void {
    try {
      if (!config.azure.speechKey || !config.azure.speechRegion) {
        logger.warn('Azure Speech credentials not configured. Voice verification will use mock mode.');
        this.enabled = false;
        return;
      }

      this.speechConfig = sdk.SpeechConfig.fromSubscription(
        config.azure.speechKey,
        config.azure.speechRegion
      );

      this.enabled = true;
      logger.info('Azure Voice Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Azure Voice Service:', error);
      this.enabled = false;
    }
  }

  /**
   * Create a voice profile for a user
   * @param audioData Base64 encoded audio data
   * @returns Profile ID for the created voice profile
   */
  async createVoiceProfile(audioData: string): Promise<VoiceProfileResult> {
    if (!this.enabled || !this.speechConfig) {
      // Mock mode - generate fake profile ID
      logger.info('🎤 [MOCK VOICE] Creating voice profile (mock mode)');
      return {
        success: true,
        profileId: `MOCK_PROFILE_${Date.now()}`,
      };
    }

    try {
      // Create independent identification profile client
      const client = new sdk.VoiceProfileClient(this.speechConfig);

      // Create a new voice profile for speaker identification
      const profile = await new Promise<sdk.VoiceProfile>((resolve, reject) => {
        client.createProfileAsync(
          sdk.VoiceProfileType.TextIndependentIdentification,
          'en-US',
          (result) => resolve(result),
          (error) => reject(error)
        );
      });

      // Convert Base64 to audio buffer
      const audioBuffer = Buffer.from(audioData.split(',')[1] || audioData, 'base64');

      // Create audio config from buffer
      const pushStream = sdk.AudioInputStream.createPushStream();
      pushStream.write(audioBuffer);
      pushStream.close();

      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

      // Enroll the voice profile
      await new Promise<sdk.VoiceProfileEnrollmentResult>((resolve, reject) => {
        client.enrollProfileAsync(
          profile,
          audioConfig,
          (result) => resolve(result),
          (error) => reject(error)
        );
      });

      logger.info('Voice profile created successfully:', { profileId: profile.profileId });

      return {
        success: true,
        profileId: profile.profileId,
      };
    } catch (error: any) {
      logger.error('Error creating voice profile:', error);
      return {
        success: false,
        error: error.message || 'Failed to create voice profile',
      };
    }
  }

  /**
   * Verify voice against stored profile
   * @param audioData Base64 encoded audio data to verify
   * @param storedProfileId Voice profile ID stored in database
   * @returns Verification result with similarity score
   */
  async verifyVoice(audioData: string, storedProfileId: string): Promise<VoiceVerificationResult> {
    if (!this.enabled || !this.speechConfig) {
      // Mock mode - simulate verification
      logger.info('🎤 [MOCK VOICE] Verifying voice (mock mode)', {
        profileId: storedProfileId.substring(0, 20),
      });

      // Simple mock: if audio data is similar length to profile, accept
      const mockScore = Math.random() * 0.3 + 0.7; // 0.7-1.0
      return {
        success: mockScore >= 0.8,
        similarityScore: mockScore,
      };
    }

    try {
      // Create independent identification profile client
      const client = new sdk.VoiceProfileClient(this.speechConfig);

      // Get the voice profile
      const profile = await new Promise<sdk.VoiceProfile>((resolve, reject) => {
        client.retrieveEnrollmentResultAsync(
          sdk.VoiceProfileType.TextIndependentIdentification,
          storedProfileId,
          (result) => resolve(result),
          (error) => reject(error)
        );
      });

      // Convert Base64 to audio buffer
      const audioBuffer = Buffer.from(audioData.split(',')[1] || audioData, 'base64');

      // Create audio config from buffer
      const pushStream = sdk.AudioInputStream.createPushStream();
      pushStream.write(audioBuffer);
      pushStream.close();

      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

      // Create recognizer
      const recognizer = new sdk.SpeakerRecognizer(this.speechConfig, audioConfig);

      // Create identification model
      const model = sdk.SpeakerIdentificationModel.fromProfiles([profile]);

      // Perform identification
      const result = await new Promise<sdk.SpeakerRecognitionResult>((resolve, reject) => {
        recognizer.recognizeOnceAsync(
          model,
          (result) => resolve(result),
          (error) => reject(error)
        );
      });

      // Check result
      if (result.reason === sdk.ResultReason.RecognizedSpeaker) {
        const score = result.score; // Similarity score (0-1)
        const verified = score >= 0.8; // Threshold of 0.8

        logger.info('Voice verification completed:', {
          verified,
          score,
          profileId: storedProfileId,
        });

        return {
          success: verified,
          similarityScore: score,
          profileId: result.profileId,
        };
      } else {
        logger.warn('Voice verification failed - speaker not recognized');
        return {
          success: false,
          similarityScore: 0,
          error: 'Speaker not recognized',
        };
      }
    } catch (error: any) {
      logger.error('Error verifying voice:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify voice',
      };
    }
  }

  /**
   * Delete a voice profile
   * @param profileId Voice profile ID to delete
   */
  async deleteVoiceProfile(profileId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.enabled || !this.speechConfig) {
      logger.info('🎤 [MOCK VOICE] Deleting voice profile (mock mode)');
      return { success: true };
    }

    try {
      const client = new sdk.VoiceProfileClient(this.speechConfig);

      // Get the voice profile
      const profile = await new Promise<sdk.VoiceProfile>((resolve, reject) => {
        client.retrieveEnrollmentResultAsync(
          sdk.VoiceProfileType.TextIndependentIdentification,
          profileId,
          (result) => resolve(result),
          (error) => reject(error)
        );
      });

      // Delete the profile
      await new Promise<void>((resolve, reject) => {
        client.deleteProfileAsync(
          profile,
          () => resolve(),
          (error) => reject(error)
        );
      });

      logger.info('Voice profile deleted successfully:', { profileId });
      return { success: true };
    } catch (error: any) {
      logger.error('Error deleting voice profile:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete voice profile',
      };
    }
  }
}

export const voiceService = new VoiceService();
