declare module '@google-cloud/recaptcha-enterprise' {
  export class RecaptchaEnterpriseServiceClient {
    projectPath(projectId: string): string;
    createAssessment(request: unknown): Promise<Array<any>>;
  }
}
